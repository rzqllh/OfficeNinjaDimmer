# Office Ninja Pro

**The ultimate screen privacy companion for modern workplaces.**

Ever found yourself in an open office, trying to take a quick break or check something personal, only to feel exposed? Office Ninja Pro solves that problem elegantly. It's a Chrome extension that dims, blurs, and disguises your screen content — giving you peace of mind in shared workspaces.

Whether you're taking a mental break, reading something personal, or just want to reduce visual clutter, Office Ninja Pro has your back.

---

## What Makes It Special

Most screen dimmers are basic overlays. Office Ninja Pro goes further:

- **Tab Disguise** — Your YouTube tab can instantly look like a Google Sheets spreadsheet. The title changes, the favicon changes, and to anyone glancing at your screen, you're just crunching numbers.

- **Decoy Tabs** — Hit the panic button and watch as work-appropriate tabs magically appear. Gmail, Docs, Calendar — take your pick.

- **Floating Controls** — A small, draggable widget sits on any page, letting you adjust settings without opening the popup.

- **Per-Site Memory** — Different settings for different sites. Your manga reader dims to 80%, while your code editor stays at 40%. Office Ninja Pro remembers.

---

## Features at a Glance

### Visual Privacy
| Control | Range | What It Does |
|---------|-------|--------------|
| Dim | 0–95% | Darkens the screen with a smooth overlay |
| Blur | 0–20px | Applies backdrop blur for extra privacy |
| Grayscale | On/Off | Removes color, making content harder to identify at a distance |

### Tab Disguise
One click transforms your current tab into something office-appropriate:

| Disguise | Tab Title Becomes |
|----------|-------------------|
| 📊 Sheets | "Q4 Budget Analysis - Google Sheets" |
| 📧 Gmail | "Inbox (3) - Gmail" |
| 📝 Docs | "Meeting Notes - Google Docs" |
| 📅 Calendar | "Team Sync - Google Calendar" |

The favicon updates too. From across the room, no one can tell the difference.

### Decoy Tabs
Configure which tabs open when you trigger panic mode. Options include:
- Google Docs
- Google Sheets
- Gmail
- Google Calendar
- Google Drive

When you press the Boss Key, these tabs open in the background, creating an instant alibi.

### Quick Presets
For those who don't want to fiddle with sliders:
- **Night Mode** — 60% dim, 2px blur, colors preserved
- **Focus Mode** — 40% dim, 5px blur, grayscale on
- **Office Stealth** — 80% dim, 3px blur, maximum discretion

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Alt + Shift + S` | Toggle stealth mode on/off |
| `Alt + Shift + B` | Boss Key — opens safe tab + decoy tabs |

These are customizable via `chrome://extensions/shortcuts`.

---

## Installation

### Option 1: Load Unpacked (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The ninja icon should appear in your toolbar

### Option 2: Chrome Web Store
*Coming soon — currently in review*

---

## How to Use

**Basic Usage:**
1. Click the 🥷 icon in your Chrome toolbar
2. Drag the dim and blur sliders to your preference
3. Toggle grayscale if you want extra privacy
4. Your settings apply immediately

**Tab Disguise:**
1. Open the popup
2. Click any disguise button (Sheets, Gmail, Docs, Calendar)
3. Watch the tab title and icon change instantly
4. Click "Restore Original" to undo

**Decoy Tabs:**
1. Right-click the extension → Options
2. Enable "Decoy Tabs"
3. Check which tabs you want opened
4. Press `Alt + Shift + B` to trigger

**Per-Site Settings:**
1. Navigate to a site you want custom settings for
2. Open the popup and toggle "Per-site settings"
3. Adjust your preferences
4. These will automatically apply whenever you visit this site

---

## Project Structure

```
OfficeNinjaDimmer/
├── manifest.json           # Chrome extension manifest (v3)
├── README.md               # This file
├── README_DEV.md           # Developer documentation
├── CHANGELOG.md            # Version history
├── LICENSE                 # MIT license
│
├── popup/                  # Extension popup UI
│   ├── popup.html          # Popup structure
│   ├── popup.css           # Styling (dark theme, glassmorphism)
│   └── popup.js            # Popup logic and event handlers
│
├── content/                # Scripts injected into web pages
│   ├── content.js          # Overlay, widget, and disguise logic
│   └── widget.css          # Floating widget styles
│
├── background/             # Service worker
│   └── background.js       # Shortcuts, decoy tabs, lifecycle events
│
├── options/                # Settings page
│   ├── options.html
│   ├── options.css
│   └── options.js
│
├── utils/                  # Shared utilities
│   └── storage.js          # Chrome storage abstraction
│
└── icons/                  # Extension icons (16, 48, 128px)
```

---

## Permissions Explained

Office Ninja Pro requests minimal permissions:

| Permission | Why It's Needed |
|------------|-----------------|
| `activeTab` | To apply visual effects to the current tab |
| `scripting` | To inject the content script that creates overlays |
| `storage` | To save your settings and sync them across devices |

No data is collected. No analytics. Everything stays on your machine.

---

## Contributing

Found a bug? Have an idea? Contributions are welcome.

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run through the testing checklist in `README_DEV.md`
5. Submit a pull request

For technical details on architecture and code style, see the [Developer Guide](README_DEV.md).

---

## License

MIT License. Use it, modify it, share it — just keep the copyright notice.

---

## Acknowledgments

Built for everyone who's ever felt the anxiety of an open office. Stay productive. Stay private. Stay ninja. 🥷
