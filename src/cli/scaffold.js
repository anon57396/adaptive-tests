#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { DiscoveryEngine, getDiscoveryEngine } = require('../adaptive/discovery-engine');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
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

const pickBestExport = (metadata, fallbackName) => {
  if (!metadata || !Array.isArray(metadata.exports) || metadata.exports.length === 0) {
    return {
      exportedName: fallbackName,
      access: { type: 'named', name: fallbackName },
      info: {
        kind: 'class',
        name: fallbackName,
        methods: [],
        properties: [],
        extends: null
      }
    };
  }

  const exports = metadata.exports;

  const priorityScore = (entry) => {
    const info = entry.info || {};
    let score = 0;
    if (info.kind === 'class') score += 3;
    if (info.kind === 'function') score += 2;
    if (entry.exportedName && fallbackName && entry.exportedName === fallbackName) score += 3;
    if (entry.access && entry.access.type === 'default') score += 1;
    if (info.methods && info.methods.length > 0) score += Math.min(info.methods.length, 3);
    return score;
  };

  const sorted = [...exports].sort((a, b) => priorityScore(b) - priorityScore(a));
  return sorted[0];
};

const buildSignature = (exportEntry) => {
  const info = exportEntry.info || {};
  const signature = {};

  if (info.name) {
    signature.name = info.name;
  }

  if (info.kind && info.kind !== 'unknown') {
    signature.type = info.kind;
  }

  const methods = toArray(info.methods).filter(Boolean);
  if (methods.length > 0) {
    signature.methods = methods;
  }

  const properties = toArray(info.properties).filter(Boolean);
  if (properties.length > 0) {
    signature.properties = properties;
  }

  if (info.extends) {
    signature.extends = info.extends;
  }

  if (exportEntry.access && exportEntry.access.type === 'named' && exportEntry.access.name) {
    signature.exports = exportEntry.access.name;
  }

  return signature;
};

const formatSignatureLines = (signature, indent = '    ') => {
  const lines = [];
  const push = (key, value) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      lines.push(`${indent}${key}: [${value.map((v) => `'${v}'`).join(', ')}],`);
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

const toPascalCase = (value) => {
  if (!value) return value;
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, (match) => match.toUpperCase())
    .replace(/\s+/g, '');
};

const generateTestContent = ({
  className,
  variableName,
  signature,
  methods,
  isTypeScript
}) => {
  const importLine = isTypeScript
    ? `import { getDiscoveryEngine } from 'adaptive-tests';`
    : `const { getDiscoveryEngine } = require('adaptive-tests');`;

  const signatureLines = formatSignatureLines(signature);
  const methodBlocks = methods.map((method) => `  it('TODO: ${method}', () => {
    // TODO: add assertions for ${method}
  });`).join('\n\n');

  const typeHint = isTypeScript ? `let ${variableName}: any;` : `let ${variableName};`;

  return `/* eslint-disable @typescript-eslint/no-explicit-any */
${importLine}

describe('${className} – adaptive discovery', () => {
  const engine = getDiscoveryEngine();
  ${typeHint}

  beforeAll(async () => {
    ${variableName} = await engine.discoverTarget({
${signatureLines ? `${signatureLines}\n` : ''}    });
  });

  it('discovers the target', () => {
    expect(${variableName}).toBeDefined();
  });

${methodBlocks ? `${methodBlocks}\n` : ''}});
`;
};

