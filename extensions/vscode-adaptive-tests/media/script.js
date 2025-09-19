(function () {
    const vscode = acquireVsCodeApi();

    // Core elements - available immediately
    const signatureInput = document.getElementById('signature-input');
    const runButton = document.getElementById('run-discovery');
    const resultsSection = document.querySelector('.results-section');
    const resultsContainer = document.getElementById('results-container');
    const resultsSummary = document.querySelector('.results-summary');
    const errorSection = document.querySelector('.error-section');
    const errorMessage = document.querySelector('.error-message');
    const presetButtons = document.querySelectorAll('.preset-btn');
    const statusAnnouncements = document.getElementById('status-announcements');
    const progressContainer = document.querySelector('.discovery-progress');
    const progressText = document.getElementById('progress-text');
    const progressSteps = document.querySelectorAll('.progress-step');

    // State
    let isLoading = false;
    let lastSignature = null;
    let lastResults = [];
    let validationTimeout = null;
    let currentStep = 0;

    // Lazy-loaded modules
    let presetModule = null;
    let resultsModule = null;
    let navigationModule = null;
    let errorsModule = null;

    // Initialize
    function init() {
        // Restore previous state
        const state = vscode.getState();
        if (state) {
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

    // Lazy loading functions
    async function loadPresetModule() {
        if (!presetModule) {
            presetModule = await import('./modules/presets.js');
        }
        return presetModule;
    }

    async function loadResultsModule() {
        if (!resultsModule) {
            resultsModule = await import('./modules/results.js');
        }
        return resultsModule;
    }

    async function loadNavigationModule() {
        if (!navigationModule) {
            navigationModule = await import('./modules/navigation.js');
        }
        return navigationModule;
    }

    async function loadErrorsModule() {
        if (!errorsModule) {
            errorsModule = await import('./modules/errors.js');
        }
        return errorsModule;
    }

    // Setup functions with lazy loading
    async function setupPresetHandlers() {
        const module = await loadPresetModule();
        module.setupPresetHandlers(signatureInput, presetButtons, announceToScreenReader, saveState);
    }

    async function setupResultNavigation(resultsContainer) {
        const module = await loadNavigationModule();
        return module.setupResultNavigation(resultsContainer);
    }

    // Core accessibility helper functions (always available)
    function announceToScreenReader(message, priority = 'polite') {
        if (!statusAnnouncements) return;
        
        statusAnnouncements.textContent = message;
        statusAnnouncements.setAttribute('aria-live', priority);
        
        // Clear after announcement to avoid repetition
        setTimeout(() => {
            statusAnnouncements.textContent = '';
        }, 1000);
    }

    function manageFocus(element, options = {}) {
        setTimeout(() => {
            if (element && typeof element.focus === 'function') {
                element.focus(options);
            }
        }, options.delay || 100);
    }

    // Make announceToScreenReader available globally for modules
    window.announceToScreenReader = announceToScreenReader;

    // Essential keyboard handlers (always loaded)
    function handleInputKeydown(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            runDiscovery();
        } else if (e.key === 'Escape') {
            hideError();
        }
    }

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

    function debounceValidation() {
        clearTimeout(validationTimeout);
        validationTimeout = setTimeout(async () => {
            await validateSignature();
        }, 500);
    }

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

    async function runDiscovery() {
        if (isLoading) return;

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

    function openFile(path) {
        vscode.postMessage({
            command: 'openFile',
            path: path
        });
    }

    function scaffoldTest(path) {
        vscode.postMessage({
            command: 'scaffoldTest',
            path: path
        });
    }

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

    function showProgress() {
        if (progressContainer) {
            progressContainer.classList.add('visible');
            progressContainer.style.display = 'flex';
        }
    }

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

    function resetProgress() {
        currentStep = 0;
        progressSteps.forEach(step => {
            step.classList.remove('active', 'completed');
        });
        if (progressText) {
            progressText.textContent = 'Discovering files...';
        }
    }

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

    function startProgressAnimation() {
        resetProgress();
        
        // Simulate progress steps
        setTimeout(() => updateProgress(0, 'Scanning workspace...'), 200);
        setTimeout(() => updateProgress(1, 'Parsing code files...'), 1000);
        setTimeout(() => updateProgress(2, 'Calculating scores...'), 2000);
        setTimeout(() => updateProgress(3, 'Finalizing results...'), 3000);
    }

    async function showError(message, errorType) {
        const module = await loadErrorsModule();
        const category = errorType || module.categorizeError(message);
        module.showError(message, errorSection, errorMessage, resultsSection, announceToScreenReader, manageFocus, category, lastSignature);
    }

    // Make retry function available globally
    window.retryLastDiscovery = function(signature) {
        if (signature) {
            signatureInput.value = JSON.stringify(signature, null, 2);
            hideError();
            runDiscovery();
        }
    };

    function hideError() {
        errorSection.style.display = 'none';
    }

    function hideResults() {
        resultsSection.style.display = 'none';
        if (navigationModule) {
            navigationModule.resetSelection();
        }
    }

    function saveState() {
        vscode.setState({
            signature: signatureInput.value,
            results: lastResults,
            lastSignature: lastSignature,
            totalCandidates: lastResults.length
        });
    }

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