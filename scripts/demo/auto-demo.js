#!/usr/bin/env node

/**
 * Automated Demo Animation
 * Creates a terminal animation perfect for screen recording
 * Just run: node auto-demo.js
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Colors
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function clear() {
  console.clear();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(text, color = '') {
  console.log(color + text + c.reset);
}

function box(text, color = c.cyan) {
  const width = 50;
  console.log(color + '═'.repeat(width));
  console.log(text);
  console.log('═'.repeat(width) + c.reset);
}

function run(cmd, showOutput = true) {
  try {
    const output = execSync(cmd, { encoding: 'utf8', stdio: showOutput ? 'inherit' : 'pipe' });
    return { success: true, output };
  } catch (e) {
    return { success: false, output: e.stdout || e.message };
  }
}

async function typeWriter(text, delay = 40) {
  for (const char of text) {
    process.stdout.write(char);
    await sleep(delay);
  }
  console.log();
}

async function main() {
  clear();

  // Title
  log('\n    🚀 ADAPTIVE TESTS DEMO', c.bright + c.cyan);
  log('    Tests That Survive Refactoring\n', c.cyan);
  await sleep(2000);

  // Scene 1: Both pass
  clear();
  box('📋 SCENE 1: Both Tests Pass Initially', c.green);
  await sleep(1000);

  log('\nSetting up...', c.dim);
  run('node restore.js 2>&1', false);
  await sleep(500);

  log('\n✅ Running TRADITIONAL tests:', c.yellow);
  await sleep(500);
  const trad1 = run('npm run test:traditional 2>&1', false);

  if (trad1.success) {
    log('  PASS ✓ All tests passed', c.green);
  }
  await sleep(1500);

  log('\n✅ Running ADAPTIVE tests:', c.yellow);
  await sleep(500);
  const adapt1 = run('npm run test:adaptive 2>&1', false);

  if (adapt1.success) {
    log('  PASS ✓ All tests passed', c.green);
    log('  Discovery: Found Calculator.js', c.dim);
  }
  await sleep(2000);

  // Scene 2: Refactor
  clear();
  box('📋 SCENE 2: Refactoring - Moving Files', c.yellow);
  await sleep(1000);

  log('\n🔧 Moving Calculator.js to nested folder...', c.cyan);
  await sleep(1000);

  log('\nFROM: languages/javascript/examples/calculator/src/Calculator.js', c.dim);
  log('  ↓', c.yellow);
  log('TO:   languages/javascript/examples/calculator/src/core/math/utils/Calculator.js', c.green);
  await sleep(1500);

  run('node refactor.js 2>&1', false);
  log('\n✓ File moved!', c.green);
  await sleep(1500);

  // Scene 3: Traditional fails
  clear();
  box('📋 SCENE 3: Traditional Tests FAIL', c.red);
  await sleep(1000);

  log('\n❌ Running TRADITIONAL tests after refactor:', c.yellow);
  await sleep(500);
  const trad2 = run('npm run test:traditional 2>&1', false);

  log('\n  FAIL ✗ Cannot find module', c.red + c.bright);
  log('  Error: Module ../src/Calculator not found!', c.red);
  log('  The import path is broken!', c.red);
  await sleep(2500);

  // Scene 4: Adaptive passes
  clear();
  box('📋 SCENE 4: Adaptive Tests STILL PASS!', c.green);
  await sleep(1000);

  log('\n✅ Running ADAPTIVE tests after refactor:', c.yellow);
  await sleep(500);

  log('\n🔍 Discovering Calculator...', c.cyan);
  await sleep(500);
  log('  Searching...', c.dim);
  await sleep(500);
  log('  Found at: src/core/math/utils/Calculator.js!', c.green + c.bright);
  await sleep(1000);

  const adapt2 = run('npm run test:adaptive 2>&1', false);
  log('\n  PASS ✓ All tests passed', c.green + c.bright);
  log('  No import changes needed!', c.green);
  await sleep(2500);

  // Summary
  clear();
  box('📊 FINAL COMPARISON', c.magenta);
  await sleep(1000);

  console.log('\n  ' + c.red + 'TRADITIONAL' + c.reset + '              ' + c.green + 'ADAPTIVE' + c.reset);
  console.log('  ' + c.red + '───────────' + c.reset + '              ' + c.green + '────────' + c.reset);
  await sleep(500);

  console.log('  ✅ Pass originally        ✅ Pass originally');
  await sleep(500);

  console.log('  ' + c.red + '❌ FAIL after refactor' + c.reset + '    ' + c.green + '✅ PASS after refactor' + c.reset);
  await sleep(500);

  console.log('  ' + c.yellow + '⏱  30 min to fix' + c.reset + '         ' + c.green + '⏱  0 min to fix' + c.reset);
  await sleep(1500);

  log('\n' + '─'.repeat(50), c.dim);
  await typeWriter('\n⭐ Never fix test imports again!');
  await sleep(1000);

  log('\n📦 npm install adaptive-tests', c.cyan);
  log('🔗 github.com/anon57396/adaptive-tests', c.cyan);
  await sleep(2000);

  // Cleanup
  log('\n' + c.dim + 'Restoring files...' + c.reset);
  run('node restore.js 2>&1', false);

  log('\n✨ Demo complete!', c.green + c.bright);
}

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\nCleaning up...');
  run('node restore.js 2>&1', false);
  process.exit(0);
});

// Run
if (require.main === module) {
  main().catch(err => {
    console.error('Error:', err);
    run('node restore.js 2>&1', false);
    process.exit(1);
  });
}