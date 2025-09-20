#!/usr/bin/env node

/**
 * Refactor Script for TypeScript example - moves the calculator deep into a new folder.
 */

const fs = require('fs');
const path = require('path');

const relativeOldPath = 'languages/typescript/examples/typescript/src/Calculator.ts';
const relativeNewPath = 'languages/typescript/examples/typescript/lib/core/math/services/Calculator.ts';

const oldPath = path.resolve(relativeOldPath);
const newPath = path.resolve(relativeNewPath);

console.log('🔧 Refactoring (TypeScript): Moving Calculator.ts into a nested folder...\n');

if (!fs.existsSync(oldPath)) {
  console.log('⚠️  Calculator.ts not found at expected source location. Run "node restore-ts.js" first.');
  process.exit(0);
}

fs.mkdirSync(path.dirname(newPath), { recursive: true });
fs.copyFileSync(oldPath, newPath);
fs.unlinkSync(oldPath);

console.log(`✅ Moved: ${relativeOldPath}`);
console.log(`     → ${relativeNewPath}`);

console.log('\n📊 Impact Analysis:');
console.log('  - Traditional TypeScript tests: ❌ Import path broken');
console.log('  - Adaptive TypeScript tests:    ✅ Still green\n');

console.log('Try:');
console.log('  npx jest languages/typescript/examples/typescript/tests/traditional  # ❌ Import error');
console.log('  npx jest languages/typescript/examples/typescript/tests/adaptive     # ✅ Still passes\n');
