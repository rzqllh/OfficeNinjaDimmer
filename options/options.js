/*
 * Office Ninja Pro - Options Page Controller
 * Version 3.2
 * 
 * Handles all the settings on the options page, including the decoy tabs
 * configuration, widget toggle, site management, and statistics display.
 */

document.addEventListener('DOMContentLoaded', async function () {

    // ─────────────────────────────────────────────────────────────────────────
    // UI Elements
    // ─────────────────────────────────────────────────────────────────────────

    const ui = {
        // Widget settings
        widgetToggle: document.getElementById('widgetEnabled'),

        // Decoy tab settings
        decoyToggle: document.getElementById('decoyEnabled'),
        decoyOptionsPanel: document.getElementById('decoyOptions'),
        decoyCheckboxes: {
            docs: document.getElementById('decoyDocs'),
            sheets: document.getElementById('decoySheets'),
            gmail: document.getElementById('decoyGmail'),
            calendar: document.getElementById('decoyCalendar'),
            drive: document.getElementById('decoyDrive')
        },

        // Sites list
        sitesListContainer: document.getElementById('sitesList'),

        // Stats displays
        totalTimeDisplay: document.getElementById('totalTime'),
        sessionsDisplay: document.getElementById('sessionsCount'),
        todayTimeDisplay: document.getElementById('todayTime'),
        weekTimeDisplay: document.getElementById('weekTime'),

        // Buttons
        resetStatsButton: document.getElementById('resetStats'),
        shortcutsLink: document.getElementById('shortcutsLink')
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────

    async function initialize() {
        await loadAllSettings();
        await loadSitesList();
        await updateStatsDisplay();
        setupEventListeners();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Settings Loading
    // ─────────────────────────────────────────────────────────────────────────

    async function loadAllSettings() {
        // Load widget settings
        const globalSettings = await StorageUtils.getSettings();
        ui.widgetToggle.checked = globalSettings.widgetEnabled !== false;

        // Load decoy settings
        const result = await chrome.storage.sync.get(['decoySettings']);
        const decoyConfig = result.decoySettings || { enabled: false, tabs: ['docs', 'sheets'] };

        ui.decoyToggle.checked = decoyConfig.enabled;
        updateDecoyOptionsVisibility();

        // Check the appropriate decoy tab checkboxes
        decoyConfig.tabs.forEach(tabKey => {
            if (ui.decoyCheckboxes[tabKey]) {
                ui.decoyCheckboxes[tabKey].checked = true;
            }
        });
    }

    function updateDecoyOptionsVisibility() {
        // Show or hide the decoy options based on the toggle
        if (ui.decoyToggle.checked) {
            ui.decoyOptionsPanel.style.display = 'block';
            ui.decoyOptionsPanel.style.opacity = '1';
        } else {
            ui.decoyOptionsPanel.style.opacity = '0.5';
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Site Settings Management
    // ─────────────────────────────────────────────────────────────────────────

    async function loadSitesList() {
        const allSiteSettings = await StorageUtils.getAllSiteSettings();
        const sites = Object.keys(allSiteSettings);

        if (sites.length === 0) {
            ui.sitesListContainer.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📭</span>
                    <p>No site-specific settings saved yet.</p>
                    <p class="hint">Enable the per-site toggle in the popup to save custom settings for different websites.</p>
                </div>
            `;
            return;
        }

        // Build the list of saved sites
        ui.sitesListContainer.innerHTML = sites.map(hostname => {
            const config = allSiteSettings[hostname];
            const summary = `Dim: ${config.dimLevel}% | Blur: ${config.blurLevel}px`;

            return `
                <div class="site-item" data-hostname="${hostname}">
                    <div>
                        <div class="site-hostname">${hostname}</div>
                        <div class="site-preview">${summary}</div>
                    </div>
                    <button class="delete-btn" data-hostname="${hostname}">Delete</button>
                </div>
            `;
        }).join('');

        // Wire up delete buttons
        ui.sitesListContainer.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async function () {
                const hostname = this.dataset.hostname;
                await StorageUtils.deleteSiteSettings(hostname);
                await loadSitesList();
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Statistics Display
    // ─────────────────────────────────────────────────────────────────────────

    async function updateStatsDisplay() {
        const stats = await StorageUtils.getStats();
        const today = new Date().toISOString().split('T')[0];

        // Calculate this week's time
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);

        let weekTotalMs = 0;
        Object.entries(stats.dailyStats || {}).forEach(([date, timeMs]) => {
            if (new Date(date) >= weekStart) {
                weekTotalMs += timeMs;
            }
        });

        // Update the display
        ui.totalTimeDisplay.textContent = StorageUtils.formatTime(stats.totalTimeMs || 0);
        ui.sessionsDisplay.textContent = stats.sessionsCount || 0;
        ui.todayTimeDisplay.textContent = StorageUtils.formatTime(stats.dailyStats?.[today] || 0);
        ui.weekTimeDisplay.textContent = StorageUtils.formatTime(weekTotalMs);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Settings Saving
    // ─────────────────────────────────────────────────────────────────────────

    async function saveDecoySettings() {
        // Collect which tabs are selected
        const selectedTabs = [];
        Object.entries(ui.decoyCheckboxes).forEach(([key, checkbox]) => {
            if (checkbox && checkbox.checked) {
                selectedTabs.push(key);
            }
        });

        const decoyConfig = {
            enabled: ui.decoyToggle.checked,
            tabs: selectedTabs
        };

        await chrome.storage.sync.set({ decoySettings: decoyConfig });
    }

    async function saveWidgetSetting() {
        const settings = await StorageUtils.getSettings();
        settings.widgetEnabled = ui.widgetToggle.checked;
        await StorageUtils.saveSettings(settings);

        // Notify all open tabs to show/hide the widget
        const allTabs = await chrome.tabs.query({});
        allTabs.forEach(tab => {
            try {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'TOGGLE_WIDGET',
                    enabled: settings.widgetEnabled
                });
            } catch (e) {
                // Tab might not have the content script loaded
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Event Handlers
    // ─────────────────────────────────────────────────────────────────────────

    function setupEventListeners() {
        // Widget toggle
        ui.widgetToggle.addEventListener('change', saveWidgetSetting);

        // Decoy tabs toggle
        ui.decoyToggle.addEventListener('change', function () {
            updateDecoyOptionsVisibility();
            saveDecoySettings();
        });

        // Individual decoy tab checkboxes
        Object.values(ui.decoyCheckboxes).forEach(checkbox => {
            if (checkbox) {
                checkbox.addEventListener('change', saveDecoySettings);
            }
        });

        // Reset stats button
        ui.resetStatsButton.addEventListener('click', async function () {
            const confirmed = confirm('Are you sure you want to reset all your usage statistics? This cannot be undone.');

            if (confirmed) {
                await chrome.storage.local.set({
                    stats: {
                        totalTimeMs: 0,
                        sessionsCount: 0,
                        lastActiveDate: null,
                        dailyStats: {}
                    }
                });
                await updateStatsDisplay();
            }
        });

        // Shortcuts link (chrome:// URLs can't be opened directly)
        ui.shortcutsLink.addEventListener('click', function (event) {
            event.preventDefault();
            navigator.clipboard.writeText('chrome://extensions/shortcuts').then(() => {
                alert('URL copied to clipboard! Paste it in your address bar to customize keyboard shortcuts.');
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Start everything
    // ─────────────────────────────────────────────────────────────────────────

    initialize();

});
