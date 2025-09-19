#!/usr/bin/env node

/**
 * Adaptive Tests CLI - Initialize adaptive testing in any project
 * Usage: npx adaptive-tests init
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const CONFIG_FILENAME = 'adaptive-tests.config.js';

/**
 * Detect which package manager is being used
 * @returns {{name: string, install: string, add: string, addDev: string}}
 */
function detectPackageManager() {
  const cwd = process.cwd();

  // Check for lock files
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
    return {
      name: 'yarn',
      install: 'yarn install',
      add: 'yarn add',
      addDev: 'yarn add --dev'
    };
  }

  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
    return {
      name: 'pnpm',
      install: 'pnpm install',
      add: 'pnpm add',
      addDev: 'pnpm add --save-dev'
    };
  }

  if (fs.existsSync(path.join(cwd, 'bun.lockb'))) {
    return {
      name: 'bun',
      install: 'bun install',
      add: 'bun add',
      addDev: 'bun add --dev'
    };
  }

  // Default to npm
  return {
    name: 'npm',
    install: 'npm install',
    add: 'npm install',
    addDev: 'npm install --save-dev'
  };
}
const KNOWN_FRAMEWORKS = ['jest', 'mocha', 'vitest', 'jasmine', 'ava'];

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

function detectSourceDirectory() {
  const candidates = ['src', 'app', 'lib', 'services', 'packages'];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(process.cwd(), candidate))) {
      return candidate;
    }
  }
  return 'src';
}

function detectTestDirectory(framework) {
  const key = (framework || '').toLowerCase();
  if (key === 'mocha' || key === 'jasmine' || key === 'ava') {
    return 'test';
  }
  return 'tests';
}

function isInteractiveSession() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function sanitiseDir(dir, fallback) {
  const trimmed = (dir || '').trim();
  if (!trimmed) return fallback;
  const withoutDots = trimmed.replace(/^\.\/+/, '');
  const segments = withoutDots.split(/[\\/]+/).filter(Boolean);
  const normalised = segments.join('/');
  return normalised || fallback;
}

function toClassName(value) {
  const safe = (value || '').replace(/[^a-zA-Z0-9]+/g, ' ');
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'ExampleService';
  }
  return parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

function toFileSlug(value) {
  const className = toClassName(value);
  return className
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function createPrompter() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = (question, defaultValue = '') => new Promise((resolve) => {
    const hint = defaultValue ? ` [${defaultValue}]` : '';
    rl.question(`${COLORS.cyan}?${COLORS.reset} ${question}${hint}: `, (answer) => {
      const response = (answer || '').trim();
      resolve(response || defaultValue);
    });
  });

  const askYesNo = async (question, defaultValue) => {
    const hint = defaultValue ? 'Y/n' : 'y/N';
    const response = (await ask(`${question} (${hint})`, '')).toLowerCase();
    if (!response) return defaultValue;
    if (['y', 'yes'].includes(response)) return true;
    if (['n', 'no'].includes(response)) return false;
    return defaultValue;
  };

  const close = () => rl.close();

  return { ask, askYesNo, close };
}

function normaliseFramework(answer, fallback) {
  const response = (answer || '').trim();
  if (!response) {
    return fallback;
  }
  const lower = response.toLowerCase();
  if (KNOWN_FRAMEWORKS.includes(lower)) {
    return lower;
  }
  return response;
}

function getTestSyntax(framework) {
  const key = (framework || '').toLowerCase();
  if (key === 'mocha' || key === 'jasmine') {
    return { describe: 'describe', test: 'it' };
  }
  if (key === 'vitest' || key === 'jest') {
    return { describe: 'describe', test: 'test' };
  }
  return { describe: 'describe', test: 'test' };
}

function supportsAdaptiveTestBase(framework) {
  const key = (framework || '').toLowerCase();
  return key === 'jest' || key === 'vitest';
}

