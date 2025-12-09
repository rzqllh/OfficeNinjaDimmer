/*
 * Office Ninja Pro - Background Service Worker
 * Version 3.3
 * 
 * Runs in the background and handles keyboard shortcuts, opening decoy tabs
 * (both built-in and custom), and managing extension lifecycle events.
 */

// The "safe" page to open when Boss Key is pressed
const safeTabUrl = 'https://docs.google.com/document/create';

// Built-in decoy tab URLs
const builtInDecoyTabs = {
    gmail: 'https://mail.google.com',
    sheets: 'https://docs.google.com/spreadsheets/create',
    docs: 'https://docs.google.com/document/create',
    calendar: 'https://calendar.google.com',
    drive: 'https://drive.google.com'
};

// ─────────────────────────────────────────────────────────────────────────
// Keyboard Shortcuts
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
    const decoyConfig = settings.decoySettings || { enabled: false, tabs: [], customTabs: [] };

    if (decoyConfig.enabled) {
        // Open built-in decoys
        if (decoyConfig.tabs && decoyConfig.tabs.length > 0) {
            for (const tabKey of decoyConfig.tabs) {
                const url = builtInDecoyTabs[tabKey];
                if (url) {
                    await chrome.tabs.create({ url: url, active: false });
                }
            }
        }

        // Open custom decoys
        if (decoyConfig.customTabs && decoyConfig.customTabs.length > 0) {
            for (const customTab of decoyConfig.customTabs) {
                if (customTab.url) {
                    await chrome.tabs.create({ url: customTab.url, active: false });
                }
            }
        }
    }
}

async function openSafeTab() {
    await chrome.tabs.create({ url: safeTabUrl });
}

// ─────────────────────────────────────────────────────────────────────────
// Extension Lifecycle
// ─────────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'install') {
        // First time install - set up default settings
        // Note: Widget is OFF by default as per user preference
        chrome.storage.sync.set({
            globalSettings: {
                dimLevel: 0,
                blurLevel: 0,
                grayscale: false,
                overlayColor: '#000000',
                widgetEnabled: false  // Widget OFF by default
            },
            decoySettings: {
                enabled: false,
                tabs: [],
                customTabs: []  // For user-defined decoy tabs
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

        // Migration: ensure new settings structure exists
        chrome.storage.sync.get(['decoySettings', 'globalSettings'], function (result) {
            // Add customTabs array if missing
            if (result.decoySettings && !result.decoySettings.customTabs) {
                result.decoySettings.customTabs = [];
                chrome.storage.sync.set({ decoySettings: result.decoySettings });
            }

            // Ensure decoySettings exists
            if (!result.decoySettings) {
                chrome.storage.sync.set({
                    decoySettings: {
                        enabled: false,
                        tabs: [],
                        customTabs: []
                    }
                });
            }
        });
    }
});

// ─────────────────────────────────────────────────────────────────────────
// Message Handling
// ─────────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

    if (request.action === 'OPEN_SAFE_TAB') {
        openSafeTab();
        return false;
    }

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
// Tab Navigation - Auto-apply per-site settings
// ─────────────────────────────────────────────────────────────────────────

chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
    if (changeInfo.status !== 'complete') return;
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return;

    try {
        const url = new URL(tab.url);
        const hostname = url.hostname;

        const result = await chrome.storage.sync.get(['siteSettings']);
        const allSiteSettings = result.siteSettings || {};

        if (allSiteSettings[hostname]) {
            const siteConfig = allSiteSettings[hostname];

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
            } catch (e) { }
        }
    } catch (e) { }
});
