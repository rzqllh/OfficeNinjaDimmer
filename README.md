# Office Ninja Pro 🥷

A premium Chrome extension for screen dimming and privacy in open-office environments. Stay productive (or at least look like it) with customizable dimming, blur effects, tab disguise, and emergency escape features.

![Version](https://img.shields.io/badge/version-3.2-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-green)
![License](https://img.shields.io/badge/license-MIT-brightgreen)

## ✨ Features

### Core Features
- **Screen Dimming** - Adjustable opacity overlay (0-95%)
- **Blur Effect** - Backdrop blur for extra privacy (0-20px)
- **Grayscale Mode** - Desaturate the page for less distraction
- **Color Themes** - Black, Midnight Blue, Forest Green, Sepia overlays

### 🎭 Tab Disguise
Instantly change your tab to look like work apps:
| Disguise | Appears As |
|----------|------------|
| 📊 Sheets | "Q4 Budget Analysis - Google Sheets" |
| 📧 Gmail | "Inbox (3) - Gmail" |
| 📝 Docs | "Meeting Notes - Google Docs" |
| 📅 Calendar | "Team Sync - Google Calendar" |

### 🎭 Decoy Tabs
Auto-open productive-looking tabs when panic mode triggers. Configure which tabs to open in Settings.

### 🚀 Quick Presets
- **Night Mode** - Dim 60%, Blur 2px
- **Focus Mode** - Dim 40%, Blur 5px, Grayscale
- **Office Stealth** - Dim 80%, Blur 3px

### ⌨️ Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Alt+Shift+S` | Toggle Stealth Mode |
| `Alt+Shift+B` | Boss Key (Emergency Escape + Decoy Tabs) |

### Additional Features
- **Floating Widget** - Draggable control on any page
- **Per-Site Settings** - Custom configs for different websites
- **Usage Statistics** - Track your stealth time
- **Chrome Sync** - Settings sync across devices

## 📦 Installation

### From Source
1. Clone this repository
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `OfficeNinjaDimmer` folder

### From Chrome Web Store
*Coming soon*

## 🎮 Usage

1. Click the 🥷 extension icon
2. Use sliders to adjust dim and blur levels
3. Click presets for quick settings
4. Use Tab Disguise buttons to camouflage your tab
5. Press `Alt+Shift+B` for emergency escape

## 📁 Project Structure

```
OfficeNinjaDimmer/
├── manifest.json          # Extension manifest v3
├── icons/                 # Extension icons
├── popup/                 # Popup UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── content/               # Content scripts
│   ├── content.js
│   └── widget.css
├── background/            # Service worker
│   └── background.js
├── options/               # Settings page
│   ├── options.html
│   ├── options.css
│   └── options.js
└── utils/                 # Shared utilities
    └── storage.js
```

## 🛡️ Permissions

- `activeTab` - Access current tab for effects
- `scripting` - Inject content scripts
- `storage` - Save settings and statistics

## 📜 License

MIT License - feel free to modify and distribute.

## 🤝 Contributing

Contributions are welcome! Please read the [Developer Guide](README_DEV.md) first.

---

Made with ❤️ for office ninjas everywhere
