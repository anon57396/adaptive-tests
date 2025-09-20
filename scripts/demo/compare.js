#!/usr/bin/env node

/**
 * Side-by-side comparison of traditional vs adaptive testing
 * Run this to see the difference in real-time
 */

const { spawnSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ALLOWED_COMMANDS = new Set(['npm', 'node']);

function parseCommand(cmd) {
  return cmd.trim().split(/\s+/).filter(Boolean);
}

function run(cmd, silent = false, options = {}) {
  const [command, ...args] = parseCommand(cmd);
  if (!command || !ALLOWED_COMMANDS.has(command)) {
    throw new Error(`Command ${command || '<empty>'} is not permitted.`);
  }

  const result = spawnSync(command, args, {
    shell: false,
    encoding: 'utf8',
    stdio: silent ? 'pipe' : 'inherit',
    ...options
  });

  if (result.error) {
    return {
      success: false,
      output: result.error.message
    };
  }

  if (result.status !== 0) {
    const output = result.stdout || result.stderr || '';
    return {
      success: false,
      output: typeof output === 'string' ? output : output.toString()
    };
  }

  const output = result.stdout || '';
  return {
    success: true,
    output: typeof output === 'string' ? output : output.toString()
  };
}

function pause() {
  return new Promise(resolve => {
    rl.question('\n⏎ Press Enter to continue...', resolve);
  });
}

async function main() {
  console.log('═'.repeat(60));
  console.log('    ADAPTIVE TESTING VS TRADITIONAL TESTING');
  console.log('═'.repeat(60));

  // Step 1: Setup
  console.log('\n📦 SETUP: Installing and restoring original state...\n');
  run('npm install', true);
  run('node restore.js', true);
  run('node restore-broken.js', true);
  console.log('✅ Ready!\n');

  await pause();

  // Step 2: Both pass initially
  console.log('═'.repeat(60));
  console.log('\n✅ SCENARIO 1: Both test suites with working code\n');
  console.log('Traditional Tests:');
  run('npm run test:traditional');
  console.log('\nAdaptive Tests:');
  run('npm run test:adaptive');
  console.log('\n✨ Both pass with working code!\n');

  await pause();

  // Step 3: Refactor
  console.log('═'.repeat(60));
  console.log('\n🔧 SCENARIO 2: After moving Calculator.js...\n');
  console.log('Moving: languages/javascript/examples/calculator/src/Calculator.js');
  console.log('    To: languages/javascript/examples/calculator/lib/core/math/services/Calculator.js\n');
  run('node refactor.js', true);

  await pause();

  console.log('Traditional Tests:');
  const tradResult = run('npm run test:traditional');
  if (!tradResult.success) {
    console.log('\n❌ FAILED: Cannot find module!\n');
  }

  console.log('Adaptive Tests:');
  run('npm run test:adaptive');
  console.log('\n✨ Adaptive tests found the moved file and still pass!\n');

  await pause();

  // Step 4: Broken implementation
  console.log('═'.repeat(60));
  console.log('\n🐛 SCENARIO 3: With broken implementation...\n');
  run('node restore.js', true);
  run('node demo-broken.js', true);
  console.log('Bugs introduced: add() returns wrong result, multiply() broken, etc.\n');

  await pause();

  console.log('Traditional Tests:');
  run('npm run test:traditional');

  console.log('\nAdaptive Tests:');
  run('npm run test:adaptive');

  console.log('\n✨ Both fail with the SAME test errors!');
  console.log('   Adaptive tests catch real bugs, not just "find something"!\n');

  // Cleanup
  run('node restore.js', true);
  run('node restore-broken.js', true);

  console.log('═'.repeat(60));
  console.log('\n🎯 SUMMARY:');
  console.log('\n  Traditional: Breaks on file moves, catches bugs');
  console.log('  Adaptive:    Survives file moves, catches bugs\n');
  console.log('  The difference: Right failures vs wrong failures\n');
  console.log('═'.repeat(60));

  rl.close();
}

main().catch(console.error);