# Developer Guide 🛠️

Technical documentation for contributing to Office Ninja Pro.

## Tech Stack

- **Manifest V3** - Latest Chrome extension platform
- **Vanilla JavaScript** - No frameworks, lightweight
- **CSS3** - Modern styling with CSS variables
- **Chrome Storage API** - Sync and local storage

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│     Popup       │────▶│  Background     │
│  (popup.js)     │     │  (service       │
└────────┬────────┘     │   worker)       │
         │              └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│    Content      │◀───▶│    Storage      │
│   Script        │     │    Utils        │
└─────────────────┘     └─────────────────┘
```

## Key Components

### Content Script (`content/content.js`)
Injected into all web pages. Handles:
- Creating dim and blur overlay elements
- Tab disguise (title + favicon changes)
- Floating widget creation and interactions
- Message handling from popup/background

### Background Service Worker (`background/background.js`)
Always-running script. Handles:
- Keyboard shortcut commands
- Opening decoy tabs on panic
- Per-site settings auto-apply on navigation

### Storage Utilities (`utils/storage.js`)
Centralized storage interface:
- `StorageUtils.getSettings()` - Get global settings
- `StorageUtils.getSiteSettings(hostname)` - Get per-site config
- `StorageUtils.getStats()` - Get usage statistics
- `StorageUtils.formatTime(ms)` - Format time for display

## Adding New Features

### Adding a New Disguise Preset
1. Open `content/content.js`
2. Find `disguisePresets` object
3. Add new preset:
```javascript
newPreset: {
    title: 'Your Fake Title',
    favicon: 'https://example.com/favicon.ico'
}
```
4. Update popup HTML to include new button

### Adding a New Quick Preset
1. Open `popup/popup.js`
2. Find `quickPresets` object
3. Add configuration:
```javascript
myPreset: { dim: 50, blur: 3, gray: false }
```
4. Add button to `popup/popup.html`

## Message Protocol

Messages between scripts use this format:
```javascript
{ action: 'ACTION_NAME', data: { ... } }
```

### Actions
| Action | From | To | Purpose |
|--------|------|-----|---------|
| `UPDATE_STYLES` | Popup | Content | Apply visual effects |
| `TOGGLE_STEALTH` | Background | Content | Toggle via shortcut |
| `APPLY_DISGUISE` | Popup | Content | Change tab appearance |
| `REMOVE_DISGUISE` | Popup | Content | Restore original tab |
| `TOGGLE_WIDGET` | Options | Content | Show/hide widget |

## Building & Testing

### Local Development
1. Make changes to source files
2. Go to `chrome://extensions`
3. Click refresh button on extension card
4. Test on any webpage

### Testing Checklist
- [ ] Popup opens correctly
- [ ] Sliders update effects in real-time
- [ ] Quick presets apply correct values
- [ ] Tab disguise changes title and favicon
- [ ] Restore button works
- [ ] Boss key opens safe tab + decoy tabs
- [ ] Per-site settings persist
- [ ] Options page loads and saves
- [ ] Widget appears and is draggable

## Code Style

- Use descriptive variable names
- Add comments explaining "why", not "what"
- Use section headers to organize long files
- Keep functions focused and small

## File Naming

- `camelCase` for JS files
- `kebab-case` for CSS classes
- Prefix with purpose: `widget-`, `popup-`, etc.
