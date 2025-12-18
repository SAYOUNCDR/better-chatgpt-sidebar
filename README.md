<div align="center">

# ✨ ChatGPT Favorites

**Enhance your ChatGPT experience by saving important chats for quick access.**

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chatgpt.com)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success?style=for-the-badge)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE.md)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge)](https://github.com/yourusername/chatgpt-favorites)

</div>

---

## 🚀 Overview

**ChatGPT Favorites** is a powerful Chrome extension designed to streamline your workflow on [ChatGPT](https://chatgpt.com). It seamlessly integrates into the sidebar, allowing you to organize chats into folders, mark them as "Important", and access them instantly without searching through your history.

## ✨ Features

### 🗂️ Advanced Organization

- **⭐ Favorites Section**: A dedicated, always-visible "Important Chats" section in the sidebar.
- **📂 Folders**: Create custom folders to categorize your chats with custom names, emoji icons, and color indicators.
- **🔽 Collapsible UI**: Keep your workspace clean by collapsing folders or the entire favorites list when not in use.

### 🖱️ Drag and Drop

- **🔄 Seamless Reordering**: Drag and drop to reorder folders and favorites.
- **↔️ Cross-Folder Movement**: Move chats between folders or to the root list simply by dragging them.
- **🎯 Intuitive Drop Targets**: Drop onto a folder header or into the list to move items.

### ⚡ Quick Actions

- **🖱️ Context Menu Integration**: Add chats to favorites directly from the native three-dot context menu.
- **🧠 Smart Selection**: When adding a favorite, a modal lets you instantly choose the destination folder.
- **🗑️ One-Click Delete**: Easily remove favorites or folders with a dedicated trash icon.

### 🎨 Modern UI

- **🌑 Native Aesthetic**: Designed with a sleek, dark-themed aesthetic inspired by **shadcn/ui**.
- **✨ Visual Feedback**: Smooth transitions, hover effects, and drag-and-drop visual cues.
- **🎨 Color Coding**: Folders feature a color strip for quick visual identification.

### ☁️ Sync & Storage

- **🔄 Cross-Device Sync**: Your favorites and folders sync automatically across all your Chrome instances.

## 📥 Installation

1.  **Prepare Local Directory**:

    - Open your terminal (Command Prompt, PowerShell, or Terminal).
    - Navigate to the folder where you want to save the project:
      ```bash
      cd Documents
      ```

2.  **Clone the Repository**:

    - Run the following command to clone the project:
      ```bash
      git clone https://github.com/yourusername/chatgpt-favorites.git
      ```
    - _Alternatively, you can download the ZIP file from GitHub and extract it._

3.  **Load into Chrome**:

    - Open Google Chrome and type `chrome://extensions` in the address bar.
    - Enable **Developer mode** using the toggle switch in the top right corner.
    - Click the **Load unpacked** button that appears in the top left.
    - Select the `chatgpt-favorites` folder you just cloned (or extracted).

4.  **Verify**:
    - Go to [chatgpt.com](https://chatgpt.com).
    - You should now see the **Important Chats** section in your sidebar!

## 📖 Usage

### Adding a Favorite

1.  Hover over any chat in the sidebar.
2.  Click the **three dots (...)** to open the options menu.
3.  Select **✨ Add to Favorites**.
4.  Choose a destination folder from the popup modal (if you have folders created).

### Managing Folders

1.  Click the **New Folder** icon in the "Important Chats" header.
2.  Give it a name, an emoji icon, and pick a color.
3.  Drag chats into the folder to organize them.

### Managing Favorites

- **Open**: Click any favorite to open it immediately.
- **Reorder**: Drag and drop items to arrange them how you like.
- **Remove**: Click the **Trash** icon next to any item to remove it.

## 🛠️ Development

### Project Structure

| File            | Description                                                        |
| :-------------- | :----------------------------------------------------------------- |
| `manifest.json` | Extension configuration (Manifest V3).                             |
| `content.js`    | Core logic for sidebar injection, folder management, and DnD.      |
| `styles.css`    | Native-like styles (shadcn/ui inspired) for the injected elements. |

### Permissions

- `storage`: For saving your favorite chats and folders.
- `activeTab`: To ensure reliable DOM injection.
- **Host Permissions**: `chat.openai.com` and `chatgpt.com`.

## � Privacy Policy

We respect your privacy. You can view our full privacy policy [here](https://sayouncdr.github.io/extension-privacy-policy/).

For more details, check the [Privacy Policy Repository](https://github.com/SAYOUNCDR/extension-privacy-policy).

## �📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE.md) file for details.

---

<div align="center">
  <sub>Built with ❤️ for the ChatGPT Community.</sub>
</div>
