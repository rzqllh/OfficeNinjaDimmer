/*
 * Office Ninja Pro - Background Service Worker
 * Version 3.2
 * 
 * This runs in the background and handles things like keyboard shortcuts,
 * opening decoy tabs when panic mode is triggered, and managing extension
 * lifecycle events.
 */

// The "safe" page to open when Boss Key is pressed
const safeTabUrl = 'https://docs.google.com/document/create';

// Available decoy tabs that can be opened during panic mode
const availableDecoyTabs = {
    gmail: 'https://mail.google.com',
    sheets: 'https://docs.google.com/spreadsheets/create',
    docs: 'https://docs.google.com/document/create',
    calendar: 'https://calendar.google.com',
    drive: 'https://drive.google.com'
};

// ─────────────────────────────────────────────────────────────────────────
// Keyboard Shortcuts
// Handle the global hotkeys for quick actions
// ─────────────────────────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async function (commandName) {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];

        if (!currentTab || !currentTab.id) return;

        // Can't work with chrome:// or edge:// pages
        if (currentTab.url && (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('edge://'))) {
            if (commandName === 'boss-key') {
                await openSafeTab();
            }
            return;
        }

        switch (commandName) {
            case 'toggle-stealth':
                await handleToggleStealth(currentTab.id);
                break;

            case 'boss-key':
                await handleBossKey();
                break;
        }
    } catch (error) {
        console.log('Command handling failed:', error);
    }
});

async function handleToggleStealth(tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, { action: 'TOGGLE_STEALTH' });
    } catch (error) {
        // Content script probably isn't loaded, let's inject it first
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['utils/storage.js', 'content/content.js']
            });

            // Give it a moment to initialize
            await new Promise(resolve => setTimeout(resolve, 100));
            await chrome.tabs.sendMessage(tabId, { action: 'TOGGLE_STEALTH' });
        } catch (injectError) {
            console.log('Cannot inject script into this page:', injectError);
        }
    }
}

async function handleBossKey() {
    // First, open the safe tab
    await openSafeTab();

    // Check if decoy tabs are enabled
    const settings = await chrome.storage.sync.get(['decoySettings']);
    const decoyConfig = settings.decoySettings || { enabled: false, tabs: [] };

    if (decoyConfig.enabled && decoyConfig.tabs.length > 0) {
        await openDecoyTabs(decoyConfig.tabs);
    }
}

async function openSafeTab() {
    await chrome.tabs.create({ url: safeTabUrl });
}

async function openDecoyTabs(tabsToOpen) {
    // Open each selected decoy tab
    for (const tabKey of tabsToOpen) {
        const url = availableDecoyTabs[tabKey];
        if (url) {
            await chrome.tabs.create({ url: url, active: false });
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────
// Extension Lifecycle
// Handle install and update events
// ─────────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'install') {
        // First time install - set up default settings
        chrome.storage.sync.set({
            globalSettings: {
                dimLevel: 0,
                blurLevel: 0,
                grayscale: false,
                overlayColor: '#000000',
                widgetEnabled: true
            },
            decoySettings: {
                enabled: false,
                tabs: ['docs', 'sheets']  // Default decoy tabs
            }
        });

        chrome.storage.local.set({
            stats: {
                totalTimeMs: 0,
                sessionsCount: 0,
                lastActiveDate: null,
                dailyStats: {}
            }
        });

        console.log('Office Ninja Pro installed successfully!');

    } else if (details.reason === 'update') {
        console.log('Office Ninja Pro updated to version', chrome.runtime.getManifest().version);

        // Make sure decoy settings exist after update
        chrome.storage.sync.get(['decoySettings'], function (result) {
            if (!result.decoySettings) {
                chrome.storage.sync.set({
                    decoySettings: {
                        enabled: false,
                        tabs: ['docs', 'sheets']
                    }
                });
            }
        });
    }
});

// ─────────────────────────────────────────────────────────────────────────
// Message Handling
// Respond to messages from popup and content scripts
// ─────────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

    // Synchronous message handlers (no async response needed)
    if (request.action === 'OPEN_SAFE_TAB') {
        openSafeTab();
        return false;
    }

    // Async handlers need to return true
    if (request.action === 'GET_CURRENT_TAB') {
        chrome.tabs.query({ active: true, currentWindow: true })
            .then(tabs => sendResponse(tabs[0] || null))
            .catch(() => sendResponse(null));
        return true;
    }

    if (request.action === 'INJECT_CONTENT_SCRIPT') {
        chrome.scripting.executeScript({
            target: { tabId: request.tabId },
            files: ['utils/storage.js', 'content/content.js']
        })
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    if (request.action === 'TRIGGER_PANIC_WITH_DECOYS') {
        handleBossKey().then(() => sendResponse({ success: true }));
        return true;
    }

    return false;
});

// ─────────────────────────────────────────────────────────────────────────
// Tab Navigation
// Auto-apply per-site settings when switching tabs
// ─────────────────────────────────────────────────────────────────────────

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
    // Only act when page is fully loaded
    if (changeInfo.status !== 'complete') return;

    // Skip internal browser pages
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return;

    try {
        const url = new URL(tab.url);
        const hostname = url.hostname;

        // Check for site-specific settings
        const result = await chrome.storage.sync.get(['siteSettings']);
        const allSiteSettings = result.siteSettings || {};

        if (allSiteSettings[hostname]) {
            // This site has custom settings, apply them
            const siteConfig = allSiteSettings[hostname];

            // Wait a bit for the content script to be ready
            await new Promise(resolve => setTimeout(resolve, 200));

            try {
                await chrome.tabs.sendMessage(tabId, {
                    action: 'UPDATE_STYLES',
                    data: {
                        dim: siteConfig.dimLevel || 0,
                        blur: siteConfig.blurLevel || 0,
                        gray: siteConfig.grayscale || false,
                        color: siteConfig.overlayColor || '#000000'
                    }
                });
            } catch (e) {
                // Content script not ready yet, that's okay
            }
        }
    } catch (e) {
        // Invalid URL or other error, ignore it
    }
});
