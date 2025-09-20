#!/usr/bin/env node

/**
 * Restore script for TypeScript example - moves Calculator.ts back to src.
 */

const fs = require('fs');
const path = require('path');

const relativeOldPath = 'languages/typescript/examples/typescript/lib/core/math/services/Calculator.ts';
const relativeNewPath = 'languages/typescript/examples/typescript/src/Calculator.ts';

const oldPath = path.resolve(relativeOldPath);
const newPath = path.resolve(relativeNewPath);

console.log('🔄 Restoring (TypeScript): Moving Calculator.ts back to src...\n');

if (!fs.existsSync(oldPath)) {
  if (fs.existsSync(newPath)) {
    console.log('✅ Already restored');
  } else {
    console.log('⚠️  Calculator.ts not found in either location.');
  }
  process.exit(0);
}

fs.mkdirSync(path.dirname(newPath), { recursive: true });
fs.copyFileSync(oldPath, newPath);
fs.unlinkSync(oldPath);

const segments = ['lib/core/math/services', 'lib/core/math', 'lib/core', 'lib'];
segments.forEach(segment => {
  const dirPath = path.resolve('languages/typescript/examples/typescript', segment);
  try {
    fs.rmdirSync(dirPath);
  } catch (error) {
    // directory not empty or missing - ignore
  }
});

console.log('✅ TypeScript calculator restored to languages/typescript/examples/typescript/src/Calculator.ts\n');
