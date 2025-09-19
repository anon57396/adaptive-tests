// Keyboard navigation and accessibility functionality

let selectedResultIndex = -1;
let focusTimeout = null;

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
        
        // Announce selection to screen reader
        const resultPath = resultItems[selectedResultIndex].querySelector('.result-path').textContent;
        const score = resultItems[selectedResultIndex].querySelector('.result-score')?.textContent || '';
        // Use global announceToScreenReader if available
        if (window.announceToScreenReader) {
            window.announceToScreenReader(`Selected ${resultPath} ${score}`, 'assertive');
        }
    }
}

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

export function resetSelection() {
    selectedResultIndex = -1;
}