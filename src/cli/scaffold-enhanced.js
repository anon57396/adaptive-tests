#!/usr/bin/env node

/**
 * Enhanced Smart Test Scaffolding - Next-level test generation
 *
 * Advanced features beyond basic scaffolding:
 * - Intelligent assertion generation based on method signatures
 * - Mock data generation for common patterns
 * - Dependency injection detection
 * - Test coverage suggestions
 * - Interactive mode for complex modules
 * - Batch scaffolding for entire directories
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
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

/**
 * Infer test assertions based on method name patterns
 */
function inferAssertions(methodName, className) {
  const assertions = [];

  // Getter patterns
  if (methodName.startsWith('get') || methodName.startsWith('fetch')) {
    assertions.push(`expect(result).toBeDefined();`);
    assertions.push(`expect(result).not.toBeNull();`);

    const entity = methodName.replace(/^(get|fetch)/, '');
    if (entity) {
      assertions.push(`// expect(result).toHaveProperty('id');`);
      assertions.push(`// expect(result).toMatchObject({ /* expected shape */ });`);
    }
  }

  // Boolean patterns
  if (methodName.startsWith('is') || methodName.startsWith('has') || methodName.startsWith('can')) {
    assertions.push(`expect(result).toBe(true); // or false`);
    assertions.push(`expect(typeof result).toBe('boolean');`);
  }

  // Setter patterns
  if (methodName.startsWith('set') || methodName.startsWith('update')) {
    assertions.push(`expect(result).toBeUndefined(); // or return this for chaining`);
    assertions.push(`// Verify the value was actually set`);
    const property = methodName.replace(/^(set|update)/, '').toLowerCase();
    assertions.push(`// expect(instance.get${property.charAt(0).toUpperCase() + property.slice(1)}()).toBe(newValue);`);
  }

  // Creation patterns
  if (methodName.includes('create') || methodName.includes('add') || methodName.includes('insert')) {
    assertions.push(`expect(result).toBeDefined();`);
    assertions.push(`expect(result).toHaveProperty('id');`);
    assertions.push(`// expect(result.createdAt).toBeInstanceOf(Date);`);
  }

  // Deletion patterns
  if (methodName.includes('delete') || methodName.includes('remove')) {
    assertions.push(`expect(result).toBe(true); // or deleted count`);
    assertions.push(`// Verify the item no longer exists`);
  }

  // Validation patterns
  if (methodName.includes('validate') || methodName.includes('verify')) {
    assertions.push(`expect(result).toHaveProperty('valid');`);
    assertions.push(`expect(result.errors).toBeInstanceOf(Array);`);
  }

  // List/Array patterns
  if (methodName.includes('list') || methodName.includes('getAll') || methodName.endsWith('s')) {
    assertions.push(`expect(Array.isArray(result)).toBe(true);`);
    assertions.push(`expect(result.length).toBeGreaterThanOrEqual(0);`);
    assertions.push(`// expect(result[0]).toHaveProperty('id');`);
  }

  // Count patterns
  if (methodName.includes('count') || methodName.includes('size') || methodName.includes('length')) {
    assertions.push(`expect(typeof result).toBe('number');`);
    assertions.push(`expect(result).toBeGreaterThanOrEqual(0);`);
  }

  // Search/Find patterns
  if (methodName.includes('find') || methodName.includes('search') || methodName.includes('query')) {
    assertions.push(`expect(result).toBeDefined();`);
    assertions.push(`// expect(result).toMatchObject(searchCriteria);`);
  }

  // Default for unknown patterns
  if (assertions.length === 0) {
    assertions.push(`expect(result).toBeDefined();`);
    assertions.push(`// Add specific assertions based on expected behavior`);
  }

  return assertions;
}

/**
 * Generate mock data based on parameter names
 */
function generateMockData(methodName, paramCount = 0) {
  const mocks = [];

  // Common parameter patterns
  if (methodName.includes('User') || methodName.includes('user')) {
    mocks.push(`{ id: '123', name: 'John Doe', email: 'john@example.com' }`);
  }

  if (methodName.includes('Product') || methodName.includes('product')) {
    mocks.push(`{ id: 'prod-1', name: 'Widget', price: 99.99, stock: 100 }`);
  }

  if (methodName.includes('Order') || methodName.includes('order')) {
    mocks.push(`{ id: 'ord-1', userId: 'user-123', items: [], total: 150.00 }`);
  }

  if (methodName.includes('id') || methodName.includes('Id')) {
    mocks.push(`'test-id-123'`);
  }

  if (methodName.includes('email')) {
    mocks.push(`'test@example.com'`);
  }

  if (methodName.includes('password')) {
    mocks.push(`'SecurePass123!'`);
  }

  if (methodName.includes('token')) {
    mocks.push(`'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'`);
  }

  if (methodName.includes('date') || methodName.includes('Date')) {
    mocks.push(`new Date('2024-01-01')`);
  }

  if (methodName.includes('amount') || methodName.includes('price')) {
    mocks.push(`99.99`);
  }

  if (methodName.includes('count') || methodName.includes('limit')) {
    mocks.push(`10`);
  }

  if (methodName.includes('page') || methodName.includes('offset')) {
    mocks.push(`0`);
  }

  if (methodName.includes('search') || methodName.includes('query')) {
    mocks.push(`'search term'`);
  }

  if (methodName.includes('filter') || methodName.includes('Filter')) {
    mocks.push(`{ status: 'active', sortBy: 'createdAt' }`);
  }

  // Generic fallbacks based on param count
  if (mocks.length === 0 && paramCount > 0) {
    for (let i = 0; i < paramCount; i++) {
      mocks.push(`param${i + 1}`);
    }
  }

  return mocks;
}

