import * as vscode from 'vscode';
import { DiscoveryLensPanel } from './webview/DiscoveryLensPanel';
import { DiscoveryTreeProvider } from './providers/DiscoveryTreeProvider';
import { AdaptiveTestsCodeLensProvider } from './providers/CodeLensProvider';
import { ScaffoldCommand } from './commands/ScaffoldCommand';
import { DiscoveryCommand } from './commands/DiscoveryCommand';

let discoveryLensPanel: DiscoveryLensPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Adaptive Tests extension is now active!');

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
}

export function deactivate() {
    if (discoveryLensPanel) {
        discoveryLensPanel.dispose();
    }
}