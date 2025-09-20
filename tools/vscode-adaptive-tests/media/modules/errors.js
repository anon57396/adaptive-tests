/**
 * @fileoverview Error handling and display module for the Discovery Lens.
 * Manages error categorization, display, and user interaction with error states.
 *
 * @module ErrorsModule
 */

/**
 * Error type definitions with display configuration.
 * @type {Object}
 * @readonly
 */
const ERROR_TYPES = {
    VALIDATION: {
        category: 'validation',
        icon: '⚠️',
        color: 'warning'
    },
    NETWORK: {
        category: 'network',
        icon: '🔌',
        color: 'error'
    },
    DISCOVERY: {
        category: 'discovery',
        icon: '🔍',
        color: 'info'
    },
    UNKNOWN: {
        category: 'unknown',
        icon: '❌',
        color: 'error'
    }
};

/**
 * Displays an error message with enhanced structure and actions.
 * Creates categorized error display with appropriate styling and user actions.
 *
 * @function showError
 * @param {string} message - Error message to display
 * @param {HTMLElement} errorSection - Error display section element
 * @param {HTMLElement} errorMessage - Error message container element
 * @param {HTMLElement} resultsSection - Results section to hide during error
 * @param {Function} announceToScreenReader - Function for accessibility announcements
 * @param {Function} manageFocus - Function for focus management
 * @param {string} [errorType='UNKNOWN'] - Error type for categorization
 * @param {Object} [originalSignature=null] - Original signature for retry functionality
 */
export function showError(message, errorSection, errorMessage, resultsSection, announceToScreenReader, manageFocus, errorType = 'UNKNOWN', originalSignature = null) {
    const errorConfig = ERROR_TYPES[errorType] || ERROR_TYPES.UNKNOWN;
    
    // Create enhanced error display structure if it doesn't exist
    setupErrorStructure(errorSection);
    
    // Update error category
    const categoryElement = errorSection.querySelector('#error-category') || errorSection.querySelector('.error-category');
    if (categoryElement) {
        categoryElement.textContent = errorConfig.category;
        categoryElement.className = `error-category ${errorConfig.category}`;
    }
    
    // Update error icon
    const errorIcon = errorSection.querySelector('.error-icon');
    if (errorIcon) {
        errorIcon.textContent = errorConfig.icon;
    }
    
    // Update error message
    errorMessage.textContent = message;
    
    // Update error description with helpful guidance
    const descriptionElement = errorSection.querySelector('#error-description') || errorSection.querySelector('.error-description');
    if (descriptionElement) {
        descriptionElement.textContent = getErrorDescription(errorType, message);
    }
    
    // Setup error actions
    setupErrorActions(errorType, originalSignature, errorSection);
    
    // Update state manager if available
    if (window.stateManager) {
        window.stateManager.setState({
            ui: {
                ...window.stateManager.getState('ui'),
                currentError: message,
                currentErrorType: errorType,
                resultsVisible: false
            }
        });
    }
    
    // Show error section, hide results
    errorSection.style.display = 'block';
    resultsSection.style.display = 'none';
    
    // Announce error to screen reader
    announceToScreenReader(`${errorConfig.category} error: ${message}`, 'assertive');
    
    // Focus management for errors
    manageFocus(errorSection, { delay: 100 });
}

/**
 * Sets up the enhanced error display structure if not already present.
 * Transforms basic error elements into structured error display.
 *
 * @function setupErrorStructure
 * @param {HTMLElement} errorSection - Error section element to enhance
 */
function setupErrorStructure(errorSection) {
    // Check if enhanced structure already exists
    if (errorSection.querySelector('.error-content')) return;
    
    // Transform existing error section to enhanced structure
    const existingMessage = errorSection.querySelector('.error-message');
    if (existingMessage) {
        const errorContent = document.createElement('div');
        errorContent.className = 'error-content';
        
        const errorIcon = document.createElement('div');
        errorIcon.className = 'error-icon';
        errorIcon.setAttribute('aria-hidden', 'true');
        errorIcon.textContent = '⚠️';
        
        const errorDetails = document.createElement('div');
        errorDetails.className = 'error-details';
        
        const errorCategory = document.createElement('div');
        errorCategory.className = 'error-category';
        errorCategory.id = 'error-category';
        
        const errorDescription = document.createElement('div');
        errorDescription.className = 'error-description';
        errorDescription.id = 'error-description';
        
        const errorActions = document.createElement('div');
        errorActions.className = 'error-actions';
        errorActions.id = 'error-actions';
        
        errorDetails.appendChild(errorCategory);
        errorDetails.appendChild(existingMessage);
        errorDetails.appendChild(errorDescription);
        errorDetails.appendChild(errorActions);
        
        errorContent.appendChild(errorIcon);
        errorContent.appendChild(errorDetails);
        
        // Insert enhanced structure before existing message
        existingMessage.parentNode.insertBefore(errorContent, existingMessage);
    }
}

