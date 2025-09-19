import * as vscode from 'vscode';
import * as path from 'path';
import {
    IDiscoveryLensAPI,
    DiscoveryResult,
    DiscoverySignature,
    DiscoveryState,
    ScoreBreakdown
} from '../types/api';

export class DiscoveryLensPanel implements IDiscoveryLensAPI {
    private readonly panel: vscode.WebviewPanel;
    private readonly context: vscode.ExtensionContext;
    private disposables: vscode.Disposable[] = [];

    // State management for API
    private currentState: DiscoveryState = {
        signature: null,
        results: [],
        isLoading: false,
        lastError: null,
        lastRunTimestamp: null,
        config: {
            showScores: true,
            maxResults: 10,
            outputDirectory: 'tests/adaptive',
            autoOpen: true
        }
    };

    // Event emitters for API subscribers
    private stateChangeEmitter = new vscode.EventEmitter<DiscoveryState>();
    private resultsEmitter = new vscode.EventEmitter<DiscoveryResult[]>();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;

        // Load configuration
        this.loadConfiguration();

        // Create webview panel
        this.panel = vscode.window.createWebviewPanel(
            'adaptiveTestsDiscovery',
            'Discovery Lens',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'media'),
                    vscode.Uri.joinPath(context.extensionUri, 'out', 'webview')
                ]
            }
        );

        // Set icon
        this.panel.iconPath = {
            light: vscode.Uri.joinPath(context.extensionUri, 'media', 'search-light.svg'),
            dark: vscode.Uri.joinPath(context.extensionUri, 'media', 'search-dark.svg')
        };

        // Set HTML content
        this.panel.webview.html = this.getWebviewContent();

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'runDiscovery':
                        await this.handleRunDiscovery(message.signature);
                        break;
                    case 'openFile':
                        await this.handleOpenFile(message.path);
                        break;
                    case 'scaffoldTest':
                        await this.handleScaffoldTest(message.path);
                        break;
                }
            },
            undefined,
            this.disposables
        );

        // Handle panel disposal
        this.panel.onDidDispose(
            () => this.dispose(),
            undefined,
            this.disposables
        );
    }

    public reveal() {
        this.panel.reveal();
    }

    public onDidDispose(callback: () => void) {
        this.panel.onDidDispose(callback);
    }

    public dispose() {
        this.panel.dispose();
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
        this.stateChangeEmitter.dispose();
        this.resultsEmitter.dispose();
    }

    private async handleRunDiscovery(signature: any) {
        try {
            // Update state
            this.updateState({ isLoading: true, signature, lastError: null });

            // Import discovery engine from main package
            const adaptiveTests = await this.loadAdaptiveTests();
            const engine = adaptiveTests.getDiscoveryEngine();

            // Get workspace root
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                throw new Error('No workspace folder open');
            }

            // Run discovery
            const candidates = await engine.collectCandidates(workspaceRoot, signature);

            // Sort by score
            candidates.sort((a: any, b: any) => b.score - a.score);

            // Limit results based on configuration
            const maxResults = this.currentState.config.maxResults;
            const showScores = this.currentState.config.showScores;

            const results: DiscoveryResult[] = candidates.slice(0, maxResults).map((candidate: any) => ({
                path: candidate.path,
                relativePath: path.relative(workspaceRoot, candidate.path),
                score: candidate.score,
                scoreBreakdown: this.extractScoreBreakdown(candidate, signature),
                metadata: candidate.metadata,
                language: this.detectLanguage(candidate.path)
            }));

            // Update state with results
            this.updateState({
                isLoading: false,
                results,
                lastRunTimestamp: Date.now()
            });

            // Emit results event
            this.resultsEmitter.fire(results);

            // Send results to webview
            this.panel.webview.postMessage({
                command: 'displayResults',
                results: results.map(r => ({
                    ...r,
                    absolutePath: r.path,
                    path: r.relativePath,
                    showScores
                })),
                signature,
                totalCandidates: candidates.length
            });

        } catch (error: any) {
            const errorMessage = error.message || 'Discovery failed';

            // Update state with error
            this.updateState({
                isLoading: false,
                lastError: errorMessage
            });

            // Send error to webview
            this.panel.webview.postMessage({
                command: 'showError',
                error: errorMessage
            });
        }
    }

    private extractScoreBreakdown(candidate: any, signature: any): ScoreBreakdown {
        const factors: ScoreBreakdown['factors'] = [];

        // Extract scoring factors from candidate
        if (candidate.nameMatch) {
            factors.push({
                factor: 'name',
                points: candidate.nameMatch,
                description: 'Name similarity match'
            });
        }
        if (candidate.pathBonus) {
            factors.push({
                factor: 'path',
                points: candidate.pathBonus,
                description: 'Standard path location'
            });
        }
        if (candidate.methodMatches) {
            factors.push({
                factor: 'methods',
                points: candidate.methodMatches * 10,
                description: `${candidate.methodMatches} method matches`
            });
        }
        if (candidate.typeMatch) {
            factors.push({
                factor: 'type',
                points: candidate.typeMatch,
                description: 'Type match'
            });
        }

        // Add base score if no other factors
        if (factors.length === 0) {
            factors.push({
                factor: 'base',
                points: candidate.score,
                description: 'Base discovery score'
            });
        }

        return {
            factors,
            total: candidate.score
        };
    }

    private detectLanguage(filePath: string): DiscoveryResult['language'] {
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
            case '.js':
            case '.jsx':
                return 'javascript';
            case '.ts':
            case '.tsx':
                return 'typescript';
            case '.php':
                return 'php';
            case '.java':
                return 'java';
            case '.py':
                return 'python';
            default:
                return undefined;
        }
    }

    private async handleOpenFile(filePath: string) {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                throw new Error('No workspace folder open');
            }

            const absolutePath = path.isAbsolute(filePath)
                ? filePath
                : path.join(workspaceRoot, filePath);

            const document = await vscode.workspace.openTextDocument(absolutePath);
            await vscode.window.showTextDocument(document);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
        }
    }

    private async handleScaffoldTest(filePath: string) {
        try {
            const uri = vscode.Uri.file(filePath);
            await vscode.commands.executeCommand('adaptive-tests.scaffoldFile', uri);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to scaffold test: ${error.message}`);
        }
    }

    private async loadAdaptiveTests() {
        try {
            // Try to load from workspace node_modules first
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (workspaceRoot) {
                const localPath = path.join(workspaceRoot, 'node_modules', 'adaptive-tests');
                return require(localPath);
            }
        } catch (e) {
            // Fall back to bundled version
        }

        // Load bundled version
        return require('adaptive-tests');
    }

    // ==================== API Implementation ====================

    /**
     * Run discovery with a given signature
     */
    public async runDiscovery(signature: DiscoverySignature): Promise<DiscoveryResult[]> {
        await this.handleRunDiscovery(signature);
        return this.currentState.results;
    }

    /**
     * Set the signature in the Discovery Lens UI
     */
    public setSignature(signature: DiscoverySignature): void {
        this.updateState({ signature });

        // Send to webview
        this.panel.webview.postMessage({
            command: 'setSignature',
            signature: JSON.stringify(signature, null, 2)
        });
    }

    /**
     * Get the current state
     */
    public getState(): DiscoveryState {
        return { ...this.currentState };
    }

    /**
     * Show the Discovery Lens panel
     */
    public show(): void {
        this.panel.reveal();
    }

    /**
     * Hide the Discovery Lens panel
     */
    public hide(): void {
        this.panel.dispose();
    }

    /**
     * Clear current results and signature
     */
    public clear(): void {
        this.updateState({
            signature: null,
            results: [],
            lastError: null,
            lastRunTimestamp: null
        });

        // Clear webview
        this.panel.webview.postMessage({
            command: 'clear'
        });
    }

    /**
     * Subscribe to state changes
     */
    public onStateChange(callback: (state: DiscoveryState) => void): { dispose(): void } {
        return this.stateChangeEmitter.event(callback);
    }

    /**
     * Subscribe to discovery results
     */
    public onResults(callback: (results: DiscoveryResult[]) => void): { dispose(): void } {
        return this.resultsEmitter.event(callback);
    }

    // ==================== Helper Methods ====================

    private updateState(partial: Partial<DiscoveryState>): void {
        const previousState = { ...this.currentState };
        this.currentState = { ...this.currentState, ...partial };
        this.stateChangeEmitter.fire(this.currentState);
    }

    private loadConfiguration(): void {
        const config = vscode.workspace.getConfiguration('adaptive-tests');
        this.currentState.config = {
            showScores: config.get<boolean>('discovery.showScores', true),
            maxResults: config.get<number>('discovery.maxResults', 10),
            outputDirectory: config.get<string>('scaffold.outputDirectory', 'tests/adaptive'),
            autoOpen: config.get<boolean>('scaffold.autoOpen', true)
        };
    }

    private getWebviewContent(): string {
        const styleUri = this.getWebviewUri('style.css');
        const scriptUri = this.getWebviewUri('script.js');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Discovery Lens</title>
    <link href="${styleUri}" rel="stylesheet">
</head>
<body>
    <div class="container">
        <header>
            <h1>🔍 Discovery Lens</h1>
            <p class="subtitle">Visualize how adaptive-tests discovers your code</p>
        </header>

        <section class="input-section">
            <label for="signature-input">Enter Discovery Signature (JSON)</label>
            <textarea
                id="signature-input"
                placeholder='{"name": "Calculator", "type": "class", "methods": ["add", "subtract"]}'
                rows="4"
            ></textarea>

            <div class="preset-buttons">
                <button class="preset-btn" data-preset="class">Class Example</button>
                <button class="preset-btn" data-preset="function">Function Example</button>
                <button class="preset-btn" data-preset="interface">Interface Example</button>
            </div>

            <button id="run-discovery" class="primary-btn">
                Run Discovery
            </button>
        </section>

        <section class="results-section" style="display: none;">
            <h2>Discovery Results</h2>
            <div class="results-summary"></div>
            <div id="results-container"></div>
        </section>

        <section class="error-section" style="display: none;">
            <div class="error-message"></div>
        </section>

        <section class="help-section">
            <details>
                <summary>How Discovery Works</summary>
                <div class="help-content">
                    <p>The discovery engine uses multiple strategies to find your code:</p>
                    <ul>
                        <li><strong>Name Matching:</strong> Searches for files and exports matching the signature name</li>
                        <li><strong>Type Analysis:</strong> Matches based on code structure (class, function, interface)</li>
                        <li><strong>Method Signatures:</strong> Compares available methods with expected ones</li>
                        <li><strong>Path Scoring:</strong> Prefers standard locations (src/, lib/, etc.)</li>
                        <li><strong>AST Analysis:</strong> Deep code structure analysis for accurate matching</li>
                    </ul>
                    <p>Each candidate receives a score based on how well it matches the signature. Higher scores indicate better matches.</p>
                </div>
            </details>
        </section>
    </div>

    <script src="${scriptUri}"></script>
</body>
</html>`;
    }

    private getWebviewUri(fileName: string): vscode.Uri {
        return this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', fileName)
        );
    }
}