/**
 * Groq API Client Service supporting dynamic model discovery, auto-fallback, and ultra-fast streaming.
 */

class GroqService {
  constructor() {
    this.abortController = null;
    this.cachedModels = null;
  }

  /**
   * Fetch real-time active models directly from Groq for the given API key.
   */
  async getAvailableModels(apiKey) {
    if (!apiKey) return [];
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return [];
      }

      const json = await response.json();
      if (!json || !Array.isArray(json.data)) return [];

      // Filter out speech/audio models and safety guards to keep only text chat models
      const textModels = json.data
        .filter(m => {
          const id = (m.id || '').toLowerCase();
          return !id.includes('whisper') && !id.includes('guard') && m.active !== false;
        })
        .map(m => ({
          id: m.id,
          name: this._formatModelDisplayName(m.id)
        }));

      // Sort models: put 70b/8b/recommended near top
      textModels.sort((a, b) => {
        if (a.id.includes('70b') && !b.id.includes('70b')) return -1;
        if (!a.id.includes('70b') && b.id.includes('70b')) return 1;
        if (a.id.includes('8b') && !b.id.includes('8b')) return -1;
        if (!a.id.includes('8b') && b.id.includes('8b')) return 1;
        return a.id.localeCompare(b.id);
      });

      this.cachedModels = textModels;
      return textModels;
    } catch (e) {
      console.warn('Could not fetch live Groq models:', e);
      return [];
    }
  }

  _formatModelDisplayName(id) {
    if (id.includes('llama-3.1-8b-instant')) return 'Llama 3.1 8B Instant (Ultra-Fast)';
    if (id.includes('llama-3.3-70b')) return 'Llama 3.3 70B (High Intelligence)';
    if (id.includes('llama3-70b')) return 'Llama 3 70B';
    if (id.includes('llama3-8b')) return 'Llama 3 8B';
    if (id.includes('qwen')) return `Qwen (${id})`;
    if (id.includes('gemma')) return `Gemma (${id})`;
    return id;
  }

  /**
   * Stream response from Groq API (OpenAI-compatible SSE) with auto-fallback.
   */
  async streamChat({
    apiKey,
    model = 'llama-3.1-8b-instant',
    messages,
    temperature = 0.7,
    onChunk
  }) {
    if (!apiKey) {
      throw new Error('Groq API Key is missing. Please set your Groq key in Settings.');
    }

    try {
      return await this._executeStreamRequest({
        apiKey,
        model,
        messages,
        temperature,
        onChunk
      });
    } catch (err) {
      const msg = (err.message || '').toLowerCase();
      const isDecommissionedOrNotFound = msg.includes('decommissioned') ||
                                         msg.includes('does not exist') ||
                                         msg.includes('do not have access') ||
                                         msg.includes('not found') ||
                                         msg.includes('404');

      // If user aborted, don't fallback
      if (msg.includes('stopped by user')) {
        throw err;
      }

      // If the selected model was decommissioned or not accessible, find a live model and retry
      if (isDecommissionedOrNotFound) {
        console.warn(`Model ${model} is not available. Querying live models for auto-fallback...`);
        const liveModels = await this.getAvailableModels(apiKey);
        const alternative = liveModels.find(m => m.id !== model);

        if (alternative && alternative.id) {
          console.log(`Auto-falling back to active Groq model: ${alternative.id}`);
          if (typeof onChunk === 'function') {
            onChunk(`*(Model was updated by Groq — switching to active model: ${alternative.id})*\n\n`, '');
          }
          return await this._executeStreamRequest({
            apiKey,
            model: alternative.id,
            messages,
            temperature,
            onChunk
          });
        }
      }

      throw err;
    }
  }

  async _executeStreamRequest({
    apiKey,
    model,
    messages,
    temperature,
    onChunk
  }) {
    this.abortController = new AbortController();
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const requestBody = {
      model: model,
      messages: messages,
      temperature: parseFloat(temperature) || 0.7,
      max_tokens: 8192,
      stream: true
    };

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: this.abortController.signal
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Generation stopped by user.');
      }
      throw new Error(`Network error connecting to Groq API: ${err.message}`);
    }

    if (!response.ok) {
      let errorMsg = `Groq API status ${response.status} (${response.statusText})`;
      try {
        const errJson = await response.json();
        if (errJson.error && errJson.error.message) {
          errorMsg = `Groq Error: ${errJson.error.message}`;
        }
      } catch (e) {
        // fallback
      }

      if (response.status === 401) {
        errorMsg = 'Invalid Groq API Key. Please verify your Groq key (starts with gsk_...) in Settings.';
      } else if (response.status === 429) {
        errorMsg = 'Groq rate limit reached. Please wait a moment before sending another prompt.';
      }
      throw new Error(errorMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulatedText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          if (trimmed === 'data: [DONE]') break;

          const jsonStr = trimmed.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            const delta = data.choices?.[0]?.delta?.content;
            if (delta) {
              accumulatedText += delta;
              if (typeof onChunk === 'function') {
                onChunk(accumulatedText, delta);
              }
            }
          } catch (e) {
            // ignore partial json chunk
          }
        }
      }
    } catch (streamError) {
      if (streamError.name === 'AbortError') {
        return accumulatedText;
      }
      throw streamError;
    } finally {
      this.abortController = null;
    }

    return accumulatedText;
  }

  /**
   * Cancel ongoing streaming request
   */
  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Test Groq API key validity using the live models endpoint
   */
  async testApiKey(apiKey) {
    const url = 'https://api.groq.com/openai/v1/models';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data && Array.isArray(data.data);
  }
}

const groqService = new GroqService();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GroqService, groqService };
}
