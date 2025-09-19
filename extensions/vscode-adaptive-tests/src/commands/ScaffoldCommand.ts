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
                        cwd: workspaceFolder.uri.fsPath
                    });

                    if (stderr && !stderr.includes('Created')) {
                        throw new Error(stderr);
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
                                const { stdout: forceStdout } = await exec(forceCommand, {
                                    cwd: workspaceFolder.uri.fsPath
                                });

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
                    throw new Error(`Scaffold command failed: ${error.message}`);
                }
            });

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to scaffold test: ${error.message}`);
            console.error('Scaffold error:', error);
        }
    }
}