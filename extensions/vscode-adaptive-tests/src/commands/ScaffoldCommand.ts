import * as vscode from 'vscode';
import * as path from 'path';
import * as child_process from 'child_process';
import { promisify } from 'util';

const exec = promisify(child_process.exec);

export class ScaffoldCommand {
    public async execute(uri?: vscode.Uri) {
        try {
            // Get the file path
            const filePath = uri ? uri.fsPath : vscode.window.activeTextEditor?.document.uri.fsPath;

            if (!filePath) {
                vscode.window.showErrorMessage('No file selected. Please open or select a file to scaffold.');
                return;
            }

            // Check file extension
            const ext = path.extname(filePath);
            const supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.php', '.java', '.py'];

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
            const outputDir = config.get<string>('scaffold.outputDirectory', 'tests/adaptive');
            const autoOpen = config.get<boolean>('scaffold.autoOpen', true);

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
                            } else if (stderr.includes('EACCES')) {
                                throw new Error('Permission denied. Please check file permissions.');
                            } else if (stderr.includes('spawn')) {
                                throw new Error('Failed to execute command. Please check your environment.');
                            } else {
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
                        const action = await vscode.window.showInformationMessage(
                            `Test scaffolded: ${testFile}`,
                            'Open Test File'
                        );

                        if (action === 'Open Test File' || autoOpen) {
                            const doc = await vscode.workspace.openTextDocument(testPath);
                            await vscode.window.showTextDocument(doc);
                        }
                    } else {
                        // Check if file was skipped
                        if (stdout.includes('Skipped')) {
                            const overwrite = await vscode.window.showWarningMessage(
                                'Test file already exists. Overwrite?',
                                'Overwrite',
                                'Cancel'
                            );

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
                        } else if (stdout.includes('No exports found') || stdout.includes('No PHP classes')) {
                            vscode.window.showWarningMessage(
                                'No exportable code found in file. Make sure your file exports classes, functions, or other testable code.'
                            );
                        }
                    }
                } catch (error: any) {
                    // Enhanced error categorization
                    let userMessage = 'Scaffold command failed';

                    if (error.code === 'ETIMEDOUT') {
                        userMessage = 'Scaffolding timed out. The file may be very large or the system is busy.';
                    } else if (error.message.includes('ENOENT')) {
                        userMessage = 'adaptive-tests CLI not found. Please install it first: npm install -g adaptive-tests';
                    } else if (error.message.includes('not supported')) {
                        userMessage = 'This file type is not supported for scaffolding yet.';
                    } else if (error.message.includes('permission')) {
                        userMessage = 'Permission denied. Please check file and directory permissions.';
                    } else {
                        userMessage = error.message;
                    }

                    throw new Error(userMessage);
                }
            });

        } catch (error: any) {
            // Show user-friendly error with action options
            const action = await vscode.window.showErrorMessage(
                `Failed to scaffold test: ${error.message}`,
                'Show Details',
                'Try Again',
                'Open Logs'
            );

            if (action === 'Show Details') {
                const outputChannel = vscode.window.createOutputChannel('Adaptive Tests');
                outputChannel.appendLine('Scaffold Error Details:');
                outputChannel.appendLine(`Error: ${error.message}`);
                outputChannel.appendLine(`Stack: ${error.stack}`);
                outputChannel.appendLine(`File: ${filePath}`);
                outputChannel.appendLine(`Command: npx adaptive-tests scaffold`);
                outputChannel.show();
            } else if (action === 'Try Again') {
                // Retry the scaffold operation
                setTimeout(() => this.execute(vscode.Uri.file(filePath)), 1000);
            } else if (action === 'Open Logs') {
                vscode.commands.executeCommand('workbench.action.showLogs');
            }

            console.error('Scaffold error:', error);
        }
    }
}