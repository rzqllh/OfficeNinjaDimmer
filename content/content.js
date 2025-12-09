/*
 * Office Ninja Pro - Content Script
 * Version 3.2
 * 
 * This script handles all the visual effects on web pages - the dimming overlay,
 * blur effects, and the floating control widget. It also manages tab disguise
 * functionality to make your current tab look like something work-related.
 */

(function () {

    // Quick check to prevent this script from running twice on the same page
    if (window.ninjaProAlreadyLoaded) return;
    window.ninjaProAlreadyLoaded = true;

    // ─────────────────────────────────────────────────────────────────────────
    // Configuration and State
    // ─────────────────────────────────────────────────────────────────────────

    // These are the disguise presets - each one makes your tab look like
    // a different productive Google app
    const disguisePresets = {
        sheets: {
            title: 'Q4 Budget Analysis - Google Sheets',
            favicon: 'https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico'
        },
        gmail: {
            title: 'Inbox (3) - Gmail',
            favicon: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico'
        },
        docs: {
            title: 'Meeting Notes - Google Docs',
            favicon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico'
        },
        calendar: {
            title: 'Team Sync - Google Calendar',
            favicon: 'https://calendar.google.com/googlecalendar/images/favicons_2020q4/calendar_31.ico'
        }
    };

    // Keep track of the original tab info so we can restore it later
    let originalTabInfo = {
        title: document.title,
        favicon: null
    };

    // Current visual settings - starts with everything off
    let visualSettings = {
        dimLevel: 0,
        blurAmount: 0,
        useGrayscale: false,
        overlayColor: '#000000'
    };

    // Other state variables
    let stealthModeActive = false;
    let showFloatingWidget = true;
    let isTabDisguised = false;
    let currentDisguise = null;
    let sessionActiveTime = 0;

    // References to our overlay elements (we'll create these when needed)
    let dimOverlayElement = null;
    let blurOverlayElement = null;
    let floatingWidgetElement = null;
    let widgetControlPanel = null;

    // ─────────────────────────────────────────────────────────────────────────
    // Overlay Management
    // These functions create and control the visual effects on the page
    // ─────────────────────────────────────────────────────────────────────────

    function setupOverlayElements() {
        // Create the dimming layer if it doesn't exist yet
        if (!dimOverlayElement) {
            dimOverlayElement = document.createElement('div');
            dimOverlayElement.id = 'office-ninja-pro-overlay';

            // Style it to cover the entire screen
            Object.assign(dimOverlayElement.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                backgroundColor: visualSettings.overlayColor,
                zIndex: '2147483643',
                pointerEvents: 'none',  // Let clicks pass through
                transition: 'opacity 0.3s ease, background-color 0.3s ease',
                opacity: '0'
            });

            document.body.appendChild(dimOverlayElement);
        }

        // Create the blur layer separately (uses backdrop-filter for better performance)
        if (!blurOverlayElement) {
            blurOverlayElement = document.createElement('div');
            blurOverlayElement.id = 'office-ninja-pro-blur';

            Object.assign(blurOverlayElement.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                zIndex: '2147483642',
                pointerEvents: 'none',
                transition: 'backdrop-filter 0.3s ease',
                backdropFilter: 'none'
            });

            document.body.appendChild(blurOverlayElement);
        }
    }

    function applyVisualEffects() {
        // Make sure our overlay elements exist
        setupOverlayElements();

        // Apply the dimming effect (opacity controls how dark it gets)
        dimOverlayElement.style.backgroundColor = visualSettings.overlayColor;
        dimOverlayElement.style.opacity = visualSettings.dimLevel / 100;

        // Build the blur/grayscale filter string
        let backdropFilters = [];

        if (visualSettings.blurAmount > 0) {
            backdropFilters.push(`blur(${visualSettings.blurAmount}px)`);
        }

        if (visualSettings.useGrayscale) {
            backdropFilters.push('grayscale(100%)');
        }

        // Apply the filters (or remove them if none are active)
        const filterValue = backdropFilters.length > 0 ? backdropFilters.join(' ') : 'none';
        blurOverlayElement.style.backdropFilter = filterValue;
        blurOverlayElement.style.webkitBackdropFilter = filterValue;  // Safari support

        // Update our state flag
        stealthModeActive = visualSettings.dimLevel > 0 ||
            visualSettings.blurAmount > 0 ||
            visualSettings.useGrayscale;

        // Update the widget button to show active state
        updateWidgetButtonState();
    }

    function clearAllEffects() {
        if (dimOverlayElement) {
            dimOverlayElement.style.opacity = '0';
        }

        if (blurOverlayElement) {
            blurOverlayElement.style.backdropFilter = 'none';
            blurOverlayElement.style.webkitBackdropFilter = 'none';
        }

        stealthModeActive = false;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Tab Disguise Feature
    // This lets you change your tab's title and icon to look like work stuff
    // ─────────────────────────────────────────────────────────────────────────

    function saveOriginalTabInfo() {
        // Remember the original title so we can restore it
        if (!originalTabInfo.title) {
            originalTabInfo.title = document.title;
        }

        // Find and save the current favicon
        const existingFavicon = document.querySelector('link[rel*="icon"]');
        if (existingFavicon && !originalTabInfo.favicon) {
            originalTabInfo.favicon = existingFavicon.href;
        }
    }

    function applyTabDisguise(presetName) {
        const preset = disguisePresets[presetName];
        if (!preset) return false;

        // Save original info before we change anything
        saveOriginalTabInfo();

        // Change the page title
        document.title = preset.title;

        // Update or create the favicon link
        let faviconLink = document.querySelector('link[rel*="icon"]');

        if (!faviconLink) {
            faviconLink = document.createElement('link');
            faviconLink.rel = 'icon';
            document.head.appendChild(faviconLink);
        }

        faviconLink.href = preset.favicon;

        // Update state
        isTabDisguised = true;
        currentDisguise = presetName;

        return true;
    }

    function removeTabDisguise() {
        if (!isTabDisguised) return;

        // Restore the original title
        if (originalTabInfo.title) {
            document.title = originalTabInfo.title;
        }

        // Restore the original favicon
        if (originalTabInfo.favicon) {
            const faviconLink = document.querySelector('link[rel*="icon"]');
            if (faviconLink) {
                faviconLink.href = originalTabInfo.favicon;
            }
        }

        isTabDisguised = false;
        currentDisguise = null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Floating Widget
    // The little ninja button that floats on the page for quick access
    // ─────────────────────────────────────────────────────────────────────────

    function createFloatingWidget() {
        // Don't create duplicates
        if (floatingWidgetElement || document.getElementById('office-ninja-widget')) {
            floatingWidgetElement = document.getElementById('office-ninja-widget');
            return;
        }

        if (!showFloatingWidget) return;

        // Load our widget styles
        if (!document.getElementById('ninja-widget-styles')) {
            const styleLink = document.createElement('link');
            styleLink.id = 'ninja-widget-styles';
            styleLink.rel = 'stylesheet';
            styleLink.href = chrome.runtime.getURL('content/widget.css');
            document.head.appendChild(styleLink);
        }

        // Build the widget HTML
        floatingWidgetElement = document.createElement('div');
        floatingWidgetElement.id = 'office-ninja-widget';
        floatingWidgetElement.innerHTML = `
            <div class="ninja-widget-panel">
                <div class="widget-slider-group">
                    <div class="widget-label">
                        <span>Dim</span>
                        <span class="widget-dim-value">0%</span>
                    </div>
                    <input type="range" class="widget-slider widget-dim-slider" min="0" max="95" value="0">
                </div>
                <div class="widget-slider-group">
                    <div class="widget-label">
                        <span>Blur</span>
                        <span class="widget-blur-value">0px</span>
                    </div>
                    <input type="range" class="widget-slider widget-blur-slider" min="0" max="20" value="0">
                </div>
                <div class="widget-toggle-row">
                    <span class="widget-toggle-label">Grayscale</span>
                    <label class="widget-switch">
                        <input type="checkbox" class="widget-gray-toggle">
                        <span class="widget-switch-slider"></span>
                    </label>
                </div>
            </div>
            <button class="ninja-widget-btn" title="Office Ninja Pro">🥷</button>
        `;

        // Position it (try to load saved position first)
        try {
            const savedPosition = localStorage.getItem('ninjaWidgetPos');
            if (savedPosition) {
                const pos = JSON.parse(savedPosition);
                floatingWidgetElement.style.right = (pos.right || 20) + 'px';
                floatingWidgetElement.style.bottom = (pos.bottom || 20) + 'px';
            } else {
                floatingWidgetElement.style.right = '20px';
                floatingWidgetElement.style.bottom = '20px';
            }
        } catch (e) {
            floatingWidgetElement.style.right = '20px';
            floatingWidgetElement.style.bottom = '20px';
        }

        document.body.appendChild(floatingWidgetElement);
        widgetControlPanel = floatingWidgetElement.querySelector('.ninja-widget-panel');

        // Set up all the interactions
        setupWidgetInteractions();
        syncWidgetWithCurrentSettings();
    }

    function setupWidgetInteractions() {
        if (!floatingWidgetElement) return;

        const mainButton = floatingWidgetElement.querySelector('.ninja-widget-btn');
        const dimSlider = floatingWidgetElement.querySelector('.widget-dim-slider');
        const blurSlider = floatingWidgetElement.querySelector('.widget-blur-slider');
        const grayscaleToggle = floatingWidgetElement.querySelector('.widget-gray-toggle');
        const dimDisplay = floatingWidgetElement.querySelector('.widget-dim-value');
        const blurDisplay = floatingWidgetElement.querySelector('.widget-blur-value');

        if (!mainButton) return;

        // Track if we're dragging (to prevent click after drag)
        let isDragging = false;
        let dragStartX, dragStartY;

        // Click the button to toggle the control panel
        mainButton.addEventListener('click', () => {
            if (!isDragging) {
                widgetControlPanel.classList.toggle('visible');
            }
            isDragging = false;
        });

        // Make the widget draggable
        mainButton.addEventListener('mousedown', (event) => {
            event.preventDefault();
            dragStartX = event.clientX;
            dragStartY = event.clientY;

            const handleMouseMove = (moveEvent) => {
                const deltaX = Math.abs(moveEvent.clientX - dragStartX);
                const deltaY = Math.abs(moveEvent.clientY - dragStartY);

                // Only count as dragging if we moved a bit
                if (deltaX > 5 || deltaY > 5) {
                    isDragging = true;
                    const newRight = window.innerWidth - moveEvent.clientX - 24;
                    const newBottom = window.innerHeight - moveEvent.clientY - 24;

                    // Keep it on screen
                    floatingWidgetElement.style.right = Math.max(0, Math.min(window.innerWidth - 48, newRight)) + 'px';
                    floatingWidgetElement.style.bottom = Math.max(0, Math.min(window.innerHeight - 48, newBottom)) + 'px';
                }
            };

            const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);

                // Save the new position
                try {
                    localStorage.setItem('ninjaWidgetPos', JSON.stringify({
                        right: parseInt(floatingWidgetElement.style.right) || 20,
                        bottom: parseInt(floatingWidgetElement.style.bottom) || 20
                    }));
                } catch (e) { }
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });

        // Handle slider inputs
        if (dimSlider) {
            dimSlider.addEventListener('input', () => {
                visualSettings.dimLevel = parseInt(dimSlider.value);
                dimDisplay.textContent = visualSettings.dimLevel + '%';
                applyVisualEffects();
                saveSettingsToStorage();
            });
        }

        if (blurSlider) {
            blurSlider.addEventListener('input', () => {
                visualSettings.blurAmount = parseInt(blurSlider.value);
                blurDisplay.textContent = visualSettings.blurAmount + 'px';
                applyVisualEffects();
                saveSettingsToStorage();
            });
        }

        if (grayscaleToggle) {
            grayscaleToggle.addEventListener('change', () => {
                visualSettings.useGrayscale = grayscaleToggle.checked;
                applyVisualEffects();
                saveSettingsToStorage();
            });
        }

        // Close the panel when clicking elsewhere on the page
        document.addEventListener('click', (event) => {
            if (floatingWidgetElement && widgetControlPanel && !floatingWidgetElement.contains(event.target)) {
                widgetControlPanel.classList.remove('visible');
            }
        });
    }

    function syncWidgetWithCurrentSettings() {
        if (!floatingWidgetElement) return;

        const dimSlider = floatingWidgetElement.querySelector('.widget-dim-slider');
        const blurSlider = floatingWidgetElement.querySelector('.widget-blur-slider');
        const grayscaleToggle = floatingWidgetElement.querySelector('.widget-gray-toggle');
        const dimDisplay = floatingWidgetElement.querySelector('.widget-dim-value');
        const blurDisplay = floatingWidgetElement.querySelector('.widget-blur-value');

        if (dimSlider && dimDisplay) {
            dimSlider.value = visualSettings.dimLevel;
            dimDisplay.textContent = visualSettings.dimLevel + '%';
        }

        if (blurSlider && blurDisplay) {
            blurSlider.value = visualSettings.blurAmount;
            blurDisplay.textContent = visualSettings.blurAmount + 'px';
        }

        if (grayscaleToggle) {
            grayscaleToggle.checked = visualSettings.useGrayscale;
        }

        updateWidgetButtonState();
    }

    function updateWidgetButtonState() {
        if (!floatingWidgetElement) return;

        const mainButton = floatingWidgetElement.querySelector('.ninja-widget-btn');
        if (mainButton) {
            mainButton.classList.toggle('active', stealthModeActive);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Storage Helpers
    // Sync our settings with Chrome's storage
    // ─────────────────────────────────────────────────────────────────────────

    function saveSettingsToStorage() {
        try {
            chrome.storage.sync.get(['siteSettings'], (result) => {
                const currentHostname = window.location.hostname;
                const allSiteSettings = result.siteSettings || {};

                // Check if this site has custom settings
                if (allSiteSettings[currentHostname]) {
                    allSiteSettings[currentHostname] = {
                        dimLevel: visualSettings.dimLevel,
                        blurLevel: visualSettings.blurAmount,
                        grayscale: visualSettings.useGrayscale,
                        overlayColor: visualSettings.overlayColor
                    };
                    chrome.storage.sync.set({ siteSettings: allSiteSettings });
                } else {
                    // Otherwise save as global settings
                    chrome.storage.sync.set({
                        globalSettings: {
                            dimLevel: visualSettings.dimLevel,
                            blurLevel: visualSettings.blurAmount,
                            grayscale: visualSettings.useGrayscale,
                            overlayColor: visualSettings.overlayColor
                        }
                    });
                }
            });
        } catch (error) {
            console.log('Failed to save settings:', error);
        }
    }

    function loadSettingsFromStorage() {
        try {
            chrome.storage.sync.get(['globalSettings', 'siteSettings'], (result) => {
                if (chrome.runtime.lastError) {
                    console.log('Error loading settings:', chrome.runtime.lastError);
                    return;
                }

                const currentHostname = window.location.hostname;
                const allSiteSettings = result.siteSettings || {};

                // Check for site-specific settings first
                if (allSiteSettings[currentHostname]) {
                    const siteConfig = allSiteSettings[currentHostname];
                    visualSettings = {
                        dimLevel: siteConfig.dimLevel || 0,
                        blurAmount: siteConfig.blurLevel || 0,
                        useGrayscale: siteConfig.grayscale || false,
                        overlayColor: siteConfig.overlayColor || '#000000'
                    };
                } else if (result.globalSettings) {
                    // Fall back to global settings
                    const globalConfig = result.globalSettings;
                    visualSettings = {
                        dimLevel: globalConfig.dimLevel || 0,
                        blurAmount: globalConfig.blurLevel || 0,
                        useGrayscale: globalConfig.grayscale || false,
                        overlayColor: globalConfig.overlayColor || '#000000'
                    };
                }

                syncWidgetWithCurrentSettings();
            });
        } catch (error) {
            console.log('Error loading settings:', error);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Message Handling
    // Listen for commands from the popup and background script
    // ─────────────────────────────────────────────────────────────────────────

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
            switch (message.action) {

                case 'UPDATE_STYLES':
                    // The popup sent new visual settings
                    visualSettings = {
                        dimLevel: message.data.dim || 0,
                        blurAmount: message.data.blur || 0,
                        useGrayscale: message.data.gray || false,
                        overlayColor: message.data.color || '#000000'
                    };
                    applyVisualEffects();
                    syncWidgetWithCurrentSettings();
                    break;

                case 'TOGGLE_STEALTH':
                    // Quick toggle via keyboard shortcut
                    if (stealthModeActive && (visualSettings.dimLevel > 0 || visualSettings.blurAmount > 0)) {
                        // Currently active, so turn it off (but remember settings)
                        const rememberedSettings = { ...visualSettings };
                        visualSettings = { dimLevel: 0, blurAmount: 0, useGrayscale: false, overlayColor: visualSettings.overlayColor };
                        applyVisualEffects();
                        visualSettings = rememberedSettings;
                        stealthModeActive = false;
                    } else {
                        // Turn it on with existing settings (or defaults)
                        if (visualSettings.dimLevel === 0 && visualSettings.blurAmount === 0) {
                            visualSettings = { dimLevel: 85, blurAmount: 5, useGrayscale: true, overlayColor: visualSettings.overlayColor };
                        }
                        applyVisualEffects();
                    }
                    syncWidgetWithCurrentSettings();
                    break;

                case 'APPLY_DISGUISE':
                    // Change tab appearance to look like work
                    const success = applyTabDisguise(message.preset);
                    sendResponse({ success: success, disguise: currentDisguise });
                    break;

                case 'REMOVE_DISGUISE':
                    // Restore original tab appearance
                    removeTabDisguise();
                    sendResponse({ success: true });
                    break;

                case 'GET_DISGUISE_STATUS':
                    // Check if tab is currently disguised
                    sendResponse({
                        isDisguised: isTabDisguised,
                        currentDisguise: currentDisguise
                    });
                    break;

                case 'TOGGLE_WIDGET':
                    // Show or hide the floating widget
                    showFloatingWidget = message.enabled;
                    if (showFloatingWidget && !floatingWidgetElement) {
                        createFloatingWidget();
                    } else if (!showFloatingWidget && floatingWidgetElement) {
                        floatingWidgetElement.remove();
                        floatingWidgetElement = null;
                    }
                    break;

                case 'GET_STATUS':
                    // Return current state
                    sendResponse({
                        isActive: stealthModeActive,
                        settings: visualSettings,
                        isDisguised: isTabDisguised,
                        disguise: currentDisguise
                    });
                    break;
            }
        } catch (error) {
            console.log('Message handling error:', error);
        }

        return true;  // Required for async response
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Initialization
    // Set everything up when the script loads
    // ─────────────────────────────────────────────────────────────────────────

    function initialize() {
        // Load any saved settings
        loadSettingsFromStorage();

        // Create the floating widget after a short delay
        // (gives the page time to fully render)
        const safelyCreateWidget = () => {
            try {
                createFloatingWidget();
            } catch (error) {
                console.log('Widget creation failed:', error);
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', safelyCreateWidget);
        } else {
            setTimeout(safelyCreateWidget, 300);
        }

        // Periodically check that our overlays still exist
        // (some pages might try to remove unknown elements)
        setInterval(() => {
            const overlayStillExists = document.getElementById('office-ninja-pro-overlay');
            const blurStillExists = document.getElementById('office-ninja-pro-blur');

            if (stealthModeActive && (!overlayStillExists || !blurStillExists)) {
                // Our overlays got removed somehow, recreate them
                dimOverlayElement = null;
                blurOverlayElement = null;
                applyVisualEffects();
            }

            // Also check the widget
            const widgetStillExists = document.getElementById('office-ninja-widget');
            if (showFloatingWidget && !widgetStillExists && !floatingWidgetElement) {
                safelyCreateWidget();
            } else if (widgetStillExists && !floatingWidgetElement) {
                floatingWidgetElement = widgetStillExists;
                widgetControlPanel = floatingWidgetElement.querySelector('.ninja-widget-panel');
            }
        }, 2000);

        // Track how long stealth mode is active (for stats)
        setInterval(() => {
            if (stealthModeActive) {
                sessionActiveTime += 1000;

                // Save stats every minute
                if (sessionActiveTime % 60000 === 0) {
                    try {
                        chrome.storage.local.get(['stats'], (result) => {
                            if (chrome.runtime.lastError) return;

                            const stats = result.stats || { totalTimeMs: 0, dailyStats: {} };
                            const today = new Date().toISOString().split('T')[0];

                            stats.totalTimeMs += 60000;
                            stats.dailyStats[today] = (stats.dailyStats[today] || 0) + 60000;

                            chrome.storage.local.set({ stats });
                        });
                    } catch (e) { }
                }
            }
        }, 1000);
    }

    // Start everything up
    if (document.body) {
        initialize();
    } else {
        document.addEventListener('DOMContentLoaded', initialize);
    }

})();