/**
 * Detect if a class likely has dependencies
 */
function detectDependencies(exportInfo) {
  const indicators = [
    'Service', 'Repository', 'Controller', 'Manager', 'Provider',
    'Client', 'Adapter', 'Gateway', 'Handler', 'Processor'
  ];

  const className = exportInfo.info.name || '';
  const hasDependencyPattern = indicators.some(pattern =>
    className.includes(pattern)
  );

  // Check for constructor parameters (would need AST analysis for accuracy)
  const methods = Array.from(exportInfo.info.methods || []);
  const hasComplexMethods = methods.some(m =>
    m.includes('connect') || m.includes('init') || m.includes('setup')
  );

  return hasDependencyPattern || hasComplexMethods;
}

/**
 * Generate enhanced test template with intelligent features
 */
function generateEnhancedTestTemplate(sourceFile, exportInfo, options = {}) {
  const { framework = 'jest', typescript = false } = options;
  const signature = buildSignature(exportInfo);
  const info = exportInfo.info;
  const name = signature.name || path.basename(sourceFile, path.extname(sourceFile));

  const hasDependencies = detectDependencies(exportInfo);
  const methods = Array.from(info.methods || []).filter(m => !m.startsWith('_'));

  // Generate sophisticated method tests
  const methodTests = methods.map(method => {
    const assertions = inferAssertions(method, name);
    const mockData = generateMockData(method, 2); // Assume 2 params for now
    const isAsync = ['create', 'fetch', 'get', 'post', 'delete', 'update', 'save', 'load', 'connect'].some(prefix =>
      method.toLowerCase().includes(prefix)
    );

    return `
  describe('${method}', () => {
    test('should ${humanizeMethodName(method)}', ${isAsync ? 'async ' : ''}() => {
      // Arrange
      ${signature.type === 'class' ? `const instance = new ${name}(${hasDependencies ? 'mockDependencies' : ''});` : ''}
      ${mockData.length > 0 ? `const mockData = ${mockData[0]};` : ''}

      // Act
      ${signature.type === 'class'
        ? `const result = ${isAsync ? 'await ' : ''}instance.${method}(${mockData.length > 0 ? 'mockData' : ''});`
        : `const result = ${isAsync ? 'await ' : ''}${name}.${method}(${mockData.length > 0 ? 'mockData' : ''});`
      }

      // Assert
      ${assertions.join('\n      ')}
    });

    ${method.includes('error') || method.includes('validate') ? `
    test('should handle errors in ${method}', ${isAsync ? 'async ' : ''}() => {
      ${signature.type === 'class' ? `const instance = new ${name}(${hasDependencies ? 'mockDependencies' : ''});` : ''}
      const invalidData = null; // or invalid mock data

      ${isAsync
        ? `await expect(instance.${method}(invalidData)).rejects.toThrow();`
        : `expect(() => instance.${method}(invalidData)).toThrow();`
      }
    });` : ''}
  });`;
  }).join('\n');

  // Generate template with enhanced features
  const template = `const { discover } = require('adaptive-tests');
${hasDependencies ? `const { createMockInstance } = require('../test-utils/mocks');` : ''}

/**
 * Adaptive Tests for ${name}
 *
 * Auto-generated with intelligent assertions and mock data.
 * These tests will find ${name} even after refactoring.
 *
 * Coverage suggestions:
 * - Happy path scenarios ✓
 * - Error handling ${methods.some(m => m.includes('error')) ? '✓' : '⚠️ Add error cases'}
 * - Edge cases ⚠️ Review and add
 * - Integration tests ${hasDependencies ? '⚠️ Consider adding' : ''}
 */

describe('${name}', () => {
  let ${name};
  ${hasDependencies ? `let mockDependencies;` : ''}

  beforeAll(async () => {
    ${name} = await discover(${JSON.stringify(signature, null, 4).split('\n').join('\n    ')});
  });

  ${hasDependencies ? `beforeEach(() => {
    // Setup mock dependencies
    mockDependencies = {
      database: createMockInstance('Database'),
      logger: createMockInstance('Logger'),
      // Add other dependencies as needed
    };
  });` : ''}

  describe('Discovery', () => {
    test('should successfully discover ${name}', () => {
      expect(${name}).toBeDefined();
      expect(typeof ${name}).toBe('${signature.type === 'class' ? 'function' : 'function'}');
    });

    test('should have expected interface', () => {
      ${signature.type === 'class' ? `const instance = new ${name}(${hasDependencies ? 'mockDependencies' : ''});` : ''}
      ${methods.map(m => `expect(${signature.type === 'class' ? 'instance' : name}.${m}).toBeDefined();`).join('\n      ')}
    });
  });

  ${methodTests}

  ${hasDependencies ? `
  describe('Dependency Injection', () => {
    test('should handle missing dependencies gracefully', () => {
      expect(() => new ${name}()).toThrow();
    });

    test('should accept mock dependencies', () => {
      const instance = new ${name}(mockDependencies);
      expect(instance).toBeDefined();
    });
  });` : ''}

  describe('Integration Scenarios', () => {
    test.todo('should handle complete workflow');
    test.todo('should maintain state consistency');
    test.todo('should handle concurrent operations');
  });
});`;

  return template;
}

