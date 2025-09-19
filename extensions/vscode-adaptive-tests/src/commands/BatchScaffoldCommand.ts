import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import { promisify } from 'util';

const exec = promisify(child_process.exec);

export class BatchScaffoldCommand {
    private readonly supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.php', '.java', '.py', '.go', '.rs'];

    public async execute(uri?: vscode.Uri) {
        try {
            // Get the folder path
            const folderPath = uri ? uri.fsPath : vscode.window.activeTextEditor?.document.uri.fsPath;

            if (!folderPath) {
                vscode.window.showErrorMessage('No folder selected. Please select a folder to scaffold.');
                return;
            }

            // Verify it's a directory
            const stats = await fs.promises.stat(folderPath);
            if (!stats.isDirectory()) {
                vscode.window.showErrorMessage('Please select a folder, not a file.');
                return;
            }

            // Get workspace root
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(folderPath));
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('Folder is not in a workspace.');
                return;
            }

            // Find all eligible files
            const files = await this.findEligibleFiles(folderPath);

            if (files.length === 0) {
                vscode.window.showInformationMessage('No eligible files found in the selected folder.');
                return;
            }

            // Show confirmation with file count
            const relativePath = path.relative(workspaceFolder.uri.fsPath, folderPath);
            const confirmation = await vscode.window.showInformationMessage(
                `Found ${files.length} file(s) to scaffold in ${relativePath}. Continue?`,
                'Scaffold All',
                'Preview Files',
                'Cancel'
            );

            if (confirmation === 'Cancel' || !confirmation) {
                return;
            }

            if (confirmation === 'Preview Files') {
                // Show quick pick with all files
                const fileItems = files.map(file => ({
                    label: path.basename(file),
                    description: path.relative(folderPath, path.dirname(file)),
                    detail: path.relative(workspaceFolder.uri.fsPath, file),
                    picked: true,
                    file
                }));

                const selectedItems = await vscode.window.showQuickPick(fileItems, {
                    canPickMany: true,
                    placeHolder: 'Select files to scaffold tests for',
                    title: 'Batch Scaffold Preview'
                });

                if (!selectedItems || selectedItems.length === 0) {
                    return;
                }

                // Use only selected files
                files.length = 0;
                files.push(...selectedItems.map(item => item.file));
            }

            // Get configuration
            const config = vscode.workspace.getConfiguration('adaptive-tests');
            const outputDir = config.get<string>('scaffold.outputDirectory', 'tests/adaptive');
            const autoOpen = config.get<boolean>('scaffold.autoOpen', true);

            // Run batch scaffolding with progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Scaffolding Adaptive Tests',
                cancellable: true
            }, async (progress, token) => {
                const results = {
                    success: [] as string[],
                    skipped: [] as string[],
                    failed: [] as string[]
                };

                for (let i = 0; i < files.length; i++) {
                    if (token.isCancellationRequested) {
                        break;
                    }

                    const file = files[i];
                    const fileName = path.basename(file);
                    const percent = Math.round((i / files.length) * 100);

                    progress.report({
                        increment: percent,
                        message: `Processing ${fileName} (${i + 1}/${files.length})`
                    });

                    try {
                        const result = await this.scaffoldSingleFile(
                            file,
                            workspaceFolder.uri.fsPath,
                            outputDir
                        );

                        if (result.created) {
                            results.success.push(result.testFile);
                        } else if (result.skipped) {
                            results.skipped.push(file);
                        } else {
                            results.failed.push(file);
                        }
                    } catch (error: any) {
                        results.failed.push(file);
                        console.error(`Failed to scaffold ${file}:`, error);
                    }
                }

                // Show summary
                this.showResults(results, autoOpen);
                return results;
            });

        } catch (error: any) {
            vscode.window.showErrorMessage(`Batch scaffolding failed: ${error.message}`);
            console.error('Batch scaffold error:', error);
        }
    }

    private async findEligibleFiles(folderPath: string): Promise<string[]> {
        const files: string[] = [];
        const supportedExtensions = this.supportedExtensions;

        async function walk(dir: string) {
            const entries = await fs.promises.readdir(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    // Skip node_modules, .git, and test directories
                    if (!['node_modules', '.git', 'tests', '__tests__', 'test'].includes(entry.name)) {
                        await walk(fullPath);
                    }
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    // Skip test files and check if extension is supported
                    if (!entry.name.includes('.test.') &&
                        !entry.name.includes('.spec.') &&
                        supportedExtensions.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        }

        await walk(folderPath);
        return files;
    }

    private async scaffoldSingleFile(
        filePath: string,
        workspaceRoot: string,
        outputDir: string
    ): Promise<{ created: boolean; skipped: boolean; testFile: string }> {
        const relativePath = path.relative(workspaceRoot, filePath);
        const command = `npx adaptive-tests scaffold "${relativePath}" --output-dir="${outputDir}"`;

        const { stdout, stderr } = await exec(command, {
            cwd: workspaceRoot
        });

        // Parse output to determine result
        if (stdout.includes('✅ Created')) {
            const match = stdout.match(/✅ Created (.+)/);
            if (match) {
                const testFile = path.join(workspaceRoot, match[1].trim());
                return { created: true, skipped: false, testFile };
            }
        }

        if (stdout.includes('Skipped') || stdout.includes('No exports found')) {
            return { created: false, skipped: true, testFile: '' };
        }

        return { created: false, skipped: false, testFile: '' };
    }

    private async showResults(
        results: { success: string[]; skipped: string[]; failed: string[] },
        autoOpen: boolean
    ) {
        const total = results.success.length + results.skipped.length + results.failed.length;

        // Build summary message
        let message = `Batch scaffolding complete:\n`;
        message += `✅ Created: ${results.success.length}\n`;
        message += `⏭️ Skipped: ${results.skipped.length}\n`;
        if (results.failed.length > 0) {
            message += `❌ Failed: ${results.failed.length}`;
        }

        // Show summary with actions
        const options = ['OK'];
        if (results.success.length > 0) {
            options.unshift('Open Tests');
        }

        const action = await vscode.window.showInformationMessage(
            message,
            ...options
        );

        // Open test files if requested
        if (action === 'Open Tests' && autoOpen && results.success.length > 0) {
            // Open first few test files (limit to avoid overwhelming)
            const filesToOpen = results.success.slice(0, 3);

            for (const testFile of filesToOpen) {
                try {
                    const doc = await vscode.workspace.openTextDocument(testFile);
                    await vscode.window.showTextDocument(doc, { preview: false });
                } catch (error) {
                    console.error(`Failed to open ${testFile}:`, error);
                }
            }

            if (results.success.length > 3) {
                vscode.window.showInformationMessage(
                    `Opened first 3 of ${results.success.length} test files.`
                );
            }
        }
    }
}