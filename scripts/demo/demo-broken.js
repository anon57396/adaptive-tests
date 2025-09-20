#!/usr/bin/env node

/**
 * Demo Script - Shows that adaptive tests catch real bugs
 * Not just "can't find module" errors
 */

const fs = require('fs');
const path = require('path');

console.log('🐛 Breaking Calculator Implementation (not moving it)...\n');

const goodPath = 'languages/javascript/examples/calculator/src/Calculator.js';
const brokenPath = 'languages/javascript/examples/calculator/src/BrokenCalculator.js';

// Backup good calculator
if (fs.existsSync(goodPath)) {
  const goodContent = fs.readFileSync(goodPath, 'utf8');
  fs.writeFileSync(goodPath + '.backup', goodContent);

  // Replace with broken version
  const brokenContent = fs.readFileSync(brokenPath, 'utf8');
  fs.writeFileSync(goodPath, brokenContent);

  console.log('✅ Replaced Calculator.js with broken implementation');
  console.log('\n🔍 What we broke:');
  console.log('  - add() returns a - b instead of a + b');
  console.log('  - multiply() returns a + b instead of a * b');
  console.log('  - divide() missing zero check');
  console.log('  - power() uses multiplication instead of Math.pow');
  console.log('  - sqrt() missing negative check');
  console.log('  - clearHistory() doesn\'t actually clear\n');

  console.log('📊 Expected Results:');
  console.log('  - Traditional tests: ❌ Fail with actual test failures');
  console.log('  - Adaptive tests:    ❌ Also fail with same test failures!\n');
  console.log('                       (Not "module not found" errors)\n');

  console.log('This proves adaptive tests are doing real validation,');
  console.log('not just passing because they found something.\n');
} else {
  console.log('⚠️  Calculator.js not found. Run "npm run restore" first.\n');
}