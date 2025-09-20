#!/usr/bin/env node

/**
 * Replace the TypeScript calculator with a broken implementation.
 */

const fs = require('fs');
const path = require('path');

const workingPath = path.resolve('languages/typescript/examples/typescript/src/Calculator.ts');
const brokenPath = path.resolve('languages/typescript/examples/typescript/src/BrokenCalculator.ts');
const backupPath = `${workingPath}.backup`;

console.log('🐛 Breaking TypeScript Calculator implementation...\n');

if (!fs.existsSync(workingPath)) {
  console.log('⚠️  Missing Calculator.ts. Run "node restore-ts.js" first.');
  process.exit(0);
}

if (!fs.existsSync(brokenPath)) {
  console.log('⚠️  Missing BrokenCalculator.ts.');
  process.exit(1);
}

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(workingPath, backupPath);
}

fs.copyFileSync(brokenPath, workingPath);

console.log('✅ TypeScript calculator replaced with broken implementation');
console.log('\n🔍 Introduced bugs:');
console.log('  - add(): subtraction instead of addition');
console.log('  - multiply(): addition instead of multiplication');
console.log('  - divide(): missing zero guard');
console.log('  - power(): uses multiplication');
console.log('  - sqrt(): no negative guard');
console.log('  - clearHistory(): does nothing\n');

console.log('Expected results:');
console.log('  - Traditional TypeScript tests: ❌ Actual assertion failures');
console.log('  - Adaptive TypeScript tests:    ❌ Same assertion failures (real bugs)\n');
