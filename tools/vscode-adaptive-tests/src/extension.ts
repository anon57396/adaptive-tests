import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { DiscoveryLensPanel } from './webview/DiscoveryLensPanel';
import { DiscoveryTreeProvider } from './providers/DiscoveryTreeProvider';
import { AdaptiveTestsCodeLensProvider } from './providers/CodeLensProvider';
import { ScaffoldCommand } from './commands/ScaffoldCommand';
import { BatchScaffoldCommand } from './commands/BatchScaffoldCommand';
import { OpenTestCommand } from './commands/OpenTestCommand';
import { DiscoveryCommand } from './commands/DiscoveryCommand';
import { SmartContextMenuProvider, TestContextProvider } from './providers/SmartContextMenuProvider';
import { DiscoveryLensAPIFactory, getDiscoveryLensAPI } from './api/DiscoveryLensAPIFactory';
import { IDiscoveryLensAPI } from './types/api';

let discoveryLensPanel: DiscoveryLensPanel | undefined;
const execAsync = promisify(exec);

export function activate(context: vscode.ExtensionContext) {
    console.log('Adaptive Tests extension is now active!');

    // Initialize API factory for cross-extension communication
    const apiFactory = DiscoveryLensAPIFactory.getInstance();
    apiFactory.initialize(context);

    // Register Discovery Lens command
    const showDiscoveryLensCommand = vscode.commands.registerCommand(
        'adaptive-tests.showDiscoveryLens',
        () => {
            // Use API factory to get consistent panel instance
            const api = apiFactory.getDiscoveryLensAPI({ autoShow: true });
            if (discoveryLensPanel) {
                discoveryLensPanel.reveal();
            } else {
                discoveryLensPanel = new DiscoveryLensPanel(context);
                discoveryLensPanel.onDidDispose(() => {
                    discoveryLensPanel = undefined;
                });
            }
        }
    );

    // Register Scaffold command
    const scaffoldCommand = new ScaffoldCommand();
    const scaffoldFileCommand = vscode.commands.registerCommand(
        'adaptive-tests.scaffoldFile',
        (uri: vscode.Uri) => scaffoldCommand.execute(uri)
    );

    // Register Batch Scaffold command
    const batchScaffoldCommand = new BatchScaffoldCommand();
    const scaffoldBatchCommand = vscode.commands.registerCommand(
        'adaptive-tests.scaffoldBatch',
        (uri: vscode.Uri) => batchScaffoldCommand.execute(uri)
    );

    // Register Open Test command
    const openTestCommand = new OpenTestCommand();
    const openTestCmd = vscode.commands.registerCommand(
        'adaptive-tests.openTest',
        (uri: vscode.Uri) => openTestCommand.execute(uri)
    );

    // Register Smart Context Menu Provider
    const smartMenuProvider = new SmartContextMenuProvider();
    smartMenuProvider.registerCommands(context);

    // Start Test Context Provider for dynamic menu items
    const testContextProvider = TestContextProvider.getInstance();
    testContextProvider.startWatching(context);

    // Register Discovery command
    const discoveryCommand = new DiscoveryCommand();
    const runDiscoveryCommand = vscode.commands.registerCommand(
        'adaptive-tests.runDiscovery',
        async (uri: vscode.Uri) => {
            // Use API factory for discovery operations
            const api = apiFactory.getDiscoveryLensAPI();
            try {
                await discoveryCommand.execute(uri);
            } catch (error) {
                console.error('Discovery command failed:', error);
                vscode.window.showErrorMessage(`Discovery failed: ${error}`);
            }
        }
    );

    // Register Tree Data Provider for Discovery View
    const discoveryTreeProvider = new DiscoveryTreeProvider();
    vscode.window.registerTreeDataProvider(
        'adaptive-tests.discoveryView',
        discoveryTreeProvider
    );

    // Register CodeLens Provider
    const codeLensProvider = new AdaptiveTestsCodeLensProvider();
    const codeLensDisposable = vscode.languages.registerCodeLensProvider(
        [
            { language: 'javascript' },
            { language: 'typescript' },
            { language: 'javascriptreact' },
            { language: 'typescriptreact' },
            { language: 'java' },
            { language: 'go' },
            { language: 'php' },
            { language: 'python' },
            { language: 'rust' }
        ],
        codeLensProvider
    );

    // Add status bar item
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.text = '$(search) Discovery Lens';
    statusBarItem.tooltip = 'Open Adaptive Tests Discovery Lens';
    statusBarItem.command = 'adaptive-tests.showDiscoveryLens';
    statusBarItem.show();

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
    if (workspaceRoot) {
        setupInvisibleIntegration(workspaceRoot, context, statusBarItem).catch(error => {
            console.error('Failed to integrate invisible mode:', error);
        });
    }

    // Register all disposables
    context.subscriptions.push(
        showDiscoveryLensCommand,
        scaffoldFileCommand,
        scaffoldBatchCommand,
        openTestCmd,
        runDiscoveryCommand,
        codeLensDisposable,
        statusBarItem
    );

    // Show welcome message on first activation
    const config = vscode.workspace.getConfiguration('adaptive-tests');
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);

    if (!hasShownWelcome) {
        vscode.window.showInformationMessage(
            'Welcome to Adaptive Tests! Click the Discovery Lens button in the status bar to start exploring.',
            'Open Discovery Lens',
            'Later'
        ).then(selection => {
            if (selection === 'Open Discovery Lens') {
                vscode.commands.executeCommand('adaptive-tests.showDiscoveryLens');
            }
            context.globalState.update('hasShownWelcome', true);
        });
    }

    // Export API for cross-extension communication
    return {
        getDiscoveryLensAPI,

        // Additional APIs can be exposed here for other extensions
        getDiscoveryEngine: async () => {
            try {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspaceRoot) {
                    const adaptiveTests = require('adaptive-tests');
                    return adaptiveTests.getDiscoveryEngine(workspaceRoot);
                }
            } catch (e) {
                console.error('Failed to load discovery engine:', e);
            }
            return null;
        }
    };
}

