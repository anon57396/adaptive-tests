#!/usr/bin/env node

/**
 * Restore from broken implementation
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Restoring good Calculator implementation...\n');

const goodPath = 'languages/javascript/examples/calculator/src/Calculator.js';
const backupPath = goodPath + '.backup';

if (fs.existsSync(backupPath)) {
  const backupContent = fs.readFileSync(backupPath, 'utf8');
  fs.writeFileSync(goodPath, backupContent);
  fs.unlinkSync(backupPath);

  console.log('✅ Restored Calculator.js to working implementation');
  console.log('\nTests should pass again!\n');
} else {
  console.log('⚠️  No backup found. Calculator may already be restored.\n');
}