async function gatherSetupOptions(context) {
  const interactive = isInteractiveSession();
  const defaultFramework = context.detectedFramework || 'jest';
  const defaultTypeScript = context.detectedLanguage === 'typescript';
  const defaultSourceDir = context.defaultSourceDir;
  const defaultTestDir = detectTestDirectory(defaultFramework);

  let framework = defaultFramework;
  let useTypeScript = defaultTypeScript;
  let sourceDir = defaultSourceDir;
  let testDir = defaultTestDir;
  let generateConfig = !context.configExists;
  let overwriteConfig = !context.configExists;
  let generateExamples = true;
  let sampleName = 'ExampleService';

  if (interactive) {
    const prompter = createPrompter();

    framework = normaliseFramework(
      await prompter.ask('Which test framework are you using (Jest, Mocha, etc.)?', defaultFramework),
      defaultFramework
    );

    useTypeScript = await prompter.askYesNo('Are you using TypeScript?', defaultTypeScript);

    sourceDir = sanitiseDir(
      await prompter.ask('Where are your source files located (e.g., src, lib)?', defaultSourceDir),
      defaultSourceDir
    );

    testDir = sanitiseDir(
      await prompter.ask('Where should adaptive tests be created?', detectTestDirectory(framework)),
      detectTestDirectory(framework)
    );

    sampleName = toClassName(await prompter.ask('Name for the sample target (class/function)?', sampleName));

    if (context.configExists) {
      overwriteConfig = await prompter.askYesNo('Update existing adaptive-tests.config.js with recommended defaults?', false);
      generateConfig = overwriteConfig;
    } else {
      generateConfig = await prompter.askYesNo('Generate adaptive-tests.config.js with recommended defaults?', true);
      overwriteConfig = generateConfig;
    }

    generateExamples = await prompter.askYesNo('Generate an example adaptive test and discovery snippet?', true);

    prompter.close();
  }

  return {
    framework,
    useTypeScript,
    sourceDir,
    testDir,
    generateConfig,
    overwriteConfig,
    generateExamples,
    sampleName,
  };
}

function createConfigContent(options) {
  const extensions = options.useTypeScript
    ? "['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']"
    : "['.js', '.jsx', '.mjs', '.cjs']";

  return `/**
 * Generated by adaptive-tests init.
 * Adjust scoring weights to match your project's architecture.
 */

module.exports = {
  discovery: {
    extensions: ${extensions},
    maxDepth: 10,
    skipDirectories: ['node_modules', 'coverage', 'dist', '${options.testDir}', '__tests__'],
    scoring: {
      paths: {
        positive: {
          '/${options.sourceDir}/': 18
        },
        negative: {
          '/${options.testDir}/': -40,
          '/__tests__/': -45
        }
      }
    }
  }
};
`;
}

function writeConfigFile(options) {
  const configPath = path.join(process.cwd(), CONFIG_FILENAME);
  if (!options.generateConfig) {
    return false;
  }

  if (fs.existsSync(configPath) && !options.overwriteConfig) {
    log(`⚠️  ${CONFIG_FILENAME} already exists. Skipping generation.`, COLORS.yellow);
    return false;
  }

  fs.writeFileSync(configPath, createConfigContent(options));
  log(`🧩 Created ${CONFIG_FILENAME}`, COLORS.green);
  return true;
}

function createBaseTestFile(framework, language, options) {
  const className = toClassName(options.sampleName);
  const frameworkKey = (framework || '').toLowerCase();
  const methodsComment = "// Add the methods your target exposes";

  if (supportsAdaptiveTestBase(frameworkKey)) {
    const keywords = getTestSyntax(framework);
    const importStatement = language === 'typescript'
      ? "import { AdaptiveTest, discover } from 'adaptive-tests';"
      : "const { AdaptiveTest, discover } = require('adaptive-tests');";

    const targetParam = language === 'typescript' ? `Target: any` : 'Target';

    return `${importStatement}

class ${className}AdaptiveTest extends AdaptiveTest {
  getTargetSignature() {
    return {
      name: '${className}',
      type: 'class',
      methods: ['methodName'] // ${methodsComment}
    };
  }

  async runTests(${targetParam}) {
    ${keywords.describe}('${className}', () => {
      ${keywords.test}('should be discoverable', () => {
        const instance = new Target();
        expect(instance).toBeDefined();
      });
    });
  }
}

// Initialize the adaptive test runner
new ${className}AdaptiveTest();
`;
  }

  const importStatement = language === 'typescript'
    ? "import { discover } from 'adaptive-tests';"
    : "const { discover } = require('adaptive-tests');";

  const keywords = getTestSyntax(framework);
  const assertionComment = frameworkKey === 'mocha'
    ? "// Replace with your assertion library (e.g., chai expect)"
    : "// Replace with your preferred assertions";

  if (frameworkKey === 'ava') {
    const avaImport = language === 'typescript'
      ? "import test from 'ava';\nimport { discover } from 'adaptive-tests';"
      : "const test = require('ava');\nconst { discover } = require('adaptive-tests');";

    return `${avaImport}

test('${className} is discoverable', async (t) => {
  const Target = await discover({
    name: '${className}',
    type: 'class',
    methods: ['methodName'] // ${methodsComment}
  });

  t.truthy(Target);
});
`;
  }

  return `${importStatement}

${keywords.describe}('${className}', () => {
  ${keywords.test}('should discover the implementation', async () => {
    const Target = await discover({
      name: '${className}',
      type: 'class',
      methods: ['methodName'] // ${methodsComment}
    });

    ${assertionComment}
    // expect(new Target()).toBeDefined();
  });
});
`;
}

