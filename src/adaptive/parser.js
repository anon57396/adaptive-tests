const parser = require('@babel/parser');
const crypto = require('crypto');

// AST cache to avoid re-parsing the same content
const AST_CACHE = new Map();
const MAX_CACHE_SIZE = 100;

const PARSER_PLUGINS = [
  'jsx',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'decorators-legacy',
  'dynamicImport',
  'optionalChaining',
  'nullishCoalescingOperator',
  'objectRestSpread',
  'topLevelAwait',
  'typescript'
];

function makeUnknownInfo(name) {
  return {
    kind: 'unknown',
    name: name || null,
    methods: [],
    properties: [],
    extends: null
  };
}

function toArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (value instanceof Set) {
    return Array.from(value);
  }
  return [value];
}

function normalizeExportInfo(info) {
  if (!info) {
    return makeUnknownInfo(null);
  }

  return {
    kind: info.kind || 'unknown',
    name: info.name || null,
    methods: toArray(info.methods),
    properties: toArray(info.properties),
    extends: info.extends || null
  };
}

function getMemberName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'StringLiteral') {
    return node.value;
  }
  return null;
}

function getSpecifierName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'StringLiteral') {
    return node.value;
  }
  return null;
}

function resolveExpressionName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'StringLiteral') {
    return node.value;
  }
  if (node.type === 'MemberExpression' && node.property) {
    return getMemberName(node.property);
  }
  return null;
}

function extractClassInfo(node, fallbackName) {
  const name = (node.id && node.id.name) || fallbackName || null;
  const methods = new Set();
  const properties = new Set();
  let extendsName = null;

  if (node.superClass) {
    extendsName = resolveExpressionName(node.superClass);
  }

  const bodyElements = node.body && node.body.body ? node.body.body : [];
  for (const element of bodyElements) {
    if (element.type === 'ClassMethod') {
      if (element.kind === 'method' && !element.static) {
        const methodName = getMemberName(element.key);
        if (methodName) {
          methods.add(methodName);
        }
      }
      if (element.kind === 'constructor' && element.body && element.body.body) {
        for (const stmt of element.body.body) {
          if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
            const assignment = stmt.expression;
            if (assignment.left.type === 'MemberExpression' && assignment.left.object.type === 'ThisExpression') {
              const propName = getMemberName(assignment.left.property);
              if (propName) {
                properties.add(propName);
              }
            }
          }
        }
      }
    } else if (element.type === 'ClassProperty' && !element.static) {
      const propName = getMemberName(element.key);
      if (propName) {
        properties.add(propName);
      }
    }
  }

  return {
    kind: 'class',
    name,
    methods,
    properties,
    extends: extendsName
  };
}

function extractFunctionInfo(node, fallbackName) {
  const name = (node.id && node.id.name) || fallbackName || null;
  return {
    kind: 'function',
    name,
    methods: new Set(),
    properties: new Set(),
    extends: null
  };
}

function extractValueInfo(node, fallbackName) {
  if (!node) {
    return null;
  }
  switch (node.type) {
    case 'ClassDeclaration':
    case 'ClassExpression':
      return extractClassInfo(node, fallbackName);
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
      return extractFunctionInfo(node, fallbackName);
    case 'Identifier':
      return null;
    case 'ObjectExpression':
      return {
        kind: 'object',
        name: fallbackName || null,
        methods: new Set(),
        properties: new Set(),
        extends: null
      };
    default:
      return makeUnknownInfo(fallbackName);
  }
}

function isModuleExports(node) {
  return node && node.type === 'MemberExpression' &&
    !node.computed &&
    node.object && node.object.type === 'Identifier' &&
    node.object.name === 'module' &&
    node.property && node.property.type === 'Identifier' &&
    node.property.name === 'exports';
}

function isExportsMember(node) {
  return node && node.type === 'MemberExpression' &&
    node.object && node.object.type === 'Identifier' &&
    node.object.name === 'exports';
}

