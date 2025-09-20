#!/usr/bin/env node

/**
 * Restore Script - Puts Calculator.js back to original location
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Restoring: Moving Calculator.js back to original location...\n');

const oldPath = 'languages/javascript/examples/calculator/lib/core/math/services/Calculator.js';
const newPath = 'languages/javascript/examples/calculator/src/Calculator.js';

// Create original directory structure
const newDir = path.dirname(newPath);
fs.mkdirSync(newDir, { recursive: true });

// Move the file back
if (fs.existsSync(oldPath)) {
  const content = fs.readFileSync(oldPath, 'utf8');
  fs.writeFileSync(newPath, content);
  fs.unlinkSync(oldPath);

  console.log(`✅ Restored: ${oldPath}`);
  console.log(`        → ${newPath}`);

  // Clean up refactored directories
  const dirs = ['lib/core/math/services', 'lib/core/math', 'lib/core', 'lib'];
  dirs.forEach(dir => {
    const fullDir = path.join('languages/javascript/examples/calculator', dir);
    try {
      fs.rmdirSync(fullDir);
    } catch (e) {
      // Directory not empty or doesn't exist
    }
  });

  console.log('\n✨ Original structure restored!\n');
} else if (fs.existsSync(newPath)) {
  console.log('✅ Already in original location\n');
} else {
  console.log('⚠️  Calculator.js not found in either location\n');
}