/**
 * Interactive mode for complex modules with multiple exports
 */
async function interactiveExportSelection(exports) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n' + COLORS.cyan + '📦 Multiple exports found:' + COLORS.reset);
  exports.forEach((exp, index) => {
    const name = exp.info.name || exp.access.name || 'anonymous';
    const type = exp.info.kind;
    const methods = Array.from(exp.info.methods || []).length;
    console.log(`  ${COLORS.yellow}[${index + 1}]${COLORS.reset} ${name} (${type}) - ${methods} methods`);
  });

  return new Promise((resolve) => {
    rl.question(COLORS.cyan + '\nSelect export to scaffold (1-' + exports.length + ') or "all": ' + COLORS.reset, (answer) => {
      rl.close();

      if (answer.toLowerCase() === 'all') {
        resolve(exports);
      } else {
        const index = parseInt(answer) - 1;
        if (index >= 0 && index < exports.length) {
          resolve([exports[index]]);
        } else {
          resolve([exports[0]]); // Default to first
        }
      }
    });
  });
}

/**
 * Batch scaffolding for entire directories
 */
async function batchScaffold(directory, options) {
  const files = [];

  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.includes('node_modules')) {
        scanDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
        if (!entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
          files.push(fullPath);
        }
      }
    }
  }

  scanDirectory(directory);

  log(`\n🔍 Found ${files.length} source files to scaffold`, COLORS.cyan);

  const results = {
    success: [],
    failed: [],
    skipped: []
  };

  for (const file of files) {
    try {
      const exportInfo = analyzeSourceFile(file);
      if (exportInfo) {
        const outputPath = generateOutputPath(file, options);

        if (fs.existsSync(outputPath) && !options.force) {
          results.skipped.push(file);
          continue;
        }

        const template = generateEnhancedTestTemplate(file, exportInfo, options);
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, template);
        results.success.push(file);
        log(`  ✅ ${path.relative(process.cwd(), file)}`, COLORS.green);
      } else {
        results.skipped.push(file);
      }
    } catch (error) {
      results.failed.push(file);
      log(`  ❌ ${path.relative(process.cwd(), file)}: ${error.message}`, COLORS.red);
    }
  }

  // Summary
  log('\n📊 Batch Scaffolding Summary:', COLORS.bright + COLORS.cyan);
  log(`  ✅ Success: ${results.success.length} files`, COLORS.green);
  log(`  ⏭️  Skipped: ${results.skipped.length} files`, COLORS.yellow);
  log(`  ❌ Failed: ${results.failed.length} files`, COLORS.red);

  return results;
}

function generateOutputPath(sourceFile, options) {
  const ext = options.typescript ? 'ts' : 'js';
  const testFileName = `${path.basename(sourceFile, path.extname(sourceFile))}.test.${ext}`;

  if (options.outputDir) {
    return path.join(options.outputDir, testFileName);
  }

  return path.join(
    path.dirname(sourceFile).replace(/src/, 'tests/adaptive'),
    testFileName
  );
}

function buildSignature(exportInfo) {
  const signature = {};
  const info = exportInfo.info;
  const access = exportInfo.access;

  if (info.name) {
    signature.name = info.name;
  } else if (access.name) {
    signature.name = access.name;
  }

  if (info.kind && info.kind !== 'unknown') {
    signature.type = info.kind;
  }

  if (access.type === 'named' && access.name) {
    signature.exports = access.name;
  }

  const methods = Array.from(info.methods || []).filter(m => !m.startsWith('_'));
  if (methods.length > 0) {
    signature.methods = methods;
  }

  if (!signature.methods || signature.methods.length === 0) {
    const properties = Array.from(info.properties || []).filter(p => !p.startsWith('_'));
    if (properties.length > 0) {
      signature.properties = properties;
    }
  }

  if (info.extends) {
    signature.extends = info.extends;
  }

  return signature;
}