function createDiscoveryExample(language, options) {
  const className = toClassName(options.sampleName);
  const importStatement = language === 'typescript'
    ? "import { discover } from 'adaptive-tests';"
    : "const { discover } = require('adaptive-tests');";

  const asyncWrapperStart = language === 'typescript' ? 'async function main(): Promise<void> {' : 'async function main() {';

  return `${importStatement}

${asyncWrapperStart}
  const Target = await discover({
    name: '${className}',
    type: 'class',
    methods: ['methodName'] // Update with real structure
  });

  console.log('Discovered ${className} from ${options.sourceDir}/', Target);
}

main().catch((error) => {
  console.error('Discovery failed', error);
});
`;
}

async function runInit() {
  header();

  const detectedFramework = detectTestFramework();
  const detectedLanguage = detectLanguage();
  const defaultSourceDir = detectSourceDirectory();
  const configExists = fs.existsSync(path.join(process.cwd(), CONFIG_FILENAME));

  log('📋 Detected Environment:', COLORS.yellow);
  log(`   Test Framework: ${detectedFramework || 'None detected'}`, COLORS.dim);
  log(`   Language: ${detectedLanguage}`, COLORS.dim);
  log(`   Suggested source directory: ${defaultSourceDir}`, COLORS.dim);
  console.log();

  const setupOptions = await gatherSetupOptions({
    detectedFramework,
    detectedLanguage,
    defaultSourceDir,
    configExists,
  });

  const framework = setupOptions.framework || detectedFramework || 'jest';
  const language = setupOptions.useTypeScript ? 'typescript' : 'javascript';
  const sourceDir = setupOptions.sourceDir || defaultSourceDir;
  const testDir = setupOptions.testDir || detectTestDirectory(framework);

  log('🎛️  Setup selections:', COLORS.yellow);
  log(`   Test Framework: ${framework}`, COLORS.dim);
  log(`   TypeScript: ${setupOptions.useTypeScript ? 'Yes' : 'No'}`, COLORS.dim);
  log(`   Source Directory: ${sourceDir}`, COLORS.dim);
  log(`   Adaptive Tests Directory: ${testDir}/adaptive`, COLORS.dim);
  log(`   Sample Target: ${toClassName(setupOptions.sampleName)}`, COLORS.dim);
  console.log();

  // Check if adaptive-tests is already installed
  const packagePath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    const pm = detectPackageManager();

    if (!deps['adaptive-tests']) {
      log(`📦 Installing adaptive-tests using ${pm.name}...`, COLORS.blue);
      try {
        execSync(`${pm.addDev} adaptive-tests`, { stdio: 'inherit' });
        log('✅ Package installed successfully!', COLORS.green);
      } catch (error) {
        log(`❌ Failed to install package. Please run: ${pm.addDev} adaptive-tests`, COLORS.red);
        process.exit(1);
      }
    } else {
      log('✅ adaptive-tests is already installed', COLORS.green);
    }

    if (setupOptions.useTypeScript && !deps['ts-node']) {
      log(`📦 Installing ts-node for TypeScript support using ${pm.name}...`, COLORS.blue);
      try {
        execSync(`${pm.addDev} ts-node`, { stdio: 'inherit' });
      } catch (error) {
        log('⚠️  Could not install ts-node. TypeScript discovery may not work.', COLORS.yellow);
      }
    }
  }

  // Ensure adaptive test directory exists
  const adaptiveDir = path.join(process.cwd(), testDir, 'adaptive');

  if (!fs.existsSync(adaptiveDir)) {
    fs.mkdirSync(adaptiveDir, { recursive: true });
  }

  const ext = language === 'typescript' ? 'ts' : 'js';
  const fileSlug = toFileSlug(setupOptions.sampleName);

  if (setupOptions.generateExamples) {
    const baseTestPath = path.join(adaptiveDir, `${fileSlug || 'example'}-adaptive.test.${ext}`);
    if (!fs.existsSync(baseTestPath)) {
      fs.writeFileSync(baseTestPath, createBaseTestFile(framework, language, setupOptions));
      log(`📝 Created example test: ${path.relative(process.cwd(), baseTestPath)}`, COLORS.green);
    } else {
      log(`ℹ️  Example test already exists: ${path.relative(process.cwd(), baseTestPath)}`, COLORS.dim);
    }

    const discoveryExamplePath = path.join(adaptiveDir, `${fileSlug || 'example'}-discovery.${ext}`);
    if (!fs.existsSync(discoveryExamplePath)) {
      fs.writeFileSync(discoveryExamplePath, createDiscoveryExample(language, setupOptions));
      log(`📝 Created discovery example: ${path.relative(process.cwd(), discoveryExamplePath)}`, COLORS.green);
    } else {
      log(`ℹ️  Discovery example already exists: ${path.relative(process.cwd(), discoveryExamplePath)}`, COLORS.dim);
    }

    if (supportsAdaptiveTestBase(framework)) {
      const baseClassPath = path.join(adaptiveDir, `base.${ext}`);
      if (!fs.existsSync(baseClassPath)) {
        const baseContent = language === 'typescript'
          ? "export { AdaptiveTest, adaptiveTest } from 'adaptive-tests';"
          : "module.exports = require('adaptive-tests');";
        fs.writeFileSync(baseClassPath, baseContent);
      }
    }
  } else {
    log('ℹ️  Skipped example files (per your selection).', COLORS.dim);
  }

  const configCreated = writeConfigFile(setupOptions);

  console.log();
  log('🎉 Setup Complete!', COLORS.bright + COLORS.green);
  console.log();
  log('Next steps:', COLORS.yellow);
  if (setupOptions.generateExamples) {
    log(`  • Review ${path.posix.join(testDir, 'adaptive')} for generated examples.`, COLORS.dim);
  } else {
    log(`  • Add your first adaptive test under ${path.posix.join(testDir, 'adaptive')}.`, COLORS.dim);
  }
  if (configCreated) {
    log(`  • Tweak ${CONFIG_FILENAME} scoring to match your codebase.`, COLORS.dim);
  }
  log('  • Run your existing test command to confirm everything passes.', COLORS.dim);
  console.log();
  log('📚 Documentation: https://github.com/anon57396/adaptive-tests', COLORS.cyan);
  log('⭐ Star us on GitHub if this helps!', COLORS.magenta);
  console.log();
}