const parseArgs = (args) => {
  const options = {
    root: process.cwd(),
    isTypeScript: false,
    force: false,
    targetArg: null
  };

  const normalizedArgs = [...args];
  for (let i = 0; i < normalizedArgs.length; i += 1) {
    const arg = normalizedArgs[i];
    if (arg === '--root') {
      const next = normalizedArgs[i + 1];
      if (!next) {
        throw new Error('Missing value for --root');
      }
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
    if (arg === '--force' || arg === '--overwrite') {
      options.force = true;
      continue;
    }
    if (!options.targetArg) {
      options.targetArg = arg;
      continue;
    }
  }

  if (!options.targetArg) {
    throw new Error('Please provide a source path or component name.');
  }

  return options;
};

const log = (message, color = COLORS.reset) => {
  console.log(color + message + COLORS.reset);
};

const resolveSourceFromName = async (engine, normalizedSignature) => {
  const candidates = await engine.collectCandidates(engine.rootPath, normalizedSignature) || [];
  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  return candidates[0];
};

async function runScaffold(args = []) {
  let options;
  try {
    options = parseArgs(args);
  } catch (error) {
    console.error(`${COLORS.red}Error:${COLORS.reset} ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const root = options.root;
  const targetArg = options.targetArg;
  const targetIsPath = targetArg.includes('/') || targetArg.includes('\\') || /\.m?tsx?$/i.test(targetArg);

  let filePath;
  let exportMetadata;
  let signatureName;

  const discoveryEngine = new DiscoveryEngine(root);

  if (targetIsPath) {
    filePath = path.resolve(root, targetArg);
    if (!fs.existsSync(filePath)) {
      console.error(`${COLORS.red}Error:${COLORS.reset} Source file not found: ${targetArg}`);
      process.exitCode = 1;
      return;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const metadata = discoveryEngine.analyzeModuleExports(content, path.basename(filePath, path.extname(filePath)));
    exportMetadata = metadata;
    signatureName = path.basename(filePath, path.extname(filePath));
  } else {
    try {
      const normalizedSig = discoveryEngine.normalizeSignature({ name: targetArg });
      const bestCandidate = await resolveSourceFromName(discoveryEngine, normalizedSig);
      if (!bestCandidate) {
        console.error(`${COLORS.red}Error:${COLORS.reset} Unable to find a component named '${targetArg}'.`);
        process.exitCode = 1;
        return;
      }
      filePath = bestCandidate.path;
      exportMetadata = bestCandidate.metadata;
      signatureName = (bestCandidate.metadata && bestCandidate.metadata.exports && bestCandidate.metadata.exports[0]
        && ((bestCandidate.metadata.exports[0].info && bestCandidate.metadata.exports[0].info.name) || bestCandidate.metadata.exports[0].exportedName))
        || targetArg;
      if (!signatureName) {
        signatureName = path.basename(filePath, path.extname(filePath));
      }

      log(`Found component at ${path.relative(root, filePath)}`, COLORS.dim);
    } catch (error) {
      console.error(`${COLORS.red}Error:${COLORS.reset} ${error.message}`);
      process.exitCode = 1;
      return;
    }
  }

  const exportEntry = pickBestExport(exportMetadata, signatureName);
  const signature = buildSignature(exportEntry);

  if (!signature.name) {
    signature.name = signatureName || exportEntry.exportedName || toPascalCase(path.basename(filePath, path.extname(filePath)));
  }
  if (!signature.type) {
    signature.type = 'class';
  }

  const className = signature.name;
  const variableName = className;
  const methods = signature.methods || [];

  const describeName = className;
  const testContent = generateTestContent({
    className: describeName,
    variableName,
    signature,
    methods,
    isTypeScript: options.isTypeScript
  });

  const testDir = path.join(root, 'tests', 'adaptive');
  ensureDirSync(testDir);

  const extension = options.isTypeScript ? 'ts' : 'js';
  const testFileName = `${className}.test.${extension}`;
  const testFilePath = path.join(testDir, testFileName);

  if (fs.existsSync(testFilePath) && !options.force) {
    console.error(`${COLORS.red}Error:${COLORS.reset} Test file already exists: ${path.relative(root, testFilePath)} (use --force to overwrite)`);
    process.exitCode = 1;
    return;
  }

  fs.writeFileSync(testFilePath, testContent, 'utf8');

  log(`Created ${path.relative(root, testFilePath)}`, COLORS.green);
}

module.exports = { runScaffold };
