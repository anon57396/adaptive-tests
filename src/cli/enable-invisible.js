#!/usr/bin/env node

/**
 * Enable Invisible Mode CLI
 *
 * One-liner to enable invisible mode for vibe coders
 * Auto-detects test framework and patches config
 * Provides undo functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ADAPTIVE_DIR = path.join(process.cwd(), '.adaptive-tests');
const MARKER_FILE = path.join(ADAPTIVE_DIR, 'invisible-enabled.json');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function ensureAdaptiveDir() {
  if (!fs.existsSync(ADAPTIVE_DIR)) {
    fs.mkdirSync(ADAPTIVE_DIR, { recursive: true });
  }
}

/**
 * Auto-enable invisible mode with framework detection
 */
async function enableInvisibleMode(options = {}) {
  const { dryRun = false, undo = false, force = false } = options;

  log('🎭 Adaptive Tests: Enabling invisible mode...', 'cyan');

  if (undo) {
    return await disableInvisibleMode({ dryRun });
  }

  // Detect project structure
  const detection = await detectTestFramework();

  if (!detection.framework && !force) {
    log('❌ No test framework detected. Use --force to enable anyway.', 'red');
    log('💡 Supported: Jest, Vitest, Mocha, Jasmine', 'yellow');
    return { success: false, reason: 'no_framework' };
  }

  log(`🔍 Detected: ${detection.framework || 'Unknown'} (${detection.confidence})`, 'blue');

  // Choose installation strategy
  const strategy = chooseInstallationStrategy(detection);
  log(`📋 Strategy: ${strategy.name}`, 'blue');

  if (dryRun) {
    log('🧪 DRY RUN: Would apply these changes:', 'yellow');
    strategy.changes.forEach(change => {
      log(`  ${change.action}: ${change.file}`, 'yellow');
    });
    return { success: true, dryRun: true, strategy };
  }

  // Apply changes
  const results = [];
  for (const change of strategy.changes) {
    try {
      const result = await applyChange(change, detection);
      results.push({ ...change, ...result });
      log(`✅ ${change.action}: ${change.file}`, 'green');
    } catch (error) {
      log(`❌ Failed ${change.action}: ${error.message}`, 'red');
      results.push({ ...change, error: error.message });
    }
  }

  // Create undo script
  await createUndoScript(results);
  await writeMarker({ detection, strategy: strategy.name, results });

  log('🎉 Invisible mode enabled!', 'green');
  log('🔄 To disable: npx adaptive-tests enable-invisible --undo', 'blue');
  log('📖 Test it: Break an import and run your tests', 'cyan');

  return { success: true, results, strategy: strategy.name };
}

/**
 * Detect test framework and configuration
 */
