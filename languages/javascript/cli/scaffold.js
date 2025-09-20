#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { DiscoveryEngine, getDiscoveryEngine } = require('../adaptive/discovery-engine');
const { LanguagePluginRegistry } = require('../adaptive/language-plugin-registry');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

const ensureDirSync = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  return [value];
};

const log = (message, color = COLORS.reset, options = {}) => {
  if (options.json) return;
  console.log(color + message + COLORS.reset);
};

const pickBestExport = (exports, fallbackName) => {
  if (!exports || exports.length === 0) {
    return null;
  }
  const priority = (entry) => {
    const info = entry.info || {};
    let score = 0;
    if (info.kind === 'class' || info.kind === 'struct' || info.kind === 'module') score += 5;
    if (info.kind === 'function') score += 2;
    if (entry.access && entry.access.type === 'default') score += 1;
    if (entry.exportedName && entry.exportedName === fallbackName) score += 3;
    if (entry.exportedName && fallbackName && entry.exportedName.toLowerCase() === fallbackName.toLowerCase()) score += 2;
    if (info.methods && info.methods.length > 0) score += Math.min(info.methods.length, 3);
    return score;
  };
  return [...exports].sort((a, b) => priority(b) - priority(a))[0];
};

const buildSignature = (exportEntry) => {
  if (!exportEntry) return {};
  const info = exportEntry.info || {};
  const signature = {};
  if (info.name) signature.name = info.name;
  if (info.kind && info.kind !== 'unknown') signature.type = info.kind;
  if (exportEntry.access && exportEntry.access.type === 'named' && exportEntry.access.name) {
    signature.exports = exportEntry.access.name;
  }
  const methods = toArray(info.methods).filter(Boolean);
  if (methods.length > 0) {
    signature.methods = methods;
  }
  const properties = toArray(info.properties).filter(Boolean);
  if (!signature.methods && properties.length > 0) {
    signature.properties = properties;
  }
  if (info.extends) signature.extends = info.extends;
  return signature;
};

const formatSignatureLines = (signature, indent = '    ') => {
  const lines = [];
  const push = (key, value) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      lines.push(`${indent}${key}: [${value.map(v => `'${v}'`).join(', ')}],`);
      return;
    }
    lines.push(`${indent}${key}: '${value}',`);
  };
  push('name', signature.name);
  push('type', signature.type);
  push('exports', signature.exports);
  push('extends', signature.extends);
  push('methods', signature.methods);
  push('properties', signature.properties);
  if (lines.length > 0) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
  }
  return lines.join('\n');
};

const inferAssertions = (method) => {
  const assertions = [];
  if (method.match(/^(get|fetch|load)/i)) {
    assertions.push('expect(result).toBeDefined();');
    assertions.push("// expect(result).toHaveProperty('id');");
  } else if (method.match(/^(is|has|can)/i)) {
    assertions.push('expect(typeof result).toBe(\'boolean\');');
    assertions.push('// expect(result).toBe(true);');
  } else if (method.match(/create|add|insert/i)) {
    assertions.push('expect(result).toBeDefined();');
    assertions.push("expect(result).toHaveProperty('id');");
  } else if (method.match(/delete|remove/i)) {
    assertions.push('expect(result).toBeDefined();');
    assertions.push('// expect(result).toBe(true);');
  } else if (method.match(/count|size|length/i)) {
    assertions.push('expect(typeof result).toBe(\'number\');');
  } else {
    assertions.push('expect(result).toBeDefined();');
    assertions.push('// Add specific assertions based on expected behaviour');
  }
  return assertions;
};

const generateMethodBlocks = (signature, methods, options) => {
  if (!methods || methods.length === 0) {
    return '  // No public methods detected\n';
  }

  if (!options.applyAssertions) {
    return `  describe('methods', () => {\n${methods.map(method => `    it.todo('TODO: ${method}');`).join('\n')}\n  });\n`;
  }

  const blocks = methods.map((method) => {
    const assertions = inferAssertions(method);
    const invokeTarget = signature.type === 'class'
      ? `const instance = createInstance();\n      const result = ${options.asyncHint && method.match(/get|fetch|load|create|update|delete/i) ? 'await ' : ''}instance.${method}();`
      : `const result = ${options.asyncHint && method.match(/get|fetch|load|create|update|delete/i) ? 'await ' : ''}${signature.name}.${method}();`;
    const awaitNeeded = /await /.test(invokeTarget);
    return `  describe('${method}', () => {
    it('should handle ${method}', ${awaitNeeded ? 'async ' : ''}() => {
      // Arrange
      const createInstance = () => new ${signature.name || 'Target'}(/* TODO: dependencies */);
      // Act
      ${invokeTarget}
      // Assert
      ${assertions.join('\n      ')}
    });
  });`;
  }).join('\n\n');

  return blocks + '\n';
};

