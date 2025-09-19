// Preset signatures for the Discovery Lens
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

// Preset button event handler
export function setupPresetHandlers(signatureInput, presetButtons, announceToScreenReader, saveState) {
    presetButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            const preset = presets[button.dataset.preset];
            if (preset) {
                signatureInput.value = JSON.stringify(preset, null, 2);
                announceToScreenReader(`Loaded ${button.textContent.toLowerCase()}`);
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