#!/usr/bin/env node

/**
 * Verify that Adaptive Tests invisible mode is configured.
 *
 * This script is optional; teams can wire it into CI to ensure
 * invisible mode remains enabled after config changes.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const markerPath = path.join(projectRoot, '.adaptive-tests', 'invisible-enabled.json');

if (!fs.existsSync(markerPath)) {
  console.error(
    '❌ Adaptive Tests invisible mode marker not found. Run "npx adaptive-tests enable-invisible" to enable or remove this check.'
  );
  process.exit(1);
}

try {
  const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
  if (marker && marker.enabledAt) {
    console.log('✅ Adaptive Tests invisible mode detected.');
    process.exit(0);
  }
} catch (error) {
  console.error('❌ Adaptive Tests invisible marker is invalid JSON.');
  process.exit(1);
}

console.error('❌ Adaptive Tests invisible marker is missing metadata.');
process.exit(1);