const slugify = (value) => {
  return (value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'target';
};

const generatePHPTestContent = async ({ signature, phpMetadata }) => {
  const registry = LanguagePluginRegistry.getInstance();
  const phpIntegration = await registry.getPlugin('php');

  // Find the target in metadata
  let target = null;

  if (signature.kind === 'class' || !signature.kind) {
    target = phpMetadata.classes.find(c => c.name === signature.name);
  }

  if (!target && signature.kind === 'interface') {
    target = phpMetadata.interfaces.find(i => i.name === signature.name);
  }

  if (!target && signature.kind === 'trait') {
    target = phpMetadata.traits.find(t => t.name === signature.name);
  }

  if (!target && signature.kind === 'function') {
    target = phpMetadata.functions.find(f => f.name === signature.name);
  }

  if (!target) {
    target = {
      name: signature.name || 'Target',
      type: signature.kind || 'class',
      metadata: signature
    };
  }

  const fullTarget = {
    name: target.name,
    type: target.type || target.kind || 'class',
    namespace: phpMetadata.namespace,
    metadata: target
  };

  return phpIntegration.generatePHPTest(fullTarget);
};


// Plugin helper function
const getLanguagePlugin = async (language) => {
  const registry = LanguagePluginRegistry.getInstance();
  return await registry.getPlugin(language);
};

const analyzeJavaFile = async (filePath) => {
  const javaIntegration = await getLanguagePlugin('java');
  if (!javaIntegration) {
    return null;
  }

  const javaMetadata = await javaIntegration.collector.parseFile(filePath);
  if (!javaMetadata) {
    return null;
  }

  const exports = [];
  const addType = (type) => {
    if (!type) return;
    const methods = (type.methods || []).filter(method => !method.isConstructor).map(method => method.name);
    exports.push({
      exportedName: type.name,
      access: { type: 'default' },
      info: {
        name: type.name,
        fullName: type.fullName,
        kind: type.type,
        methods,
        annotations: (type.annotations || []).map(annotation => annotation.name),
        extends: type.extends,
        implements: type.implements,
        javaType: type
      }
    });
  };

  javaMetadata.classes.forEach(addType);
  javaMetadata.interfaces.forEach(addType);
  javaMetadata.enums.forEach(addType);
  javaMetadata.records.forEach(addType);

  return { exports, javaMetadata };
};

const analyzeGoFile = async (filePath) => {
  const goIntegration = await getLanguagePlugin('go');
  if (!goIntegration) {
    return null;
  }

  const goMetadata = await goIntegration.collector.parseFile(filePath);
  if (!goMetadata) {
    return null;
  }

  const exports = [];
  const isExportedName = (value) => Boolean(value) && /^[A-Z]/.test(value);

  // Add structs
  goMetadata.structs.forEach(struct => {
    if (struct.name && isExportedName(struct.name)) {
      const methods = (struct.methods || []).map(method => method.name);
      exports.push({
        exportedName: struct.name,
        access: { type: 'default' },
        info: {
          name: struct.name,
          kind: 'struct',
          type: 'struct',
          methods,
          fields: (struct.fields || []).map(field => field.name),
          embeds: struct.embeds || [],
          goType: struct
        }
      });
    }
  });

  // Add interfaces
  goMetadata.interfaces.forEach(iface => {
    if (iface.name && isExportedName(iface.name)) {
      const methods = (iface.methods || []).map(method => method.name);
      exports.push({
        exportedName: iface.name,
        access: { type: 'default' },
        info: {
          name: iface.name,
          kind: 'interface',
          type: 'interface',
          methods,
          embeds: iface.embeds || [],
          goType: iface
        }
      });
    }
  });

  // Add functions
  goMetadata.functions.forEach(func => {
    if (func.name && (func.exported || isExportedName(func.name))) {
      exports.push({
        exportedName: func.name,
        access: { type: 'default' },
        info: {
          name: func.name,
          kind: 'function',
          type: 'function',
          parameters: func.parameters || [],
          returnType: func.returnType,
          goType: func
        }
      });
    }
  });

  // Add types (type aliases)
  goMetadata.types.forEach(type => {
    if (type.name && isExportedName(type.name)) {
      exports.push({
        exportedName: type.name,
        access: { type: 'default' },
        info: {
          name: type.name,
          kind: 'type',
          type: 'type',
          underlyingType: type.underlyingType,
          goType: type
        }
      });
    }
  });

  return { exports, goMetadata };
};

const analyzeRustFile = async (filePath) => {
  const rustIntegration = await getLanguagePlugin('rust');
  if (!rustIntegration) {
    return null;
  }

  const rustMetadata = await rustIntegration.collector.parseFile(filePath);
  if (!rustMetadata) {
    return null;
  }

  const exports = [];
  const isExportedName = (visibility) => visibility === 'public';

  // Add structs
  rustMetadata.structs.forEach(struct => {
    if (struct.name && (struct.exported || isExportedName(struct.visibility))) {
      const methods = (struct.methods || []).map(method => method.name);
      exports.push({
        exportedName: struct.name,
        access: { type: 'default' },
        info: {
          name: struct.name,
          kind: 'struct',
          type: 'struct',
          methods,
          fields: (struct.fields || []).map(field => field.name),
          derives: struct.derives || [],
          generics: struct.generics || [],
          rustType: struct
        }
      });
    }
  });

  // Add enums
  rustMetadata.enums.forEach(enumItem => {
    if (enumItem.name && (enumItem.exported || isExportedName(enumItem.visibility))) {
      const variants = (enumItem.variants || []).map(variant => variant.name);
      exports.push({
        exportedName: enumItem.name,
        access: { type: 'default' },
        info: {
          name: enumItem.name,
          kind: 'enum',
          type: 'enum',
          variants,
          derives: enumItem.derives || [],
          generics: enumItem.generics || [],
          rustType: enumItem
        }
      });
    }
  });

  // Add traits
  rustMetadata.traits.forEach(trait => {
    if (trait.name && (trait.exported || isExportedName(trait.visibility))) {
      const methods = (trait.methods || []).map(method => method.name);
      exports.push({
        exportedName: trait.name,
        access: { type: 'default' },
        info: {
          name: trait.name,
          kind: 'trait',
          type: 'trait',
          methods,
          supertraits: trait.supertraits || [],
          generics: trait.generics || [],
          rustType: trait
        }
      });
    }
  });

  // Add functions
  rustMetadata.functions.forEach(func => {
    if (func.name && (func.exported || isExportedName(func.visibility))) {
      exports.push({
        exportedName: func.name,
        access: { type: 'default' },
        info: {
          name: func.name,
          kind: 'function',
          type: 'function',
          parameters: func.parameters || [],
          returnType: func.returnType,
          generics: func.generics || [],
          rustType: func
        }
      });
    }
  });

  // Add type aliases
  rustMetadata.types.forEach(type => {
    if (type.name && (type.exported || isExportedName(type.visibility))) {
      exports.push({
        exportedName: type.name,
        access: { type: 'default' },
        info: {
          name: type.name,
          kind: 'type',
          type: 'type',
          target: type.target,
          generics: type.generics || [],
          rustType: type
        }
      });
    }
  });

  return { exports, rustMetadata };
};

const findJavaTarget = (javaMetadata, info) => {
  if (!javaMetadata) {
    return null;
  }
  const fullName = info.fullName || info.name;
  const candidates = [
    ...javaMetadata.classes,
    ...javaMetadata.interfaces,
    ...javaMetadata.enums,
    ...javaMetadata.records
  ];
  let match = candidates.find(type => type.fullName === fullName);
  if (!match) {
    match = candidates.find(type => type.name === info.name);
  }
  return match || candidates[0];
};

const findGoTarget = (goMetadata, info) => {
  if (!goMetadata) {
    return null;
  }
  const targetName = info.name;
  const candidates = [
    ...goMetadata.structs,
    ...goMetadata.interfaces,
    ...goMetadata.functions,
    ...goMetadata.types
  ];
  let match = candidates.find(item => item.name === targetName);
  if (!match) {
    match = candidates.find(item => item.name.toLowerCase() === targetName.toLowerCase());
  }
  return match || candidates[0];
};

const findRustTarget = (rustMetadata, info) => {
  if (!rustMetadata) {
    return null;
  }
  const targetName = info.name;
  const candidates = [
    ...rustMetadata.structs,
    ...rustMetadata.enums,
    ...rustMetadata.traits,
    ...rustMetadata.functions,
    ...rustMetadata.types
  ];
  let match = candidates.find(item => item.name === targetName);
  if (!match) {
    match = candidates.find(item => item.name.toLowerCase() === targetName.toLowerCase());
  }
  return match || candidates[0];
};

const generateGoOutputPath = (root, filePath, options, targetName, goMetadata) => {
  const baseName = targetName || path.basename(filePath, '.go');
  const testFileName = `${baseName.toLowerCase()}_test.go`;
  const sourceDir = path.dirname(filePath);

  // Go tests should be in the same package/directory as the source
  return path.join(sourceDir, testFileName);
};

const generateRustOutputPath = (root, filePath, options, targetName, rustMetadata) => {
  const baseName = targetName || path.basename(filePath, '.rs');
  const testFileName = `${baseName.toLowerCase()}_test.rs`;
  const sourceDir = path.dirname(filePath);

  // Rust tests can be in the same directory or in a tests/ subdirectory
  // For unit tests, same directory is preferred
  return path.join(sourceDir, testFileName);
};

const generateGoTestContent = async ({ signature, goMetadata, goType, options = {} }) => {
  const target = goType || findGoTarget(goMetadata, signature);
  if (!target) {
    throw new Error('Unable to resolve Go target for scaffolding');
  }

  const goIntegration = await getLanguagePlugin('go');
  if (!goIntegration) {
    throw new Error('Go language plugin not available');
  }

  const goTarget = {
    name: target.name,
    type: target.type,
    packageName: goMetadata?.packageName,
    metadata: target
  };

  return goIntegration.generateGoTest(goTarget, options);
};

const generateRustTestContent = async ({ signature, rustMetadata, rustType, options = {} }) => {
  const target = rustType || findRustTarget(rustMetadata, signature);
  if (!target) {
    throw new Error('Unable to resolve Rust target for scaffolding');
  }

  const rustIntegration = await getLanguagePlugin('rust');
  if (!rustIntegration) {
    throw new Error('Rust language plugin not available');
  }

  const rustTarget = {
    name: target.name,
    type: target.type,
    crateName: rustMetadata?.crateName,
    metadata: target
  };

  return rustIntegration.generateRustTest(rustTarget, options);
};

const generateJavaOutputPath = (root, filePath, options, targetName, javaMetadata) => {
  const baseName = targetName || path.basename(filePath, '.java');
  const testFileName = `${baseName}Test.java`;
  const relative = path.relative(root, filePath);

  // Convert to segments for cross-platform compatibility
  const segments = relative.split(path.sep);

  // Check for Maven/Gradle structure (src/main/java)
  const mainJavaIndex = segments.findIndex((seg, i) =>
    i < segments.length - 2 &&
    seg === 'src' &&
    segments[i + 1] === 'main' &&
    segments[i + 2] === 'java'
  );

  if (mainJavaIndex !== -1) {
    // Replace 'main' with 'test' in the path
    const testSegments = [...segments];
    testSegments[mainJavaIndex + 1] = 'test';
    testSegments[testSegments.length - 1] = testFileName;
    return path.join(root, ...testSegments);
  }

  // Check for src/main structure (any language)
  const mainIndex = segments.findIndex((seg, i) =>
    i < segments.length - 1 &&
    seg === 'src' &&
    segments[i + 1] === 'main'
  );

  if (mainIndex !== -1) {
    const langFolder = segments[mainIndex + 2]; // The language folder after src/main/
    const pkgSegments = segments.slice(mainIndex + 3, -1); // Package structure
    return path.join(root, 'src', 'test', 'java', ...pkgSegments, testFileName);
  }

  const packageName = javaMetadata && javaMetadata.packageName;
  const baseDir = options.outputDir || path.join(root, 'tests', 'java');
  if (packageName) {
    return path.join(baseDir, ...packageName.split('.'), testFileName);
  }
  return path.join(baseDir, testFileName);
};

const generateJavaTestContent = async ({ signature, javaMetadata, javaType, options = {} }) => {
  const javaIntegration = await getLanguagePlugin('java');
  if (!javaIntegration) {
    throw new Error('Java language plugin not available');
  }

  const target = javaType || findJavaTarget(javaMetadata, signature);
  if (!target) {
    throw new Error('Unable to resolve Java target type for scaffolding');
  }
  const packageName = options.packageName ?? target.packageName ?? javaMetadata?.packageName ?? null;
  return javaIntegration.generateJUnitTest({
    target,
    signature,
    options: {
      packageName,
      testClassName: `${target.name}Test`
    }
  });
};

const analyzePythonFile = async (filePath) => {
  const pythonIntegration = await getLanguagePlugin('python');
  if (!pythonIntegration) {
    return null;
  }

  const result = await pythonIntegration.parseFile(filePath);
  if (!result) {
    return null;
  }

  return {
    exports: result.exports,
    pythonMetadata: result.pythonMetadata
  };
};

const analyzeRubyFile = async (filePath) => {
  const rubyIntegration = await getLanguagePlugin('ruby');
  if (!rubyIntegration) {
    return null;
  }

  const metadata = await rubyIntegration.parseFile(filePath);
  if (!metadata) {
    return null;
  }

  const exports = rubyIntegration.buildExports(metadata);
  if (!exports || exports.length === 0) {
    return null;
  }

  return {
    exports,
    rubyMetadata: metadata
  };
};

const generatePythonOutputPath = (root, filePath, options, targetName) => {
  const baseDir = options.outputDir || path.join(root, 'tests', 'adaptive');
  ensureDirSync(baseDir);
  const slug = slugify(targetName || path.basename(filePath, '.py'));
  return path.join(baseDir, `test_${slug}.py`);
};

const generatePythonTestContent = async ({ signature, moduleName, pythonKind, depth }) => {
  const pythonIntegration = await getLanguagePlugin('python');
  if (!pythonIntegration) {
    throw new Error('Python language plugin not available');
  }

  return pythonIntegration.generatePytestTest({
    signature,
    moduleName,
    targetKind: pythonKind,
    depth
  });
};

const generateRubyOutputPath = (root, filePath, options, targetName) => {
  const baseDir = options.outputDir || path.join(root, 'spec');
  ensureDirSync(baseDir);
  const slug = slugify(targetName || path.basename(filePath, '.rb'));
  return path.join(baseDir, `${slug}_spec.rb`);
};

const generateRubyTestContent = async ({ signature, rubyInfo, requirePath }) => {
  const rubyIntegration = await getLanguagePlugin('ruby');
  if (!rubyIntegration) {
    throw new Error('Ruby language plugin not available');
  }

  return rubyIntegration.generateRSpecTest({
    target: { ruby: rubyInfo },
    signature,
    requirePath
  });
};

const computePythonModule = (root, filePath) => {
  const relative = path.relative(root, filePath).replace(/\\/g, '/');
  if (!relative) {
    return path.basename(filePath, '.py');
  }
  const withoutSuffix = relative.replace(/\.py$/, '');
  const parts = withoutSuffix.split('/').filter(Boolean);
  if (parts.length === 0) {
    return path.basename(filePath, '.py');
  }
  if (parts[parts.length - 1] === '__init__') {
    parts.pop();
  }
  return parts.join('.') || path.basename(filePath, '.py');
};



const generateTestContent = ({
  signature,
  methods,
  isTypeScript,
  applyAssertions
}) => {
  const lines = formatSignatureLines(signature);
  const importLine = isTypeScript
    ? `import { getDiscoveryEngine } from 'adaptive-tests';`
    : `const { getDiscoveryEngine } = require('adaptive-tests');`;

  const targetVar = signature.name || 'Target';
  const methodBlocks = generateMethodBlocks(signature, methods, { applyAssertions, asyncHint: true });

  return `${importLine}

describe('${targetVar} – adaptive discovery', () => {
  const engine = getDiscoveryEngine();
  let ${targetVar};

  beforeAll(async () => {
    ${targetVar} = await engine.discoverTarget({
${lines ? `${lines}\n` : ''}    });
  });

  it('discovers the target', () => {
    expect(${targetVar}).toBeDefined();
  });

${methodBlocks || ''}  // TODO: add domain-specific assertions here
});
`;
};

const analyzeSourceFile = (engine, filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath, path.extname(filePath));
  const metadata = engine.analyzeModuleExports(content, fileName);
  if (!metadata || !metadata.exports || metadata.exports.length === 0) {
    return null;
  }
  return metadata.exports;
};

