<div align="center">

# ✨ ChatGPT Favorites

**Enhance your ChatGPT experience by saving important chats for quick access.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chatgpt.com)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success?style=for-the-badge)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge)](https://github.com/yourusername/chatgpt-favorites)

</div>

---

## 🚀 Overview

**ChatGPT Favorites** is a powerful Chrome extension designed to streamline your workflow on [ChatGPT](https://chatgpt.com). It seamlessly integrates into the sidebar, allowing you to mark chats as "Important" and access them instantly without searching through your history.

## ✨ Features

- **⭐ Favorites Section**: A dedicated, always-visible "Important Chats" section in the sidebar.
- **🔽 Collapsible UI**: Keep your workspace clean by collapsing the favorites list when not in use.
- **🖱️ Seamless Integration**: Add chats to favorites directly from the native three-dot context menu.
- **📂 Popup Manager**: A beautiful popup interface (shadcn/ui style) to view, manage, and clear your favorites.
- **🔄 Cross-Device Sync**: Your favorites sync automatically across all your Chrome instances.
- **🎨 Native Aesthetic**: Designed to look and feel exactly like ChatGPT, with full Dark/Light mode support.

## 📥 Installation

1.  **Clone or Download** this repository.
    ```bash
    git clone https://github.com/yourusername/chatgpt-favorites.git
    ```
2.  Open Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the `chatgpt-favorites` directory.
6.  Go to [chatgpt.com](https://chatgpt.com) and enjoy!

## 📖 Usage

### Adding a Favorite
1.  Hover over any chat in the sidebar.
2.  Click the **three dots (...)** to open the options menu.
3.  Select **✨ Add to Favorites**.
4.  The chat is instantly pinned to the top of your sidebar.

### Managing Favorites
- **Open**: Click any favorite to open it immediately in the current tab.
- **Remove**: Use the context menu again (**💔 Remove from Favorites**) or use the extension popup.
- **Popup**: Click the extension icon in your toolbar to see a list of all favorites, remove specific ones, or **Clear All**.

## 🛠️ Development

### Project Structure
| File | Description |
| :--- | :--- |
| `manifest.json` | Extension configuration (Manifest V3). |
| `content.js` | Core logic for sidebar injection and DOM observation. |
| `popup.html` | The extension popup UI structure. |
| `popup.js` | Logic for the popup manager. |
| `styles.css` | Native-like styles for the injected elements. |

### Permissions
- `storage`: For saving your favorite chats.
- `scripting` & `activeTab`: To ensure reliable DOM injection.
- **Host Permissions**: `chat.openai.com` and `chatgpt.com`.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ for the ChatGPT Community.</sub>
</div>
