#!/usr/bin/env node

/**
 * Removes large generated artifacts (coverage reports, virtualenvs, temp caches)
 * so the repository stays lean before packaging or sharing.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const targets = [
  { relativePath: 'coverage', description: 'Jest coverage reports' },
  { relativePath: '.venv', description: 'Project virtualenv' },
  { relativePath: '.test-discovery-cache.json', description: 'Discovery cache' },
  { relativePath: 'node_modules/.cache', description: 'Node build caches' },
  { relativePath: 'languages/python/examples/python/.adaptive-validate-venv', description: 'Validation virtualenv' },
  { relativePath: 'languages/javascript/plugins/vite-plugin-adaptive/.venv', description: 'Local virtualenv (vite plugin)' },
  { relativePath: 'languages/javascript/plugins/webpack-plugin-adaptive/.venv', description: 'Local virtualenv (webpack plugin)' },
  { relativePath: 'languages/javascript/plugins/jest-adaptive/.turbo', description: 'Build cache (jest plugin)' },
];

let removed = 0;

for (const target of targets) {
  const targetPath = path.join(repoRoot, target.relativePath);
  if (!fs.existsSync(targetPath)) {
    continue;
  }

  try {
    const stats = fs.statSync(targetPath);
    if (stats.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    } else {
      fs.rmSync(targetPath, { force: true });
    }
    removed += 1;
    console.log(`[clean-artifacts] Removed ${target.relativePath} (${target.description})`);
  } catch (error) {
    console.warn(`[clean-artifacts] Failed to remove ${target.relativePath}: ${error.message}`);
  }
}

if (removed === 0) {
  console.log('[clean-artifacts] Nothing to clean.');
} else {
  console.log(`[clean-artifacts] Cleanup complete (${removed} entries).`);
}