const analyzePHPFile = async (filePath) => {
  const phpIntegration = await getLanguagePlugin('php');
  if (!phpIntegration) {
    return null;
  }

  const metadata = await phpIntegration.collector.parseFile(filePath);
  if (!metadata) return null;

  // Convert PHP metadata to export-like format for consistency
  const exports = [];

  // Add classes
  metadata.classes.forEach(cls => {
    exports.push({
      exportedName: cls.name,
      access: { type: 'default' },
      info: {
        name: cls.name,
        kind: 'class',
        methods: cls.methods.filter(m => m.visibility === 'public').map(m => m.name),
        properties: cls.properties.filter(p => p.visibility === 'public').map(p => p.name)
      }
    });
  });

  // Add interfaces
  metadata.interfaces.forEach(intf => {
    exports.push({
      exportedName: intf.name,
      access: { type: 'default' },
      info: {
        name: intf.name,
        kind: 'interface',
        methods: intf.methods.map(m => m.name)
      }
    });
  });

  // Add traits
  metadata.traits.forEach(trait => {
    exports.push({
      exportedName: trait.name,
      access: { type: 'default' },
      info: {
        name: trait.name,
        kind: 'trait',
        methods: trait.methods.filter(m => m.visibility === 'public').map(m => m.name)
      }
    });
  });

  // Add functions
  metadata.functions.forEach(fn => {
    exports.push({
      exportedName: fn.name,
      access: { type: 'default' },
      info: {
        name: fn.name,
        kind: 'function'
      }
    });
  });

  return { exports, phpMetadata: metadata };
};

