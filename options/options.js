/*
 * Office Ninja Pro - Options Page Controller
 * Version 3.3
 * 
 * Manages all the settings on the options page including custom decoy tabs,
 * per-site configurations, widget toggle, and usage statistics.
 */

document.addEventListener('DOMContentLoaded', async function () {

    // ─────────────────────────────────────────────────────────────────────────
    // UI Element References
    // ─────────────────────────────────────────────────────────────────────────

    const ui = {
        // Widget toggle
        widgetToggle: document.getElementById('widgetEnabled'),

        // Decoy settings
        decoyToggle: document.getElementById('decoyEnabled'),
        decoyOptionsPanel: document.getElementById('decoyOptions'),
        builtInDecoys: {
            docs: document.getElementById('decoyDocs'),
            sheets: document.getElementById('decoySheets'),
            gmail: document.getElementById('decoyGmail'),
            calendar: document.getElementById('decoyCalendar'),
            drive: document.getElementById('decoyDrive')
        },

        // Custom decoys
        customDecoysList: document.getElementById('customDecoysList'),
        customDecoyIcon: document.getElementById('customDecoyIcon'),
        customDecoyName: document.getElementById('customDecoyName'),
        customDecoyUrl: document.getElementById('customDecoyUrl'),
        addCustomDecoyBtn: document.getElementById('addCustomDecoy'),

        // Per-site settings form
        newSiteHostname: document.getElementById('newSiteHostname'),
        newSiteDim: document.getElementById('newSiteDim'),
        newSiteBlur: document.getElementById('newSiteBlur'),
        newSiteColor: document.getElementById('newSiteColor'),
        newSiteGrayscale: document.getElementById('newSiteGrayscale'),
        addSiteSettingsBtn: document.getElementById('addSiteSettings'),
        sitesListContainer: document.getElementById('sitesList'),

        // Stats
        totalTimeDisplay: document.getElementById('totalTime'),
        sessionsDisplay: document.getElementById('sessionsCount'),
        todayTimeDisplay: document.getElementById('todayTime'),
        weekTimeDisplay: document.getElementById('weekTime'),
        resetStatsButton: document.getElementById('resetStats'),

        // Other
        shortcutsLink: document.getElementById('shortcutsLink')
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────

    async function initialize() {
        await loadAllSettings();
        await loadCustomDecoys();
        await loadSitesList();
        await updateStatsDisplay();
        setupEventListeners();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Settings Loading
    // ─────────────────────────────────────────────────────────────────────────

    async function loadAllSettings() {
        // Widget setting
        const globalSettings = await StorageUtils.getSettings();
        ui.widgetToggle.checked = globalSettings.widgetEnabled === true;

        // Decoy settings
        const result = await chrome.storage.sync.get(['decoySettings']);
        const decoyConfig = result.decoySettings || { enabled: false, tabs: [], customTabs: [] };

        ui.decoyToggle.checked = decoyConfig.enabled;
        updateDecoyOptionsVisibility();

        // Check built-in decoy checkboxes
        (decoyConfig.tabs || []).forEach(tabKey => {
            if (ui.builtInDecoys[tabKey]) {
                ui.builtInDecoys[tabKey].checked = true;
            }
        });
    }

    function updateDecoyOptionsVisibility() {
        ui.decoyOptionsPanel.style.opacity = ui.decoyToggle.checked ? '1' : '0.5';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Custom Decoy Tabs Management
    // ─────────────────────────────────────────────────────────────────────────

    async function loadCustomDecoys() {
        const result = await chrome.storage.sync.get(['decoySettings']);
        const customTabs = result.decoySettings?.customTabs || [];

        if (customTabs.length === 0) {
            ui.customDecoysList.innerHTML = '<div class="empty-hint">No custom decoys added yet</div>';
            return;
        }

        ui.customDecoysList.innerHTML = customTabs.map((tab, index) => `
            <div class="custom-decoy-item" data-index="${index}">
                <span class="decoy-icon">${tab.icon}</span>
                <span class="decoy-name">${tab.name}</span>
                <span class="decoy-url">${shortenUrl(tab.url)}</span>
                <button class="btn-delete-decoy" data-index="${index}">✕</button>
            </div>
        `).join('');

        // Attach delete handlers
        ui.customDecoysList.querySelectorAll('.btn-delete-decoy').forEach(btn => {
            btn.addEventListener('click', async function () {
                const index = parseInt(this.dataset.index);
                await deleteCustomDecoy(index);
            });
        });
    }

    function shortenUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.hostname;
        } catch {
            return url.substring(0, 30);
        }
    }

    async function addCustomDecoy() {
        const icon = ui.customDecoyIcon.value.trim() || '🌐';
        const name = ui.customDecoyName.value.trim();
        const url = ui.customDecoyUrl.value.trim();

        if (!name || !url) {
            alert('Please enter both a name and URL for the custom decoy.');
            return;
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            alert('Please enter a valid URL (e.g. https://example.com)');
            return;
        }

        const result = await chrome.storage.sync.get(['decoySettings']);
        const decoySettings = result.decoySettings || { enabled: false, tabs: [], customTabs: [] };

        if (!decoySettings.customTabs) {
            decoySettings.customTabs = [];
        }

        decoySettings.customTabs.push({ icon, name, url });

        await chrome.storage.sync.set({ decoySettings });

        // Clear form
        ui.customDecoyIcon.value = '';
        ui.customDecoyName.value = '';
        ui.customDecoyUrl.value = '';

        await loadCustomDecoys();
    }

    async function deleteCustomDecoy(index) {
        const result = await chrome.storage.sync.get(['decoySettings']);
        const decoySettings = result.decoySettings || { enabled: false, tabs: [], customTabs: [] };

        if (decoySettings.customTabs && decoySettings.customTabs[index]) {
            decoySettings.customTabs.splice(index, 1);
            await chrome.storage.sync.set({ decoySettings });
            await loadCustomDecoys();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Per-Site Settings Management
    // ─────────────────────────────────────────────────────────────────────────

    async function loadSitesList() {
        const allSiteSettings = await StorageUtils.getAllSiteSettings();
        const sites = Object.keys(allSiteSettings);

        if (sites.length === 0) {
            ui.sitesListContainer.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📭</span>
                    <p>No site-specific settings saved yet.</p>
                </div>
            `;
            return;
        }

        ui.sitesListContainer.innerHTML = sites.map(hostname => {
            const config = allSiteSettings[hostname];
            const summary = `Dim: ${config.dimLevel}% | Blur: ${config.blurLevel}px${config.grayscale ? ' | Grayscale' : ''}`;

            return `
                <div class="site-item" data-hostname="${hostname}">
                    <div class="site-info-block">
                        <div class="site-hostname">${hostname}</div>
                        <div class="site-preview">${summary}</div>
                    </div>
                    <button class="delete-btn" data-hostname="${hostname}">Delete</button>
                </div>
            `;
        }).join('');

        // Attach delete handlers
        ui.sitesListContainer.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', async function () {
                const hostname = this.dataset.hostname;
                if (confirm(`Remove settings for ${hostname}?`)) {
                    await StorageUtils.deleteSiteSettings(hostname);
                    await loadSitesList();
                }
            });
        });
    }

    async function addNewSiteSettings() {
        const hostname = ui.newSiteHostname.value.trim().toLowerCase();
        const dimLevel = parseInt(ui.newSiteDim.value) || 50;
        const blurLevel = parseInt(ui.newSiteBlur.value) || 3;
        const overlayColor = ui.newSiteColor.value || '#000000';
        const grayscale = ui.newSiteGrayscale.checked;

        if (!hostname) {
            alert('Please enter a website domain (e.g. youtube.com)');
            return;
        }

        // Clean up hostname
        let cleanHostname = hostname.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

        await StorageUtils.saveSiteSettings(cleanHostname, {
            dimLevel,
            blurLevel,
            overlayColor,
            grayscale
        });

        // Clear form
        ui.newSiteHostname.value = '';
        ui.newSiteDim.value = '50';
        ui.newSiteBlur.value = '3';
        ui.newSiteColor.value = '#000000';
        ui.newSiteGrayscale.checked = false;

        await loadSitesList();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Statistics
    // ─────────────────────────────────────────────────────────────────────────

    async function updateStatsDisplay() {
        const stats = await StorageUtils.getStats();
        const today = new Date().toISOString().split('T')[0];

        // Calculate week total
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);

        let weekTotalMs = 0;
        Object.entries(stats.dailyStats || {}).forEach(([date, timeMs]) => {
            if (new Date(date) >= weekStart) {
                weekTotalMs += timeMs;
            }
        });

        ui.totalTimeDisplay.textContent = StorageUtils.formatTime(stats.totalTimeMs || 0);
        ui.sessionsDisplay.textContent = stats.sessionsCount || 0;
        ui.todayTimeDisplay.textContent = StorageUtils.formatTime(stats.dailyStats?.[today] || 0);
        ui.weekTimeDisplay.textContent = StorageUtils.formatTime(weekTotalMs);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Settings Saving
    // ─────────────────────────────────────────────────────────────────────────

    async function saveDecoySettings() {
        // Gather built-in decoys
        const selectedTabs = [];
        Object.entries(ui.builtInDecoys).forEach(([key, checkbox]) => {
            if (checkbox && checkbox.checked) {
                selectedTabs.push(key);
            }
        });

        // Get existing custom decoys
        const result = await chrome.storage.sync.get(['decoySettings']);
        const existingCustom = result.decoySettings?.customTabs || [];

        const decoyConfig = {
            enabled: ui.decoyToggle.checked,
            tabs: selectedTabs,
            customTabs: existingCustom
        };

        await chrome.storage.sync.set({ decoySettings: decoyConfig });
    }

    async function saveWidgetSetting() {
        const settings = await StorageUtils.getSettings();
        settings.widgetEnabled = ui.widgetToggle.checked;
        await StorageUtils.saveSettings(settings);

        // Notify all tabs about the change
        const allTabs = await chrome.tabs.query({});
        allTabs.forEach(tab => {
            try {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'TOGGLE_WIDGET',
                    enabled: settings.widgetEnabled
                });
            } catch (e) { }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Event Listeners
    // ─────────────────────────────────────────────────────────────────────────

    function setupEventListeners() {
        // Widget toggle
        ui.widgetToggle.addEventListener('change', saveWidgetSetting);

        // Decoy toggle
        ui.decoyToggle.addEventListener('change', function () {
            updateDecoyOptionsVisibility();
            saveDecoySettings();
        });

        // Built-in decoy checkboxes
        Object.values(ui.builtInDecoys).forEach(checkbox => {
            if (checkbox) {
                checkbox.addEventListener('change', saveDecoySettings);
            }
        });

        // Add custom decoy button
        ui.addCustomDecoyBtn.addEventListener('click', addCustomDecoy);

        // Enter key on custom decoy URL field
        ui.customDecoyUrl.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                addCustomDecoy();
            }
        });

        // Add site settings button
        ui.addSiteSettingsBtn.addEventListener('click', addNewSiteSettings);

        // Enter key on hostname field
        ui.newSiteHostname.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                addNewSiteSettings();
            }
        });

        // Reset stats
        ui.resetStatsButton.addEventListener('click', async function () {
            if (confirm('Reset all usage statistics? This cannot be undone.')) {
                await StorageUtils.resetStats();
                await updateStatsDisplay();
            }
        });

        // Shortcuts link
        ui.shortcutsLink.addEventListener('click', function (e) {
            e.preventDefault();
            navigator.clipboard.writeText('chrome://extensions/shortcuts').then(() => {
                alert('URL copied! Paste it in your address bar to customize shortcuts.');
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Start
    // ─────────────────────────────────────────────────────────────────────────

    initialize();

});
