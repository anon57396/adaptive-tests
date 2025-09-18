/**
 * TypeScript Discovery Engine - delegates to the adaptive discovery core
 * but uses TypeScript's compiler API for richer structural checks.
 */

const path = require('path');
const ts = require('typescript');

const { DiscoveryEngine } = require('../discovery');

class TypeScriptDiscoveryEngine extends DiscoveryEngine {
  constructor(rootPath = process.cwd()) {
    super(rootPath, { extensions: ['.ts', '.tsx', '.js', '.cjs', '.mjs'] });
  }

  evaluateCandidate(filePath, signature) {
    const candidate = super.evaluateCandidate(filePath, signature);
    if (!candidate) {
      return null;
    }

    const ext = path.extname(filePath);
    if (ext !== '.ts' && ext !== '.tsx') {
      return candidate;
    }

    const sourceText = this.safeReadFile(filePath);
    if (!sourceText) {
      return candidate;

    }

    const metadata = inspectTypeScriptSource(filePath, sourceText);

    if (signature.name) {
      const matches = metadata.possibleNames.some(name => this.nameMatches(signature, name));
      if (!matches) {
        return null;
      }
    }

    if (signature.exports) {
      const exportMatches = metadata.exportedNames.has(signature.exports) ||
        metadata.defaultExportNameMatches(signature.exports);
      if (!exportMatches) {
        return null;
      }
    }

    if (signature.methods && signature.methods.length > 0) {
      const missing = signature.methods.filter(method => !metadata.methods.has(method));
      if (missing.length > 0) {
        return null;
      }
    }

    candidate.score += metadata.scoreBoost;
    candidate.tsMetadata = metadata;
    return candidate;
  }
}

function inspectTypeScriptSource(filePath, sourceText) {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const exportedNames = new Set();
  const possibleNames = new Set();
  const methods = new Set();
  const defaultExportNames = new Set();

  const addName = name => {
    if (name) {
      possibleNames.add(name);
    }
  };

  const addMethodsFromMembers = members => {
    members.forEach(member => {
      if (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) {
        const name = member.name && ts.isIdentifier(member.name)
          ? member.name.text
          : member.name && ts.isStringLiteral(member.name)
            ? member.name.text
            : null;
        if (name) {
          methods.add(name);
        }
      }
    });
  };

  const recordExportedName = name => {
    if (name) {
      exportedNames.add(name);
    }
  };

  const traverse = node => {
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      addName(className);
      addMethodsFromMembers(node.members);

      if (hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
        recordExportedName(className);
      }

      if (hasModifier(node, ts.SyntaxKind.DefaultKeyword)) {
        defaultExportNames.add(className);
      }
    }

    if (ts.isFunctionDeclaration(node) && node.name) {
      const functionName = node.name.text;
      addName(functionName);
      if (hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
        recordExportedName(functionName);
      }
      if (hasModifier(node, ts.SyntaxKind.DefaultKeyword)) {
        defaultExportNames.add(functionName);
      }
    }

    if (ts.isVariableStatement(node) && hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
      node.declarationList.declarations.forEach(declaration => {
        const names = collectBindingNames(declaration.name);
        names.forEach(recordExportedName);
        names.forEach(addName);
      });
    }

    if (ts.isExportAssignment(node)) {
      if (node.expression && ts.isIdentifier(node.expression)) {
        const name = node.expression.text;
        defaultExportNames.add(name);
        addName(name);
      }
    }

    if (ts.isExportDeclaration(node) && node.exportClause) {
      if (ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach(element => {
          const exportName = element.name.text;
          recordExportedName(exportName);
          addName(exportName);
        });
      }
    }

    ts.forEachChild(node, traverse);
  };

  traverse(sourceFile);

  const scoreBoost = Math.min(methods.size * 4, 32) + exportedNames.size * 5 + defaultExportNames.size * 6;

  return {
    exportedNames,
    possibleNames: Array.from(possibleNames),
    methods,
    defaultExportNameMatches(target) {
      if (!target) return false;
      const matcher = new RegExp(`^${escapeForRegExp(target)}$`, 'i');
      return Array.from(defaultExportNames).some(name => matcher.test(name));
    },
    scoreBoost
  };
}

function hasModifier(node, kind) {
  return !!node.modifiers && node.modifiers.some(modifier => modifier.kind === kind);
}

function collectBindingNames(nameNode, result = []) {
  if (ts.isIdentifier(nameNode)) {
    result.push(nameNode.text);
    return result;
  }

  if (ts.isObjectBindingPattern(nameNode) || ts.isArrayBindingPattern(nameNode)) {
    nameNode.elements.forEach(element => {
      if (ts.isBindingElement(element)) {
        collectBindingNames(element.name, result);
      }
    });
  }

  return result;
}

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const enginesByRoot = new Map();

function getTypeScriptDiscoveryEngine(rootPath = process.cwd()) {
  const normalized = path.resolve(rootPath || process.cwd());
  if (!enginesByRoot.has(normalized)) {
    enginesByRoot.set(normalized, new TypeScriptDiscoveryEngine(normalized));
  }
  return enginesByRoot.get(normalized);
}

module.exports = {
  TypeScriptDiscoveryEngine,
  getTypeScriptDiscoveryEngine
};
