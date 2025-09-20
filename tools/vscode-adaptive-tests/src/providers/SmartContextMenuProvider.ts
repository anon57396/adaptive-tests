import * as vscode from 'vscode';
import * as path from 'path';
import { OpenTestCommand } from '../commands/OpenTestCommand';

/**
 * Smart context menu provider that dynamically determines
 * whether to show "Scaffold Test" or "Open Test" based on
 * whether a test file already exists.
 */
export class SmartContextMenuProvider {
    private openTestCommand: OpenTestCommand;

    constructor() {
        this.openTestCommand = new OpenTestCommand();
    }

    /**
     * Register dynamic commands that check test existence
     */
    public registerCommands(context: vscode.ExtensionContext): void {
        // Smart command that decides between scaffold and open
        const smartTestCommand = vscode.commands.registerCommand(
            'adaptive-tests.smartTest',
            async (uri: vscode.Uri) => {
                const hasTest = await this.openTestCommand.hasTest(uri.fsPath);

                if (hasTest) {
                    // Test exists, open it
                    await vscode.commands.executeCommand('adaptive-tests.openTest', uri);
                } else {
                    // No test, scaffold it
                    await vscode.commands.executeCommand('adaptive-tests.scaffoldFile', uri);
                }
            }
        );

        // Register the open test command
        const openTestCommand = vscode.commands.registerCommand(
            'adaptive-tests.openTest',
            (uri: vscode.Uri) => this.openTestCommand.execute(uri)
        );

        context.subscriptions.push(smartTestCommand, openTestCommand);
    }

    /**
     * Determine the appropriate menu item label
     */
    public async getMenuLabel(uri: vscode.Uri): Promise<string> {
        const hasTest = await this.openTestCommand.hasTest(uri.fsPath);
        return hasTest ? 'Open Adaptive Test' : 'Scaffold Adaptive Test';
    }

    /**
     * Determine the appropriate icon
     */
    public async getMenuIcon(uri: vscode.Uri): Promise<string> {
        const hasTest = await this.openTestCommand.hasTest(uri.fsPath);
        return hasTest ? '$(file-code)' : '$(add)';
    }
}

/**
 * Context value provider for conditional menu items
 *
 * This sets context values that can be used in when clauses
 * for menu items in package.json
 */
export class TestContextProvider {
    private static instance: TestContextProvider;
    private openTestCommand: OpenTestCommand;
    private fileTestStatus: Map<string, boolean> = new Map();

    private constructor() {
        this.openTestCommand = new OpenTestCommand();
    }

    public static getInstance(): TestContextProvider {
        if (!TestContextProvider.instance) {
            TestContextProvider.instance = new TestContextProvider();
        }
        return TestContextProvider.instance;
    }

    /**
     * Start watching for file changes and update context
     */
    public startWatching(context: vscode.ExtensionContext): void {
        // Update context when active editor changes
        vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (editor && editor.document) {
                await this.updateContext(editor.document.uri);
            }
        }, null, context.subscriptions);

        // Update context when files are saved (tests might be created)
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            // Clear cache for related files
            this.clearCacheForFile(document.uri.fsPath);

            // Update context for active editor
            if (vscode.window.activeTextEditor) {
                await this.updateContext(vscode.window.activeTextEditor.document.uri);
            }
        }, null, context.subscriptions);

        // Update context when files are created
        vscode.workspace.onDidCreateFiles(async (event) => {
            // Clear cache as new test files might have been created
            this.fileTestStatus.clear();

            // Update context for active editor
            if (vscode.window.activeTextEditor) {
                await this.updateContext(vscode.window.activeTextEditor.document.uri);
            }
        }, null, context.subscriptions);

        // Initial update
        if (vscode.window.activeTextEditor) {
            this.updateContext(vscode.window.activeTextEditor.document.uri);
        }
    }

    /**
     * Update context values for a file
     */
    private async updateContext(uri: vscode.Uri): Promise<void> {
        const filePath = uri.fsPath;
        const ext = path.extname(filePath);

        // Check if it's a supported file type
        const supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.php', '.java', '.py', '.go', '.rs'];
        const isSupported = supportedExtensions.includes(ext) &&
                          !filePath.includes('.test.') &&
                          !filePath.includes('.spec.');

        if (!isSupported) {
            vscode.commands.executeCommand('setContext', 'adaptive-tests.hasTest', false);
            vscode.commands.executeCommand('setContext', 'adaptive-tests.canScaffold', false);
            return;
        }

        // Check cache first
        let hasTest = this.fileTestStatus.get(filePath);

        if (hasTest === undefined) {
            // Not in cache, check file system
            hasTest = await this.openTestCommand.hasTest(filePath);
            this.fileTestStatus.set(filePath, hasTest);
        }

        // Set context values
        vscode.commands.executeCommand('setContext', 'adaptive-tests.hasTest', hasTest);
        vscode.commands.executeCommand('setContext', 'adaptive-tests.canScaffold', !hasTest);
    }

    /**
     * Clear cache for a specific file and related files
     */
    private clearCacheForFile(filePath: string): void {
        const fileName = path.basename(filePath, path.extname(filePath));

        // Clear cache for any file with similar name (could be test or source)
        const keysToDelete: string[] = [];
        for (const key of this.fileTestStatus.keys()) {
            if (key.includes(fileName)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.fileTestStatus.delete(key));
    }

    /**
     * Manually refresh context for a file
     */
    public async refreshContext(uri: vscode.Uri): Promise<void> {
        this.fileTestStatus.delete(uri.fsPath);
        await this.updateContext(uri);
    }
}