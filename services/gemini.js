/**
 * Gemini API Client Service supporting streaming, auto-retry, and high-demand fallback.
 */

class GeminiService {
  constructor() {
    this.abortController = null;
    this.fallbackChain = {
      'gemini-3.8-flash': ['gemini-2.0-flash', 'gemini-2.0-flash-lite'],
      'gemini-2.0-flash': ['gemini-3.8-flash', 'gemini-2.0-flash-lite'],
      'gemini-3.8-pro': ['gemini-2.0-flash', 'gemini-3.8-flash'],
      'gemini-2.0-flash-lite': ['gemini-2.0-flash', 'gemini-3.8-flash']
    };
  }

  /**
   * Stream a response from Google Gemini API with intelligent high-demand handling.
   */
  async streamChat({
    apiKey,
    model = 'gemini-3.8-flash',
    contents,
    systemPrompt = '',
    temperature = 0.7,
    onChunk
  }) {
    if (!apiKey) {
      throw new Error('Gemini API Key is missing. Please set your API key in Settings.');
    }

    // Try primary model, retry on high demand, and fallback if necessary
    const modelsToTry = [model, ...(this.fallbackChain[model] || ['gemini-2.0-flash'])];
    let lastError = null;

    for (let i = 0; i < modelsToTry.length; i++) {
      const currentModel = modelsToTry[i];
      try {
        return await this._executeStreamRequest({
          apiKey,
          model: currentModel,
          contents,
          systemPrompt,
          temperature,
          onChunk
        });
      } catch (err) {
        lastError = err;
        const msg = (err.message || '').toLowerCase();
        const isHighDemand = msg.includes('high demand') ||
                             msg.includes('overloaded') ||
                             msg.includes('temporarily') ||
                             msg.includes('503') ||
                             msg.includes('resource_exhausted');

        // If user manually stopped generation, do not retry
        if (msg.includes('stopped by user')) {
          throw err;
        }

        // If high demand and we have fallback models, retry after brief delay
        if (isHighDemand && i < modelsToTry.length - 1) {
          console.warn(`Model ${currentModel} under high demand. Trying backup model ${modelsToTry[i + 1]}...`);
          await new Promise(r => setTimeout(r, 1200));
          continue;
        }

        throw err;
      }
    }

    throw lastError || new Error('Failed to generate response.');
  }

  async _executeStreamRequest({
    apiKey,
    model,
    contents,
    systemPrompt,
    temperature,
    onChunk
  }) {
    this.abortController = new AbortController();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${encodeURIComponent(apiKey)}&alt=sse`;

    const requestBody = {
      contents: contents,
      generationConfig: {
        temperature: parseFloat(temperature) || 0.7,
        maxOutputTokens: 8192
      }
    };

    if (systemPrompt && systemPrompt.trim()) {
      requestBody.systemInstruction = {
        parts: [{ text: systemPrompt.trim() }]
      };
    }

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: this.abortController.signal
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Generation stopped by user.');
      }
      throw new Error(`Network error connecting to Gemini API: ${err.message}`);
    }

    if (!response.ok) {
      let errorMsg = `Gemini API returned status ${response.status} (${response.statusText})`;
      try {
        const errJson = await response.json();
        if (errJson.error && errJson.error.message) {
          errorMsg = `Gemini Error: ${errJson.error.message}`;
        }
      } catch (e) {
        // fallback
      }

      if (response.status === 400 && errorMsg.toLowerCase().includes('key')) {
        errorMsg = 'Invalid Gemini API Key. Please verify your API key in the extension settings.';
      } else if (response.status === 429) {
        errorMsg = 'Gemini rate limit exceeded. Please wait a moment before asking again.';
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

          const jsonStr = trimmed.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            const candidates = data.candidates;
            if (candidates && candidates.length > 0) {
              const parts = candidates[0]?.content?.parts;
              if (parts && parts.length > 0) {
                for (const part of parts) {
                  if (part.text) {
                    accumulatedText += part.text;
                    if (typeof onChunk === 'function') {
                      onChunk(accumulatedText, part.text);
                    }
                  }
                }
              }
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE JSON chunk:', jsonStr, parseError);
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
   * Helper to validate an API key with fallback support
   */
  async testApiKey(apiKey, preferredModel = 'gemini-2.0-flash') {
    const testModels = [preferredModel, 'gemini-2.0-flash', 'gemini-3.8-flash'];
    let lastError = null;

    for (const m of testModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: 'Hi' }] }]
          })
        });

        if (response.ok) {
          return true;
        }

        const err = await response.json().catch(() => ({}));
        lastError = new Error(err.error?.message || `HTTP ${response.status}`);
      } catch (e) {
        lastError = e;
      }
    }

    throw lastError || new Error('Connection failed.');
  }
}

// Singleton instance
const geminiService = new GeminiService();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GeminiService, geminiService };
}
