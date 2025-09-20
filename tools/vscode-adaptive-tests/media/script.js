/**
 * @fileoverview Main script for the Adaptive Tests Discovery Lens webview.
 * Manages test discovery, state management, UI interactions, and module coordination
 * for the VS Code extension with lazy-loaded ES modules.
 *
 * @author VS Code Adaptive Tests Extension
 * @version 2.0.0
 */

(function () {
    /**
     * VS Code API instance for extension communication.
     * @type {Object}
     */
    const vscode = acquireVsCodeApi();

    // Core DOM elements - available immediately
    /** @type {HTMLInputElement} Signature input textarea */
    const signatureInput = document.getElementById('signature-input');
    /** @type {HTMLButtonElement} Discovery run button */
    const runButton = document.getElementById('run-discovery');
    /** @type {HTMLElement} Results display section */
    const resultsSection = document.querySelector('.results-section');
    /** @type {HTMLElement} Results container for items */
    const resultsContainer = document.getElementById('results-container');
    /** @type {HTMLElement} Results summary display */
    const resultsSummary = document.querySelector('.results-summary');
    /** @type {HTMLElement} Error display section */
    const errorSection = document.querySelector('.error-section');
    /** @type {HTMLElement} Error message container */
    const errorMessage = document.querySelector('.error-message');
    /** @type {NodeList} Preset selection buttons */
    const presetButtons = document.querySelectorAll('.preset-btn');
    /** @type {HTMLElement} Screen reader announcements */
    const statusAnnouncements = document.getElementById('status-announcements');
    /** @type {HTMLElement} Progress indicator container */
    const progressContainer = document.querySelector('.discovery-progress');
    /** @type {HTMLElement} Progress text display */
    const progressText = document.getElementById('progress-text');
    /** @type {NodeList} Progress step indicators */
    const progressSteps = document.querySelectorAll('.progress-step');

    /**
     * Central state management system for the Discovery Lens application.
     * Provides structured state management with subscription system for reactive UI updates.
     *
     * @class StateManager
     */
    class StateManager {
        /**
         * Creates an instance of StateManager with initial state and subscription system.
         */
        constructor() {
            /**
             * @private
             * @type {Object} The current application state
             */
            this.state = {
                /** @type {boolean} Loading state indicator */
                isLoading: false,
                /** @type {Object|null} Last discovery signature */
                lastSignature: null,
                /** @type {Array} Last discovery results */
                lastResults: [],
                /** @type {number|null} Validation timeout reference */
                validationTimeout: null,
                /** @type {number} Current progress step */
                currentStep: 0,
                /** @type {Object} UI-specific state */
                ui: {
                    /** @type {string|null} Current error message */
                    currentError: null,
                    /** @type {string|null} Current error type */
                    currentErrorType: null,
                    /** @type {boolean} Whether results are currently displayed */
                    resultsVisible: false,
                    /** @type {number} Selected result index for navigation */
                    selectedResultIndex: -1,
                    /** @type {Array} Accessibility announcements queue */
                    announcements: []
                }
            };

            /**
             * @private
             * @type {Array<Function>} List of subscriber functions
             */
            this.subscribers = [];
        }

        /**
         * Gets the current state or a specific property from state.
         *
         * @param {string} [key] - Optional key to get specific state property
         * @returns {any} The entire state object or specific property value
         */
        getState(key) {
            return key ? this.state[key] : { ...this.state };
        }

        /**
         * Updates the state with new values and notifies subscribers.
         *
         * @param {Object} updates - Object containing state updates
         * @param {boolean} [silent=false] - If true, doesn't notify subscribers
         */
        setState(updates, silent = false) {
            const previousState = { ...this.state };
            
            // Deep merge updates into current state
            this.state = this._deepMerge(this.state, updates);
            
            if (!silent) {
                this._notifySubscribers(previousState, this.state);
            }
        }

        /**
         * Subscribes to state changes.
         *
         * @param {Function} callback - Function to call when state changes
         * @returns {Function} Unsubscribe function
         */
        subscribe(callback) {
            this.subscribers.push(callback);
            
            // Return unsubscribe function
            return () => {
                const index = this.subscribers.indexOf(callback);
                if (index > -1) {
                    this.subscribers.splice(index, 1);
                }
            };
        }

        /**
         * Performs a deep merge of two objects.
         *
         * @private
         * @param {Object} target - Target object
         * @param {Object} source - Source object to merge
         * @returns {Object} Merged object
         */
        _deepMerge(target, source) {
            const result = { ...target };
            
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this._deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
            
            return result;
        }

        /**
         * Notifies all subscribers of state changes.
         *
         * @private
         * @param {Object} previousState - Previous state object
         * @param {Object} newState - New state object
         */
        _notifySubscribers(previousState, newState) {
            this.subscribers.forEach(callback => {
                try {
                    callback(newState, previousState);
                } catch (error) {
                    console.error('Error in state subscriber:', error);
                }
            });
        }
    }

    // Global state manager instance
    const stateManager = new StateManager();
    
    // Make stateManager globally accessible for modules
    window.stateManager = stateManager;

    // Lazy-loaded modules - loaded on demand for performance
    /** @type {Object|null} Presets module for signature templates */
    let presetModule = null;
    /** @type {Object|null} Results module for discovery result display */
    let resultsModule = null;
    /** @type {Object|null} Navigation module for keyboard navigation */
    let navigationModule = null;
    /** @type {Object|null} Errors module for error handling and display */
    let errorsModule = null;

    /**
     * Initializes the application by setting up state subscriptions, event listeners,
     * restoring previous state, and configuring accessibility features.
     *
     * @function init
     */
    function init() {
        // Set up state change subscriptions
        setupStateSubscriptions();
        
        // Restore previous state
        const state = vscode.getState();
        if (state) {
            // Update state manager with restored data
            stateManager.setState({
                lastResults: state.results || [],
                lastSignature: state.lastSignature || null
            }, true); // Silent update during initialization
            
            if (state.signature) {
                signatureInput.value = state.signature;
            }
            if (state.results) {
                // Lazy load results module when needed
                loadResultsModule().then(() => {
                    if (resultsModule) {
                        resultsModule.displayResults({
                            results: state.results,
                            signature: state.lastSignature,
                            totalCandidates: state.totalCandidates
                        }, resultsSection, resultsContainer, resultsSummary, announceToScreenReader, manageFocus, saveState, setupResultNavigation);
                    }
                });
            }
        }

        // Essential event listeners (always loaded)
        runButton.addEventListener('click', runDiscovery);
        signatureInput.addEventListener('keydown', handleInputKeydown);
        signatureInput.addEventListener('input', debounceValidation);

        // Lazy load preset handlers when needed
        setupPresetHandlers();

        // Global keyboard navigation
        document.addEventListener('keydown', handleGlobalKeydown);

        // Handle messages from extension
        window.addEventListener('message', handleMessage);

        // Handle details accessibility
        setupDetailsAccessibility();
    }

    /**
     * Sets up state change subscriptions to automatically update UI when state changes.
     * Manages reactive updates for loading states, errors, results, and UI elements.
     *
     * @function setupStateSubscriptions
     */
    function setupStateSubscriptions() {
        stateManager.subscribe((newState, previousState) => {
            // Handle loading state changes
            if (newState.isLoading !== previousState.isLoading) {
                setLoading(newState.isLoading);
            }
            
            // Handle error state changes
            if (newState.ui.currentError !== previousState.ui.currentError) {
                if (newState.ui.currentError) {
                    showError(newState.ui.currentError, newState.ui.currentErrorType);
                } else {
                    hideError();
                }
            }
            
            // Handle results visibility changes
            if (newState.ui.resultsVisible !== previousState.ui.resultsVisible) {
                if (!newState.ui.resultsVisible) {
                    hideResults();
                }
            }
            
            // Handle signature input synchronization
            if (newState.lastSignature !== previousState.lastSignature && newState.lastSignature) {
                const signatureJson = JSON.stringify(newState.lastSignature, null, 2);
                if (signatureInput.value !== signatureJson) {
                    signatureInput.value = signatureJson;
                }
            }
        });
    }

    /**
     * Lazy loading functions for ES modules - loads modules only when needed
     * to improve initial load performance and reduce memory footprint.
     */

    /**
     * Loads the presets module for signature templates.
     *
     * @async
     * @function loadPresetModule
     * @returns {Promise<Object>} The presets module
     */
    async function loadPresetModule() {
        if (!presetModule) {
            presetModule = await import('./modules/presets.js');
        }
        return presetModule;
    }

    /**
     * Loads the results module for discovery result display.
     *
     * @async
     * @function loadResultsModule
     * @returns {Promise<Object>} The results module
     */
    async function loadResultsModule() {
        if (!resultsModule) {
            resultsModule = await import('./modules/results.js');
        }
        return resultsModule;
    }

    /**
     * Loads the navigation module for keyboard navigation and accessibility.
     *
     * @async
     * @function loadNavigationModule
     * @returns {Promise<Object>} The navigation module
     */
    async function loadNavigationModule() {
        if (!navigationModule) {
            navigationModule = await import('./modules/navigation.js');
        }
        return navigationModule;
    }

    /**
     * Loads the errors module for error handling and display.
     *
     * @async
     * @function loadErrorsModule
     * @returns {Promise<Object>} The errors module
     */
    async function loadErrorsModule() {
        if (!errorsModule) {
            errorsModule = await import('./modules/errors.js');
        }
        return errorsModule;
    }

    /**
     * Setup functions with lazy loading - configure components as needed
     */

    /**
     * Sets up preset button handlers with lazy-loaded presets module.
     *
     * @async
     * @function setupPresetHandlers
     */
    async function setupPresetHandlers() {
        const module = await loadPresetModule();
        module.setupPresetHandlers(signatureInput, presetButtons, announceToScreenReader, saveState);
    }

    /**
     * Sets up result navigation with lazy-loaded navigation module.
     *
     * @async
     * @function setupResultNavigation
     * @param {HTMLElement} resultsContainer - Container element for results
     * @returns {Promise<any>} Navigation setup result
     */
    async function setupResultNavigation(resultsContainer) {
        const module = await loadNavigationModule();
        return module.setupResultNavigation(resultsContainer);
    }

    /**
     * Core accessibility helper functions (always available)
     */

    /**
     * Announces a message to screen readers for accessibility.
     * Updates state manager with announcement history and provides live region updates.
     *
     * @function announceToScreenReader
     * @param {string} message - Message to announce to screen readers
     * @param {string} [priority='polite'] - Announcement priority ('polite' or 'assertive')
     */
    function announceToScreenReader(message, priority = 'polite') {
        if (!statusAnnouncements) return;
        
        statusAnnouncements.textContent = message;
        statusAnnouncements.setAttribute('aria-live', priority);
        
        // Update state with accessibility announcement
        const currentState = stateManager.getState();
        const announcements = [...currentState.ui.announcements, {
            message,
            priority,
            timestamp: Date.now()
        }];
        
        stateManager.setState({
            ui: {
                ...currentState.ui,
                announcements: announcements.slice(-10) // Keep last 10 announcements
            }
        });
        
        // Clear after announcement to avoid repetition
        setTimeout(() => {
            statusAnnouncements.textContent = '';
        }, 1000);
    }

    /**
     * Manages focus with optional delay for better accessibility.
     *
     * @function manageFocus
     * @param {HTMLElement} element - Element to focus
     * @param {Object} [options={}] - Focus options
     * @param {number} [options.delay=100] - Delay before focusing in milliseconds
     */
    function manageFocus(element, options = {}) {
        setTimeout(() => {
            if (element && typeof element.focus === 'function') {
                element.focus(options);
            }
        }, options.delay || 100);
    }

    // Make announceToScreenReader available globally for modules
    window.announceToScreenReader = announceToScreenReader;

    /**
     * Essential keyboard handlers (always loaded)
     */

    /**
     * Handles keyboard input in the signature textarea.
     * Supports Ctrl+Enter for discovery and Escape for error clearing.
     *
     * @function handleInputKeydown
     * @param {KeyboardEvent} e - Keyboard event
     */
    function handleInputKeydown(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            runDiscovery();
        } else if (e.key === 'Escape') {
            hideError();
        }
    }

    /**
     * Handles global keyboard navigation and shortcuts.
     * Manages escape key handling and results navigation delegation.
     *
     * @async
     * @function handleGlobalKeydown
     * @param {KeyboardEvent} e - Keyboard event
     */
    async function handleGlobalKeydown(e) {
        // Handle escape to clear focus/selections
        if (e.key === 'Escape') {
            if (navigationModule) {
                navigationModule.resetSelection();
            }
        }

        // Handle results navigation when focus is in results area
        if (resultsContainer.contains(document.activeElement) ||
            (document.activeElement && document.activeElement.classList.contains('result-item'))) {
            
            if (!navigationModule) {
                await loadNavigationModule();
            }
            navigationModule.handleGlobalKeydown(e, resultsContainer);
        }
    }

    /**
     * Debounces signature validation to avoid excessive validation calls.
     *
     * @function debounceValidation
     */
    function debounceValidation() {
        const currentTimeout = stateManager.getState('validationTimeout');
        clearTimeout(currentTimeout);
        
        const newTimeout = setTimeout(async () => {
            await validateSignature();
        }, 500);
        
        stateManager.setState({ validationTimeout: newTimeout });
    }

    /**
     * Validates the current signature input asynchronously.
     * Uses the errors module to display validation feedback.
     *
     * @async
     * @function validateSignature
     */
    async function validateSignature() {
        const signatureText = signatureInput.value.trim();
        if (!signatureText) return;

        const errorsModule = await loadErrorsModule();
        const validation = errorsModule.validateSignature(signatureText);
        
        if (!validation.isValid) {
            errorsModule.setInputError(validation.error, signatureInput);
        } else {
            errorsModule.clearInputError(signatureInput);
        }
    }

    /**
     * Initiates the test discovery process.
     * Validates input, updates state, and sends discovery request to extension.
     *
     * @async
     * @function runDiscovery
     */
    async function runDiscovery() {
        const currentState = stateManager.getState();
        if (currentState.isLoading) return;

        const signatureText = signatureInput.value.trim();
        if (!signatureText) {
            await showError('Please enter a discovery signature');
            manageFocus(signatureInput);
            return;
        }

        let signature;
        try {
            signature = JSON.parse(signatureText);
        } catch (e) {
            await showError('Invalid JSON signature. Please check your syntax.');
            manageFocus(signatureInput);
            return;
        }

        if (!signature.name) {
            await showError('Signature must include at least a "name" property');
            manageFocus(signatureInput);
            return;
        }

        setLoading(true);
        hideError();
        hideResults();
        
        // Show skeleton loading in results
        const resultsModule = await loadResultsModule();
        resultsModule.showSkeleton(resultsContainer, 5);
        resultsSection.style.display = 'block';
        
        // Clear input errors
        const errorsModule = await loadErrorsModule();
        errorsModule.clearInputError(signatureInput);

        lastSignature = signature;
        saveState();

        announceToScreenReader('Starting discovery...', 'assertive');

        // Send message to extension
        vscode.postMessage({
            command: 'runDiscovery',
            signature: signature
        });
    }

    /**
     * Handles messages from the VS Code extension.
     * Routes different message types to appropriate handlers.
     *
     * @async
     * @function handleMessage
     * @param {MessageEvent} event - Message event from VS Code extension
     */
    async function handleMessage(event) {
        const message = event.data;

        switch (message.command) {
            case 'displayResults':
                setLoading(false);
                await displayResults(message);
                break;
            case 'showError':
                setLoading(false);
                await showError(message.error, message.errorType);
                break;
            case 'updateProgress':
                if (message.step !== undefined && message.text) {
                    updateProgress(message.step, message.text);
                }
                break;
        }
    }

    /**
     * Displays discovery results using the results module.
     * Updates state and delegates to results module for rendering.
     *
     * @async
     * @function displayResults
     * @param {Object} data - Results data from discovery
     */
    async function displayResults(data) {
        const module = await loadResultsModule();
        lastResults = data.results;
        
        module.displayResults(
            data,
            resultsSection,
            resultsContainer,
            resultsSummary,
            announceToScreenReader,
            manageFocus,
            saveState,
            setupResultNavigation
        );
    }

    /**
     * Sends a request to open a file in VS Code editor.
     *
     * @function openFile
     * @param {string} path - File path to open
     */
    function openFile(path) {
        vscode.postMessage({
            command: 'openFile',
            path: path
        });
    }

    /**
     * Sends a request to scaffold a test file for the given path.
     *
     * @function scaffoldTest
     * @param {string} path - File path to scaffold test for
     */
    function scaffoldTest(path) {
        vscode.postMessage({
            command: 'scaffoldTest',
            path: path
        });
    }

    /**
     * Sets loading state and updates UI elements accordingly.
     * Manages button state, progress display, and accessibility attributes.
     *
     * @function setLoading
     * @param {boolean} loading - Whether discovery is in loading state
     */
    function setLoading(loading) {
        isLoading = loading;
        runButton.disabled = loading;
        runButton.classList.toggle('loading', loading);
        runButton.setAttribute('aria-busy', loading.toString());

        if (loading) {
            runButton.innerHTML = '<span class="progress-spinner" aria-hidden="true"></span> Running Discovery...';
            runButton.setAttribute('aria-label', 'Running discovery, please wait');
            showProgress();
            startProgressAnimation();
        } else {
            runButton.innerHTML = 'Run Discovery';
            runButton.setAttribute('aria-label', 'Run discovery to find matching code files');
            hideProgress();
            resetProgress();
        }
    }

    /**
     * Shows the progress indicator with animation.
     *
     * @function showProgress
     */
    function showProgress() {
        if (progressContainer) {
            progressContainer.classList.add('visible');
            progressContainer.style.display = 'flex';
        }
    }

    /**
     * Hides the progress indicator with transition.
     *
     * @function hideProgress
     */
    function hideProgress() {
        if (progressContainer) {
            progressContainer.classList.remove('visible');
            setTimeout(() => {
                if (!progressContainer.classList.contains('visible')) {
                    progressContainer.style.display = 'none';
                }
            }, 300);
        }
    }

    /**
     * Resets progress display to initial state.
     *
     * @function resetProgress
     */
    function resetProgress() {
        currentStep = 0;
        progressSteps.forEach(step => {
            step.classList.remove('active', 'completed');
        });
        if (progressText) {
            progressText.textContent = 'Discovering files...';
        }
    }

    /**
     * Updates progress display with current step and text.
     *
     * @function updateProgress
     * @param {number} step - Current progress step
     * @param {string} text - Progress description text
     */
    function updateProgress(step, text) {
        if (progressText) {
            progressText.textContent = text;
        }
        
        // Mark previous steps as completed
        for (let i = 0; i < currentStep; i++) {
            if (progressSteps[i]) {
                progressSteps[i].classList.remove('active');
                progressSteps[i].classList.add('completed');
            }
        }
        
        // Mark current step as active
        if (progressSteps[currentStep]) {
            progressSteps[currentStep].classList.add('active');
        }
        
        currentStep = step;
    }

    /**
     * Starts simulated progress animation during discovery.
     *
     * @function startProgressAnimation
     */
    function startProgressAnimation() {
        resetProgress();
        
        // Simulate progress steps
        setTimeout(() => updateProgress(0, 'Scanning workspace...'), 200);
        setTimeout(() => updateProgress(1, 'Parsing code files...'), 1000);
        setTimeout(() => updateProgress(2, 'Calculating scores...'), 2000);
        setTimeout(() => updateProgress(3, 'Finalizing results...'), 3000);
    }

    /**
     * Shows error message using the errors module.
     * Categorizes and displays errors with appropriate user interactions.
     *
     * @async
     * @function showError
     * @param {string} message - Error message to display
     * @param {string} [errorType] - Optional error type override
     */
    async function showError(message, errorType) {
        const module = await loadErrorsModule();
        const category = errorType || module.categorizeError(message);
        module.showError(message, errorSection, errorMessage, resultsSection, announceToScreenReader, manageFocus, category, lastSignature);
    }

    /**
     * Global retry function for error recovery.
     * Available to error module for retry functionality.
     */
    window.retryLastDiscovery = function(signature) {
        if (signature) {
            signatureInput.value = JSON.stringify(signature, null, 2);
            hideError();
            runDiscovery();
        }
    };

    /**
     * Hides the error display section.
     *
     * @function hideError
     */
    function hideError() {
        errorSection.style.display = 'none';
    }

    /**
     * Hides the results display section and resets navigation state.
     *
     * @function hideResults
     */
    function hideResults() {
        resultsSection.style.display = 'none';
        if (navigationModule) {
            navigationModule.resetSelection();
        }
    }

    /**
     * Saves current application state to VS Code webview state.
     * Persists signature, results, and metadata for restoration.
     *
     * @function saveState
     */
    function saveState() {
        vscode.setState({
            signature: signatureInput.value,
            results: lastResults,
            lastSignature: lastSignature,
            totalCandidates: lastResults.length
        });
    }

    /**
     * Sets up accessibility features for details elements.
     *
     * @function setupDetailsAccessibility
     */
    function setupDetailsAccessibility() {
        const detailsElement = document.querySelector('details');
        const summaryElement = document.querySelector('summary');
        if (detailsElement && summaryElement) {
            summaryElement.addEventListener('click', () => {
                // Update aria-expanded after the click event
                setTimeout(() => {
                    summaryElement.setAttribute('aria-expanded', detailsElement.open.toString());
                }, 0);
            });
        }
    }

    // Make functions available globally for onclick handlers
    window.openFile = openFile;
    window.scaffoldTest = scaffoldTest;

    // Initialize on load
    init();
})();