# Developer Guide

This document is for developers who want to understand how Office Ninja Pro works under the hood, contribute improvements, or build similar extensions.

---

## Understanding the Architecture

Office Ninja Pro follows Chrome's Manifest V3 architecture, which separates the extension into distinct contexts that communicate via message passing.

### The Big Picture
```
┌─────────────────────────────────────────────────────────────────────────┐
│  CHROME BROWSER ENVIRONMENT                                             │
│                                                                         │
│  ┌──────────────────────┐             ┌──────────────────────────────┐  │
│  │      UI LAYER        │             │        LOGIC LAYER           │  │
│  │                      │   Events    │                              │  │
│  │   ┌──────────────┐   │────────────▶│  BACKGROUND SERVICE WORKER   │  │
│  │   │    POPUP     │   │             │       (background.js)        │  │
│  │   │   (popup/)   │◀──│─────────────│                              │  │
│  │   └──────┬───────┘   │  Messages   │  • Manages Lifecycle         │  │
│  │          │           │             │  • Handles Shortcuts         │  │
│  │   ┌──────▼───────┐   │             │  • Context Menus             │  │
│  │   │ OPTIONS PAGE │   │             └──────────────┬───────────────┘  │
│  │   │  (options/)  │   │                            │                  │
│  │   └──────────────┘   │                            │ messaging        │
│  └──────────┬───────────┘                            ▼                  │
│             │Save/Load                      ┌──────────────────┐        │
│             │                               │  CONTENT SCRIPT  │        │
│             │                        ┌─────▶│   (content.js)   │        │
│             │                        │      └────────┬─────────┘        │
│             │                        │               │                  │
│  ┌──────────▼───────────┐            │      ┌────────▼─────────┐        │
│  │    STORAGE LAYER     │◀───────────┘      │     WEB PAGE     │        │
│  │  (chrome.storage)    │    Read           │       DOM        │        │
│  │                      │    Settings       │                  │        │
│  │ • Sync (Settings)    │                   │ • Overlay Elements│       │
│  │ • Local (Stats)      │                   │ • Visual Effects  │       │
│  └──────────────────────┘                   └───────────────────┘       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why This Separation Matters

**Content Scripts** have access to the DOM but can't directly use most Chrome APIs. They can see and manipulate the web page.

**Background Service Worker** has full Chrome API access but no DOM. It handles events like keyboard shortcuts and extension lifecycle.

**Popup** is a mini webpage that appears when you click the extension icon. It's destroyed when closed, so it doesn't hold state.

**Storage** bridges all these contexts. When the popup saves a setting, the content script can read it. When stats are updated, the options page can display them.

---

## Deep Dive: How Features Work

### Tab Disguise

The disguise feature works by manipulating two things:

1. **Document Title** — We simply set `document.title` to something work-appropriate.

2. **Favicon** — We find the existing `<link rel="icon">` element (or create one) and point its `href` to a Google favicon URL.

```javascript
// From content.js — simplified
function applyTabDisguise(presetName) {
    const preset = disguisePresets[presetName];
    
    // Save original values for restoration
    originalTabInfo.title = document.title;
    
    // Apply disguise
    document.title = preset.title;
    
    let faviconLink = document.querySelector('link[rel*="icon"]');
    if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
    }
    faviconLink.href = preset.favicon;
}
```

The preset favicons come from Google's public CDN, so they load instantly and look authentic.

### Overlay System

Instead of using CSS filters directly on the page (which would affect our own UI elements), we create two fixed-position overlays:

1. **Dim Overlay** — A full-screen div with a solid background color and adjustable opacity.

2. **Blur Overlay** — A full-screen div with `backdrop-filter: blur()` applied.

Both have `pointer-events: none` so clicks pass through to the actual page.

```css
/* Conceptually */
#dim-overlay {
    position: fixed;
    inset: 0;
    background: #000;
    opacity: 0.7;
    z-index: 2147483643;
    pointer-events: none;
}

