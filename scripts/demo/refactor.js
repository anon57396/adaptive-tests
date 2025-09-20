#!/usr/bin/env node

/**
 * Refactor Script - Completely reorganizes the codebase
 * Traditional tests will break. Adaptive tests will survive.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Refactoring: Moving Calculator.js to a completely different location...\n');

const oldPath = 'languages/javascript/examples/calculator/src/Calculator.js';
const newPath = 'languages/javascript/examples/calculator/lib/core/math/services/Calculator.js';

// Create new directory structure
const newDir = path.dirname(newPath);
fs.mkdirSync(newDir, { recursive: true });

// Move the file
if (fs.existsSync(oldPath)) {
  const content = fs.readFileSync(oldPath, 'utf8');
  fs.writeFileSync(newPath, content);
  fs.unlinkSync(oldPath);

  console.log(`✅ Moved: ${oldPath}`);
  console.log(`     → ${newPath}`);
  console.log('\n📊 Impact Analysis:');
  console.log('  - Traditional tests: ❌ All imports broken');
  console.log('  - Adaptive tests:    ✅ Still working!\n');

  // Clean up old directory if empty
  try {
    fs.rmdirSync(path.dirname(oldPath));
  } catch (e) {
    // Directory not empty or doesn't exist
  }
} else {
  console.log('⚠️  File already moved or does not exist');
  console.log('    Run "npm run restore" to reset the example\n');
}

console.log('Now try:');
console.log('  npm run test:traditional  # Watch them fail');
console.log('  npm run test:adaptive     # Watch them pass\n');