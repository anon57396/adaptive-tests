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
exports.TestContextProvider = exports.SmartContextMenuProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const OpenTestCommand_1 = require("../commands/OpenTestCommand");
/**
 * Smart context menu provider that dynamically determines
 * whether to show "Scaffold Test" or "Open Test" based on
 * whether a test file already exists.
 */
class SmartContextMenuProvider {
    constructor() {
        this.openTestCommand = new OpenTestCommand_1.OpenTestCommand();
    }
    /**
     * Register dynamic commands that check test existence
     */
    registerCommands(context) {
        // Smart command that decides between scaffold and open
        const smartTestCommand = vscode.commands.registerCommand('adaptive-tests.smartTest', async (uri) => {
            const hasTest = await this.openTestCommand.hasTest(uri.fsPath);
            if (hasTest) {
                // Test exists, open it
                await vscode.commands.executeCommand('adaptive-tests.openTest', uri);
            }
            else {
                // No test, scaffold it
                await vscode.commands.executeCommand('adaptive-tests.scaffoldFile', uri);
            }
        });
        // Register the open test command
        const openTestCommand = vscode.commands.registerCommand('adaptive-tests.openTest', (uri) => this.openTestCommand.execute(uri));
        context.subscriptions.push(smartTestCommand, openTestCommand);
    }
    /**
     * Determine the appropriate menu item label
     */
    async getMenuLabel(uri) {
        const hasTest = await this.openTestCommand.hasTest(uri.fsPath);
        return hasTest ? 'Open Adaptive Test' : 'Scaffold Adaptive Test';
    }
    /**
     * Determine the appropriate icon
     */
    async getMenuIcon(uri) {
        const hasTest = await this.openTestCommand.hasTest(uri.fsPath);
        return hasTest ? '$(file-code)' : '$(add)';
    }
}
exports.SmartContextMenuProvider = SmartContextMenuProvider;
/**
 * Context value provider for conditional menu items
 *
 * This sets context values that can be used in when clauses
 * for menu items in package.json
 */
class TestContextProvider {
    constructor() {
        this.fileTestStatus = new Map();
        this.openTestCommand = new OpenTestCommand_1.OpenTestCommand();
    }
    static getInstance() {
        if (!TestContextProvider.instance) {
            TestContextProvider.instance = new TestContextProvider();
        }
        return TestContextProvider.instance;
    }
    /**
     * Start watching for file changes and update context
     */
    startWatching(context) {
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
    async updateContext(uri) {
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
    clearCacheForFile(filePath) {
        const fileName = path.basename(filePath, path.extname(filePath));
        // Clear cache for any file with similar name (could be test or source)
        const keysToDelete = [];
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
    async refreshContext(uri) {
        this.fileTestStatus.delete(uri.fsPath);
        await this.updateContext(uri);
    }
}
exports.TestContextProvider = TestContextProvider;
//# sourceMappingURL=SmartContextMenuProvider.js.map