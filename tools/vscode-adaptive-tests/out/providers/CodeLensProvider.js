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
exports.AdaptiveTestsCodeLensProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class AdaptiveTestsCodeLensProvider {
    constructor() {
        this._onDidChangeCodeLenses = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;
        vscode.workspace.onDidChangeConfiguration((_) => {
            this._onDidChangeCodeLenses.fire();
        });
    }
    provideCodeLenses(document, token) {
        const codeLenses = [];
        // Only provide lenses for supported file types
        const ext = path.extname(document.fileName);
        const supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.php', '.py', '.rs'];
        if (!supportedExtensions.includes(ext)) {
            return codeLenses;
        }
        const text = document.getText();
        // Language-specific class detection
        const patterns = this.getLanguagePatterns(ext);
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                const className = match[1];
                const line = document.positionAt(match.index).line;
                const range = new vscode.Range(line, 0, line, 0);
                // Check if test exists
                const testExists = this.checkTestExists(document, className);
                if (testExists) {
                    codeLenses.push(new vscode.CodeLens(range, {
                        title: '✓ Adaptive test exists',
                        tooltip: 'An adaptive test already exists for this class',
                        command: 'adaptive-tests.openTest',
                        arguments: [document.uri, className]
                    }));
                }
                else {
                    codeLenses.push(new vscode.CodeLens(range, {
                        title: '$(add) Generate adaptive test',
                        tooltip: 'Generate an adaptive test for this class',
                        command: 'adaptive-tests.scaffoldFile',
                        arguments: [document.uri]
                    }));
                }
            }
        }
        // Add general discovery lens at the beginning of the file if we found any patterns
        if (codeLenses.length === 0 && patterns.length > 0) {
            const range = new vscode.Range(0, 0, 0, 0);
            codeLenses.push(new vscode.CodeLens(range, {
                title: '$(search) Run discovery',
                tooltip: 'See how elements in this file would be discovered',
                command: 'adaptive-tests.runDiscovery',
                arguments: [document.uri]
            }));
        }
        return codeLenses;
    }
    resolveCodeLens(codeLens, token) {
        return codeLens;
    }
    getLanguagePatterns(ext) {
        switch (ext) {
            case '.js':
            case '.ts':
            case '.jsx':
            case '.tsx':
                return [
                    { regex: /export\s+(?:default\s+)?class\s+(\w+)/g, type: 'class' },
                    { regex: /export\s+(?:default\s+)?function\s+(\w+)/g, type: 'function' }
                ];
            case '.java':
                return [
                    { regex: /(?:public\s+)?class\s+(\w+)/g, type: 'class' },
                    { regex: /(?:public\s+)?interface\s+(\w+)/g, type: 'interface' },
                    { regex: /(?:public\s+)?enum\s+(\w+)/g, type: 'enum' }
                ];
            case '.go':
                return [
                    { regex: /type\s+(\w+)\s+struct/g, type: 'struct' },
                    { regex: /type\s+(\w+)\s+interface/g, type: 'interface' },
                    { regex: /func\s+(\w+)\s*\(/g, type: 'function' }
                ];
            case '.php':
                return [
                    { regex: /class\s+(\w+)/g, type: 'class' },
                    { regex: /interface\s+(\w+)/g, type: 'interface' },
                    { regex: /trait\s+(\w+)/g, type: 'trait' },
                    { regex: /function\s+(\w+)/g, type: 'function' }
                ];
            case '.py':
                return [
                    { regex: /^class\s+(\w+)/gm, type: 'class' },
                    { regex: /^def\s+(\w+)/gm, type: 'function' }
                ];
            case '.rs':
                return [
                    { regex: /(?:pub\s+)?struct\s+(\w+)/g, type: 'struct' },
                    { regex: /(?:pub\s+)?enum\s+(\w+)/g, type: 'enum' },
                    { regex: /(?:pub\s+)?trait\s+(\w+)/g, type: 'trait' },
                    { regex: /(?:pub\s+)?fn\s+(\w+)/g, type: 'function' },
                    { regex: /impl(?:\s+\w+\s+for)?\s+(\w+)/g, type: 'impl' }
                ];
            default:
                return [];
        }
    }
    checkTestExists(document, className) {
        // Check if corresponding test file exists
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {
            return false;
        }
        const config = vscode.workspace.getConfiguration('adaptive-tests');
        const testDir = config.get('scaffold.outputDirectory', 'tests/adaptive');
        // Common test file patterns
        const testPatterns = [
            path.join(workspaceFolder.uri.fsPath, testDir, `${className}.test.js`),
            path.join(workspaceFolder.uri.fsPath, testDir, `${className}.test.ts`),
            path.join(workspaceFolder.uri.fsPath, testDir, `${className}.spec.js`),
            path.join(workspaceFolder.uri.fsPath, testDir, `${className}.spec.ts`),
            path.join(workspaceFolder.uri.fsPath, 'tests', `${className}.test.js`),
            path.join(workspaceFolder.uri.fsPath, 'tests', `${className}.test.ts`),
            path.join(workspaceFolder.uri.fsPath, '__tests__', `${className}.test.js`),
            path.join(workspaceFolder.uri.fsPath, '__tests__', `${className}.test.ts`)
        ];
        // Check if any test file exists
        return testPatterns.some(pattern => {
            try {
                return fs.existsSync(pattern);
            }
            catch {
                return false;
            }
        });
    }
}
exports.AdaptiveTestsCodeLensProvider = AdaptiveTestsCodeLensProvider;
//# sourceMappingURL=CodeLensProvider.js.map