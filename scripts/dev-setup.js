#!/usr/bin/env node

/**
 * Developer setup script for Adaptive Tests
 * Ensures all dependencies and tools are properly configured
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function header(title) {
  console.log();
  log('═'.repeat(50), 'blue');
  log(title, 'bold');
  log('═'.repeat(50), 'blue');
  console.log();
}

const ALLOWED_COMMANDS = new Set([
  'npm',
  'npx',
  'git',
  'node',
  'python',
  'python3',
  'py',
  'php',
  'ruby',
  'go',
  'rustc',
  'java',
  'mvn'
]);

function runCommand(command, args = [], description, options = {}) {
  if (!ALLOWED_COMMANDS.has(command)) {
    throw new Error(`Command ${command} is not permitted by dev-setup allowlist.`);
  }

  log(`▶ ${description}...`, 'yellow');
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, ...options });

  if (result.error) {
    log(`✗ ${description} failed (${result.error.message})`, 'red');
    return false;
  }

  if (result.status !== 0) {
    log(`✗ ${description} failed (exit code ${result.status})`, 'red');
    return false;
  }

  log(`✓ ${description} complete`, 'green');
  return true;
}

function commandExists(command, args = []) {
  if (!ALLOWED_COMMANDS.has(command)) {
    throw new Error(`Command ${command} is not permitted by dev-setup allowlist.`);
  }

  const result = spawnSync(command, args, { stdio: 'ignore', shell: false });
  return !result.error && result.status === 0;
}

function checkCommand(command, args, name) {
  if (commandExists(command, args)) {
    log(`✓ ${name} installed`, 'green');
    return true;
  }

  log(`✗ ${name} not installed`, 'yellow');
  return false;
}

async function main() {
  header('🚀 Adaptive Tests Developer Setup');

  // Check Node version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 16) {
    log(`Node.js ${nodeVersion} is too old. Please upgrade to v16 or later.`, 'red');
    process.exit(1);
  }
  log(`✓ Node.js ${nodeVersion}`, 'green');

  // Check required tools
  header('🔍 Checking Development Tools');

  const tools = [
    { command: 'git', args: ['--version'], name: 'Git' },
    { command: 'npm', args: ['--version'], name: 'npm' },
    { command: 'node', args: ['--version'], name: 'Node.js' }
  ];

  const optionalToolGroups = [
    {
      name: 'Python',
      variants: [
        { command: 'python3', args: ['--version'], label: 'Python 3' },
        { command: 'py', args: ['--version'], label: 'Python (Windows launcher)' },
        { command: 'python', args: ['--version'], label: 'Python' }
      ]
    },
    { name: 'PHP', variants: [{ command: 'php', args: ['--version'], label: 'PHP' }] },
    { name: 'Ruby', variants: [{ command: 'ruby', args: ['--version'], label: 'Ruby' }] },
    { name: 'Go', variants: [{ command: 'go', args: ['version'], label: 'Go' }] },
    { name: 'Rust', variants: [{ command: 'rustc', args: ['--version'], label: 'rustc' }] },
    { name: 'Java', variants: [{ command: 'java', args: ['-version'], label: 'Java' }] },
    { name: 'Maven', variants: [{ command: 'mvn', args: ['-version'], label: 'Maven' }] }
  ];

  let allRequired = true;
  for (const tool of tools) {
    if (!checkCommand(tool.command, tool.args, tool.name)) {
      allRequired = false;
    }
  }

  if (!allRequired) {
    log('\nPlease install missing required tools and run again.', 'red');
    process.exit(1);
  }

  log('\nOptional language support:', 'bold');
  for (const group of optionalToolGroups) {
    let available = false;
    for (const variant of group.variants) {
      if (commandExists(variant.command, variant.args)) {
        log(`✓ ${group.name} available via ${variant.label}`, 'green');
        available = true;
        break;
      }
    }
    if (!available) {
      log(`⚠️  ${group.name} tooling not detected (optional)`, 'yellow');
    }
  }

  // Install dependencies
  header('📦 Installing Dependencies');

  if (!runCommand('npm', ['install'], 'Installing npm packages')) {
    log('Failed to install dependencies. Please check npm errors above.', 'red');
    process.exit(1);
  }

  // Build packages
  header('🔨 Building Packages');

  runCommand('npm', ['run', 'build:types'], 'Building TypeScript types');
  runCommand('npm', ['run', 'build:plugins'], 'Building plugins');

  // Run tests
  header('🧪 Running Tests');

  if (!runCommand('npm', ['test'], 'Running test suite')) {
    log('Some tests failed. This is OK for development, but fix before submitting PRs.', 'yellow');
  }

  // Run validation
  header('✅ Running Validation');

  if (!runCommand('npm', ['run', 'validate'], 'Running validation suite')) {
    log('Validation had some issues. Check the output above.', 'yellow');
  }

  // Setup git hooks (optional)
  header('🪝 Git Hooks Setup');

  const setupHooks = await new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('Would you like to set up git hooks for automatic testing? (y/n) ', (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });

  if (setupHooks) {
    const hookContent = `#!/bin/sh
# Adaptive Tests pre-commit hook
npm run lint
npm test -- --onlyChanged
`;

    const hookPath = path.join('.git', 'hooks', 'pre-commit');
    fs.writeFileSync(hookPath, hookContent);
    fs.chmodSync(hookPath, '755');
    log('✓ Git hooks installed', 'green');
  }

  // Final instructions
  header('🎉 Setup Complete!');

  log('Your development environment is ready!', 'green');
  console.log();
  log('Useful commands:', 'bold');
  console.log('  npm test           - Run tests');
  console.log('  npm run validate   - Run validation suite');
  console.log('  npm run lint       - Check code style');
  console.log('  npm run dev        - Start development mode');
  console.log();
  log('Next steps:', 'bold');
  console.log('  1. Check out .github/DEVELOPMENT.md for development guide');
  console.log('  2. Explore languages/javascript/examples/ directory');
  console.log('  3. Join discussions at https://github.com/anon57396/adaptive-tests/discussions');
  console.log();
  log('Happy coding! 🚀', 'blue');
}

main().catch(error => {
  log(`Setup failed: ${error.message}`, 'red');
  process.exit(1);
});
