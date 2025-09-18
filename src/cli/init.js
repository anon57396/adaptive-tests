#!/usr/bin/env node

/**
 * Adaptive Tests CLI - Initialize adaptive testing in any project
 * Usage: npx adaptive-tests init
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = '') {
  console.log(color + message + COLORS.reset);
}

function header() {
  console.log('\n' + COLORS.cyan + '═'.repeat(50) + COLORS.reset);
  log('   🚀 Adaptive Tests - Setup Wizard', COLORS.bright + COLORS.cyan);
  console.log(COLORS.cyan + '═'.repeat(50) + COLORS.reset + '\n');
}

function detectTestFramework() {
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) {
    return null;
  }

  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (deps.jest) return 'jest';
  if (deps.mocha) return 'mocha';
  if (deps.vitest) return 'vitest';
  if (deps.jasmine) return 'jasmine';
  if (deps.ava) return 'ava';

  return null;
}

function detectLanguage() {
  const hasTypeScript = fs.existsSync(path.join(process.cwd(), 'tsconfig.json'));
  return hasTypeScript ? 'typescript' : 'javascript';
}

function createBaseTestFile(framework, language) {
  const ext = language === 'typescript' ? 'ts' : 'js';
  const importStatement = language === 'typescript'
    ? "import { AdaptiveTest, discover } from 'adaptive-tests';"
    : "const { AdaptiveTest, discover } = require('adaptive-tests');";

  const template = `${importStatement}

/**
 * Example Adaptive Test
 *
 * This test will automatically find your component/service
 * even if you move it to a different location.
 */

class ExampleAdaptiveTest extends AdaptiveTest {
  getTargetSignature() {
    return {
      // Adjust these to match your target module
      name: 'YourComponentName',
      type: 'class', // or 'function'
      methods: ['methodName'], // optional: required methods
      exports: 'YourComponentName' // optional: specific export name
    };
  }

  async runTests(YourComponent) {
    ${framework === 'jest' ? 'describe' : 'suite'}('Adaptive Tests Example', () => {
      ${framework === 'jest' ? 'test' : 'it'}('should find and test the component', () => {
        expect(YourComponent).toBeDefined();
        // Add your actual tests here
      });
    });
  }
}

// Initialize the test
new ExampleAdaptiveTest();
`;

  return template;
}

function createDiscoveryExample(language) {
  const ext = language === 'typescript' ? 'ts' : 'js';
  const importStatement = language === 'typescript'
    ? "import { discover } from 'adaptive-tests';"
    : "const { discover } = require('adaptive-tests');";

  return `${importStatement}

/**
 * Direct Discovery Example
 *
 * Use discover() to find modules dynamically in your tests
 */

async function runTests() {
  // Find a module by its signature
  const MyService = await discover({
    name: 'UserService',
    type: 'class',
    methods: ['createUser', 'deleteUser']
  });

  // Use it normally
  const service = new MyService();
  const user = service.createUser('Alice');
  console.log('Created user:', user);
}

// For async test runners
${language === 'typescript' ? '(async () => {' : '(async function() {'}
  await runTests();
})();
`;
}

async function main() {
  header();

  // Detect environment
  const framework = detectTestFramework();
  const language = detectLanguage();

  log('📋 Detected Environment:', COLORS.yellow);
  log(`   Test Framework: ${framework || 'None detected'}`, COLORS.dim);
  log(`   Language: ${language}`, COLORS.dim);
  console.log();

  // Check if already installed
  const packagePath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (!deps['adaptive-tests']) {
      log('📦 Installing adaptive-tests...', COLORS.blue);
      try {
        execSync('npm install --save-dev adaptive-tests', { stdio: 'inherit' });
        log('✅ Package installed successfully!', COLORS.green);
      } catch (error) {
        log('❌ Failed to install package. Please run: npm install adaptive-tests', COLORS.red);
        process.exit(1);
      }
    } else {
      log('✅ adaptive-tests is already installed', COLORS.green);
    }

    if (language === 'typescript' && !deps['ts-node']) {
      log('📦 Installing ts-node for TypeScript support...', COLORS.blue);
      try {
        execSync('npm install --save-dev ts-node', { stdio: 'inherit' });
      } catch (error) {
        log('⚠️  Could not install ts-node. TypeScript discovery may not work.', COLORS.yellow);
      }
    }
  }

  // Create example files
  const testDir = framework === 'jest' ? 'tests' : 'test';
  const adaptiveDir = path.join(process.cwd(), testDir, 'adaptive');

  if (!fs.existsSync(adaptiveDir)) {
    fs.mkdirSync(adaptiveDir, { recursive: true });
  }

  // Create base test file
  const ext = language === 'typescript' ? 'ts' : 'js';
  const baseTestPath = path.join(adaptiveDir, `example.test.${ext}`);

  if (!fs.existsSync(baseTestPath)) {
    fs.writeFileSync(baseTestPath, createBaseTestFile(framework, language));
    log(`📝 Created example test: ${path.relative(process.cwd(), baseTestPath)}`, COLORS.green);
  }

  // Create discovery example
  const discoveryExamplePath = path.join(adaptiveDir, `discovery-example.${ext}`);

  if (!fs.existsSync(discoveryExamplePath)) {
    fs.writeFileSync(discoveryExamplePath, createDiscoveryExample(language));
    log(`📝 Created discovery example: ${path.relative(process.cwd(), discoveryExamplePath)}`, COLORS.green);
  }

  // Create adaptive test base if needed
  const baseClassPath = path.join(adaptiveDir, `base.${ext}`);

  if (!fs.existsSync(baseClassPath)) {
    const baseContent = language === 'typescript'
      ? `export { AdaptiveTest, adaptiveTest } from 'adaptive-tests';`
      : `module.exports = require('adaptive-tests');`;
    fs.writeFileSync(baseClassPath, baseContent);
  }

  console.log();
  log('🎉 Setup Complete!', COLORS.bright + COLORS.green);
  console.log();
  log('Next steps:', COLORS.yellow);
  log(`  1. Check the examples in ${testDir}/adaptive/`, COLORS.dim);
  log('  2. Update example.test.js with your actual component signatures', COLORS.dim);
  log('  3. Run your tests with your existing test command', COLORS.dim);
  console.log();
  log('📚 Documentation: https://github.com/anon57396/adaptive-tests', COLORS.cyan);
  log('⭐ Star us on GitHub if this helps!', COLORS.magenta);
  console.log();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error during initialization:', error);
    process.exit(1);
  });
}

module.exports = { main };