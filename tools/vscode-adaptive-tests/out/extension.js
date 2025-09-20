"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const DiscoveryLensPanel_1 = require("./webview/DiscoveryLensPanel");
const DiscoveryTreeProvider_1 = require("./providers/DiscoveryTreeProvider");
const CodeLensProvider_1 = require("./providers/CodeLensProvider");
const ScaffoldCommand_1 = require("./commands/ScaffoldCommand");
const BatchScaffoldCommand_1 = require("./commands/BatchScaffoldCommand");
const OpenTestCommand_1 = require("./commands/OpenTestCommand");
const DiscoveryCommand_1 = require("./commands/DiscoveryCommand");
const SmartContextMenuProvider_1 = require("./providers/SmartContextMenuProvider");
const DiscoveryLensAPIFactory_1 = require("./api/DiscoveryLensAPIFactory");
let discoveryLensPanel;
function activate(context) {
    console.log('Adaptive Tests extension is now active!');
    // Initialize API factory for cross-extension communication
    const apiFactory = DiscoveryLensAPIFactory_1.DiscoveryLensAPIFactory.getInstance();
    apiFactory.initialize(context);
    // Register Discovery Lens command
    const showDiscoveryLensCommand = vscode.commands.registerCommand('adaptive-tests.showDiscoveryLens', () => {
        // Use API factory to get consistent panel instance
        const api = apiFactory.getDiscoveryLensAPI({ autoShow: true });
        if (discoveryLensPanel) {
            discoveryLensPanel.reveal();
        }
        else {
            discoveryLensPanel = new DiscoveryLensPanel_1.DiscoveryLensPanel(context);
            discoveryLensPanel.onDidDispose(() => {
                discoveryLensPanel = undefined;
            });
        }
    });
    // Register Scaffold command
    const scaffoldCommand = new ScaffoldCommand_1.ScaffoldCommand();
    const scaffoldFileCommand = vscode.commands.registerCommand('adaptive-tests.scaffoldFile', (uri) => scaffoldCommand.execute(uri));
    // Register Batch Scaffold command
    const batchScaffoldCommand = new BatchScaffoldCommand_1.BatchScaffoldCommand();
    const scaffoldBatchCommand = vscode.commands.registerCommand('adaptive-tests.scaffoldBatch', (uri) => batchScaffoldCommand.execute(uri));
    // Register Open Test command
    const openTestCommand = new OpenTestCommand_1.OpenTestCommand();
    const openTestCmd = vscode.commands.registerCommand('adaptive-tests.openTest', (uri) => openTestCommand.execute(uri));
    // Register Smart Context Menu Provider
    const smartMenuProvider = new SmartContextMenuProvider_1.SmartContextMenuProvider();
    smartMenuProvider.registerCommands(context);
    // Start Test Context Provider for dynamic menu items
    const testContextProvider = SmartContextMenuProvider_1.TestContextProvider.getInstance();
    testContextProvider.startWatching(context);
    // Register Discovery command
    const discoveryCommand = new DiscoveryCommand_1.DiscoveryCommand();
    const runDiscoveryCommand = vscode.commands.registerCommand('adaptive-tests.runDiscovery', async (uri) => {
        // Use API factory for discovery operations
        const api = apiFactory.getDiscoveryLensAPI();
        try {
            await discoveryCommand.execute(uri);
        }
        catch (error) {
            console.error('Discovery command failed:', error);
            vscode.window.showErrorMessage(`Discovery failed: ${error}`);
        }
    });
    // Register Tree Data Provider for Discovery View
    const discoveryTreeProvider = new DiscoveryTreeProvider_1.DiscoveryTreeProvider();
    vscode.window.registerTreeDataProvider('adaptive-tests.discoveryView', discoveryTreeProvider);
    // Register CodeLens Provider
    const codeLensProvider = new CodeLensProvider_1.AdaptiveTestsCodeLensProvider();
    const codeLensDisposable = vscode.languages.registerCodeLensProvider([
        { language: 'javascript' },
        { language: 'typescript' },
        { language: 'javascriptreact' },
        { language: 'typescriptreact' },
        { language: 'java' },
        { language: 'go' },
        { language: 'php' },
        { language: 'python' },
        { language: 'rust' }
    ], codeLensProvider);
    // Add status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(search) Discovery Lens';
    statusBarItem.tooltip = 'Open Adaptive Tests Discovery Lens';
    statusBarItem.command = 'adaptive-tests.showDiscoveryLens';
    statusBarItem.show();
    // Register all disposables
    context.subscriptions.push(showDiscoveryLensCommand, scaffoldFileCommand, scaffoldBatchCommand, openTestCmd, runDiscoveryCommand, codeLensDisposable, statusBarItem);
    // Show welcome message on first activation
    const config = vscode.workspace.getConfiguration('adaptive-tests');
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
    if (!hasShownWelcome) {
        vscode.window.showInformationMessage('Welcome to Adaptive Tests! Click the Discovery Lens button in the status bar to start exploring.', 'Open Discovery Lens', 'Later').then(selection => {
            if (selection === 'Open Discovery Lens') {
                vscode.commands.executeCommand('adaptive-tests.showDiscoveryLens');
            }
            context.globalState.update('hasShownWelcome', true);
        });
    }
    // Export API for cross-extension communication
    return {
        getDiscoveryLensAPI: DiscoveryLensAPIFactory_1.getDiscoveryLensAPI,
        // Additional APIs can be exposed here for other extensions
        getDiscoveryEngine: async () => {
            try {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspaceRoot) {
                    const adaptiveTests = require('adaptive-tests');
                    return adaptiveTests.getDiscoveryEngine(workspaceRoot);
                }
            }
            catch (e) {
                console.error('Failed to load discovery engine:', e);
            }
            return null;
        }
    };
}
function deactivate() {
    if (discoveryLensPanel) {
        discoveryLensPanel.dispose();
    }
    DiscoveryLensAPIFactory_1.DiscoveryLensAPIFactory.getInstance().dispose();
}
//# sourceMappingURL=extension.js.map