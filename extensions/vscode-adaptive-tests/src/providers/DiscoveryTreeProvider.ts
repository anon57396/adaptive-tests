import * as vscode from 'vscode';
import * as path from 'path';
import { DiscoveryLensAPIFactory } from '../api/DiscoveryLensAPIFactory';

export class DiscoveryTreeProvider implements vscode.TreeDataProvider<DiscoveryItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DiscoveryItem | undefined | null | void> =
        new vscode.EventEmitter<DiscoveryItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DiscoveryItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    private results: DiscoveryItem[] = [];

    private lastSignature: any = null;

    constructor() {
        // Subscribe to API factory state changes
        this.subscribeToAPIChanges();
    }

    private subscribeToAPIChanges() {
        // Get the API factory instance
        const apiFactory = DiscoveryLensAPIFactory.getInstance();

        // If there's a way to listen for state changes, connect it here
        // For now, we'll implement manual updates through commands
    }

    refresh(results?: any[], signature?: any): void {
        if (results) {
            this.results = results.map((result, index) =>
                new DiscoveryItem(
                    result.path,
                    result.score,
                    result.absolutePath || result.path,
                    index
                )
            );
            this.lastSignature = signature;
        }
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DiscoveryItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: DiscoveryItem): Thenable<DiscoveryItem[]> {
        if (!element) {
            // Root level - return discovery results
            if (this.results.length === 0) {
                return Promise.resolve([
                    new DiscoveryItem(
                        'No discovery results',
                        0,
                        '',
                        -1,
                        vscode.TreeItemCollapsibleState.None,
                        true
                    )
                ]);
            }
            return Promise.resolve(this.results);
        }
        return Promise.resolve([]);
    }

    getParent(element: DiscoveryItem): DiscoveryItem | undefined {
        return undefined;
    }

    async runDiscoveryForCurrentFile() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No file open');
            return;
        }

        await vscode.commands.executeCommand('adaptive-tests.runDiscovery', editor.document.uri);
    }

    clearResults() {
        this.results = [];
        this.lastSignature = null;
        this.refresh();
    }
}

class DiscoveryItem extends vscode.TreeItem {
    constructor(
        public readonly filePath: string,
        public readonly score: number,
        public readonly absolutePath: string,
        public readonly index: number,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
        public readonly isEmpty: boolean = false
    ) {
        const label = isEmpty ? filePath : `${path.basename(filePath)} (${score})`;
        super(label, collapsibleState);

        if (!isEmpty) {
            this.tooltip = `${this.filePath}\nScore: ${this.score}`;
            this.description = path.dirname(filePath);

            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.file(absolutePath)]
            };

            this.contextValue = 'discoveryResult';

            // Set icon based on score
            if (score >= 80) {
                this.iconPath = new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'));
            } else if (score >= 50) {
                this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'));
            } else {
                this.iconPath = new vscode.ThemeIcon('question');
            }
        } else {
            this.iconPath = new vscode.ThemeIcon('search');
            this.contextValue = 'emptyState';
        }
    }
}