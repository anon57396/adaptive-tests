#!/usr/bin/env node

/**
 * Developer setup script for Adaptive Tests
 * Ensures all dependencies and tools are properly configured
 */

const { execSync } = require('child_process');
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

function run(command, description) {
  try {
    log(`▶ ${description}...`, 'yellow');
    execSync(command, { stdio: 'inherit' });
    log(`✓ ${description} complete`, 'green');
    return true;
  } catch (error) {
    log(`✗ ${description} failed`, 'red');
    return false;
  }
}

function checkCommand(command, name) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    log(`✓ ${name} installed`, 'green');
    return true;
  } catch {
    log(`✗ ${name} not installed`, 'yellow');
    return false;
  }
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

  const tools = {
    git: 'Git',
    npm: 'npm',
    node: 'Node.js'
  };

  const optionalTools = {
    python3: 'Python 3',
    php: 'PHP',
    ruby: 'Ruby',
    go: 'Go',
    rustc: 'Rust',
    java: 'Java',
    mvn: 'Maven'
  };

  let allRequired = true;
  for (const [cmd, name] of Object.entries(tools)) {
    if (!checkCommand(cmd, name)) {
      allRequired = false;
    }
  }

  if (!allRequired) {
    log('\nPlease install missing required tools and run again.', 'red');
    process.exit(1);
  }

  log('\nOptional language support:', 'bold');
  for (const [cmd, name] of Object.entries(optionalTools)) {
    checkCommand(cmd, name);
  }

  // Install dependencies
  header('📦 Installing Dependencies');

  if (!run('npm install', 'Installing npm packages')) {
    log('Failed to install dependencies. Please check npm errors above.', 'red');
    process.exit(1);
  }

  // Build packages
  header('🔨 Building Packages');

  run('npm run build:types', 'Building TypeScript types');
  run('npm run build:plugins', 'Building plugins');

  // Run tests
  header('🧪 Running Tests');

  if (!run('npm test', 'Running test suite')) {
    log('Some tests failed. This is OK for development, but fix before submitting PRs.', 'yellow');
  }

  // Run validation
  header('✅ Running Validation');

  if (!run('npm run validate', 'Running validation suite')) {
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
  console.log('  2. Explore examples/ directory');
  console.log('  3. Join discussions at https://github.com/anon57396/adaptive-tests/discussions');
  console.log();
  log('Happy coding! 🚀', 'blue');
}

main().catch(error => {
  log(`Setup failed: ${error.message}`, 'red');
  process.exit(1);
});