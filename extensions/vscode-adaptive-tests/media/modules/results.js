// Results display and rendering functionality

export function showSkeleton(resultsContainer, count = 3) {
    resultsContainer.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        const skeletonEl = createSkeletonElement();
        resultsContainer.appendChild(skeletonEl);
    }
}

function createSkeletonElement() {
    const div = document.createElement('div');
    div.className = 'skeleton-result';
    div.setAttribute('aria-hidden', 'true');
    
    div.innerHTML = `
        <div class="skeleton-header">
            <div class="skeleton skeleton-path"></div>
            <div class="skeleton skeleton-score"></div>
        </div>
        <div class="skeleton-breakdown">
            <div class="skeleton skeleton-breakdown-title"></div>
            <div class="skeleton skeleton-breakdown-item"></div>
            <div class="skeleton skeleton-breakdown-item"></div>
            <div class="skeleton skeleton-breakdown-item"></div>
        </div>
        <div class="skeleton-actions">
            <div class="skeleton skeleton-action"></div>
            <div class="skeleton skeleton-action"></div>
        </div>
    `;
    
    return div;
}

export function displayResults(data, resultsSection, resultsContainer, resultsSummary, announceToScreenReader, manageFocus, saveState, setupResultNavigation) {
    const { results, signature, totalCandidates } = data;

    // Update summary
    const summaryText = results.length === 0
        ? `No matches found out of ${totalCandidates} candidates`
        : `Found ${results.length} matches out of ${totalCandidates} candidates`;
    resultsSummary.innerHTML = `
        <strong>${summaryText}</strong>
        ${signature ? ` for signature: <code>${JSON.stringify(signature, null, 2)}</code>` : ''}
    `;

    // Clear previous results and selection
    resultsContainer.innerHTML = '';

    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state" role="status">
                <div class="empty-state-icon" aria-hidden="true">🔍</div>
                <div class="empty-state-text">No matching files found</div>
                <p>Try adjusting your signature or check that the target code exists in your workspace.</p>
            </div>
        `;
        announceToScreenReader(`No matches found out of ${totalCandidates} candidates`, 'assertive');
    } else {
        results.forEach((result, index) => {
            const resultEl = createResultElement(result, index, results.length);
            resultsContainer.appendChild(resultEl);
        });
        
        // Set up result navigation and accessibility
        setupResultNavigation(resultsContainer);

        announceToScreenReader(`Found ${results.length} matches out of ${totalCandidates} candidates. Use arrow keys to navigate results.`, 'assertive');
        
        // Focus management - focus first result after a brief delay
        const resultItems = resultsContainer.querySelectorAll('.result-item');
        manageFocus(resultItems[0], { delay: 200 });
    }

    resultsSection.style.display = 'block';
    saveState();
}

function createResultElement(result, index, totalResults) {
    const div = document.createElement('div');
    div.className = 'result-item';
    div.setAttribute('role', 'listitem');

    // Determine score class and description
    let scoreClass = 'score-low';
    let scoreDescription = 'low match';
    if (result.score >= 80) {
        scoreClass = 'score-high';
        scoreDescription = 'high match';
    } else if (result.score >= 50) {
        scoreClass = 'score-medium';
        scoreDescription = 'medium match';
    }

    // Build breakdown HTML
    let breakdownHtml = '';
    if (result.showScores && result.scoreBreakdown && result.scoreBreakdown.length > 0) {
        breakdownHtml = `
            <div class="result-breakdown">
                <div class="breakdown-title">Score Breakdown:</div>
                <ul class="breakdown-list" role="list">
                    ${result.scoreBreakdown.map(item => `<li role="listitem">${item}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    const scoreDisplay = result.showScores 
        ? `<span class="result-score ${scoreClass}" aria-label="Score ${result.score}, ${scoreDescription}">${result.score}</span>` 
        : '';

    div.innerHTML = `
        <div class="result-header">
            <span class="result-path" role="text">${result.path}</span>
            ${scoreDisplay}
        </div>
        ${breakdownHtml}
        <div class="result-actions" role="group" aria-label="Actions for ${result.path}">
            <button class="action-btn" 
                    onclick="openFile('${result.absolutePath}')"
                    aria-describedby="open-help-${index}">
                Open File
            </button>
            <button class="action-btn" 
                    onclick="scaffoldTest('${result.absolutePath}')"
                    aria-describedby="scaffold-help-${index}">
                Scaffold Test
            </button>
            <div id="open-help-${index}" class="visually-hidden">
                Open ${result.path} in editor
            </div>
            <div id="scaffold-help-${index}" class="visually-hidden">
                Generate test file for ${result.path}
            </div>
        </div>
    `;

    const ariaLabel = result.showScores 
        ? `File ${result.path}, score ${result.score}, ${scoreDescription}. Position ${index + 1} of ${totalResults}` 
        : `File ${result.path}. Position ${index + 1} of ${totalResults}`;
    div.setAttribute('aria-label', ariaLabel);

    return div;
}

export function hideResults(resultsSection) {
    resultsSection.style.display = 'none';
}