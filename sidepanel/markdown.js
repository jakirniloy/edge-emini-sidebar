/**
 * Lightweight, secure Markdown renderer for the Gemini Side Panel.
 * Converts markdown text to formatted HTML with code block copy buttons.
 */

const MarkdownRenderer = {
  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  render(markdown) {
    if (!markdown) return '';

    // First preserve code blocks so internal markdown is not processed
    const codeBlocks = [];
    let text = markdown.replace(/```([a-zA-Z0-9_\-+#]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const id = codeBlocks.length;
      codeBlocks.push({
        lang: lang ? lang.trim() : 'text',
        code: code.replace(/\n$/, '')
      });
      return `__CODE_BLOCK_${id}__`;
    });

    // Escape HTML of the remaining text
    text = this.escapeHtml(text);

    // Blockquotes: lines starting with >
    text = text.replace(/^>\s?(.*)$/gm, '<blockquote>$1</blockquote>');
    // Group consecutive blockquotes
    text = text.replace(/<\/blockquote>\n<blockquote>/g, '\n');

    // Headings
    text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold & Italics
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
    text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // Inline code: `code`
    text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Links: [text](url)
    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Unordered lists (- or *)
    text = text.replace(/^[\*\-]\s+(.*)$/gim, '<li>$1</li>');
    // Numbered lists (1. )
    text = text.replace(/^\d+\.\s+(.*)$/gim, '<li class="numbered">$1</li>');

    // Wrap consecutive <li> into <ul> or <ol>
    text = text.replace(/(<li class="numbered">[\s\S]*?<\/li>)(?!\s*<li class="numbered">)/gi, '<ol>$1</ol>');
    text = text.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/gi, '<ul>$1</ul>');
    text = text.replace(/<\/ol>\s*<ol>/gi, '');
    text = text.replace(/<\/ul>\s*<ul>/gi, '');

    // Paragraphs / Linebreaks
    const paragraphs = text.split(/\n\s*\n/);
    text = paragraphs.map(p => {
      p = p.trim();
      if (!p) return '';
      if (/^<(h[1-6]|ul|ol|blockquote|div|table)/i.test(p)) {
        return p;
      }
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).filter(Boolean).join('\n');

    // Restore Code Blocks with copy buttons
    codeBlocks.forEach((item, index) => {
      const escapedCode = this.escapeHtml(item.code);
      const codeHtml = `
        <div class="code-block-wrapper">
          <div class="code-header">
            <span class="code-lang">${item.lang}</span>
            <button class="copy-code-btn" type="button" data-code="${encodeURIComponent(item.code)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            </button>
          </div>
          <pre><code class="language-${item.lang}">${escapedCode}</code></pre>
        </div>`;
      text = text.replace(`__CODE_BLOCK_${index}__`, codeHtml);
    });

    return text;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkdownRenderer;
}
