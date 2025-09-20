#!/usr/bin/env node

/**
 * Ensures no compiled Go parser binaries are present in the workspace.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TARGET_DIRECTORIES = [path.join(ROOT, 'src')];
const BINARY_PATTERN = /go-ast-parser(?:\.exe)?$/;
const violations = [];

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
      continue;
    }

    if (BINARY_PATTERN.test(entry.name)) {
      violations.push(fullPath);
      continue;
    }

    if (fullPath.startsWith(path.join(ROOT, 'src', 'adaptive', 'go')) && (fs.statSync(fullPath).mode & 0o111)) {
      violations.push(fullPath);
    }
  }
}

for (const dir of TARGET_DIRECTORIES) {
  if (fs.existsSync(dir)) {
    scanDirectory(dir);
  }
}

if (violations.length > 0) {
  console.error('\n❌ Binary artifacts detected (remove committed Go parser binaries):');
  violations.forEach((file) => console.error(` - ${path.relative(ROOT, file)}`));
  console.error('\nRun npm run clean or delete the files above before committing.');
  process.exit(1);
}

console.log('✅ No embedded Go parser binaries detected.');
