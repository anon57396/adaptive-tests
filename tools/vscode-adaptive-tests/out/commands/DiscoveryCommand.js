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
exports.DiscoveryCommand = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class DiscoveryCommand {
    async execute(uri) {
        try {
            // Get the file path
            const filePath = uri ? uri.fsPath : vscode.window.activeTextEditor?.document.uri.fsPath;
            if (!filePath) {
                vscode.window.showErrorMessage('No file selected. Please open or select a file to analyze.');
                return;
            }
            // Import adaptive-tests
            const adaptiveTests = await this.loadAdaptiveTests();
            const engine = adaptiveTests.getDiscoveryEngine();
            // Get workspace root
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('File is not in a workspace folder.');
                return;
            }
            // Analyze the file to extract signature
            const fileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
            const content = Buffer.from(fileContent).toString('utf8');
            const fileName = path.basename(filePath, path.extname(filePath));
            // Try to extract exports/classes based on file type
            const ext = path.extname(filePath);
            let signature = null;
            if (ext === '.js' || ext === '.ts' || ext === '.jsx' || ext === '.tsx') {
                // Use the discovery engine's analyzer
                const metadata = engine.analyzeModuleExports(content, fileName);
                if (metadata && metadata.exports && metadata.exports.length > 0) {
                    // Pick the best export
                    const mainExport = metadata.exports.find((e) => e.access?.type === 'default') || metadata.exports[0];
                    signature = {
                        name: mainExport.info?.name || mainExport.exportedName || fileName,
                        type: mainExport.info?.kind || 'unknown',
                        methods: mainExport.info?.methods || []
                    };
                }
            }
            else if (ext === '.php') {
                // For PHP files, extract class name from content
                const classMatch = content.match(/class\s+(\w+)/);
                if (classMatch) {
                    signature = {
                        name: classMatch[1],
                        type: 'class'
                    };
                }
            }
            else if (ext === '.java') {
                // For Java files, extract class name
                const classMatch = content.match(/(?:public\s+)?class\s+(\w+)/);
                if (classMatch) {
                    signature = {
                        name: classMatch[1],
                        type: 'class'
                    };
                }
            }
            else if (ext === '.py') {
                // For Python files, extract class name
                const classMatch = content.match(/class\s+(\w+)/);
                if (classMatch) {
                    signature = {
                        name: classMatch[1],
                        type: 'class'
                    };
                }
            }
            if (!signature) {
                vscode.window.showWarningMessage('Could not extract a discovery signature from this file. Opening Discovery Lens for manual input.');
                await vscode.commands.executeCommand('adaptive-tests.showDiscoveryLens');
                return;
            }
            // Show quick pick with options
            const action = await vscode.window.showQuickPick([
                {
                    label: '$(search) Open in Discovery Lens',
                    description: 'Visualize discovery results in the Discovery Lens',
                    value: 'lens'
                },
                {
                    label: '$(output) Show in Output',
                    description: 'Display raw discovery results in output panel',
                    value: 'output'
                },
                {
                    label: '$(file-code) Scaffold Test',
                    description: 'Generate a test file for this code',
                    value: 'scaffold'
                }
            ], {
                placeHolder: `Found ${signature.type}: ${signature.name}. What would you like to do?`
            });
            if (!action)
                return;
            switch (action.value) {
                case 'lens':
                    // Open Discovery Lens and populate with signature
                    await vscode.commands.executeCommand('adaptive-tests.showDiscoveryLens');
                    // The webview will be populated via message passing
                    setTimeout(() => {
                        vscode.commands.executeCommand('workbench.action.webview.postMessage', {
                            command: 'setSignature',
                            signature: JSON.stringify(signature, null, 2)
                        });
                    }, 500);
                    break;
                case 'output':
                    // Run discovery and show in output
                    const outputChannel = vscode.window.createOutputChannel('Adaptive Tests Discovery');
                    outputChannel.show();
                    outputChannel.appendLine(`Discovery Signature: ${JSON.stringify(signature, null, 2)}`);
                    outputChannel.appendLine('');
                    outputChannel.appendLine('Running discovery...');
                    const candidates = await engine.collectCandidates(workspaceFolder.uri.fsPath, signature);
                    outputChannel.appendLine('');
                    outputChannel.appendLine(`Found ${candidates.length} candidates:`);
                    outputChannel.appendLine('');
                    candidates
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 10)
                        .forEach((candidate, index) => {
                        const relativePath = path.relative(workspaceFolder.uri.fsPath, candidate.path);
                        outputChannel.appendLine(`${index + 1}. ${relativePath} (score: ${candidate.score})`);
                    });
                    break;
                case 'scaffold':
                    // Run scaffold command
                    await vscode.commands.executeCommand('adaptive-tests.scaffoldFile', uri);
                    break;
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Discovery failed: ${error.message}`);
            console.error('Discovery error:', error);
        }
    }
    async loadAdaptiveTests() {
        try {
            // Try to load from workspace node_modules first
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders) {
                for (const folder of workspaceFolders) {
                    try {
                        const localPath = path.join(folder.uri.fsPath, 'node_modules', 'adaptive-tests');
                        return require(localPath);
                    }
                    catch (e) {
                        // Continue to next folder
                    }
                }
            }
        }
        catch (e) {
            // Fall back to bundled version
        }
        // Load bundled version
        return require('adaptive-tests');
    }
}
exports.DiscoveryCommand = DiscoveryCommand;
//# sourceMappingURL=DiscoveryCommand.js.map