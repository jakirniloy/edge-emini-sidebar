/**
 * Main Controller for the Gemini & Groq Edge Side Panel
 */

document.addEventListener('DOMContentLoaded', () => {
  // Model configurations by provider
  const PROVIDER_MODELS = {
    gemini: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Fastest, High Availability)' },
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
      { id: 'gemini-3.8-pro', name: 'Gemini 3.8 Pro (Deep Reasoning)' },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' }
    ],
    groq: [
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Ultra-Fast, Recommended)' },
      { id: 'qwen-2.5-32b', name: 'Qwen 2.5 32B' },
      { id: 'llama-3.2-11b-vision-preview', name: 'Llama 3.2 11B Vision' },
      { id: 'llama-3.2-3b-preview', name: 'Llama 3.2 3B' },
      { id: 'llama-3.2-1b-preview', name: 'Llama 3.2 1B' }
    ]
  };

  // Elements
  const activeTabTitleEl = document.getElementById('activeTabTitle');
  const togglePageContextEl = document.getElementById('togglePageContext');
  const btnRefreshContext = document.getElementById('btnRefreshContext');
  const activeModelBadge = document.getElementById('activeModelBadge');
  const quickActionsEl = document.getElementById('quickActions');
  const chatContainer = document.getElementById('chatContainer');
  const welcomeScreen = document.getElementById('welcomeScreen');
  const messagesList = document.getElementById('messagesList');
  const promptInput = document.getElementById('promptInput');
  const btnSend = document.getElementById('btnSend');
  const btnStop = document.getElementById('btnStop');
  const btnNewChat = document.getElementById('btnNewChat');
  const contextTag = document.getElementById('contextTag');
  const contextTagText = document.getElementById('contextTagText');
  const btnClearContextTag = document.getElementById('btnClearContextTag');

  // Settings Elements
  const btnSettings = document.getElementById('btnSettings');
  const settingsModal = document.getElementById('settingsModal');
  const btnCloseSettings = document.getElementById('btnCloseSettings');
  const selectProvider = document.getElementById('selectProvider');
  const labelApiKey = document.getElementById('labelApiKey');
  const linkApiKey = document.getElementById('linkApiKey');
  const inputApiKey = document.getElementById('inputApiKey');
  const helpApiKey = document.getElementById('helpApiKey');
  const btnToggleApiKeyVisibility = document.getElementById('btnToggleApiKeyVisibility');
  const selectModel = document.getElementById('selectModel');
  const inputTemperature = document.getElementById('inputTemperature');
  const tempValue = document.getElementById('tempValue');
  const inputSystemPrompt = document.getElementById('inputSystemPrompt');
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  const btnTestKey = document.getElementById('btnTestKey');
  const settingsAlert = document.getElementById('settingsAlert');
  const apiNotice = document.getElementById('apiNotice');
  const btnOpenSettingsFromNotice = document.getElementById('btnOpenSettingsFromNotice');

  // State
  let settings = {
    provider: 'gemini', // 'gemini' | 'groq'
    geminiApiKey: '',
    groqApiKey: '',
    geminiModel: 'gemini-2.0-flash',
    groqModel: 'llama-3.1-8b-instant',
    temperature: 0.7,
    systemPrompt: 'You are an intelligent, helpful AI research and browsing assistant built directly into Microsoft Edge. When webpage text is provided in the prompt, you must read and analyze that text thoroughly to answer questions, summarize, or extract insights from it. Format answers clearly using Markdown, lists, and code blocks.'
  };

  let chatHistory = []; // Array of { role: 'user'|'model', text: string }
  let activeTab = null;
  let activePageContent = null;
  let isGenerating = false;
  let overrideContext = null;

  // Initialize
  init();

  async function init() {
    loadSettings();
    setupEventListeners();
    await fetchActiveTabContext();
    checkPendingAction();

    // Listen for tab switch / update in Edge
    if (chrome.tabs) {
      chrome.tabs.onActivated.addListener(() => fetchActiveTabContext());
      chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (activeTab && tabId === activeTab.id && changeInfo.status === 'complete') {
          fetchActiveTabContext();
        }
      });
    }

    // Listen for incoming actions from background context menu
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message && message.action === 'TRIGGER_ACTION') {
          handleIncomingAction(message.data);
        }
      });
    }
  }

  // 1. Settings Management
  function loadSettings() {
    chrome.storage.local.get([
      'provider',
      'apiKey',
      'geminiApiKey',
      'groqApiKey',
      'model',
      'geminiModel',
      'groqModel',
      'temperature',
      'systemPrompt',
      'chatHistory'
    ], (res) => {
      // Backwards compatibility migration
      if (res.geminiApiKey) settings.geminiApiKey = res.geminiApiKey;
      else if (res.apiKey) settings.geminiApiKey = res.apiKey;

      if (res.groqApiKey) settings.groqApiKey = res.groqApiKey;

      if (res.provider) settings.provider = res.provider;
      if (res.geminiModel) settings.geminiModel = res.geminiModel;
      else if (res.model && !res.model.includes('llama') && !res.model.includes('mixtral')) {
        settings.geminiModel = res.model;
      }

      if (res.groqModel) settings.groqModel = res.groqModel;
      else if (res.model && (res.model.includes('llama') || res.model.includes('mixtral'))) {
        settings.groqModel = res.model;
        settings.provider = 'groq';
      }

      // Automatically migrate deprecated groq models (deepseek, mixtral, 70b-versatile)
      if (settings.groqModel.includes('deepseek') ||
          settings.groqModel.includes('mixtral') ||
          settings.groqModel.includes('70b-versatile')) {
        settings.groqModel = 'llama-3.1-8b-instant';
        chrome.storage.local.set({ groqModel: settings.groqModel });
      }

      // Automatically migrate deprecated gemini models
      if (settings.geminiModel.includes('2.5') || settings.geminiModel.includes('1.5')) {
        settings.geminiModel = 'gemini-2.0-flash';
        chrome.storage.local.set({ geminiModel: settings.geminiModel });
      }

      if (res.temperature !== undefined) settings.temperature = res.temperature;
      if (res.systemPrompt) settings.systemPrompt = res.systemPrompt;

      // Update badge
      updateModelBadge();

      // Check if current provider's API key is present
      const currentKey = getCurrentApiKey();
      if (!currentKey) {
        apiNotice.style.display = 'flex';
      } else {
        apiNotice.style.display = 'none';
      }

      // Restore chat history if exists
      if (Array.isArray(res.chatHistory) && res.chatHistory.length > 0) {
        chatHistory = res.chatHistory;
        renderHistory();
      }
    });
  }

  function getCurrentApiKey() {
    return settings.provider === 'groq' ? settings.groqApiKey : settings.geminiApiKey;
  }

  function getCurrentModel() {
    return settings.provider === 'groq' ? settings.groqModel : settings.geminiModel;
  }

  function updateModelBadge() {
    const isGroq = settings.provider === 'groq';
    const model = getCurrentModel();

    if (isGroq) {
      if (model.includes('llama-3.1-8b')) activeModelBadge.textContent = 'Groq: 8B';
      else if (model.includes('llama-3.3')) activeModelBadge.textContent = 'Groq: 70B';
      else if (model.includes('qwen')) activeModelBadge.textContent = 'Groq: Qwen';
      else if (model.includes('llama-3.2')) activeModelBadge.textContent = 'Groq: 3.2';
      else activeModelBadge.textContent = 'Groq';
    } else {
      const names = {
        'gemini-2.0-flash': 'Gemini 2.0',
        'gemini-3.8-flash': 'Gemini 3.8',
        'gemini-3.8-pro': 'Gemini 3.8 Pro',
        'gemini-2.0-flash-lite': 'Gemini Lite'
      };
      activeModelBadge.textContent = names[model] || 'Gemini';
    }
  }

  function populateModelDropdown(provider, selectedModelId, customList = null) {
    selectModel.innerHTML = '';
    const models = customList || PROVIDER_MODELS[provider] || PROVIDER_MODELS.gemini;
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      if (m.id === selectedModelId) opt.selected = true;
      selectModel.appendChild(opt);
    });
  }

  async function syncProviderFormUI(provider) {
    if (provider === 'groq') {
      labelApiKey.textContent = 'Groq API Key';
      linkApiKey.href = 'https://console.groq.com/keys';
      linkApiKey.textContent = 'Get free Groq key ↗';
      inputApiKey.placeholder = 'gsk_...';
      inputApiKey.value = settings.groqApiKey || '';
      helpApiKey.textContent = 'Stored locally and sent directly to Groq ultra-fast LPU API.';
      populateModelDropdown('groq', settings.groqModel);

      // Try fetching live available models from Groq if key exists
      if (settings.groqApiKey) {
        groqService.getAvailableModels(settings.groqApiKey).then(liveModels => {
          if (liveModels && liveModels.length > 0) {
            populateModelDropdown('groq', settings.groqModel, liveModels);
          }
        });
      }
    } else {
      labelApiKey.textContent = 'Gemini API Key';
      linkApiKey.href = 'https://aistudio.google.com/app/apikey';
      linkApiKey.textContent = 'Get free key ↗';
      inputApiKey.placeholder = 'AIzaSy...';
      inputApiKey.value = settings.geminiApiKey || '';
      helpApiKey.textContent = 'Stored locally and sent directly to Google Gemini API.';
      populateModelDropdown('gemini', settings.geminiModel);
    }
  }

  function openSettings() {
    selectProvider.value = settings.provider || 'gemini';
    syncProviderFormUI(selectProvider.value);

    inputTemperature.value = settings.temperature !== undefined ? settings.temperature : 0.7;
    tempValue.textContent = inputTemperature.value;
    inputSystemPrompt.value = settings.systemPrompt || '';
    settingsAlert.style.display = 'none';
    settingsModal.style.display = 'flex';
  }

  function closeSettings() {
    settingsModal.style.display = 'none';
  }

  function saveSettings() {
    const provider = selectProvider.value;
    const key = inputApiKey.value.trim();
    const model = selectModel.value;
    const temp = parseFloat(inputTemperature.value) || 0.7;
    const sysPrompt = inputSystemPrompt.value.trim();

    settings.provider = provider;
    settings.temperature = temp;
    settings.systemPrompt = sysPrompt;

    if (provider === 'groq') {
      settings.groqApiKey = key;
      settings.groqModel = model;
    } else {
      settings.geminiApiKey = key;
      settings.geminiModel = model;
    }

    chrome.storage.local.set({
      provider: settings.provider,
      geminiApiKey: settings.geminiApiKey,
      groqApiKey: settings.groqApiKey,
      geminiModel: settings.geminiModel,
      groqModel: settings.groqModel,
      temperature: temp,
      systemPrompt: sysPrompt
    }, () => {
      updateModelBadge();
      if (getCurrentApiKey()) {
        apiNotice.style.display = 'none';
      }
      showSettingsAlert('Settings saved successfully!', 'success');
      setTimeout(closeSettings, 800);
    });
  }

  async function testKey() {
    const key = inputApiKey.value.trim();
    const provider = selectProvider.value;
    const model = selectModel.value;

    if (!key) {
      showSettingsAlert(`Please enter a ${provider === 'groq' ? 'Groq' : 'Gemini'} API key to test.`, 'error');
      return;
    }

    btnTestKey.disabled = true;
    btnTestKey.textContent = 'Testing...';

    try {
      if (provider === 'groq') {
        await groqService.testApiKey(key);
        const liveModels = await groqService.getAvailableModels(key);
        if (liveModels && liveModels.length > 0) {
          populateModelDropdown('groq', liveModels[0].id, liveModels);
          settings.groqModel = liveModels[0].id;
          showSettingsAlert(`Groq Connected! Found ${liveModels.length} active models (Selected: ${liveModels[0].id}).`, 'success');
        } else {
          showSettingsAlert('Groq Connection successful! Key is valid and ultra-fast.', 'success');
        }
      } else {
        await geminiService.testApiKey(key, model);
        showSettingsAlert('Gemini Connection successful! API key is valid.', 'success');
      }
    } catch (err) {
      showSettingsAlert(`Connection Error: ${err.message}`, 'error');
    } finally {
      btnTestKey.disabled = false;
      btnTestKey.textContent = 'Test API Key';
    }
  }

  function showSettingsAlert(msg, type) {
    settingsAlert.textContent = msg;
    settingsAlert.className = `settings-alert ${type}`;
    settingsAlert.style.display = 'block';
  }

  // 2. Active Tab & Page Content Extraction
  async function fetchActiveTabContext() {
    try {
      let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tabs || tabs.length === 0) {
        tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      }
      if (!tabs || tabs.length === 0) return;

      activeTab = tabs[0];
      const url = activeTab.url || '';

      const isRestricted = url.startsWith('edge://') ||
                           url.startsWith('chrome://') ||
                           url.startsWith('chrome-extension://') ||
                           url.startsWith('edge-extension://') ||
                           url.startsWith('about:');

      if (isRestricted) {
        activeTabTitleEl.textContent = activeTab.title ? `${activeTab.title} (System page)` : 'Internal Browser Page';
        activePageContent = {
          success: false,
          isRestricted: true,
          url: url,
          error: 'Edge system pages cannot be read.'
        };
        updateContextTag();
        return;
      }

      activeTabTitleEl.textContent = activeTab.title || 'Untitled Page';

      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: extractPageContent
      });

      if (results && results[0] && results[0].result) {
        activePageContent = results[0].result;
        updateContextTag();
      }
    } catch (err) {
      console.warn('Failed to extract tab content:', err);
      if (activeTab) {
        activeTabTitleEl.textContent = activeTab.title || 'Active Tab';
      }
    }
  }

  function updateContextTag() {
    if (!togglePageContextEl.checked) {
      contextTag.style.display = 'none';
      return;
    }

    if (activePageContent && activePageContent.isRestricted) {
      contextTagText.textContent = '⚠️ System page (cannot read)';
      contextTag.style.display = 'inline-flex';
      contextTag.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
      contextTag.style.color = '#dc2626';
      return;
    }

    contextTag.style.backgroundColor = '';
    contextTag.style.color = '';

    if (!activePageContent || !activePageContent.success) {
      contextTag.style.display = 'none';
      return;
    }

    if (activePageContent.selectedText) {
      contextTagText.textContent = `✂️ Selection (${activePageContent.selectedText.length} chars)`;
    } else {
      const words = Math.round((activePageContent.charCount || 0) / 5);
      contextTagText.textContent = `📄 Page: ${activePageContent.title.slice(0, 22)}... (~${words} words)`;
    }
    contextTag.style.display = 'inline-flex';
  }

  // 3. Context Menu / Pending Action Handling
  function checkPendingAction() {
    chrome.storage.local.get(['pendingAction'], (res) => {
      if (res.pendingAction) {
        handleIncomingAction(res.pendingAction);
        chrome.storage.local.remove(['pendingAction']);
      }
    });
  }

  function handleIncomingAction(action) {
    if (!action) return;
    if (action.type === 'summarize_page_gemini') {
      submitUserMessage('Summarize the key points of this webpage.');
    } else if (action.type === 'ask_gemini_selection') {
      if (action.selectedText) {
        overrideContext = {
          title: action.tabTitle || 'Selected text',
          selectedText: action.selectedText
        };
        promptInput.value = `Explain this: "${action.selectedText.slice(0, 100)}..."`;
        promptInput.focus();
        updateContextTag();
      }
    }
  }

  // 4. Chat Management & Multi-Provider Streaming
  async function submitUserMessage(userText) {
    if (!userText || !userText.trim()) return;
    if (isGenerating) return;

    const apiKey = getCurrentApiKey();
    if (!apiKey) {
      openSettings();
      showSettingsAlert(`Please enter your ${settings.provider === 'groq' ? 'Groq' : 'Gemini'} API Key in settings.`, 'error');
      return;
    }

    userText = userText.trim();
    promptInput.value = '';
    resizeTextarea();

    welcomeScreen.style.display = 'none';

    // Always refresh active tab right before submitting to guarantee latest DOM
    await fetchActiveTabContext();

    // Check if user is on an internal restricted page
    const shouldIncludePage = togglePageContextEl.checked;
    if (shouldIncludePage && activePageContent && activePageContent.isRestricted) {
      appendMessage('user', userText);
      const warnBubble = appendMessage('assistant', '');
      warnBubble.innerHTML = `⚠️ <strong>Cannot read internal browser page</strong> (\`${activePageContent.url || 'edge://'}\`).<br><br>Edge security does not allow extensions to access <code>edge://</code> or browser settings pages. Please open a public website (e.g. Wikipedia, a news article, or documentation) in your tab, then ask your question again!`;
      return;
    }

    // Build context header if page context is enabled
    let contextHeader = '';

    if (shouldIncludePage) {
      if (overrideContext && overrideContext.selectedText) {
        contextHeader = `[CONTEXT - Selected Text from "${overrideContext.title}"]:\n"""\n${overrideContext.selectedText}\n"""\n\n`;
        overrideContext = null;
      } else if (activePageContent && activePageContent.success && activePageContent.cleanedText) {
        if (activePageContent.selectedText) {
          contextHeader = `[CONTEXT - Selected Text on "${activePageContent.title}" (${activePageContent.url})]:\n"""\n${activePageContent.selectedText}\n"""\n\n`;
        } else {
          contextHeader = `[DOCUMENT CONTENT FROM ACTIVE BROWSER TAB]:\nPage Title: "${activePageContent.title}"\nPage URL: ${activePageContent.url}\n\n=== BEGIN WEBPAGE CONTENT ===\n${activePageContent.cleanedText}\n=== END WEBPAGE CONTENT ===\n\n`;
        }
      }
    }

    appendMessage('user', userText);

    const fullUserPrompt = contextHeader ? `${contextHeader}[USER REQUEST]:\n${userText}` : userText;
    chatHistory.push({ role: 'user', text: fullUserPrompt });

    const assistantBubble = appendMessage('assistant', '', true);
    setGeneratingState(true);

    try {
      let responseText = '';

      if (settings.provider === 'groq') {
        const messages = [];
        const systemInstruction = settings.systemPrompt || 'You are an AI assistant built into Microsoft Edge. When provided with [DOCUMENT CONTENT FROM ACTIVE BROWSER TAB], you must read that content and directly answer the user request based on the page text.';
        messages.push({ role: 'system', content: systemInstruction });

        for (let i = 0; i < chatHistory.length - 1; i++) {
          const m = chatHistory[i];
          messages.push({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text
          });
        }
        messages.push({ role: 'user', content: fullUserPrompt });

        responseText = await groqService.streamChat({
          apiKey: settings.groqApiKey,
          model: settings.groqModel || 'llama-3.3-70b-versatile',
          messages: messages,
          temperature: settings.temperature,
          onChunk: (accumulated) => {
            assistantBubble.innerHTML = MarkdownRenderer.render(accumulated);
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        });
      } else {
        // Build Gemini contents payload
        const contents = [];
        for (let i = 0; i < chatHistory.length - 1; i++) {
          const m = chatHistory[i];
          contents.push({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
          });
        }
        contents.push({
          role: 'user',
          parts: [{ text: fullUserPrompt }]
        });

        responseText = await geminiService.streamChat({
          apiKey: settings.geminiApiKey,
          model: settings.geminiModel || 'gemini-2.0-flash',
          contents: contents,
          systemPrompt: settings.systemPrompt,
          temperature: settings.temperature,
          onChunk: (accumulated) => {
            assistantBubble.innerHTML = MarkdownRenderer.render(accumulated);
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        });
      }

      assistantBubble.classList.remove('typing-cursor');
      assistantBubble.innerHTML = MarkdownRenderer.render(responseText);
      chatHistory.push({ role: 'model', text: responseText });

      if (chatHistory.length > 20) {
        chatHistory = chatHistory.slice(-20);
      }
      chrome.storage.local.set({ chatHistory });
    } catch (err) {
      assistantBubble.classList.remove('typing-cursor');
      assistantBubble.innerHTML = `<span style="color: var(--danger-color);">⚠️ ${MarkdownRenderer.escapeHtml(err.message)}</span>`;
      chatHistory.pop();
    } finally {
      setGeneratingState(false);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  function appendMessage(role, text, isStreaming = false) {
    const msgWrapper = document.createElement('div');
    msgWrapper.className = `message ${role}`;

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${isStreaming ? 'typing-cursor' : ''}`;

    if (role === 'user') {
      bubble.textContent = text;
    } else {
      bubble.innerHTML = MarkdownRenderer.render(text);
    }

    msgWrapper.appendChild(bubble);
    messagesList.appendChild(msgWrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return bubble;
  }

  function renderHistory() {
    if (chatHistory.length === 0) {
      welcomeScreen.style.display = 'flex';
      messagesList.innerHTML = '';
      return;
    }

    welcomeScreen.style.display = 'none';
    messagesList.innerHTML = '';

    chatHistory.forEach(msg => {
      let displayText = msg.text;
      if (msg.role === 'user' && displayText.includes('[USER QUERY]:\n')) {
        displayText = displayText.split('[USER QUERY]:\n')[1] || displayText;
      }
      appendMessage(msg.role === 'user' ? 'user' : 'assistant', displayText);
    });

    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function clearHistory() {
    chatHistory = [];
    chrome.storage.local.remove(['chatHistory'], () => {
      renderHistory();
    });
  }

  function setGeneratingState(generating) {
    isGenerating = generating;
    if (generating) {
      btnSend.style.display = 'none';
      btnStop.style.display = 'flex';
    } else {
      btnSend.style.display = 'flex';
      btnStop.style.display = 'none';
    }
  }

  // 5. Event Listeners
  function setupEventListeners() {
    btnSend.addEventListener('click', () => {
      submitUserMessage(promptInput.value);
    });

    btnStop.addEventListener('click', () => {
      if (geminiService) geminiService.abort();
      if (groqService) groqService.abort();
    });

    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitUserMessage(promptInput.value);
      }
    });

    promptInput.addEventListener('input', resizeTextarea);

    btnNewChat.addEventListener('click', () => {
      if (chatHistory.length > 0 && confirm('Start a new conversation and clear chat history?')) {
        clearHistory();
      }
    });

    quickActionsEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip && chip.dataset.prompt) {
        submitUserMessage(chip.dataset.prompt);
      }
    });

    btnRefreshContext.addEventListener('click', async () => {
      btnRefreshContext.style.transform = 'rotate(180deg)';
      btnRefreshContext.style.transition = 'transform 0.3s ease';
      await fetchActiveTabContext();
      setTimeout(() => {
        btnRefreshContext.style.transform = 'none';
      }, 300);
    });

    togglePageContextEl.addEventListener('change', () => {
      updateContextTag();
    });

    btnClearContextTag.addEventListener('click', () => {
      togglePageContextEl.checked = false;
      updateContextTag();
    });

    // Provider switcher in settings
    selectProvider.addEventListener('change', () => {
      syncProviderFormUI(selectProvider.value);
    });

    // Settings Modal
    btnSettings.addEventListener('click', openSettings);
    btnCloseSettings.addEventListener('click', closeSettings);
    btnSaveSettings.addEventListener('click', saveSettings);
    btnTestKey.addEventListener('click', testKey);
    btnOpenSettingsFromNotice.addEventListener('click', openSettings);

    inputTemperature.addEventListener('input', () => {
      tempValue.textContent = inputTemperature.value;
    });

    btnToggleApiKeyVisibility.addEventListener('click', () => {
      if (inputApiKey.type === 'password') {
        inputApiKey.type = 'text';
        btnToggleApiKeyVisibility.textContent = '🔒';
      } else {
        inputApiKey.type = 'password';
        btnToggleApiKeyVisibility.textContent = '👁️';
      }
    });

    // Code copy buttons
    document.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('.copy-code-btn');
      if (copyBtn) {
        const rawCode = decodeURIComponent(copyBtn.dataset.code || '');
        navigator.clipboard.writeText(rawCode).then(() => {
          const originalHtml = copyBtn.innerHTML;
          copyBtn.innerHTML = `<span>Copied!</span>`;
          copyBtn.style.color = '#10b981';
          setTimeout(() => {
            copyBtn.innerHTML = originalHtml;
            copyBtn.style.color = '';
          }, 1500);
        }).catch(err => {
          console.error('Failed to copy code:', err);
        });
      }
    });
  }

  function resizeTextarea() {
    promptInput.style.height = 'auto';
    promptInput.style.height = Math.min(promptInput.scrollHeight, 140) + 'px';
  }
});
