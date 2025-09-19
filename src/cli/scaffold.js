#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { DiscoveryEngine, getDiscoveryEngine } = require('../adaptive/discovery-engine');
const { PHPDiscoveryIntegration } = require('../adaptive/php/php-discovery-integration');
const { JavaDiscoveryIntegration } = require('../adaptive/java/java-discovery-integration');

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
    if (info.kind === 'class') score += 3;
    if (info.kind === 'function') score += 2;
    if (entry.access && entry.access.type === 'default') score += 1;
    if (entry.exportedName && entry.exportedName === fallbackName) score += 3;
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

const generatePHPTestContent = ({ signature, phpMetadata }) => {
  const phpIntegration = new PHPDiscoveryIntegration(null);

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


const javaIntegration = new JavaDiscoveryIntegration(null);

const analyzeJavaFile = async (filePath) => {
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

const generateJavaOutputPath = (root, filePath, options, targetName, javaMetadata) => {
  const baseName = targetName || path.basename(filePath, '.java');
  const testFileName = `${baseName}Test.java`;
  const relative = path.relative(root, filePath);
  const normalized = relative.split(path.sep).join('/');

  if (normalized.includes('src/main/java/')) {
    const replaced = normalized.replace('src/main/java/', 'src/test/java/');
    const destination = replaced.replace(/[^/]+$/, testFileName);
    return path.join(root, ...destination.split('/'));
  }

  if (normalized.includes('src/main/')) {
    const afterMain = normalized.substring(normalized.indexOf('src/main/') + 'src/main/'.length);
    const segments = afterMain.split('/');
    const pkgSegments = segments.slice(1, -1); // drop original language folder and file
    const destination = path.join(root, 'src', 'test', 'java', ...pkgSegments, testFileName);
    return destination;
  }

  const packageName = javaMetadata && javaMetadata.packageName;
  const baseDir = options.outputDir || path.join(root, 'tests', 'java');
  if (packageName) {
    return path.join(baseDir, ...packageName.split('.'), testFileName);
  }
  return path.join(baseDir, testFileName);
};

const generateJavaTestContent = ({ signature, javaMetadata, javaType, options = {} }) => {
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
  const phpIntegration = new PHPDiscoveryIntegration(null);
  const metadata = await phpIntegration.phpCollector.parseFile(filePath);
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

  let exports, phpMetadata, javaMetadata;

  if (isJava) {
    const javaResult = await analyzeJavaFile(filePath);
    if (!javaResult || !javaResult.exports || javaResult.exports.length === 0) {
      results.skippedNoExport.push(filePath);
      log(`⚠️  No Java types found in ${path.relative(options.root, filePath)}`, COLORS.yellow, options);
      return;
    }
    exports = javaResult.exports;
    javaMetadata = javaResult.javaMetadata;
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

  selectedExports.forEach((exportEntry, index) => {
    const signature = buildSignature(exportEntry) || {};
    if (!signature.name) {
      signature.name = exportEntry.exportedName || `Export${index + 1}`;
    }
    const methods = signature.methods || [];

    let outputPath, content;

    if (isPHP) {
      // For PHP files, generate PHPUnit test files
      const baseDir = options.outputDir || path.join(options.root, 'tests');
      ensureDirSync(baseDir);
      const baseName = signature.name || path.basename(filePath, path.extname(filePath));
      outputPath = path.join(baseDir, `${baseName}Test.php`);

      content = generatePHPTestContent({
        signature: exportEntry.info,
        phpMetadata
      });
    } else if (isJava) {
      const javaType = exportEntry.info.javaType;
      const targetName = options.allExports ? signature.name : signature.name || path.basename(filePath, path.extname(filePath));
      outputPath = generateJavaOutputPath(options.root, filePath, options, targetName, javaMetadata);

      content = generateJavaTestContent({
        signature,
        javaMetadata,
        javaType,
        options: {
          packageName: javaMetadata?.packageName
        }
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
      return;
    }

    ensureDirSync(path.dirname(outputPath));
    fs.writeFileSync(outputPath, content, 'utf8');
    results.created.push(outputPath);
    log(`✅ Created ${path.relative(options.root, outputPath)}`, COLORS.green, options);
  });
};

const runBatch = async (engine, entryPath, options, results) => {
  const extensions = engine.config.discovery.extensions || ['.js', '.ts', '.tsx'];
  // Add PHP and Java extensions if not already included
  if (!extensions.includes('.php')) {
    extensions.push('.php');
  }
  if (!extensions.includes('.java')) {
    extensions.push('.java');
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
