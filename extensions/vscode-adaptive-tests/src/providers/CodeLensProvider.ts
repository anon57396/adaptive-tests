import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class AdaptiveTestsCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    constructor() {
        vscode.workspace.onDidChangeConfiguration((_) => {
            this._onDidChangeCodeLenses.fire();
        });
    }

    public provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken
    ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];

        // Only provide lenses for supported file types
        const ext = path.extname(document.fileName);
        const supportedExtensions = ['.js', '.ts', '.jsx', '.tsx'];

        if (!supportedExtensions.includes(ext)) {
            return codeLenses;
        }

        const text = document.getText();

        // Find exported classes
        const classRegex = /export\s+(?:default\s+)?class\s+(\w+)/g;
        let match;

        while ((match = classRegex.exec(text)) !== null) {
            const className = match[1];
            const line = document.positionAt(match.index).line;
            const range = new vscode.Range(line, 0, line, 0);

            // Check if test exists
            const testExists = this.checkTestExists(document, className);

            if (testExists) {
                codeLenses.push(
                    new vscode.CodeLens(range, {
                        title: '✓ Adaptive test exists',
                        tooltip: 'An adaptive test already exists for this class',
                        command: 'adaptive-tests.openTest',
                        arguments: [document.uri, className]
                    })
                );
            } else {
                codeLenses.push(
                    new vscode.CodeLens(range, {
                        title: '$(add) Generate adaptive test',
                        tooltip: 'Generate an adaptive test for this class',
                        command: 'adaptive-tests.scaffoldFile',
                        arguments: [document.uri]
                    })
                );
            }

            // Add discovery lens
            codeLenses.push(
                new vscode.CodeLens(range, {
                    title: '$(search) Run discovery',
                    tooltip: 'See how this class would be discovered',
                    command: 'adaptive-tests.runDiscovery',
                    arguments: [document.uri]
                })
            );
        }

        // Find exported functions
        const functionRegex = /export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/g;

        while ((match = functionRegex.exec(text)) !== null) {
            const functionName = match[1];
            const line = document.positionAt(match.index).line;
            const range = new vscode.Range(line, 0, line, 0);

            codeLenses.push(
                new vscode.CodeLens(range, {
                    title: '$(search) Discover function',
                    tooltip: 'See how this function would be discovered',
                    command: 'adaptive-tests.runDiscovery',
                    arguments: [document.uri]
                })
            );
        }

        return codeLenses;
    }

    public resolveCodeLens(
        codeLens: vscode.CodeLens,
        token: vscode.CancellationToken
    ): vscode.CodeLens {
        return codeLens;
    }

    private checkTestExists(document: vscode.TextDocument, className: string): boolean {
        // Check if corresponding test file exists
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
            return false;
        }

        const config = vscode.workspace.getConfiguration('adaptive-tests');
        const testDir = config.get<string>('scaffold.outputDirectory', 'tests/adaptive');

        // Common test file patterns
        const testPatterns = [
            path.join(workspaceFolder.uri.fsPath, testDir, `${className}.test.js`),
            path.join(workspaceFolder.uri.fsPath, testDir, `${className}.test.ts`),
            path.join(workspaceFolder.uri.fsPath, testDir, `${className}.spec.js`),
            path.join(workspaceFolder.uri.fsPath, testDir, `${className}.spec.ts`),
            path.join(workspaceFolder.uri.fsPath, 'tests', `${className}.test.js`),
            path.join(workspaceFolder.uri.fsPath, 'tests', `${className}.test.ts`),
            path.join(workspaceFolder.uri.fsPath, '__tests__', `${className}.test.js`),
            path.join(workspaceFolder.uri.fsPath, '__tests__', `${className}.test.ts`)
        ];

        // Check if any test file exists
        return testPatterns.some(pattern => {
            try {
                return fs.existsSync(pattern);
            } catch {
                return false;
            }
        });
    }
}