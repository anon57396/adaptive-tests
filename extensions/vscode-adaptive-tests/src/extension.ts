import * as vscode from 'vscode';
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

export function activate(context: vscode.ExtensionContext) {
    console.log('Adaptive Tests extension is now active!');

    // Initialize API factory for cross-extension communication
    DiscoveryLensAPIFactory.getInstance().initialize(context);

    // Register Discovery Lens command
    const showDiscoveryLensCommand = vscode.commands.registerCommand(
        'adaptive-tests.showDiscoveryLens',
        () => {
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
        (uri: vscode.Uri) => discoveryCommand.execute(uri)
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
            { language: 'typescriptreact' }
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

        // Additional APIs can be exposed here for other Cypher Suite extensions
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

export function deactivate() {
    if (discoveryLensPanel) {
        discoveryLensPanel.dispose();
    }
    DiscoveryLensAPIFactory.getInstance().dispose();
}