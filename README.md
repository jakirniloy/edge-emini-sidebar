# Gemini Sidebar for Microsoft Edge

> **Created by Jakir Hossain**

A modern, fast AI assistant extension built natively for Microsoft Edge using Google's Gemini models and Groq's ultra-fast LPU inference via Chromium's Manifest V3 `sidePanel` API.

---

## ✨ Features

- **Multi-Provider Support (Gemini & Groq)**: Seamlessly switch between Google Gemini and Groq's ultra-fast LPU inference directly from settings.
- **Groq Models Supported**:
  - `llama-3.3-70b-versatile` (Top recommendation: 70B, blazing fast, highly intelligent)
  - `llama-3.1-8b-instant` (Instant response times)
  - `deepseek-r1-distill-llama-70b` (Deep analytical reasoning)
  - `mixtral-8x7b-32768` (32k long context)
  - `gemma2-9b-it`
- **Google Gemini Models Supported**:
  - `gemini-2.0-flash` (Fastest, high availability)
  - `gemini-3.8-flash` & `gemini-3.8-pro`
  - `gemini-2.0-flash-lite`
- **Native Edge Side Panel**: Stays open side-by-side with your browsing session without covering or obscuring your tabs.
- **Active Web Page Reading**: Automatically reads and extracts clean readable text, title, URL, and metadata from the active tab.
- **Selected Text Context**: Highlight any text on any webpage to immediately ask questions about it.
- **Context Menus**: Right-click on any highlighted text to *"Ask Gemini about '...'"* or right-click anywhere to *"Summarize page with Gemini"*.
- **Live Streaming**: Real-time streaming token generation via Server-Sent Events (SSE).
- **Markdown & Code Highlighting**: Renders headers, lists, links, blockquotes, and preformatted code blocks with one-click **Copy** buttons.
- **Quick Action Pills**: One-click actions for *📝 Summarize*, *💡 Key Takeaways*, *❓ Generate FAQ*, and *🔍 Explain Selection*.

---

## 🚀 How to Install in Microsoft Edge

1. Open **Microsoft Edge**.
2. In the address bar, type `edge://extensions` and press **Enter**.
3. In the left-hand sidebar, toggle **Developer mode** to **ON**.
4. Click the **Load unpacked** button at the top of the page.
5. Browse to and select this folder:
   ```
   C:\Users\user\.gemini\antigravity\scratch\edge-gemini-sidebar
   ```
6. The extension is now loaded! Pin it to your toolbar for instant access.

---

## 🔑 Setup Your API Key (Gemini or Groq)

1. Open the sidebar and click the **⚙️ Settings** icon in the top right.
2. Select your **AI Provider**:
   - **Groq (Ultra-Fast LPU)**:
     - Click **[Get free Groq key ↗](https://console.groq.com/keys)**.
     - Sign up/in and click **Create API Key**.
     - Paste the key (`gsk_...`) and select **Llama 3.3 70B**!
   - **Google Gemini**:
     - Click **[Get free key ↗](https://aistudio.google.com/app/apikey)**.
     - Sign in and copy your Gemini API key.
3. Click **Test API Key** to verify, then click **Save Settings**.

---

## 📖 How to Use

### 1. Summarizing or Asking Questions About a Webpage
- Navigate to any news article, documentation page, or blog post in Edge.
- Notice the active tab banner at the top of the sidebar displaying the current page title and word count.
- Click **📝 Summarize** or simply type your question in the chat box (e.g. *"What are the key conclusions?"*).
- If you ever want to chat with Gemini *without* including the webpage context, simply uncheck the **"Use page"** toggle or click the **✕** on the context tag.

### 2. Asking About Specific Text
- Highlight any paragraph, sentence, or technical phrase on a webpage.
- Right-click the highlighted text and select **Ask Gemini about "..."**.
- The side panel will open and load your selection into context so Gemini can explain or analyze it.

### 3. Starting a New Conversation
- Click the **+** (New Chat) icon in the header to clear conversation history and reset the chat.

---

## 📁 File Structure

```
edge-gemini-sidebar/
├── manifest.json              # Extension manifest (V3, sidePanel, activeTab, scripting)
├── background.js              # Service worker handling side panel activation & context menus
├── create_icons.py            # Utility script that generates extension icons
├── icons/                     # Icons in 16x16, 32x32, 48x48, 128x128 sizes
├── services/
│   └── gemini.js              # Streaming Gemini API client with SSE support
├── utils/
│   └── pageExtractor.js       # Injected script to safely extract clean page body & selection
└── sidepanel/
    ├── sidepanel.html         # Side panel interface layout
    ├── sidepanel.css          # Modern Fluent/Edge UI styling (dark & light mode support)
    ├── sidepanel.js           # UI logic, active tab synchronization, and chat handler
    └── markdown.js            # Lightweight Markdown parser with code copy buttons
```

---

## 👨‍💻 Author

**Created by Jakir Hossain**