function printUsage() {
  console.log(`\nUsage: npx adaptive-tests <command> [options]\n`);
  console.log(`Commands:`);
  console.log(`  init            Interactive setup wizard (default)`);
  console.log(`  migrate [dir]   Convert traditional tests to adaptive tests`);
  console.log(`  why <signature> Inspect candidate scoring for a signature`);
  console.log(`  scaffold <src>  Generate an adaptive test skeleton from source`);
  console.log(`  help            Show this message\n`);
  console.log(`Examples:`);
  console.log(`  npx adaptive-tests`);
  console.log(`  npx adaptive-tests init`);
  console.log(`  npx adaptive-tests migrate tests`);
  console.log(`  npx adaptive-tests why '{"name":"UserService"}'`);
  console.log(`  npx adaptive-tests why '{"name":"UserService"}' --json\n`);
  console.log(`  npx adaptive-tests scaffold src/services/UserService.js`);
}

async function runWhy(args = []) {
  const { runWhy: runDiscoveryLens } = require('./why');
  await runDiscoveryLens(args);
}

async function runScaffold(args = []) {
  const { runScaffold } = require('./scaffold');
  await runScaffold(args);
}

async function runMigrate(args = []) {
  const { runMigrate } = require('./migrate');
  await runMigrate(args);
}

async function main(argv = process.argv) {
  const [, , maybeCommand, ...rest] = argv;
  const handlers = {
    init: () => runInit(),
    migrate: (args) => runMigrate(args),
    why: (args) => runWhy(args),
    scaffold: (args) => runScaffold(args),
    help: () => printUsage(),
    '--help': () => printUsage(),
    '-h': () => printUsage()
  };

  if (!maybeCommand) {
    return runInit();
  }

  if (handlers[maybeCommand]) {
    return handlers[maybeCommand](rest);
  }

  if (maybeCommand.startsWith('-')) {
    // Treat unknown flags as init options for backward compatibility
    return runInit();
  }

  console.error(`Unknown command: ${maybeCommand}`);
  printUsage();
  process.exitCode = 1;
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error running adaptive-tests CLI:', error);
    process.exit(1);
  });
}

module.exports = { runInit, main };