const parseArgs = (argv) => {
  const options = {
    root: process.cwd(),
    isTypeScript: false,
    force: false,
    batch: false,
    exportName: null,
    allExports: false,
    json: false,
    applyAssertions: false,
    outputDir: null,
    targetArg: null
  };

  const args = [...argv];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--root') {
      const next = args[i + 1];
      if (!next) throw new Error('Missing value for --root');
      options.root = path.resolve(next);
      i += 1;
      continue;
    }
    if (arg.startsWith('--root=')) {
      options.root = path.resolve(arg.split('=')[1]);
      continue;
    }
    if (arg === '--typescript' || arg === '--ts') {
      options.isTypeScript = true;
      continue;
    }
    if (arg === '--force' || arg === '--overwrite' || arg === '-f') {
      options.force = true;
      continue;
    }
    if (arg === '--batch' || arg === '-b') {
      options.batch = true;
      continue;
    }
    if (arg === '--all-exports') {
      options.allExports = true;
      continue;
    }
    if (arg === '--apply-assertions') {
      options.applyAssertions = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg.startsWith('--export=')) {
      options.exportName = arg.split('=')[1];
      continue;
    }
    if (arg === '--export') {
      const next = args[i + 1];
      if (!next) throw new Error('Missing value for --export');
      options.exportName = next;
      i += 1;
      continue;
    }
    if (arg.startsWith('--output-dir=')) {
      options.outputDir = path.resolve(options.root, arg.split('=')[1]);
      continue;
    }
    if (!options.targetArg) {
      options.targetArg = arg;
    }
  }

  if (!options.targetArg) {
    throw new Error('Please provide a source path or component name.');
  }

  return options;
};