async function detectTestFramework() {
  const cwd = process.cwd();
  const packagePath = path.join(cwd, 'package.json');

  if (!fs.existsSync(packagePath)) {
    return { framework: null, confidence: 'none' };
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  // Framework detection
  if (deps.jest || fs.existsSync(path.join(cwd, 'jest.config.js')) || fs.existsSync(path.join(cwd, 'jest.config.json'))) {
    return {
      framework: 'Jest',
      confidence: 'high',
      configFiles: findConfigFiles(['jest.config.js', 'jest.config.json', 'jest.config.ts']),
      packageConfig: packageJson.jest,
      setupFiles: findSetupFiles(['setupTests.js', 'src/setupTests.js', 'test/setup.js'])
    };
  }

  if (deps.vitest || fs.existsSync(path.join(cwd, 'vitest.config.js'))) {
    return {
      framework: 'Vitest',
      confidence: 'high',
      configFiles: findConfigFiles(['vitest.config.js', 'vitest.config.ts', 'vite.config.js']),
      setupFiles: findSetupFiles(['vitest.setup.js', 'src/test-setup.js'])
    };
  }

  if (deps.mocha || fs.existsSync(path.join(cwd, '.mocharc.json'))) {
    return {
      framework: 'Mocha',
      confidence: 'medium',
      configFiles: findConfigFiles(['.mocharc.json', '.mocharc.js', 'mocha.opts']),
      setupFiles: findSetupFiles(['test/mocha.env.js', 'test/setup.js'])
    };
  }

  if (deps.jasmine) {
    return {
      framework: 'Jasmine',
      confidence: 'medium',
      setupFiles: findSetupFiles(['spec/support/jasmine.json', 'test/setup.js'])
    };
  }

  // Generic detection
  const testDirs = ['test', 'tests', '__tests__', 'spec'].filter(dir =>
    fs.existsSync(path.join(cwd, dir))
  );

  if (testDirs.length > 0) {
    return {
      framework: 'Generic',
      confidence: 'low',
      testDirs,
      setupFiles: findSetupFiles(['test/setup.js', 'tests/setup.js', 'spec/setup.js'])
    };
  }

  return { framework: null, confidence: 'none' };
}

/**
 * Find existing config files
 */
function findConfigFiles(candidates) {
  return candidates.filter(file => fs.existsSync(path.join(process.cwd(), file)));
}

/**
 * Find existing setup files
 */
function findSetupFiles(candidates) {
  return candidates.filter(file => fs.existsSync(path.join(process.cwd(), file)));
}

/**
 * Choose best installation strategy based on detection
 */
function chooseInstallationStrategy(detection) {
  const { framework, configFiles, setupFiles, packageConfig } = detection;

  if (framework === 'Jest') {
    // Strategy 1: Patch existing jest.config.js
    if (configFiles.includes('jest.config.js')) {
      return {
        name: 'patch-jest-config',
        changes: [
          {
            action: 'patch',
            file: 'jest.config.js',
            type: 'config-patch',
            backup: true
          }
        ]
      };
    }

    // Strategy 2: Patch setupTests.js
    if (setupFiles.length > 0) {
      return {
        name: 'patch-setup-file',
        changes: [
          {
            action: 'patch',
            file: setupFiles[0],
            type: 'setup-patch',
            backup: true
          }
        ]
      };
    }

    // Strategy 3: Create setupTests.js and patch package.json
    return {
      name: 'create-setup-file',
      changes: [
        {
          action: 'create',
          file: 'src/setupTests.js',
          type: 'setup-file'
        },
        {
          action: 'patch',
          file: 'package.json',
          type: 'package-patch',
          backup: true
        }
      ]
    };
  }

  if (framework === 'Vitest') {
    return {
      name: 'patch-vitest-config',
      changes: [
        {
          action: 'patch',
          file: configFiles[0] || 'vitest.config.js',
          type: 'vitest-patch',
          backup: true
        }
      ]
    };
  }

  // Generic fallback
  return {
    name: 'generic-setup',
    changes: [
      {
        action: 'create',
        file: 'test/adaptive-setup.js',
        type: 'generic-setup'
      }
    ]
  };
}

/**
 * Apply a single change
 */
async function applyChange(change, detection) {
  const filePath = path.join(process.cwd(), change.file);

  if (change.backup && fs.existsSync(filePath)) {
    const backupPath = `${filePath}.adaptive-backup`;
    fs.copyFileSync(filePath, backupPath);
    change.backupPath = backupPath;
  }

  switch (change.type) {
    case 'config-patch':
      return await patchJestConfig(filePath);

    case 'setup-patch':
      return await patchSetupFile(filePath);

    case 'setup-file':
      return await createSetupFile(filePath);

    case 'package-patch':
      return await patchPackageJson(filePath);

    case 'vitest-patch':
      return await patchVitestConfig(filePath);

    case 'generic-setup':
      return await createGenericSetup(filePath);

    default:
      throw new Error(`Unknown change type: ${change.type}`);
  }
}

/**
 * Patch Jest configuration
 */
async function patchJestConfig(configPath) {
  const content = fs.readFileSync(configPath, 'utf8');

  // Check if already patched
  if (content.includes('adaptive-tests/jest/invisible-setup')) {
    return { action: 'patch-jest-config', status: 'already-enabled' };
  }

  // Simple regex patch for common patterns
  let patchedContent = content;

  // Pattern 1: setupFilesAfterEnv array
  if (content.includes('setupFilesAfterEnv')) {
    patchedContent = content.replace(
      /setupFilesAfterEnv:\s*\[(.*?)\]/s,
      (match, existing) => {
        const files = existing.trim() ? `${existing.trim()}, ` : '';
        return `setupFilesAfterEnv: [${files}'adaptive-tests/jest/invisible-setup']`;
      }
    );
  } else {
    // Add setupFilesAfterEnv
    patchedContent = content.replace(
      /module\.exports\s*=\s*{/,
      `module.exports = {
  setupFilesAfterEnv: ['adaptive-tests/jest/invisible-setup'],`
    );
  }

  // Add globals config
  if (!content.includes('adaptiveTests')) {
    patchedContent = patchedContent.replace(
      /module\.exports\s*=\s*{([^}]*?)}/s,
      (match, existing) => {
        return `module.exports = {${existing.trim()},
  globals: {
    adaptiveTests: { invisible: true }
  }
}`;
      }
    );
  }

  fs.writeFileSync(configPath, patchedContent);
  return { action: 'patch-jest-config', status: 'patched' };
}

/**
 * Patch existing setup file
 */
async function patchSetupFile(setupPath) {
  const content = fs.readFileSync(setupPath, 'utf8');

  if (content.includes('adaptive-tests')) {
    return { action: 'patch-setup-file', status: 'already-enabled' };
  }

  const patch = `// Adaptive Tests: Invisible mode for refactoring resilience
const { setupForJest } = require('adaptive-tests/jest/invisible-setup');
setupForJest({ invisible: true });

`;

  fs.writeFileSync(setupPath, patch + content);
  return { action: 'patch-setup-file', status: 'patched' };
}

/**
 * Create new setup file
 */
async function createSetupFile(setupPath) {
  const dir = path.dirname(setupPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = `// Adaptive Tests: Invisible mode setup
// This enables automatic fallback to adaptive discovery when imports fail

const { setupForJest } = require('adaptive-tests/jest/invisible-setup');

setupForJest({
  invisible: true,
  escapePatterns: ['node_modules', '.mock', '__mocks__'],
  debug: false
});

console.log('⚡ Adaptive Tests: Invisible mode enabled');
`;

  fs.writeFileSync(setupPath, content);
  return { action: 'create-setup-file', status: 'created' };
}

/**
 * Patch package.json for Jest setup
 */
async function patchPackageJson(packagePath) {
  const content = fs.readFileSync(packagePath, 'utf8');
  const packageJson = JSON.parse(content);

  if (!packageJson.jest) {
    packageJson.jest = {};
  }

  if (!packageJson.jest.setupFilesAfterEnv) {
    packageJson.jest.setupFilesAfterEnv = [];
  }

  if (!packageJson.jest.setupFilesAfterEnv.includes('src/setupTests.js')) {
    packageJson.jest.setupFilesAfterEnv.push('src/setupTests.js');
  }

  if (!packageJson.jest.globals) {
    packageJson.jest.globals = {};
  }

  packageJson.jest.globals.adaptiveTests = { invisible: true };

  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  return { action: 'patch-package-json', status: 'patched' };
}

/**
 * Patch Vitest configuration
 */
async function patchVitestConfig(configPath) {
  const content = fs.readFileSync(configPath, 'utf8');

  if (content.includes('adaptive-tests')) {
    return { action: 'patch-vitest-config', status: 'already-enabled' };
  }

  // Simple Vitest patch
  const patch = `
// Adaptive Tests setup
import { setupForJest } from 'adaptive-tests/jest/invisible-setup';
setupForJest({ invisible: true });
`;

  fs.writeFileSync(configPath, patch + content);
  return { action: 'patch-vitest-config', status: 'patched' };
}

/**
 * Create generic setup file
 */
async function createGenericSetup(setupPath) {
  const dir = path.dirname(setupPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = `// Adaptive Tests: Generic setup for invisible mode
// Include this file in your test runner setup

const { enableInvisibleMode, patchRequireWithIsolation } = require('adaptive-tests/invisible');

enableInvisibleMode({
  escapePatterns: ['node_modules', '.mock', '__mocks__'],
  debug: false
});

patchRequireWithIsolation();

console.log('⚡ Adaptive Tests: Invisible mode enabled (generic)');

// Cleanup on exit
process.on('exit', () => {
  const { restoreOriginalRequire } = require('adaptive-tests/invisible');
  restoreOriginalRequire();
});
`;

  fs.writeFileSync(setupPath, content);
  return { action: 'create-generic-setup', status: 'created' };
}

/**
 * Create undo script
 */
async function createUndoScript(results) {
  const backupFiles = results.filter(r => r.backupPath);

  const script = `#!/usr/bin/env node

/**
 * Undo script for adaptive-tests invisible mode
 * Generated on: ${new Date().toISOString()}
 */

const fs = require('fs');

console.log('🔄 Disabling adaptive-tests invisible mode...');

const backups = ${JSON.stringify(backupFiles, null, 2)};

let restored = 0;
for (const backup of backups) {
  if (backup.backupPath && fs.existsSync(backup.backupPath)) {
    fs.copyFileSync(backup.backupPath, '${process.cwd()}/' + backup.file);
    fs.unlinkSync(backup.backupPath);
    console.log(\`✅ Restored: \${backup.file}\`);
    restored++;
  }
}

console.log(\`🎉 Invisible mode disabled: \${restored} files restored\`);
`;

  const undoPath = path.join(process.cwd(), '.adaptive-undo.js');
  fs.writeFileSync(undoPath, script);
  fs.chmodSync(undoPath, '755');
}

async function writeMarker({ detection, strategy, results }) {
  try {
    ensureAdaptiveDir();
    const marker = {
      enabledAt: new Date().toISOString(),
      strategy,
      framework: detection.framework || null,
      confidence: detection.confidence || 'unknown',
      configFiles: detection.configFiles || [],
      setupFiles: detection.setupFiles || [],
      testDirs: detection.testDirs || [],
      results: results.map(result => ({
        action: result.action,
        status: result.status || 'unknown',
        file: result.file || null
      }))
    };

    fs.writeFileSync(MARKER_FILE, JSON.stringify(marker, null, 2));
  } catch (error) {
    log('[warn] Could not update invisible mode marker: ' + error.message, 'yellow');
  }
}

function removeMarker() {
  try {
    if (fs.existsSync(MARKER_FILE)) {
      fs.unlinkSync(MARKER_FILE);
    }
  } catch (error) {
    log('[warn] Could not remove invisible mode marker: ' + error.message, 'yellow');
  }
}

/**
 * Disable invisible mode
 */
async function disableInvisibleMode(options = {}) {
  const { dryRun = false } = options;

  log('🔄 Disabling invisible mode...', 'yellow');

  const undoPath = path.join(process.cwd(), '.adaptive-undo.js');

  if (!fs.existsSync(undoPath)) {
    log('❌ No undo script found. Manual cleanup required.', 'red');
    return { success: false, reason: 'no_undo_script' };
  }

  if (dryRun) {
    log('🧪 DRY RUN: Would run undo script', 'yellow');
    return { success: true, dryRun: true };
  }

  try {
    execSync(`node ${undoPath}`, { stdio: 'inherit' });
    fs.unlinkSync(undoPath);
    removeMarker();
    log('✅ Invisible mode disabled', 'green');
    return { success: true };
  } catch (error) {
    log(`❌ Undo failed: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

module.exports = {
  enableInvisibleMode,
  disableInvisibleMode,
  detectTestFramework
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  const options = {
    dryRun: args.includes('--dry-run'),
    undo: args.includes('--undo') || args.includes('--disable'),
    force: args.includes('--force')
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npx adaptive-tests enable-invisible [options]

Options:
  --dry-run     Show what would be changed without applying
  --undo        Disable invisible mode and restore backups
  --force       Enable even if no test framework detected
  --help        Show this message

Examples:
  npx adaptive-tests enable-invisible
  npx adaptive-tests enable-invisible --dry-run
  npx adaptive-tests enable-invisible --undo
`);
    process.exit(0);
  }

  enableInvisibleMode(options)
    .then(result => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch(error => {
      log(`❌ Failed: ${error.message}`, 'red');
      process.exit(1);
    });
}
