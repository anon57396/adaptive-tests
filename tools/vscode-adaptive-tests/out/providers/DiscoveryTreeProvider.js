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
exports.DiscoveryTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const DiscoveryLensAPIFactory_1 = require("../api/DiscoveryLensAPIFactory");
class DiscoveryTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.results = [];
        this.lastSignature = null;
        // Subscribe to API factory state changes
        this.subscribeToAPIChanges();
    }
    subscribeToAPIChanges() {
        // Get the API factory instance
        const apiFactory = DiscoveryLensAPIFactory_1.DiscoveryLensAPIFactory.getInstance();
        // If there's a way to listen for state changes, connect it here
        // For now, we'll implement manual updates through commands
    }
    refresh(results, signature) {
        if (results) {
            this.results = results.map((result, index) => new DiscoveryItem(result.path, result.score, result.absolutePath || result.path, index));
            this.lastSignature = signature;
        }
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root level - return discovery results
            if (this.results.length === 0) {
                return Promise.resolve([
                    new DiscoveryItem('No discovery results', 0, '', -1, vscode.TreeItemCollapsibleState.None, true)
                ]);
            }
            return Promise.resolve(this.results);
        }
        return Promise.resolve([]);
    }
    getParent(element) {
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
exports.DiscoveryTreeProvider = DiscoveryTreeProvider;
class DiscoveryItem extends vscode.TreeItem {
    constructor(filePath, score, absolutePath, index, collapsibleState = vscode.TreeItemCollapsibleState.None, isEmpty = false) {
        const label = isEmpty ? filePath : `${path.basename(filePath)} (${score})`;
        super(label, collapsibleState);
        this.filePath = filePath;
        this.score = score;
        this.absolutePath = absolutePath;
        this.index = index;
        this.collapsibleState = collapsibleState;
        this.isEmpty = isEmpty;
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
            }
            else if (score >= 50) {
                this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'));
            }
            else {
                this.iconPath = new vscode.ThemeIcon('question');
            }
        }
        else {
            this.iconPath = new vscode.ThemeIcon('search');
            this.contextValue = 'emptyState';
        }
    }
}
//# sourceMappingURL=DiscoveryTreeProvider.js.map