#blur-overlay {
    position: fixed;
    inset: 0;
    backdrop-filter: blur(5px);
    z-index: 2147483642;
    pointer-events: none;
}
```

We use extremely high z-index values to ensure our overlays appear above everything except maybe some aggressive modals.

### Decoy Tabs

When the Boss Key is triggered:

1. Background service worker receives the keyboard command
2. It reads decoy settings from storage
3. For each enabled decoy, it calls `chrome.tabs.create()` with `active: false`
4. A safe tab (Google Docs) opens as the active tab
5. The user immediately sees a productive-looking screen

```javascript
// From background.js — simplified
async function handleBossKey() {
    await chrome.tabs.create({ url: 'https://docs.google.com/document/create' });
    
    const settings = await chrome.storage.sync.get(['decoySettings']);
    if (settings.decoySettings?.enabled) {
        for (const tabKey of settings.decoySettings.tabs) {
            await chrome.tabs.create({ 
                url: decoyUrls[tabKey], 
                active: false 
            });
        }
    }
}
```

---

## Message Protocol

Scripts communicate via `chrome.runtime.sendMessage` (to background) and `chrome.tabs.sendMessage` (to content scripts).

### Message Format

All messages follow this structure:
```javascript
{
    action: 'ACTION_NAME',
    data: { /* optional payload */ }
}
```

### Available Actions

| Action | Direction | Purpose |
|--------|-----------|---------|
| `UPDATE_STYLES` | Popup → Content | Apply new dim/blur/grayscale values |
| `TOGGLE_STEALTH` | Background → Content | Quick toggle via keyboard shortcut |
| `APPLY_DISGUISE` | Popup → Content | Change tab title and favicon |
| `REMOVE_DISGUISE` | Popup → Content | Restore original tab appearance |
| `GET_DISGUISE_STATUS` | Popup → Content | Check if tab is currently disguised |
| `TOGGLE_WIDGET` | Options → Content | Show or hide the floating widget |
| `GET_STATUS` | Popup → Content | Get current active state |
| `OPEN_SAFE_TAB` | Popup → Background | Open the safe tab |

### Handling Responses

For actions that need a response, the content script returns data via `sendResponse`:

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'GET_STATUS') {
        sendResponse({
            isActive: stealthModeActive,
            settings: visualSettings
        });
    }
    return true; // Required for async response
});
```

---

## Storage Schema

### Sync Storage (synced across devices)

```javascript
{
    globalSettings: {
        dimLevel: 0,          // 0-95
        blurLevel: 0,         // 0-20
        grayscale: false,
        overlayColor: '#000000',
        widgetEnabled: true
    },
    siteSettings: {
        'youtube.com': { dimLevel: 70, blurLevel: 5, ... },
        'reddit.com': { dimLevel: 80, blurLevel: 3, ... }
    },
    decoySettings: {
        enabled: false,
        tabs: ['docs', 'sheets']  // Array of enabled decoy keys
    }
}
```

### Local Storage (device-specific)

```javascript
{
    stats: {
        totalTimeMs: 0,
        sessionsCount: 0,
        lastActiveDate: '2024-12-09',
        dailyStats: {
            '2024-12-09': 3600000,  // milliseconds
            '2024-12-08': 7200000
        }
    }
}
```

---

## Adding New Features

### Adding a New Disguise Preset

1. Open `content/content.js`
2. Add to the `disguisePresets` object:
```javascript
const disguisePresets = {
    // ... existing presets
    slack: {
        title: 'Slack | General',
        favicon: 'https://a.slack-edge.com/80588/marketing/img/meta/favicon-32.png'
    }
};
```
3. Add a button in `popup/popup.html`
4. The existing click handler will pick it up automatically

### Adding a New Decoy Tab

1. Open `background/background.js`
2. Add to `availableDecoyTabs`:
```javascript
const availableDecoyTabs = {
    // ... existing
    notion: 'https://notion.so'
};
```
3. Add a checkbox in `options/options.html`
4. Update the checkbox ID pattern in `options/options.js`

### Adding a New Quick Preset

1. Open `popup/popup.js`
2. Add to `quickPresets`:
```javascript
const quickPresets = {
    // ... existing
    reading: { dim: 30, blur: 0, gray: false }
};
```
3. Add a button with `data-preset="reading"` in the HTML

---

## Testing Checklist

Before submitting changes, verify:

**Popup Functionality**
- [ ] Popup opens without console errors
- [ ] Sliders update effects in real-time
- [ ] Preset buttons apply correct values
- [ ] Grayscale toggle works
- [ ] Color theme buttons work

**Tab Disguise**
- [ ] Each disguise button changes title
- [ ] Favicon updates correctly
- [ ] "Restore Original" works
- [ ] Status indicator shows current disguise

**Decoy Tabs**
- [ ] Decoy toggle saves correctly
- [ ] Checkbox selections persist
- [ ] Boss key opens correct tabs
- [ ] Decoys open as background tabs

**Widget**
- [ ] Widget appears on pages
- [ ] Widget is draggable
- [ ] Panel opens on click
- [ ] Controls work correctly
- [ ] Position saves across page loads

**Per-Site Settings**
- [ ] Toggle creates site entry
- [ ] Settings persist for site
- [ ] Different sites have different settings
- [ ] Delete button removes site entry

**Edge Cases**
- [ ] Extension works after Chrome restart
- [ ] Settings sync between devices (if possible to test)
- [ ] No errors on chrome:// pages (should gracefully skip)

---

## Code Style Guidelines

**Naming**
- Use descriptive names: `visualSettings` not `vs`
- Use verbs for functions: `applyVisualEffects()` not `effects()`
- Use nouns for variables: `currentHostname` not `host`

**Comments**
- Explain *why*, not *what*
- Use section headers for long files
- Keep comments conversational

**Structure**
- Group related code together
- Separate with clear section dividers
- Keep functions focused (one thing per function)

---

## Need Help?

Open an issue on GitHub with:
- What you're trying to do
- What you expected to happen
- What actually happened
- Browser version and OS

We're happy to help!