function analyzeModuleExports(content, fileName) {
  // Generate content hash for cache key
  const contentHash = crypto.createHash('md5').update(content).digest('hex');
  const cacheKey = `${contentHash}_${fileName || 'unknown'}`;

  // Check AST cache first
  if (AST_CACHE.has(cacheKey)) {
    return AST_CACHE.get(cacheKey);
  }

  let ast;
  try {
    ast = parser.parse(content, {
      sourceType: 'unambiguous',
      plugins: PARSER_PLUGINS
    });
  } catch (error) {
    // Cache null result too to avoid re-parsing invalid files
    if (AST_CACHE.size >= MAX_CACHE_SIZE) {
      const firstKey = AST_CACHE.keys().next().value;
      AST_CACHE.delete(firstKey);
    }
    AST_CACHE.set(cacheKey, null);
    return null;
  }

  const locals = new Map();
  const register = (name, info) => {
    if (!name || !info) return;
    locals.set(name, info);
  };

  const body = ast.program.body || [];

  for (const node of body) {
    switch (node.type) {
      case 'ClassDeclaration':
        register(node.id && node.id.name, extractClassInfo(node, node.id && node.id.name));
        break;
      case 'FunctionDeclaration':
        register(node.id && node.id.name, extractFunctionInfo(node, node.id && node.id.name));
        break;
      case 'VariableDeclaration':
        for (const declarator of node.declarations || []) {
          if (declarator.id && declarator.id.type === 'Identifier') {
            const info = extractValueInfo(declarator.init, declarator.id.name);
            if (info) {
              register(declarator.id.name, info);
            }
          }
        }
        break;
      default:
        break;
    }
  }

  const exports = [];
  const addExport = (exportedName, accessType, info, fallbackName) => {
    let exportInfo = info;
    if (!exportInfo && exportedName && locals.has(exportedName)) {
      exportInfo = locals.get(exportedName);
    }
    if (!exportInfo && fallbackName && locals.has(fallbackName)) {
      exportInfo = locals.get(fallbackName);
    }
    if (!exportInfo) {
      exportInfo = makeUnknownInfo(exportedName || fallbackName || fileName);
    }
    exports.push({
      exportedName: exportedName || null,
      access: { type: accessType, name: exportedName || fallbackName || null },
      info: normalizeExportInfo(exportInfo)
    });
  };

  const handleModuleExports = (right) => {
    if (!right) return;
    if (right.type === 'Identifier') {
      addExport('default', 'direct', locals.get(right.name), right.name);
      return;
    }

    if (right.type === 'ClassExpression') {
      addExport('default', 'direct', extractClassInfo(right, fileName));
      return;
    }

    if (right.type === 'FunctionExpression' || right.type === 'ArrowFunctionExpression') {
      addExport('default', 'direct', extractFunctionInfo(right, fileName));
      return;
    }

    if (right.type === 'ObjectExpression') {
      for (const prop of right.properties || []) {
        if (prop.type !== 'ObjectProperty' && prop.type !== 'ObjectMethod') continue;
        const keyName = getMemberName(prop.key);
        if (!keyName) continue;
        const valueNode = prop.type === 'ObjectMethod'
          ? { type: 'FunctionExpression', id: null, params: prop.params, body: prop.body }
          : prop.value;
        const valueInfo = extractValueInfo(valueNode, keyName);
        addExport(keyName, 'named', valueInfo, keyName);
      }
      return;
    }

    addExport('default', 'direct', extractValueInfo(right, fileName), fileName);
  };

  const handleExportsMember = (name, value) => {
    const info = extractValueInfo(value, name);
    addExport(name, 'named', info, name);
  };

  for (const node of body) {
    switch (node.type) {
      case 'ExportDefaultDeclaration': {
        const info = extractValueInfo(node.declaration, 'default');
        exports.push({
          exportedName: 'default',
          access: { type: 'default', name: null },
          info: normalizeExportInfo(info || makeUnknownInfo('default'))
        });
        break;
      }
      case 'ExportNamedDeclaration': {
        if (node.declaration) {
          const info = extractValueInfo(node.declaration, node.declaration.id && node.declaration.id.name);
          const exportedName = (node.declaration.id && node.declaration.id.name) || (info && info.name) || null;
          addExport(exportedName, 'named', info, exportedName);
        }
        if (node.specifiers && node.specifiers.length > 0 && !node.source) {
          for (const spec of node.specifiers) {
            const exportedName = getSpecifierName(spec.exported);
            const localName = getSpecifierName(spec.local);
            addExport(exportedName, 'named', locals.get(localName), localName);
          }
        }
        break;
      }
      case 'ExpressionStatement': {
        const expr = node.expression;
        if (expr.type === 'AssignmentExpression') {
          const left = expr.left;
          if (isModuleExports(left)) {
            handleModuleExports(expr.right);
          } else if (isExportsMember(left)) {
            const name = getMemberName(left.property);
            if (name) {
              handleExportsMember(name, expr.right);
            }
          } else if (left.type === 'MemberExpression' && left.object && isModuleExports(left.object)) {
            const name = getMemberName(left.property);
            if (name) {
              handleExportsMember(name, expr.right);
            }
          }
        }
        break;
      }
      default:
        break;
    }
  }

  // Cache the result before returning
  const result = { exports };
  if (AST_CACHE.size >= MAX_CACHE_SIZE) {
    const firstKey = AST_CACHE.keys().next().value;
    AST_CACHE.delete(firstKey);
  }
  AST_CACHE.set(cacheKey, result);

  return result;
}

/**
 * Clear the AST cache (useful for testing)
 */
function clearASTCache() {
  AST_CACHE.clear();
}

module.exports = {
  analyzeModuleExports,
  clearASTCache
};
