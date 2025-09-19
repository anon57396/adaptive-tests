#!/usr/bin/env node

/**
 * Smart Test Scaffolding - Generates perfect adaptive test skeletons from source files
 *
 * This tool analyzes your source code and generates test files with:
 * - Accurate discovery signatures based on actual exports
 * - Test blocks for every public method
 * - TypeScript support
 * - Framework-aware templates (Jest, Mocha, Vitest)
 */

const fs = require('fs');
const path = require('path');
const { getDiscoveryEngine } = require('../adaptive/discovery-engine');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = '') {
  console.log(color + message + COLORS.reset);
}

function detectTestFramework() {
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) {
    return 'jest'; // default
  }

  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (deps.vitest) return 'vitest';
  if (deps.mocha) return 'mocha';
  if (deps.jest) return 'jest';
  if (deps.jasmine) return 'jasmine';
  if (deps.ava) return 'ava';

  return 'jest'; // default
}

function analyzeSourceFile(filePath) {
  const engine = getDiscoveryEngine(process.cwd());
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath, path.extname(filePath));

  try {
    const metadata = engine.analyzeModuleExports(content, fileName);
    if (!metadata || !metadata.exports || metadata.exports.length === 0) {
      return null;
    }

    // Pick the most significant export
    const exports = metadata.exports;
    let selected = exports.find(e => e.access.type === 'default') ||
                   exports.find(e => e.info.kind === 'class') ||
                   exports.find(e => e.info.kind === 'function') ||
                   exports[0];

    return selected;
  } catch (error) {
    return null;
  }
}

function buildSignature(exportInfo) {
  const signature = {};
  const info = exportInfo.info;
  const access = exportInfo.access;

  // Name
  if (info.name) {
    signature.name = info.name;
  } else if (access.name) {
    signature.name = access.name;
  }

  // Type
  if (info.kind && info.kind !== 'unknown') {
    signature.type = info.kind;
  }

  // Export name for named exports
  if (access.type === 'named' && access.name) {
    signature.exports = access.name;
  }

  // Methods
  const methods = Array.from(info.methods || []).filter(m => !m.startsWith('_'));
  if (methods.length > 0) {
    signature.methods = methods;
  }

  // Properties (only include if no methods)
  if (!signature.methods || signature.methods.length === 0) {
    const properties = Array.from(info.properties || []).filter(p => !p.startsWith('_'));
    if (properties.length > 0) {
      signature.properties = properties;
    }
  }

  // Inheritance
  if (info.extends) {
    signature.extends = info.extends;
  }

  return signature;
}

function generateTestTemplate(sourceFile, exportInfo, options = {}) {
  const { framework = 'jest', typescript = false } = options;
  const signature = buildSignature(exportInfo);
  const info = exportInfo.info;
  const name = signature.name || path.basename(sourceFile, path.extname(sourceFile));
  const ext = typescript ? 'ts' : 'js';

  // Import statements
  const importStatement = typescript
    ? `import { discover } from 'adaptive-tests';
import type { ${name} as ${name}Type } from '${path.relative(path.dirname(options.outputPath || ''), sourceFile).replace(/\\/g, '/')}';`
    : `const { discover } = require('adaptive-tests');`;

  // Test framework specific syntax
  const describeWord = framework === 'jest' || framework === 'vitest' ? 'describe' : 'suite';
  const testWord = framework === 'jest' || framework === 'vitest' ? 'test' : 'it';
  const beforeAllWord = framework === 'jest' || framework === 'vitest' ? 'beforeAll' : 'before';
  const expectFn = framework === 'vitest' ? 'expect' : 'expect';

  // Method test blocks
  const methods = Array.from(info.methods || []).filter(m => !m.startsWith('_'));
  const methodTests = methods.map(method => {
    const isAsync = ['create', 'fetch', 'get', 'post', 'delete', 'update', 'save', 'load'].some(prefix =>
      method.toLowerCase().includes(prefix)
    );

    return `
  ${testWord}('should ${humanizeMethodName(method)}', ${isAsync ? 'async ' : ''}() => {
    // TODO: Implement test for ${method}
    ${signature.type === 'class' ? `const instance = new ${name}();` : ''}
    ${signature.type === 'class'
      ? `${isAsync ? 'await ' : ''}${expectFn}(instance.${method}()).toBeDefined();`
      : `${isAsync ? 'await ' : ''}${expectFn}(${name}.${method}()).toBeDefined();`
    }
  });`;
  }).join('\n');

  // Generate template
  const template = `${importStatement}

/**
 * Adaptive Tests for ${name}
 *
 * These tests will automatically find ${name} even if it moves.
 * Generated from: ${path.relative(process.cwd(), sourceFile)}
 */

${describeWord}('${name}', () => {
  let ${name}${typescript ? `: ${name}Type` : ''};

  ${beforeAllWord}(async () => {
    // Discover the module using its signature
    ${name} = await discover(${JSON.stringify(signature, null, 4).split('\n').join('\n    ')});
  });

  ${testWord}('should discover ${name}', () => {
    ${expectFn}(${name}).toBeDefined();
    ${signature.type === 'class' ? `${expectFn}(typeof ${name}).toBe('function');` : ''}
    ${signature.type === 'function' ? `${expectFn}(typeof ${name}).toBe('function');` : ''}
  });
${methods.length > 0 ? `
  ${describeWord}('Methods', () => {${methodTests}
  });` : ''}
});
`;

  return template;
}

