#!/usr/bin/env node

/**
 * Restore the working TypeScript calculator from backup.
 */

const fs = require('fs');
const path = require('path');

const workingPath = path.resolve('languages/typescript/examples/typescript/src/Calculator.ts');
const backupPath = `${workingPath}.backup`;

console.log('🔧 Restoring TypeScript Calculator implementation...\n');

if (!fs.existsSync(backupPath)) {
  console.log('⚠️  No backup found – Calculator.ts already restored?');
  process.exit(0);
}

fs.copyFileSync(backupPath, workingPath);
fs.unlinkSync(backupPath);

console.log('✅ Restored TypeScript Calculator to working implementation\n');
