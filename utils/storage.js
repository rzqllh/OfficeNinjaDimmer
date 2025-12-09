/*
 * Office Ninja Pro - Storage Utilities
 * Version 3.2
 * 
 * This file provides a clean interface for saving and loading settings
 * from Chrome's storage APIs. We use sync storage for settings that
 * should follow the user across devices, and local storage for things
 * like usage statistics that are device-specific.
 */

const StorageUtils = {

    // ─────────────────────────────────────────────────────────────────────────
    // Default Settings
    // These are used when the extension is first installed
    // ─────────────────────────────────────────────────────────────────────────

    defaults: {
        dimLevel: 0,
        blurLevel: 0,
        grayscale: false,
        overlayColor: '#000000',
        widgetEnabled: false  // Widget is OFF by default
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Global Settings
    // The user's main preferences that apply everywhere by default
    // ─────────────────────────────────────────────────────────────────────────

    async getSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['globalSettings'], (result) => {
                const settings = result.globalSettings || this.defaults;
                resolve(settings);
            });
        });
    },

    async saveSettings(settings) {
        return new Promise((resolve) => {
            chrome.storage.sync.set({ globalSettings: settings }, () => {
                resolve(true);
            });
        });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Per-Site Settings
    // Custom configurations for specific websites
    // ─────────────────────────────────────────────────────────────────────────

    async getSiteSettings(hostname) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['siteSettings'], (result) => {
                const allSites = result.siteSettings || {};
                resolve(allSites[hostname] || null);
            });
        });
    },

    async saveSiteSettings(hostname, settings) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['siteSettings'], (result) => {
                const allSites = result.siteSettings || {};
                allSites[hostname] = settings;
                chrome.storage.sync.set({ siteSettings: allSites }, () => {
                    resolve(true);
                });
            });
        });
    },

    async deleteSiteSettings(hostname) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['siteSettings'], (result) => {
                const allSites = result.siteSettings || {};
                delete allSites[hostname];
                chrome.storage.sync.set({ siteSettings: allSites }, () => {
                    resolve(true);
                });
            });
        });
    },

    async getAllSiteSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['siteSettings'], (result) => {
                resolve(result.siteSettings || {});
            });
        });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Usage Statistics
    // Track how much time the user spends with stealth mode on
    // ─────────────────────────────────────────────────────────────────────────

    async getStats() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['stats'], (result) => {
                const stats = result.stats || {
                    totalTimeMs: 0,
                    sessionsCount: 0,
                    lastActiveDate: null,
                    dailyStats: {}
                };
                resolve(stats);
            });
        });
    },

    async updateStats(additionalTimeMs) {
        return new Promise((resolve) => {
            chrome.storage.local.get(['stats'], (result) => {
                const stats = result.stats || {
                    totalTimeMs: 0,
                    sessionsCount: 0,
                    lastActiveDate: null,
                    dailyStats: {}
                };

                const today = new Date().toISOString().split('T')[0];

                stats.totalTimeMs += additionalTimeMs;
                stats.lastActiveDate = today;

                if (!stats.dailyStats[today]) {
                    stats.dailyStats[today] = 0;
                }
                stats.dailyStats[today] += additionalTimeMs;

                chrome.storage.local.set({ stats }, () => {
                    resolve(stats);
                });
            });
        });
    },

    async incrementSession() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['stats'], (result) => {
                const stats = result.stats || {
                    totalTimeMs: 0,
                    sessionsCount: 0,
                    lastActiveDate: null,
                    dailyStats: {}
                };

                stats.sessionsCount += 1;
                stats.lastActiveDate = new Date().toISOString().split('T')[0];

                chrome.storage.local.set({ stats }, () => {
                    resolve(stats);
                });
            });
        });
    },

    async resetStats() {
        return new Promise((resolve) => {
            chrome.storage.local.set({
                stats: {
                    totalTimeMs: 0,
                    sessionsCount: 0,
                    lastActiveDate: null,
                    dailyStats: {}
                }
            }, () => {
                resolve(true);
            });
        });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // Time Formatting
    // Convert milliseconds to human-readable format
    // ─────────────────────────────────────────────────────────────────────────

    formatTime(milliseconds) {
        const totalMinutes = Math.floor(milliseconds / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
};

// Make it available globally so other scripts can use it
if (typeof window !== 'undefined') {
    window.StorageUtils = StorageUtils;
}