function humanizeMethodName(method) {
  // Convert camelCase to human readable
  return method
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .trim()
    .replace(/^get /, 'get ')
    .replace(/^set /, 'set ')
    .replace(/^is /, 'check if ')
    .replace(/^has /, 'check if it has ')
    .replace(/^create /, 'create ')
    .replace(/^delete /, 'delete ')
    .replace(/^update /, 'update ');
}

async function runScaffold(args) {
  const sourceFile = args[0];
  const outputPath = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
  const typescript = args.includes('--typescript') || args.includes('--ts');
  const framework = args.find(arg => arg.startsWith('--framework='))?.split('=')[1] || detectTestFramework();

  if (!sourceFile) {
    log('❌ Error: Please provide a source file path', COLORS.red);
    log('Usage: npx adaptive-tests scaffold <source-file> [--output=path] [--typescript]', COLORS.dim);
    process.exit(1);
  }

  const fullPath = path.resolve(sourceFile);

  if (!fs.existsSync(fullPath)) {
    // Try discovery by name
    log(`📍 File not found at path, searching for '${sourceFile}'...`, COLORS.yellow);

    const engine = getDiscoveryEngine(process.cwd());
    try {
      const candidates = await engine.collectCandidates(process.cwd(), { name: sourceFile });
      if (candidates.length > 0) {
        const selected = candidates[0];
        log(`✅ Found: ${selected.relativePath}`, COLORS.green);
        return runScaffold([selected.path, ...args.slice(1)]);
      }
    } catch (error) {
      // Continue to error message
    }

    log(`❌ Error: File not found: ${sourceFile}`, COLORS.red);
    process.exit(1);
  }

  log(`\n🔍 Analyzing: ${path.relative(process.cwd(), fullPath)}`, COLORS.cyan);

  const exportInfo = analyzeSourceFile(fullPath);

  if (!exportInfo) {
    log('❌ Error: Could not analyze exports from file', COLORS.red);
    log('Make sure the file exports a class, function, or module', COLORS.dim);
    process.exit(1);
  }

  const signature = buildSignature(exportInfo);
  log(`✅ Found export: ${signature.name || 'default'} (${exportInfo.info.kind})`, COLORS.green);

  if (signature.methods && signature.methods.length > 0) {
    log(`   Methods: ${signature.methods.join(', ')}`, COLORS.dim);
  }

  // Determine output path
  const ext = typescript ? 'ts' : 'js';
  const testFileName = `${path.basename(fullPath, path.extname(fullPath))}.test.${ext}`;
  const defaultOutput = path.join(
    path.dirname(fullPath).replace(/src/, 'tests/adaptive'),
    testFileName
  );
  const finalOutput = outputPath || defaultOutput;

  // Generate test
  const testContent = generateTestTemplate(fullPath, exportInfo, {
    framework,
    typescript,
    outputPath: finalOutput
  });

  // Create directory if needed
  const outputDir = path.dirname(finalOutput);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write file
  fs.writeFileSync(finalOutput, testContent);

  log(`\n✨ Generated adaptive test: ${path.relative(process.cwd(), finalOutput)}`, COLORS.bright + COLORS.green);
  log(`\n📊 Discovery signature:`, COLORS.yellow);
  console.log(COLORS.dim + JSON.stringify(signature, null, 2) + COLORS.reset);

  log(`\n🎯 Next steps:`, COLORS.cyan);
  log(`  1. Review the generated test file`, COLORS.dim);
  log(`  2. Implement the TODO sections with actual test logic`, COLORS.dim);
  log(`  3. Run your tests with: ${framework === 'jest' ? 'npm test' : `npx ${framework}`}`, COLORS.dim);

  log(`\n💡 Tip: This test will keep working even if you move ${signature.name}!`, COLORS.magenta);
}

// Export for use by init.js
module.exports = { runScaffold };

// Run directly if called as script
if (require.main === module) {
  runScaffold(process.argv.slice(2)).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}