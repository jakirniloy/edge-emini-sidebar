// Background service worker for Gemini Edge Sidebar

// Set the side panel to open when the user clicks the extension toolbar action icon
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn('Failed to set side panel behavior:', err);
    });
  }

  // Create right-click context menu options
  chrome.contextMenus.create({
    id: 'ask_gemini_selection',
    title: 'Ask Gemini about "%s"',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'summarize_page_gemini',
    title: 'Summarize page with Gemini',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;

  try {
    // Open the side panel in the current window
    if (chrome.sidePanel && chrome.sidePanel.open) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }

    // Save pending action to storage for the side panel to pick up
    const pendingAction = {
      type: info.menuItemId,
      selectedText: info.selectionText || '',
      tabId: tab.id,
      tabUrl: tab.url,
      tabTitle: tab.title,
      timestamp: Date.now()
    };

    await chrome.storage.local.set({ pendingAction });

    // Also broadcast message in case sidepanel is already open
    chrome.runtime.sendMessage({
      action: 'TRIGGER_ACTION',
      data: pendingAction
    }).catch(() => {
      // Ignored if sidepanel is not yet listening; it will read from storage on launch
    });
  } catch (error) {
    console.error('Error handling context menu click:', error);
  }
});