const resolveSourceByName = async (engine, name) => {
  const normalized = engine.normalizeSignature({ name });
  const candidates = await engine.collectCandidates(engine.rootPath, normalized);
  if (!candidates || candidates.length === 0) {
    return null;
  }
  candidates.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return candidates[0];
};

const generateOutputPath = (root, sourcePath, options, exportName) => {
  const baseDir = options.outputDir || path.join(root, 'tests', 'adaptive');
  ensureDirSync(baseDir);
  const baseName = exportName || path.basename(sourcePath, path.extname(sourcePath));
  const ext = options.isTypeScript ? 'ts' : 'js';
  return path.join(baseDir, `${baseName}.test.${ext}`);
};

const gatherSourceFiles = (dir, extensions) => {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...gatherSourceFiles(fullPath, extensions));
      return;
    }
    if (!entry.isFile()) {
      return;
    }
    const ext = path.extname(entry.name);
    if (!extensions.includes(ext)) {
      return;
    }
    if (entry.name.includes('.test.') || entry.name.includes('.spec.')) {
      return;
    }
    files.push(fullPath);
  });
  return files;
};

const processSingleFile = async (engine, filePath, options, results) => {
  const ext = path.extname(filePath);
  const isPHP = ext === '.php';
  const isJava = ext === '.java';
  const isGo = ext === '.go';
  const isRust = ext === '.rs';
  const isPython = ext === '.py';
  const isRuby = ext === '.rb';

  let exports, phpMetadata, javaMetadata, goMetadata, rustMetadata, pythonMetadata, rubyMetadata;

  if (isJava) {
    const javaResult = await analyzeJavaFile(filePath);
    if (!javaResult || !javaResult.exports || javaResult.exports.length === 0) {
      results.skippedNoExport.push(filePath);
      log(`⚠️  No Java types found in ${path.relative(options.root, filePath)}`, COLORS.yellow, options);
      return;
    }
    exports = javaResult.exports;
    javaMetadata = javaResult.javaMetadata;
  } else if (isGo) {
    const goResult = await analyzeGoFile(filePath);
    if (!goResult || !goResult.exports || goResult.exports.length === 0) {
      results.skippedNoExport.push(filePath);
      log(`⚠️  No Go types found in ${path.relative(options.root, filePath)}`, COLORS.yellow, options);
      return;
    }
    exports = goResult.exports;
    goMetadata = goResult.goMetadata;
  } else if (isRust) {
    const rustResult = await analyzeRustFile(filePath);
    if (!rustResult || !rustResult.exports || rustResult.exports.length === 0) {
      results.skippedNoExport.push(filePath);
      log(`⚠️  No Rust types found in ${path.relative(options.root, filePath)}`, COLORS.yellow, options);
      return;
    }
    exports = rustResult.exports;
    rustMetadata = rustResult.rustMetadata;
  } else if (isPython) {
    const pythonResult = await analyzePythonFile(filePath);
    if (!pythonResult || !pythonResult.exports || pythonResult.exports.length === 0) {
      results.skippedNoExport.push(filePath);
      log(`⚠️  No Python symbols found in ${path.relative(options.root, filePath)}`, COLORS.yellow, options);
      return;
    }
    exports = pythonResult.exports;
    pythonMetadata = pythonResult.pythonMetadata;
  } else if (isRuby) {
    const rubyResult = await analyzeRubyFile(filePath);
    if (!rubyResult || !rubyResult.exports || rubyResult.exports.length === 0) {
      results.skippedNoExport.push(filePath);
      log(`⚠️  No Ruby symbols found in ${path.relative(options.root, filePath)}`, COLORS.yellow, options);
      return;
    }
    exports = rubyResult.exports;
    rubyMetadata = rubyResult.rubyMetadata;
  } else if (isPHP) {
    const phpResult = await analyzePHPFile(filePath);
    if (!phpResult || !phpResult.exports || phpResult.exports.length === 0) {
      results.skippedNoExport.push(filePath);
      log(`⚠️  No PHP classes/functions found in ${path.relative(options.root, filePath)}`, COLORS.yellow, options);
      return;
    }
    exports = phpResult.exports;
    phpMetadata = phpResult.phpMetadata;
  } else {
    exports = analyzeSourceFile(engine, filePath);
    if (!exports || exports.length === 0) {
      results.skippedNoExport.push(filePath);
      log(`⚠️  No exports found in ${path.relative(options.root, filePath)}`, COLORS.yellow, options);
      return;
    }
  }

  let selectedExports;
  if (options.allExports) {
    selectedExports = exports;
  } else if (options.exportName) {
    selectedExports = exports.filter((entry) => {
      const infoName = entry.info && entry.info.name;
      return infoName === options.exportName || (entry.access && entry.access.name === options.exportName);
    });
    if (selectedExports.length === 0) {
      selectedExports = [pickBestExport(exports, options.exportName)];
    }
  } else {
    selectedExports = [pickBestExport(exports, path.basename(filePath, path.extname(filePath)))];
  }

  for (let index = 0; index < selectedExports.length; index += 1) {
    const exportEntry = selectedExports[index];
    const signature = buildSignature(exportEntry) || {};
    if (!signature.name) {
      signature.name = exportEntry.exportedName || `Export${index + 1}`;
    }
    const methods = signature.methods || [];

    let outputPath;
    let content;

    if (isPHP) {
      const baseDir = options.outputDir || path.join(options.root, 'tests');
      ensureDirSync(baseDir);
      const baseName = signature.name || path.basename(filePath, path.extname(filePath));
      outputPath = path.join(baseDir, `${baseName}Test.php`);

      content = await generatePHPTestContent({
        signature: exportEntry.info,
        phpMetadata
      });
    } else if (isJava) {
      const javaType = exportEntry.info.javaType;
      const targetName = options.allExports ? signature.name : signature.name || path.basename(filePath, path.extname(filePath));
      outputPath = generateJavaOutputPath(options.root, filePath, options, targetName, javaMetadata);

      content = await generateJavaTestContent({
        signature,
        javaMetadata,
        javaType,
        options: {
          packageName: javaMetadata?.packageName
        }
      });
    } else if (isGo) {
      const goType = exportEntry.info.goType;
      const targetName = options.allExports ? signature.name : signature.name || path.basename(filePath, path.extname(filePath));
      outputPath = generateGoOutputPath(options.root, filePath, options, targetName, goMetadata);

      content = await generateGoTestContent({
        signature,
        goMetadata,
        goType,
        options: {
          packageName: goMetadata?.packageName
        }
      });
    } else if (isRust) {
      const rustType = exportEntry.info.rustType;
      const targetName = options.allExports ? signature.name : signature.name || path.basename(filePath, path.extname(filePath));
      outputPath = generateRustOutputPath(options.root, filePath, options, targetName, rustMetadata);

      content = await generateRustTestContent({
        signature,
        rustMetadata,
        rustType,
        options: {
          crateName: rustMetadata?.crateName
        }
      });
    } else if (isPython) {
      const pythonInfo = exportEntry.info.python;
      signature.module = signature.module || computePythonModule(options.root, filePath);
      const targetName = signature.name || path.basename(filePath, path.extname(filePath));
      outputPath = generatePythonOutputPath(options.root, filePath, options, targetName);

      const relativeDir = path.relative(options.root, path.dirname(outputPath));
      const depth = relativeDir ? relativeDir.split(path.sep).filter(Boolean).length : 0;

      content = await generatePythonTestContent({
        signature,
        moduleName: signature.module,
        pythonKind: pythonInfo?.type || signature.type || 'class',
        depth
      });
    } else if (isRuby) {
      const rubyInfo = exportEntry.info.ruby;
      const targetName = signature.name || path.basename(filePath, path.extname(filePath));
      outputPath = generateRubyOutputPath(options.root, filePath, options, targetName);

      const requireRelative = path.relative(path.dirname(outputPath), filePath).replace(/\\/g, '/');
      const normalizedRequire = requireRelative.replace(/\.rb$/, '');
      const requirePath = normalizedRequire.startsWith('.') ? normalizedRequire : `./${normalizedRequire}`;

      content = await generateRubyTestContent({
        signature,
        rubyInfo,
        requirePath
      });
    } else {
      outputPath = generateOutputPath(options.root, filePath, options, options.allExports ? signature.name : null);

      content = generateTestContent({
        signature,
        methods,
        isTypeScript: options.isTypeScript,
        applyAssertions: options.applyAssertions
      });
    }

    if (fs.existsSync(outputPath) && !options.force) {
      results.skippedExisting.push(outputPath);
      log(`⏭️  Skipping existing file ${path.relative(options.root, outputPath)} (use --force to overwrite)`, COLORS.yellow, options);
      continue;
    }

    ensureDirSync(path.dirname(outputPath));
    fs.writeFileSync(outputPath, content, 'utf8');
    results.created.push(outputPath);
    log(`✅ Created ${path.relative(options.root, outputPath)}`, COLORS.green, options);
  }
};

