(function () {
    const vscode = acquireVsCodeApi();

    // Elements
    const signatureInput = document.getElementById('signature-input');
    const runButton = document.getElementById('run-discovery');
    const resultsSection = document.querySelector('.results-section');
    const resultsContainer = document.getElementById('results-container');
    const resultsSummary = document.querySelector('.results-summary');
    const errorSection = document.querySelector('.error-section');
    const errorMessage = document.querySelector('.error-message');
    const presetButtons = document.querySelectorAll('.preset-btn');

    // Preset signatures
    const presets = {
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

    // State
    let isLoading = false;
    let lastSignature = null;
    let lastResults = [];

    // Initialize
    function init() {
        // Restore previous state
        const state = vscode.getState();
        if (state) {
            if (state.signature) {
                signatureInput.value = state.signature;
            }
            if (state.results) {
                displayResults({
                    results: state.results,
                    signature: state.lastSignature,
                    totalCandidates: state.totalCandidates
                });
            }
        }

        // Event listeners
        runButton.addEventListener('click', runDiscovery);

        signatureInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                runDiscovery();
            }
        });

        presetButtons.forEach(button => {
            button.addEventListener('click', () => {
                const preset = presets[button.dataset.preset];
                if (preset) {
                    signatureInput.value = JSON.stringify(preset, null, 2);
                    saveState();
                }
            });
        });

        // Handle messages from extension
        window.addEventListener('message', handleMessage);
    }

    function runDiscovery() {
        if (isLoading) return;

        const signatureText = signatureInput.value.trim();
        if (!signatureText) {
            showError('Please enter a discovery signature');
            return;
        }

        let signature;
        try {
            signature = JSON.parse(signatureText);
        } catch (e) {
            showError('Invalid JSON signature. Please check your syntax.');
            return;
        }

        if (!signature.name) {
            showError('Signature must include at least a "name" property');
            return;
        }

        setLoading(true);
        hideError();
        hideResults();

        lastSignature = signature;
        saveState();

        // Send message to extension
        vscode.postMessage({
            command: 'runDiscovery',
            signature: signature
        });
    }

    function handleMessage(event) {
        const message = event.data;

        switch (message.command) {
            case 'displayResults':
                setLoading(false);
                displayResults(message);
                break;
            case 'showError':
                setLoading(false);
                showError(message.error);
                break;
        }
    }

    function displayResults(data) {
        const { results, signature, totalCandidates } = data;
        lastResults = results;

        // Update summary
        const summaryText = results.length === 0
            ? `No matches found out of ${totalCandidates} candidates`
            : `Found ${results.length} matches out of ${totalCandidates} candidates`;
        resultsSummary.innerHTML = `
            <strong>${summaryText}</strong>
            ${signature ? ` for signature: <code>${JSON.stringify(signature, null, 2)}</code>` : ''}
        `;

        // Clear previous results
        resultsContainer.innerHTML = '';

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <div class="empty-state-text">No matching files found</div>
                    <p>Try adjusting your signature or check that the target code exists in your workspace.</p>
                </div>
            `;
        } else {
            results.forEach((result, index) => {
                const resultEl = createResultElement(result, index);
                resultsContainer.appendChild(resultEl);
            });
        }

        resultsSection.style.display = 'block';
        saveState();
    }

    function createResultElement(result, index) {
        const div = document.createElement('div');
        div.className = 'result-item';

        // Determine score class
        let scoreClass = 'score-low';
        if (result.score >= 80) scoreClass = 'score-high';
        else if (result.score >= 50) scoreClass = 'score-medium';

        // Build breakdown HTML
        let breakdownHtml = '';
        if (result.showScores && result.scoreBreakdown && result.scoreBreakdown.length > 0) {
            breakdownHtml = `
                <div class="result-breakdown">
                    <div class="breakdown-title">Score Breakdown:</div>
                    <ul class="breakdown-list">
                        ${result.scoreBreakdown.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="result-header">
                <span class="result-path">${result.path}</span>
                ${result.showScores ? `<span class="result-score ${scoreClass}">${result.score}</span>` : ''}
            </div>
            ${breakdownHtml}
            <div class="result-actions">
                <button class="action-btn" onclick="openFile('${result.absolutePath}')">
                    Open File
                </button>
                <button class="action-btn" onclick="scaffoldTest('${result.absolutePath}')">
                    Scaffold Test
                </button>
            </div>
        `;

        return div;
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

        if (loading) {
            runButton.innerHTML = '<span class="spinner"></span> Running Discovery...';
        } else {
            runButton.innerHTML = 'Run Discovery';
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorSection.style.display = 'block';
        resultsSection.style.display = 'none';
    }

    function hideError() {
        errorSection.style.display = 'none';
    }

    function hideResults() {
        resultsSection.style.display = 'none';
    }

    function saveState() {
        vscode.setState({
            signature: signatureInput.value,
            results: lastResults,
            lastSignature: lastSignature,
            totalCandidates: lastResults.length
        });
    }

    // Make functions available globally for onclick handlers
    window.openFile = openFile;
    window.scaffoldTest = scaffoldTest;

    // Initialize on load
    init();
})();