async function setupInvisibleIntegration(
    workspaceRoot: string,
    context: vscode.ExtensionContext,
    statusBarItem: vscode.StatusBarItem
) {
    await maybePromptForInvisibleEnable(workspaceRoot, context);
    setupInvisibleHistoryWatcher(workspaceRoot, context, statusBarItem);
}

async function maybePromptForInvisibleEnable(workspaceRoot: string, context: vscode.ExtensionContext) {
    const markerPath = path.join(workspaceRoot, '.adaptive-tests', 'invisible-enabled.json');
    const promptedKey = 'adaptive-tests.promptedInvisible';

    if (fs.existsSync(markerPath)) {
        return;
    }

    if (context.workspaceState.get<boolean>(promptedKey)) {
        return;
    }

    const selection = await vscode.window.showInformationMessage(
        'Adaptive Tests invisible mode can automatically repair broken imports. Enable it now?',
        'Enable Invisible Mode',
        'Not Now'
    );

    if (selection === 'Enable Invisible Mode') {
        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Enabling Adaptive Tests invisible mode...'
                },
                async () => {
                    const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
                    await execAsync(`${npxCommand} adaptive-tests enable-invisible`, { cwd: workspaceRoot });
                }
            );

            vscode.window.showInformationMessage('Adaptive Tests invisible mode enabled. Break an import and rerun your tests to see it in action.');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to enable invisible mode. Run "npx adaptive-tests enable-invisible" manually for more details.');
        }
    }

    context.workspaceState.update(promptedKey, true);
}

function setupInvisibleHistoryWatcher(
    workspaceRoot: string,
    context: vscode.ExtensionContext,
    statusBarItem: vscode.StatusBarItem
) {
    const historyPattern = new vscode.RelativePattern(workspaceRoot, '.adaptive-tests/invisible-history.json');
    const watcher = vscode.workspace.createFileSystemWatcher(historyPattern);

    const refresh = () => refreshInvisibleHistory(workspaceRoot, statusBarItem, context);

    watcher.onDidChange(refresh, undefined, context.subscriptions);
    watcher.onDidCreate(refresh, undefined, context.subscriptions);
    watcher.onDidDelete(() => clearInvisibleStatus(statusBarItem), undefined, context.subscriptions);

    context.subscriptions.push(watcher);

    refresh();
}

function clearInvisibleStatus(statusBarItem: vscode.StatusBarItem) {
    statusBarItem.text = '$(search) Discovery Lens';
    statusBarItem.tooltip = 'Open Adaptive Tests Discovery Lens';
}

async function refreshInvisibleHistory(
    workspaceRoot: string,
    statusBarItem: vscode.StatusBarItem,
    context: vscode.ExtensionContext
) {
    const historyPath = path.join(workspaceRoot, '.adaptive-tests', 'invisible-history.json');
    if (!fs.existsSync(historyPath)) {
        clearInvisibleStatus(statusBarItem);
        return;
    }

    try {
        const fileContents = await fs.promises.readFile(historyPath, 'utf8');
        const history = JSON.parse(fileContents);

        if (!Array.isArray(history) || history.length === 0) {
            clearInvisibleStatus(statusBarItem);
            return;
        }

        const latest = history[0];
        const lastTimestamp = context.workspaceState.get<string>('adaptive-tests.lastInvisibleNotification');

        statusBarItem.text = '$(zap) Adaptive Tests';
        statusBarItem.tooltip = latest?.suggestion
            ? `Invisible mode recovered ${history.length} modules (latest: ${latest.suggestion})`
            : 'Adaptive Tests invisible mode is active';

        if (latest?.timestamp && latest.timestamp !== lastTimestamp) {
            const recent = history
                .slice(0, 3)
                .map((entry: any) => entry.suggestion || entry.modulePath)
                .filter(Boolean)
                .join(', ');

            if (recent) {
                vscode.window
                    .showInformationMessage(
                        `Adaptive Tests invisible mode recovered: ${recent}.`,
                        'Open Invisible History'
                    )
                    .then(selection => {
                        if (selection === 'Open Invisible History') {
                            openInvisibleHistory(historyPath);
                        }
                    });
            }

            context.workspaceState.update('adaptive-tests.lastInvisibleNotification', latest.timestamp);
        }
    } catch (error) {
        console.error('Failed to read invisible history:', error);
        clearInvisibleStatus(statusBarItem);
    }
}

async function openInvisibleHistory(historyPath: string) {
    try {
        const document = await vscode.workspace.openTextDocument(historyPath);
        await vscode.window.showTextDocument(document, { preview: false });
    } catch (error) {
        vscode.window.showErrorMessage('Unable to open invisible history file.');
    }
}

export function deactivate() {
    if (discoveryLensPanel) {
        discoveryLensPanel.dispose();
    }
    DiscoveryLensAPIFactory.getInstance().dispose();
}
