/**
 * @fileoverview Keyboard navigation and accessibility module for the Discovery Lens.
 * Manages result navigation, keyboard shortcuts, and focus management.
 *
 * @module NavigationModule
 */

/** @type {number} Currently selected result index (-1 means no selection) */
let selectedResultIndex = -1;
/** @type {number|null} Timeout reference for delayed focus operations */
let focusTimeout = null;

/**
 * Sets up keyboard navigation for result items with accessibility support.
 * Configures ARIA attributes and event handlers for result navigation.
 *
 * @function setupResultNavigation
 * @param {HTMLElement} resultsContainer - Container element with result items
 */
export function setupResultNavigation(resultsContainer) {
    const resultItems = resultsContainer.querySelectorAll('.result-item');
    resultItems.forEach((item, index) => {
        item.setAttribute('tabindex', '-1');
        item.setAttribute('aria-selected', 'false');
        
        // Add keyboard navigation
        item.addEventListener('keydown', handleGlobalKeydown);
        item.addEventListener('click', () => {
            updateResultSelection(index, resultItems);
        });
    });

    // Set initial selection to first item
    if (resultItems.length > 0) {
        updateResultSelection(0, resultItems);
    }
}

/**
 * Handles keyboard navigation within results container.
 * Supports arrow keys, Home/End, Enter for activation, and shortcut keys.
 *
 * @function handleResultsKeyNavigation
 * @param {KeyboardEvent} e - Keyboard event
 * @param {HTMLElement} resultsContainer - Container with result items
 */
export function handleResultsKeyNavigation(e, resultsContainer) {
    const resultItems = resultsContainer.querySelectorAll('.result-item');
    if (resultItems.length === 0) return;

    let newIndex = selectedResultIndex;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            newIndex = selectedResultIndex < resultItems.length - 1 ? selectedResultIndex + 1 : 0;
            break;
        case 'ArrowUp':
            e.preventDefault();
            newIndex = selectedResultIndex > 0 ? selectedResultIndex - 1 : resultItems.length - 1;
            break;
        case 'Home':
            e.preventDefault();
            newIndex = 0;
            break;
        case 'End':
            e.preventDefault();
            newIndex = resultItems.length - 1;
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedResultIndex >= 0) {
                const openButton = resultItems[selectedResultIndex].querySelector('.action-btn');
                if (openButton) openButton.click();
            }
            return;
        case 'o':
            e.preventDefault();
            if (selectedResultIndex >= 0) {
                const openButton = resultItems[selectedResultIndex].querySelector('.action-btn');
                if (openButton) openButton.click();
            }
            return;
        case 't':
            e.preventDefault();
            if (selectedResultIndex >= 0) {
                const scaffoldButton = resultItems[selectedResultIndex].querySelectorAll('.action-btn')[1];
                if (scaffoldButton) scaffoldButton.click();
            }
            return;
    }

    if (newIndex !== selectedResultIndex) {
        updateResultSelection(newIndex, resultItems);
    }
}

/**
 * Updates the result selection state and UI.
 * Manages ARIA attributes, focus, and screen reader announcements.
 *
 * @function updateResultSelection
 * @param {number} newIndex - New index to select
 * @param {NodeList} resultItems - Collection of result item elements
 */
function updateResultSelection(newIndex, resultItems) {
    // Clear previous selection
    if (selectedResultIndex >= 0 && resultItems[selectedResultIndex]) {
        resultItems[selectedResultIndex].setAttribute('aria-selected', 'false');
        resultItems[selectedResultIndex].setAttribute('tabindex', '-1');
    }

    // Set new selection
    selectedResultIndex = newIndex;
    if (selectedResultIndex >= 0 && resultItems[selectedResultIndex]) {
        resultItems[selectedResultIndex].setAttribute('aria-selected', 'true');
        resultItems[selectedResultIndex].setAttribute('tabindex', '0');
        resultItems[selectedResultIndex].focus();
        
        // Update state manager if available
        if (window.stateManager) {
            window.stateManager.setState({
                ui: {
                    ...window.stateManager.getState('ui'),
                    selectedResultIndex: selectedResultIndex
                }
            });
        }
        
        // Announce selection to screen reader
        const resultPath = resultItems[selectedResultIndex].querySelector('.result-path').textContent;
        const score = resultItems[selectedResultIndex].querySelector('.result-score')?.textContent || '';
        // Use global announceToScreenReader if available
        if (window.announceToScreenReader) {
            window.announceToScreenReader(`Selected ${resultPath} ${score}`, 'assertive');
        }
    }
}

/**
 * Handles global keyboard events for navigation and shortcuts.
 * Manages escape key handling and delegates results navigation.
 *
 * @function handleGlobalKeydown
 * @param {KeyboardEvent} e - Keyboard event
 * @param {HTMLElement} resultsContainer - Container with result items
 */
export function handleGlobalKeydown(e, resultsContainer) {
    // Handle escape to clear focus/selections
    if (e.key === 'Escape') {
        selectedResultIndex = -1;
        const resultItems = resultsContainer.querySelectorAll('.result-item');
        resultItems.forEach(item => {
            item.setAttribute('aria-selected', 'false');
            item.setAttribute('tabindex', '-1');
        });
    }

    // Handle results navigation when focus is in results area
    if (resultsContainer.contains(document.activeElement) ||
        (document.activeElement && document.activeElement.classList.contains('result-item'))) {
        handleResultsKeyNavigation(e, resultsContainer);
    }
}

/**
 * Manages focus with timeout for better accessibility and performance.
 *
 * @function manageFocus
 * @param {HTMLElement} element - Element to focus
 * @param {Object} [options={}] - Focus options
 * @param {number} [options.delay=100] - Delay before focusing in milliseconds
 */
export function manageFocus(element, options = {}) {
    if (focusTimeout) {
        clearTimeout(focusTimeout);
    }
    
    focusTimeout = setTimeout(() => {
        if (element && typeof element.focus === 'function') {
            element.focus(options);
        }
    }, options.delay || 100);
}

/**
 * Resets the current selection state.
 *
 * @function resetSelection
 */
export function resetSelection() {
    selectedResultIndex = -1;
}