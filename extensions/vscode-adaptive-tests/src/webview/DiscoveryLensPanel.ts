import * as vscode from 'vscode';
import * as path from 'path';

export class DiscoveryLensPanel {
    private readonly panel: vscode.WebviewPanel;
    private readonly context: vscode.ExtensionContext;
    private disposables: vscode.Disposable[] = [];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;

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
    }

    private async handleRunDiscovery(signature: any) {
        try {
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
            const config = vscode.workspace.getConfiguration('adaptive-tests');
            const maxResults = config.get<number>('discovery.maxResults', 10);
            const showScores = config.get<boolean>('discovery.showScores', true);

            const results = candidates.slice(0, maxResults).map((candidate: any) => ({
                path: path.relative(workspaceRoot, candidate.path),
                absolutePath: candidate.path,
                score: candidate.score,
                scoreBreakdown: candidate.scoreBreakdown || this.calculateScoreBreakdown(candidate, signature),
                showScores
            }));

            // Send results to webview
            this.panel.webview.postMessage({
                command: 'displayResults',
                results,
                signature,
                totalCandidates: candidates.length
            });

        } catch (error: any) {
            // Send error to webview
            this.panel.webview.postMessage({
                command: 'showError',
                error: error.message || 'Discovery failed'
            });
        }
    }

    private calculateScoreBreakdown(candidate: any, signature: any): string[] {
        const breakdown = [];

        // This is a simplified version - the actual implementation would analyze
        // the scoring in detail based on the discovery engine's logic
        if (candidate.nameMatch) {
            breakdown.push(`+${candidate.nameMatch} for name match`);
        }
        if (candidate.pathBonus) {
            breakdown.push(`+${candidate.pathBonus} for path location`);
        }
        if (candidate.methodMatches) {
            breakdown.push(`+${candidate.methodMatches * 10} for method matches`);
        }
        if (candidate.typeMatch) {
            breakdown.push(`+${candidate.typeMatch} for type match`);
        }

        return breakdown.length > 0 ? breakdown : [`Base score: ${candidate.score}`];
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