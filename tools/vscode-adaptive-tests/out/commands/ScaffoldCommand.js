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
exports.ScaffoldCommand = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const child_process = __importStar(require("child_process"));
const util_1 = require("util");
const exec = (0, util_1.promisify)(child_process.exec);
class ScaffoldCommand {
    async execute(uri) {
        try {
            // Get the file path
            const filePath = uri ? uri.fsPath : vscode.window.activeTextEditor?.document.uri.fsPath;
            if (!filePath) {
                vscode.window.showErrorMessage('No file selected. Please open or select a file to scaffold.');
                return;
            }
            // Check file extension
            const ext = path.extname(filePath);
            const supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.php', '.java', '.py', '.go', '.rs'];
            if (!supportedExtensions.includes(ext)) {
                vscode.window.showWarningMessage(`File type ${ext} is not supported for scaffolding.`);
                return;
            }
            // Get workspace root
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(filePath));
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('File is not in a workspace folder.');
                return;
            }
            // Get configuration
            const config = vscode.workspace.getConfiguration('adaptive-tests');
            const outputDir = config.get('scaffold.outputDirectory', 'tests/adaptive');
            const autoOpen = config.get('scaffold.autoOpen', true);
            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Scaffolding Adaptive Test',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Analyzing file...' });
                // Run the scaffold command
                const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);
                const command = `npx adaptive-tests scaffold "${relativePath}" --output-dir="${outputDir}"`;
                progress.report({ increment: 50, message: 'Generating test file...' });
                try {
                    const { stdout, stderr } = await exec(command, {
                        cwd: workspaceFolder.uri.fsPath,
                        timeout: 60000, // 60 second timeout
                        maxBuffer: 1024 * 1024 // 1MB max buffer
                    });
                    // Enhanced stderr parsing
                    if (stderr) {
                        const normalMessages = ['Created', 'Analyzing', 'Writing', 'Scaffolding'];
                        const hasNormalMessage = normalMessages.some(msg => stderr.includes(msg));
                        if (!hasNormalMessage) {
                            // Check for specific error patterns
                            if (stderr.includes('ENOENT')) {
                                throw new Error('adaptive-tests CLI not found. Please ensure it is installed: npm install -g adaptive-tests');
                            }
                            else if (stderr.includes('EACCES')) {
                                throw new Error('Permission denied. Please check file permissions.');
                            }
                            else if (stderr.includes('spawn')) {
                                throw new Error('Failed to execute command. Please check your environment.');
                            }
                            else {
                                throw new Error(`Command failed: ${stderr}`);
                            }
                        }
                    }
                    // Parse output to find created file
                    const createdMatch = stdout.match(/✅ Created (.+)/);
                    if (createdMatch) {
                        const testFile = createdMatch[1].trim();
                        const testPath = path.join(workspaceFolder.uri.fsPath, testFile);
                        progress.report({ increment: 100, message: 'Test scaffolded successfully!' });
                        // Show success message with action
                        const action = await vscode.window.showInformationMessage(`Test scaffolded: ${testFile}`, 'Open Test File');
                        if (action === 'Open Test File' || autoOpen) {
                            const doc = await vscode.workspace.openTextDocument(testPath);
                            await vscode.window.showTextDocument(doc);
                        }
                    }
                    else {
                        // Check if file was skipped
                        if (stdout.includes('Skipped')) {
                            const overwrite = await vscode.window.showWarningMessage('Test file already exists. Overwrite?', 'Overwrite', 'Cancel');
                            if (overwrite === 'Overwrite') {
                                // Re-run with --force flag
                                const forceCommand = `${command} --force`;
                                const { stdout: forceStdout, stderr: forceStderr } = await exec(forceCommand, {
                                    cwd: workspaceFolder.uri.fsPath,
                                    timeout: 60000,
                                    maxBuffer: 1024 * 1024
                                });
                                // Check for force command errors
                                if (forceStderr && !forceStderr.includes('Created')) {
                                    throw new Error(`Force overwrite failed: ${forceStderr}`);
                                }
                                const forceMatch = forceStdout.match(/✅ Created (.+)/);
                                if (forceMatch) {
                                    const testFile = forceMatch[1].trim();
                                    const testPath = path.join(workspaceFolder.uri.fsPath, testFile);
                                    if (autoOpen) {
                                        const doc = await vscode.workspace.openTextDocument(testPath);
                                        await vscode.window.showTextDocument(doc);
                                    }
                                    vscode.window.showInformationMessage(`Test file overwritten: ${testFile}`);
                                }
                            }
                        }
                        else if (stdout.includes('No exports found') || stdout.includes('No PHP classes')) {
                            vscode.window.showWarningMessage('No exportable code found in file. Make sure your file exports classes, functions, or other testable code.');
                        }
                    }
                }
                catch (error) {
                    // Enhanced error categorization
                    let userMessage = 'Scaffold command failed';
                    if (error.code === 'ETIMEDOUT') {
                        userMessage = 'Scaffolding timed out. The file may be very large or the system is busy.';
                    }
                    else if (error.message.includes('ENOENT')) {
                        userMessage = 'adaptive-tests CLI not found. Please install it first: npm install -g adaptive-tests';
                    }
                    else if (error.message.includes('not supported')) {
                        userMessage = 'This file type is not supported for scaffolding yet.';
                    }
                    else if (error.message.includes('permission')) {
                        userMessage = 'Permission denied. Please check file and directory permissions.';
                    }
                    else {
                        userMessage = error.message;
                    }
                    throw new Error(userMessage);
                }
            });
        }
        catch (error) {
            // Show user-friendly error with action options
            const action = await vscode.window.showErrorMessage(`Failed to scaffold test: ${error.message}`, 'Show Details', 'Try Again', 'Open Logs');
            if (action === 'Show Details') {
                const outputChannel = vscode.window.createOutputChannel('Adaptive Tests');
                outputChannel.appendLine('Scaffold Error Details:');
                outputChannel.appendLine(`Error: ${error.message}`);
                outputChannel.appendLine(`Stack: ${error.stack}`);
                outputChannel.appendLine(`File: ${uri?.fsPath || 'unknown'}`);
                outputChannel.appendLine(`Command: npx adaptive-tests scaffold`);
                outputChannel.show();
            }
            else if (action === 'Try Again') {
                // Retry the scaffold operation
                if (uri) {
                    setTimeout(() => this.execute(uri), 1000);
                }
            }
            else if (action === 'Open Logs') {
                vscode.commands.executeCommand('workbench.action.showLogs');
            }
            console.error('Scaffold error:', error);
        }
    }
}
exports.ScaffoldCommand = ScaffoldCommand;
//# sourceMappingURL=ScaffoldCommand.js.map