const runBatch = async (engine, entryPath, options, results) => {
  const extensions = engine.config.discovery.extensions || ['.js', '.ts', '.tsx'];
  // Add PHP, Java, Go, Rust, Python, and Ruby extensions if not already included
  if (!extensions.includes('.php')) {
    extensions.push('.php');
  }
  if (!extensions.includes('.java')) {
    extensions.push('.java');
  }
  if (!extensions.includes('.go')) {
    extensions.push('.go');
  }
  if (!extensions.includes('.rs')) {
    extensions.push('.rs');
  }
  if (!extensions.includes('.py')) {
    extensions.push('.py');
  }
  if (!extensions.includes('.rb')) {
    extensions.push('.rb');
  }
  const files = fs.statSync(entryPath).isDirectory()
    ? gatherSourceFiles(entryPath, extensions)
    : [entryPath];

  for (const file of files) {
    await processSingleFile(engine, file, options, results);
  }
};

async function runScaffold(argv = []) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`${COLORS.red}Error:${COLORS.reset} ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const root = options.root;
  const targetArg = options.targetArg;
  const discoveryEngine = new DiscoveryEngine(root);
  const results = {
    created: [],
    skippedExisting: [],
    skippedNoExport: [],
    errors: []
  };

  const isPath = targetArg.includes('/') || targetArg.includes('\\') || /\.m?[jt]sx?$/i.test(targetArg);

  try {
    if (options.batch || (isPath && fs.existsSync(path.resolve(root, targetArg)) && fs.statSync(path.resolve(root, targetArg)).isDirectory())) {
      const directory = isPath ? path.resolve(root, targetArg) : path.join(root, 'src');
      if (!fs.existsSync(directory)) {
        throw new Error(`Directory not found: ${targetArg}`);
      }
      log(`🔄 Batch scaffolding ${path.relative(root, directory)}`, COLORS.cyan, options);
      await runBatch(discoveryEngine, directory, { ...options, targetArg: directory }, results);
    } else {
      let filePath = null;
      if (isPath) {
        filePath = path.resolve(root, targetArg);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Source file not found: ${targetArg}`);
        }
      } else {
        const resolved = await resolveSourceByName(discoveryEngine, targetArg);
        if (!resolved) {
          throw new Error(`Unable to find a component named '${targetArg}'.`);
        }
        filePath = resolved.path;
        log(`🔍 Found component at ${path.relative(root, filePath)}`, COLORS.dim, options);
      }
      await processSingleFile(discoveryEngine, filePath, options, results);
    }
  } catch (error) {
    console.error(`${COLORS.red}Error:${COLORS.reset} ${error.message}`);
    results.errors.push(error.message);
    process.exitCode = 1;
  }

  if (options.json) {
    const payload = {
      created: results.created.map((file) => path.relative(root, file)),
      skipped: [
        ...results.skippedExisting.map((file) => path.relative(root, file)),
        ...results.skippedNoExport.map((file) => path.relative(root, file))
      ],
      errors: [...results.errors]
    };
    console.log(JSON.stringify(payload));
  } else {
    log('\n📊 Scaffold summary:', COLORS.bright + COLORS.cyan, options);
    log(`  ✅ Created: ${results.created.length}`, COLORS.green, options);
    log(`  ⏭️  Skipped (existing): ${results.skippedExisting.length}`, COLORS.yellow, options);
    log(`  ⚠️  Skipped (no exports): ${results.skippedNoExport.length}`, COLORS.yellow, options);
    if (results.errors.length > 0) {
      log(`  ❌ Failed: ${results.errors.length}`, COLORS.red, options);
    }
  }

  if (results.errors.length > 0) {
    process.exitCode = 1;
  }
}

module.exports = { runScaffold };

if (require.main === module) {
  runScaffold(process.argv.slice(2)).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}