function getErrorDescription(errorType, message) {
    switch (errorType) {
        case 'VALIDATION':
            if (message.includes('JSON')) {
                return 'Check that your signature is valid JSON. Common issues include missing quotes around property names, trailing commas, or unmatched brackets.';
            }
            if (message.includes('name')) {
                return 'The signature must include a "name" property that specifies what you\'re looking for.';
            }
            return 'Please review your signature format and ensure it follows the expected structure.';
            
        case 'NETWORK':
            return 'There was a problem communicating with the discovery engine. Check your workspace and VS Code extension status.';
            
        case 'DISCOVERY':
            return 'The discovery process encountered an issue while analyzing your code. This might be due to parsing errors in your source files.';
            
        default:
            return 'An unexpected error occurred. Try refreshing the webview or restarting VS Code if the problem persists.';
    }
}

function setupErrorActions(errorType, originalSignature, errorSection) {
    const actionsContainer = errorSection.querySelector('#error-actions') || errorSection.querySelector('.error-actions');
    if (!actionsContainer) return;
    
    actionsContainer.innerHTML = '';
    
    // Always show retry button
    const retryButton = createErrorButton('🔄 Retry', 'primary', () => {
        retryDiscovery(originalSignature);
    });
    retryButton.setAttribute('aria-describedby', 'retry-help');
    actionsContainer.appendChild(retryButton);
    
    // Type-specific actions
    switch (errorType) {
        case 'VALIDATION':
            const validateButton = createErrorButton('🔧 Fix JSON', 'secondary', () => {
                fixJsonSyntax();
            });
            validateButton.setAttribute('aria-describedby', 'validate-help');
            actionsContainer.appendChild(validateButton);
            break;
            
        case 'NETWORK':
            const refreshButton = createErrorButton('🔄 Refresh', 'secondary', () => {
                location.reload();
            });
            refreshButton.setAttribute('aria-describedby', 'refresh-help');
            actionsContainer.appendChild(refreshButton);
            break;
    }
    
    // Always show clear button
    const clearButton = createErrorButton('✕ Clear', 'secondary', () => {
        hideError();
    });
    clearButton.setAttribute('aria-describedby', 'clear-help');
    actionsContainer.appendChild(clearButton);
}

function createErrorButton(text, type, onClick) {
    const button = document.createElement('button');
    button.className = `error-btn ${type}`;
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
}

function retryDiscovery(signature) {
    if (signature && window.retryLastDiscovery) {
        window.retryLastDiscovery(signature);
    } else {
        hideError();
        // Focus back to run button to allow manual retry
        const runButton = document.getElementById('run-discovery');
        if (runButton) {
            runButton.focus();
        }
    }
}

function fixJsonSyntax() {
    const signatureInput = document.getElementById('signature-input');
    if (!signatureInput) return;
    
    let text = signatureInput.value.trim();
    
    // Common JSON fixes
    text = text.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":'); // Add quotes to property names
    text = text.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
    text = text.replace(/'/g, '"'); // Replace single quotes with double quotes
    
    signatureInput.value = text;
    
    // Trigger validation
    signatureInput.dispatchEvent(new Event('input'));
    
    // Announce the fix
    if (window.announceToScreenReader) {
        window.announceToScreenReader('JSON syntax automatically corrected. Please review and try again.', 'assertive');
    }
    
    // Focus the input
    signatureInput.focus();
    hideError();
}

export function hideError(errorSection) {
    const section = errorSection || document.querySelector('.error-section');
    if (section) {
        section.style.display = 'none';
    }
}

export function categorizeError(message, context = {}) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('json') || lowerMessage.includes('syntax') || lowerMessage.includes('name')) {
        return 'VALIDATION';
    }
    
    if (lowerMessage.includes('network') || lowerMessage.includes('connection') || lowerMessage.includes('timeout')) {
        return 'NETWORK';
    }
    
    if (lowerMessage.includes('discovery') || lowerMessage.includes('parse') || lowerMessage.includes('ast')) {
        return 'DISCOVERY';
    }
    
    return 'UNKNOWN';
}

export function setInputError(message, signatureInput) {
    signatureInput.setAttribute('aria-invalid', 'true');
    signatureInput.setAttribute('aria-describedby', 'signature-help signature-error');
    
    let errorElement = document.getElementById('signature-error');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'signature-error';
        errorElement.className = 'input-error';
        errorElement.setAttribute('role', 'alert');
        signatureInput.parentNode.insertBefore(errorElement, signatureInput.nextSibling);
    }
    errorElement.textContent = message;
}

export function clearInputError(signatureInput) {
    signatureInput.setAttribute('aria-invalid', 'false');
    signatureInput.setAttribute('aria-describedby', 'signature-help');
    
    const errorElement = document.getElementById('signature-error');
    if (errorElement) {
        errorElement.remove();
    }
}

export function validateSignature(signatureText) {
    if (!signatureText) return { isValid: true };

    try {
        const signature = JSON.parse(signatureText);
        if (!signature.name) {
            return { 
                isValid: false, 
                error: 'Signature must include at least a "name" property' 
            };
        } else {
            return { isValid: true };
        }
    } catch (e) {
        return { 
            isValid: false, 
            error: 'Invalid JSON syntax' 
        };
    }
}