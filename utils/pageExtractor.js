/**
 * Page content extractor utility.
 * Designed to be executed in the target web page context via chrome.scripting.executeScript.
 */

function extractPageContent() {
  try {
    // 1. Check for any current user-selected text
    const selectedText = window.getSelection() ? window.getSelection().toString().trim() : '';

    // 2. Metadata
    const title = document.title || 'Untitled Page';
    const url = window.location.href;
    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const author = document.querySelector('meta[name="author"]')?.getAttribute('content') || '';

    // 3. Find primary content container if possible (article, main, or fallback to body)
    const container = document.querySelector('article') ||
                      document.querySelector('main') ||
                      document.querySelector('[role="main"]') ||
                      document.querySelector('.main-content') ||
                      document.querySelector('#content') ||
                      document.body;

    if (!container) {
      return {
        success: false,
        error: 'Unable to access page body.',
        title,
        url,
        selectedText
      };
    }

    // 4. Clone container to safely sanitize without altering the live DOM
    const clone = container.cloneNode(true);

    // Tags to remove
    const tagsToRemove = [
      'script', 'style', 'noscript', 'svg', 'canvas',
      'nav', 'footer', 'header', 'aside', 'iframe',
      'form', 'button', 'select', 'textarea',
      '[aria-hidden="true"]', '.ad', '.ads', '.advertisement',
      '.cookie-banner', '#cookie-banner', '.newsletter'
    ];

    tagsToRemove.forEach(selector => {
      try {
        const elements = clone.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      } catch (e) {
        // ignore selector syntax errors if any
      }
    });

    // 5. Extract readable text preserving reasonable paragraph breaks
    let rawText = '';
    const textNodes = clone.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, td, th');

    if (textNodes.length > 0) {
      const parts = [];
      textNodes.forEach(node => {
        const t = (node.innerText || node.textContent || '').trim();
        if (t.length > 0) {
          parts.push(t);
        }
      });
      rawText = parts.join('\n\n');
    } else {
      rawText = clone.innerText || clone.textContent || '';
    }

    // 6. Clean up excessive whitespace & multiple blank lines
    let cleanedText = rawText
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();

    // Fallback: If filtered text is too short, extract direct body innerText
    if (!cleanedText || cleanedText.length < 50) {
      const bodyText = document.body ? (document.body.innerText || document.body.textContent || '') : '';
      cleanedText = bodyText
        .replace(/[ \t]+/g, ' ')
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .trim();
    }

    // 7. Safe length limit (approx 16,000 characters / ~4,000 words)
    const MAX_CHARS = 16000;
    let isTruncated = false;
    if (cleanedText.length > MAX_CHARS) {
      cleanedText = cleanedText.slice(0, MAX_CHARS) + '\n\n... [Content truncated for length]';
      isTruncated = true;
    }

    return {
      success: true,
      title,
      url,
      metaDescription: metaDesc,
      author,
      selectedText,
      cleanedText,
      charCount: cleanedText.length,
      isTruncated
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Error extracting content',
      title: document.title || '',
      url: window.location.href,
      selectedText: window.getSelection() ? window.getSelection().toString().trim() : ''
    };
  }
}

// For use when imported or bundled
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { extractPageContent };
}
