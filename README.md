<div align="center">

# 🌟 Gemini & Groq AI Sidebar for Microsoft Edge

### *Your Smart, Lightning-Fast AI Research & Browsing Companion*

[![Microsoft Edge](https://img.shields.io/badge/Microsoft%20Edge-Extension%20MV3-0078D7?logo=microsoftedge&logoColor=white)](https://microsoft.com/edge)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.0%20Flash-4285F4?logo=google&logoColor=white)](https://aistudio.google.com/)
[![Groq LPU](https://img.shields.io/badge/Groq-Ultra--Fast%20LPU-F55036?logo=lightning&logoColor=white)](https://groq.com/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Author](https://img.shields.io/badge/Created%20By-Jakir%20Hossain-blueviolet?style=flat&logo=github)](https://github.com/jakirniloy)

<p align="center">
  <b>Read, summarize, analyze, and chat with ANY webpage right inside Microsoft Edge's native sidebar.</b><br>
  Powered by Google's Gemini models and Groq's blazing-fast LPUs.
</p>

---

</div>

## ⚡ Highlights

| Feature | Description |
| :--- | :--- |
| 🪟 **Native Side Panel** | Lives directly in Edge's sidebar — zero tab-switching or screen clutter |
| 📄 **Active Webpage Reading** | Extracts live article text, metadata, and tables with one click |
| ✂️ **Selection Aware** | Highlight any text on any page to explain, translate, or fact-check |
| ⚡ **Groq Ultra-Fast Speed** | Real-time streaming at 300–500+ tokens/second with Groq LPU models |
| 🧠 **Google Gemini 2.0 & 3.8** | Deep multimodal intelligence and huge context windows |
| 📋 **Markdown & Code Copy** | Beautiful code blocks with one-click syntax copy buttons |
| 🔒 **100% Private & Local** | Your API keys stay in your browser; direct client-to-API communication |

---

## 🚀 How to Install in Microsoft Edge (Step-by-Step)

Anyone can install and run this extension in **less than 60 seconds**!

### Step 1: Get the Code

Choose **either** option below:

* **Option A (Quick Download - Recommended):**
  1. Click the green **Code** button at the top of this GitHub repository.
  2. Click **Download ZIP** ([or click here to download](https://github.com/jakirniloy/edge-emini-sidebar/archive/refs/heads/main.zip)).
  3. Extract the downloaded `.zip` file onto your computer (e.g. into your `Documents` or `Downloads` folder).

* **Option B (Using Git):**
  ```bash
  git clone https://github.com/jakirniloy/edge-emini-sidebar.git
  ```

---

### Step 2: Load into Microsoft Edge

1. Open **Microsoft Edge**.
2. In the address bar, type:
   ```text
   edge://extensions
   ```
   and press **Enter**.
3. In the left-hand sidebar, turn the **Developer mode** toggle **ON** (it turns blue).
4. Click the **Load unpacked** button that appears at the top.
5. In the file picker, select the extracted `edge-emini-sidebar` folder.
6. 🎉 **Done!** The extension is loaded!

---

### Step 3: Pin for 1-Click Access

1. Click the **Extensions puzzle piece** icon in Edge's top-right toolbar.
2. Find **Gemini Sidebar for Microsoft Edge** and click the **Show in toolbar (Eye icon)** to pin it.

---

## 🔑 Setup Your Free API Key (Gemini or Groq)

The extension supports both **Google Gemini** and **Groq**. Both provide generous free tiers:

1. Click the **Gemini Sidebar** icon in your toolbar to open the side panel.
2. Click the **⚙️ Settings** icon in the top right.
3. Choose your preferred AI Provider:

### Option A: Groq (Recommended for Extreme Speed ⚡)
- Click **[Get free Groq key ↗](https://console.groq.com/keys)**
- Create an API key (`gsk_...`) and paste it into the **Groq API Key** box.
- Click **Test API Key** — it will automatically discover and load active models like **Llama 3.1 8B Instant**!

### Option B: Google Gemini
- Click **[Get free Gemini key ↗](https://aistudio.google.com/app/apikey)**
- Generate your free key and paste it into the **Gemini API Key** box.
- Select **Gemini 2.0 Flash** or **Gemini 3.8 Flash**.

4. Click **Save Settings**!

---

## 💡 How to Use

### 1. Summarize Any Webpage
- Open any article, documentation, or news story in Edge.
- Click **📝 Summarize** in the sidebar.
- Gemini/Groq reads the page and generates clean, bulleted insights in seconds!

### 2. Ask About Highlighted Text
- Highlight any sentence, paragraph, or code snippet on any webpage.
- Right-click and choose **Ask Gemini about "..."**.
- The sidebar immediately opens with your selection loaded into context!

### 3. Generate FAQs & Key Takeaways
- Use the quick action pills:
  - **💡 Key Takeaways**: Extracts the core thesis and arguments.
  - **❓ Generate FAQ**: Builds a Q&A list based on the article.
  - **🔍 Explain Selection**: Simplifies technical jargon with clear examples.

### 4. General Chat (Without Webpage Context)
- Want to ask a general question without attaching the webpage?
- Simply toggle off **"Use page"** at the top of the sidebar.

---

## 🤖 Supported Models

### Groq LPU Models:
* **`llama-3.1-8b-instant`** *(Default, ultra-fast responses)*
* **`qwen-2.5-32b`** *(Multilingual, strong coding)*
* **`llama-3.2-11b-vision`** & **`llama-3.2-3b`**
* *Automatic Live Discovery*: Automatically queries your account for all available models!

### Google Gemini Models:
* **`gemini-2.0-flash`** *(High-availability workhorse)*
* **`gemini-3.8-flash`** & **`gemini-3.8-pro`**
* **`gemini-2.0-flash-lite`**
* *High-Demand Auto-Fallback*: Automatically retries and falls back during traffic spikes.

---

## 📁 Repository Structure

```
edge-emini-sidebar/
├── manifest.json              # Manifest V3 configuration & permissions
├── background.js              # Background service worker & context menus
├── create_icons.py            # Utility to generate extension icons
├── icons/                     # Extension icons (16px, 32px, 48px, 128px)
├── services/
│   ├── gemini.js              # Gemini streaming client with auto-retry
│   └── groq.js                # Groq streaming client with dynamic model discovery
├── utils/
│   └── pageExtractor.js       # Injected content extractor with DOM sanitation
└── sidepanel/
    ├── sidepanel.html         # Sidebar UI layout & settings modal
    ├── sidepanel.css          # Microsoft Fluent design (light & dark adaptive)
    ├── sidepanel.js           # Main controller, context sync & chat handler
    └── markdown.js            # Secure markdown renderer with code copy
```

---

## 👨‍💻 Author

<div align="center">

### **Developed by Jakir Hossain**

[![GitHub](https://img.shields.io/badge/GitHub-jakirniloy-181717?style=for-the-badge&logo=github)](https://github.com/jakirniloy)

If you find this extension helpful, please give it a **⭐ Star** on [GitHub](https://github.com/jakirniloy/edge-emini-sidebar)!

</div>

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