function humanizeMethodName(method) {
  return method
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .trim();
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

/**
 * Main enhanced scaffold runner
 */
async function runEnhancedScaffold(args) {
  const sourceFile = args[0];
  const options = {
    outputPath: args.find(arg => arg.startsWith('--output='))?.split('=')[1],
    outputDir: args.find(arg => arg.startsWith('--output-dir='))?.split('=')[1],
    typescript: args.includes('--typescript') || args.includes('--ts'),
    framework: args.find(arg => arg.startsWith('--framework='))?.split('=')[1] || 'jest',
    interactive: args.includes('--interactive') || args.includes('-i'),
    batch: args.includes('--batch') || args.includes('-b'),
    force: args.includes('--force') || args.includes('-f'),
    enhanced: true
  };

  if (!sourceFile) {
    log('❌ Error: Please provide a source file or directory path', COLORS.red);
    log('Usage: npx adaptive-tests scaffold-enhanced <source> [options]', COLORS.dim);
    log('\nOptions:', COLORS.cyan);
    log('  --interactive, -i     Interactive mode for multiple exports', COLORS.dim);
    log('  --batch, -b          Process entire directory', COLORS.dim);
    log('  --typescript, --ts   Generate TypeScript tests', COLORS.dim);
    log('  --force, -f          Overwrite existing tests', COLORS.dim);
    log('  --output-dir=<dir>   Output directory for tests', COLORS.dim);
    process.exit(1);
  }

  const fullPath = path.resolve(sourceFile);

  // Check if batch mode
  if (options.batch || (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory())) {
    return batchScaffold(fullPath, options);
  }

  if (!fs.existsSync(fullPath)) {
    log(`❌ Error: Path not found: ${sourceFile}`, COLORS.red);
    process.exit(1);
  }

  log(`\n🧪 Enhanced Scaffold Analysis: ${path.relative(process.cwd(), fullPath)}`, COLORS.bright + COLORS.cyan);

  // Analyze all exports
  const engine = getDiscoveryEngine(process.cwd());
  const content = fs.readFileSync(fullPath, 'utf8');
  const fileName = path.basename(fullPath, path.extname(fullPath));
  const metadata = engine.analyzeModuleExports(content, fileName);

  if (!metadata || !metadata.exports || metadata.exports.length === 0) {
    log('❌ No exports found in file', COLORS.red);
    process.exit(1);
  }

  let selectedExports = metadata.exports;

  // Interactive selection if multiple exports
  if (options.interactive && metadata.exports.length > 1) {
    selectedExports = await interactiveExportSelection(metadata.exports);
  } else {
    selectedExports = [selectedExports[0]];
  }

  // Generate tests for selected exports
  for (const exportInfo of selectedExports) {
    const signature = buildSignature(exportInfo);
    const name = signature.name || 'default';

    log(`\n✨ Generating enhanced test for: ${name}`, COLORS.green);
    log(`  Type: ${exportInfo.info.kind}`, COLORS.dim);
    log(`  Methods: ${signature.methods?.length || 0}`, COLORS.dim);
    log(`  Smart assertions: ✓`, COLORS.dim);
    log(`  Mock generation: ✓`, COLORS.dim);

    const template = generateEnhancedTestTemplate(fullPath, exportInfo, options);
    const outputPath = options.outputPath || generateOutputPath(fullPath, options);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, template);

    log(`\n📁 Test saved to: ${path.relative(process.cwd(), outputPath)}`, COLORS.cyan);
  }

  log('\n🎯 Enhanced features applied:', COLORS.yellow);
  log('  ✓ Intelligent assertion patterns based on method names', COLORS.dim);
  log('  ✓ Mock data generation for common patterns', COLORS.dim);
  log('  ✓ Dependency injection detection', COLORS.dim);
  log('  ✓ Error handling test cases', COLORS.dim);
  log('  ✓ Coverage suggestions and TODOs', COLORS.dim);

  log('\n💡 Next steps:', COLORS.cyan);
  log('  1. Review generated assertions and adjust as needed', COLORS.dim);
  log('  2. Customize mock data for your domain', COLORS.dim);
  log('  3. Implement TODO test cases', COLORS.dim);
  log('  4. Run coverage report to identify gaps', COLORS.dim);
}

module.exports = { runEnhancedScaffold };

if (require.main === module) {
  runEnhancedScaffold(process.argv.slice(2)).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}