/*
 * Office Ninja Pro - Popup Controller
 * Version 3.2
 * 
 * This script handles all the popup UI interactions. It connects the sliders,
 * buttons, and toggles in the popup to the actual functionality in the content
 * script running on the page.
 */

document.addEventListener('DOMContentLoaded', async function () {

    // ─────────────────────────────────────────────────────────────────────────
    // Grab all the UI elements we'll need to work with
    // ─────────────────────────────────────────────────────────────────────────

    const ui = {
        // Sliders and their value displays
        dimSlider: document.getElementById('dimmerSlider'),
        blurSlider: document.getElementById('blurSlider'),
        dimValue: document.getElementById('dimValue'),
        blurValue: document.getElementById('blurValue'),

        // Toggles
        grayscaleToggle: document.getElementById('grayscaleToggle'),
        perSiteToggle: document.getElementById('perSiteToggle'),

        // Buttons
        panicButton: document.getElementById('panicBtn'),
        bossButton: document.getElementById('bossBtn'),
        resetButton: document.getElementById('resetBtn'),
        restoreTabButton: document.getElementById('restoreTabBtn'),
        openOptionsLink: document.getElementById('openOptions'),

        // Preset buttons (quick settings)
        presetButtons: document.querySelectorAll('.preset-btn'),

        // Color theme buttons
        colorButtons: document.querySelectorAll('.color-btn'),

        // Tab disguise buttons
        disguiseButtons: document.querySelectorAll('.disguise-btn'),
        disguiseStatus: document.getElementById('disguiseStatus'),

        // Site info display
        hostnameDisplay: document.getElementById('currentHostname'),
        siteStatusDisplay: document.getElementById('siteStatus'),

        // Stats display
        totalTimeDisplay: document.getElementById('totalTime'),
        todayTimeDisplay: document.getElementById('todayTime')
    };

    // Quick preset configurations
    const quickPresets = {
        night: { dim: 60, blur: 2, gray: false },
        focus: { dim: 40, blur: 5, gray: true },
        stealth: { dim: 80, blur: 3, gray: false }
    };

    // Keep track of the current state
    let activeTab = null;
    let currentHostname = null;
    let selectedOverlayColor = '#000000';
    let usingSiteSpecificSettings = false;
    let startTime = Date.now();  // For session tracking

    // ─────────────────────────────────────────────────────────────────────────
    // Initialization
    // Run this when the popup opens
    // ─────────────────────────────────────────────────────────────────────────

    async function initializePopup() {
        // Figure out which tab we're working with
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        activeTab = tabs[0];

        // Extract and display the hostname
        if (activeTab && activeTab.url) {
            try {
                const url = new URL(activeTab.url);
                currentHostname = url.hostname;
                ui.hostnameDisplay.textContent = currentHostname;
            } catch (e) {
                currentHostname = null;
                ui.hostnameDisplay.textContent = 'N/A';
            }
        }

        // Load the saved settings and update the UI
        await loadSavedSettings();
        await updateStatsDisplay();
        await checkCurrentDisguiseStatus();

        // Wire up all the event handlers
        setupEventListeners();

        // Track this session
        StorageUtils.incrementSession();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Settings Management
    // Load and save the user's preferences
    // ─────────────────────────────────────────────────────────────────────────

    async function loadSavedSettings() {
        // First check if there are site-specific settings
        if (currentHostname) {
            const siteConfig = await StorageUtils.getSiteSettings(currentHostname);

            if (siteConfig) {
                // This site has custom settings
                usingSiteSpecificSettings = true;
                ui.perSiteToggle.checked = true;
                ui.siteStatusDisplay.textContent = 'Using site-specific settings';
                applyConfigToUI(siteConfig);
                return;
            }
        }

        // No site-specific settings, use global ones
        const globalConfig = await StorageUtils.getSettings();
        ui.siteStatusDisplay.textContent = 'Using global settings';
        applyConfigToUI(globalConfig);
    }

    function applyConfigToUI(config) {
        // Update sliders
        ui.dimSlider.value = config.dimLevel || 0;
        ui.blurSlider.value = config.blurLevel || 0;
        ui.grayscaleToggle.checked = config.grayscale || false;
        selectedOverlayColor = config.overlayColor || '#000000';

        // Update the value displays
        updateValueDisplays();

        // Highlight the active color button
        highlightActiveColor();
    }

    function updateValueDisplays() {
        ui.dimValue.textContent = ui.dimSlider.value + '%';
        ui.blurValue.textContent = ui.blurSlider.value + 'px';
    }

    function highlightActiveColor() {
        ui.colorButtons.forEach(button => {
            const isActive = button.dataset.color === selectedOverlayColor;
            button.classList.toggle('active', isActive);
        });
    }

    function getCurrentConfig() {
        return {
            dimLevel: parseInt(ui.dimSlider.value),
            blurLevel: parseInt(ui.blurSlider.value),
            grayscale: ui.grayscaleToggle.checked,
            overlayColor: selectedOverlayColor
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Tab Communication
    // Send commands to the content script on the active page
    // ─────────────────────────────────────────────────────────────────────────

    async function sendSettingsToPage() {
        const config = getCurrentConfig();
        updateValueDisplays();

        // Save to storage (either site-specific or global)
        if (usingSiteSpecificSettings && currentHostname) {
            await StorageUtils.saveSiteSettings(currentHostname, config);
            ui.siteStatusDisplay.textContent = 'Using site-specific settings';
        } else {
            await StorageUtils.saveSettings(config);
            ui.siteStatusDisplay.textContent = 'Using global settings';
        }

        // Tell the content script to apply the new settings
        if (activeTab && activeTab.id) {
            try {
                await chrome.tabs.sendMessage(activeTab.id, {
                    action: 'UPDATE_STYLES',
                    data: {
                        dim: config.dimLevel,
                        blur: config.blurLevel,
                        gray: config.grayscale,
                        color: config.overlayColor
                    }
                });
            } catch (error) {
                console.log('Could not reach the page:', error);
            }
        }

        // Clear any active preset highlighting
        ui.presetButtons.forEach(btn => btn.classList.remove('active'));
    }

    async function applyQuickPreset(presetName) {
        const preset = quickPresets[presetName];
        if (!preset) return;

        // Apply the preset values to the UI
        ui.dimSlider.value = preset.dim;
        ui.blurSlider.value = preset.blur;
        ui.grayscaleToggle.checked = preset.gray;

        // Highlight this preset as active
        ui.presetButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === presetName);
        });

        // Send to the page
        await sendSettingsToPage();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Tab Disguise Feature
    // Make your tab look like something work-related
    // ─────────────────────────────────────────────────────────────────────────

    async function checkCurrentDisguiseStatus() {
        if (!activeTab || !activeTab.id) return;

        try {
            const response = await chrome.tabs.sendMessage(activeTab.id, {
                action: 'GET_DISGUISE_STATUS'
            });

            if (response && response.isDisguised) {
                ui.disguiseStatus.textContent = response.currentDisguise;
                highlightActiveDisguise(response.currentDisguise);
            } else {
                ui.disguiseStatus.textContent = 'Off';
            }
        } catch (error) {
            // Content script might not be loaded yet
            ui.disguiseStatus.textContent = 'Off';
        }
    }

    async function applyTabDisguise(presetName) {
        if (!activeTab || !activeTab.id) return;

        try {
            const response = await chrome.tabs.sendMessage(activeTab.id, {
                action: 'APPLY_DISGUISE',
                preset: presetName
            });

            if (response && response.success) {
                ui.disguiseStatus.textContent = presetName;
                highlightActiveDisguise(presetName);
            }
        } catch (error) {
            console.log('Could not apply disguise:', error);
        }
    }

    async function removeTabDisguise() {
        if (!activeTab || !activeTab.id) return;

        try {
            await chrome.tabs.sendMessage(activeTab.id, {
                action: 'REMOVE_DISGUISE'
            });

            ui.disguiseStatus.textContent = 'Off';
            ui.disguiseButtons.forEach(btn => btn.classList.remove('active'));
        } catch (error) {
            console.log('Could not remove disguise:', error);
        }
    }

    function highlightActiveDisguise(activePreset) {
        ui.disguiseButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.disguise === activePreset);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Stats Display
    // Show how long the user has been in stealth mode
    // ─────────────────────────────────────────────────────────────────────────

    async function updateStatsDisplay() {
        const stats = await StorageUtils.getStats();
        const today = new Date().toISOString().split('T')[0];

        ui.totalTimeDisplay.textContent = StorageUtils.formatTime(stats.totalTimeMs);
        ui.todayTimeDisplay.textContent = StorageUtils.formatTime(stats.dailyStats[today] || 0);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Event Handlers
    // Wire up all the UI interactions
    // ─────────────────────────────────────────────────────────────────────────

    function setupEventListeners() {
        // Main sliders
        ui.dimSlider.addEventListener('input', sendSettingsToPage);
        ui.blurSlider.addEventListener('input', sendSettingsToPage);
        ui.grayscaleToggle.addEventListener('change', sendSettingsToPage);

        // Quick preset buttons
        ui.presetButtons.forEach(button => {
            button.addEventListener('click', () => {
                applyQuickPreset(button.dataset.preset);
            });
        });

        // Color theme buttons
        ui.colorButtons.forEach(button => {
            button.addEventListener('click', () => {
                selectedOverlayColor = button.dataset.color;
                highlightActiveColor();
                sendSettingsToPage();
            });
        });

        // Tab disguise buttons
        ui.disguiseButtons.forEach(button => {
            button.addEventListener('click', () => {
                applyTabDisguise(button.dataset.disguise);
            });
        });

        // Restore original tab button
        ui.restoreTabButton.addEventListener('click', removeTabDisguise);

        // Per-site settings toggle
        ui.perSiteToggle.addEventListener('change', async () => {
            usingSiteSpecificSettings = ui.perSiteToggle.checked;

            if (usingSiteSpecificSettings && currentHostname) {
                // Save current settings for this specific site
                await StorageUtils.saveSiteSettings(currentHostname, getCurrentConfig());
                ui.siteStatusDisplay.textContent = 'Using site-specific settings';
            } else if (currentHostname) {
                // Remove site-specific settings and use global
                await StorageUtils.deleteSiteSettings(currentHostname);
                ui.siteStatusDisplay.textContent = 'Using global settings';

                // Reload global settings
                const globalConfig = await StorageUtils.getSettings();
                applyConfigToUI(globalConfig);
                await sendSettingsToPage();
            }
        });

        // Panic button - max stealth
        ui.panicButton.addEventListener('click', async () => {
            ui.dimSlider.value = 95;
            ui.blurSlider.value = 10;
            ui.grayscaleToggle.checked = true;
            await sendSettingsToPage();
        });

        // Boss key - open a safe tab
        ui.bossButton.addEventListener('click', () => {
            chrome.tabs.create({ url: 'https://docs.google.com/document/create' });
            window.close();
        });

        // Reset everything
        ui.resetButton.addEventListener('click', async () => {
            ui.dimSlider.value = 0;
            ui.blurSlider.value = 0;
            ui.grayscaleToggle.checked = false;
            selectedOverlayColor = '#000000';
            highlightActiveColor();
            await sendSettingsToPage();
            await removeTabDisguise();
        });

        // Open settings page
        ui.openOptionsLink.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Session Tracking
    // Track how long the popup has been open
    // ─────────────────────────────────────────────────────────────────────────

    window.addEventListener('beforeunload', async () => {
        const sessionLength = Date.now() - startTime;
        if (sessionLength > 1000) {
            await StorageUtils.updateStats(sessionLength);
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Start everything
    // ─────────────────────────────────────────────────────────────────────────

    initializePopup();

});
