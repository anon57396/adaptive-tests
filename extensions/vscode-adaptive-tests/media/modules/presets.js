/**
 * @fileoverview Preset signatures module for the Discovery Lens.
 * Provides predefined test signatures and manages preset selection functionality.
 *
 * @module PresetModule
 */

/**
 * Collection of predefined test signature presets for common patterns.
 * @type {Object}
 * @readonly
 */
export const presets = {
    class: {
        name: 'Calculator',
        type: 'class',
        methods: ['add', 'subtract', 'multiply', 'divide']
    },
    function: {
        name: 'processData',
        type: 'function'
    },
    interface: {
        name: 'UserRepository',
        type: 'interface',
        methods: ['findById', 'save', 'delete']
    }
};

/**
 * Sets up event handlers for preset buttons with keyboard navigation support.
 * Integrates with state manager if available and provides accessibility features.
 *
 * @function setupPresetHandlers
 * @param {HTMLInputElement} signatureInput - Signature input element
 * @param {NodeList} presetButtons - Collection of preset button elements
 * @param {Function} announceToScreenReader - Function for screen reader announcements
 * @param {Function} saveState - Function to save application state
 */
export function setupPresetHandlers(signatureInput, presetButtons, announceToScreenReader, saveState) {
    presetButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            const preset = presets[button.dataset.preset];
            if (preset) {
                signatureInput.value = JSON.stringify(preset, null, 2);
                announceToScreenReader(`Loaded ${button.textContent.toLowerCase()}`);
                
                // Update state manager if available
                if (window.stateManager) {
                    window.stateManager.setState({
                        lastSignature: preset,
                        ui: {
                            ...window.stateManager.getState('ui'),
                            selectedPreset: button.dataset.preset
                        }
                    });
                }
                
                saveState();
                // Focus back to input for immediate editing
                signatureInput.focus();
            }
        });

        button.addEventListener('keydown', (e) => {
            handlePresetKeyNavigation(e, index, presetButtons);
        });
    });
}

/**
 * Handles keyboard navigation for preset buttons.
 * Supports arrow keys, Home/End navigation, and activation with Enter/Space.
 *
 * @function handlePresetKeyNavigation
 * @param {KeyboardEvent} e - Keyboard event
 * @param {number} currentIndex - Current button index
 * @param {NodeList} presetButtons - Collection of preset button elements
 */
function handlePresetKeyNavigation(e, currentIndex, presetButtons) {
    let targetIndex = currentIndex;
    
    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            targetIndex = currentIndex > 0 ? currentIndex - 1 : presetButtons.length - 1;
            break;
        case 'ArrowRight':
            e.preventDefault();
            targetIndex = currentIndex < presetButtons.length - 1 ? currentIndex + 1 : 0;
            break;
        case 'Home':
            e.preventDefault();
            targetIndex = 0;
            break;
        case 'End':
            e.preventDefault();
            targetIndex = presetButtons.length - 1;
            break;
        case 'Enter':
        case ' ':
            e.preventDefault();
            presetButtons[currentIndex].click();
            return;
    }
    
    if (targetIndex !== currentIndex) {
        presetButtons[targetIndex].focus();
    }
}