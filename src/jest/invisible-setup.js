/**
 * Invisible Mode Jest Setup
 *
 * OPT-IN ONLY: Must be explicitly enabled
 * SAFE: Does not interfere with existing setups
 * DOCUMENTED: Clear escape hatches and disable options
 */

const { setupForJest, patchRequireWithIsolation } = require('../adaptive/invisible');

/**
 * Setup invisible mode for Jest (opt-in only)
 *
 * Usage in jest.config.js:
 * {
 *   setupFilesAfterEnv: ['adaptive-tests/jest/invisible-setup'],
 *   globals: {
 *     adaptiveTests: { invisible: true }
 *   }
 * }
 */

// Only enable if explicitly requested
const globalConfig = global.adaptiveTests || {};

if (globalConfig.invisible === true) {
  console.log('⚡ Adaptive Tests: Enabling invisible mode for Jest');

  // Setup with user configuration
  setupForJest({
    invisible: true,
    escapePatterns: globalConfig.escapePatterns || ['node_modules', '.mock', '__mocks__'],
    debug: globalConfig.debug || false
  });

  // Patch require after Jest setup
  patchRequireWithIsolation();

  // Cleanup on exit
  process.on('exit', () => {
    const { restoreOriginalRequire } = require('../adaptive/invisible');
    restoreOriginalRequire();
  });

} else {
  console.log('ℹ️  Adaptive Tests: Invisible mode not enabled (set globals.adaptiveTests.invisible = true)');
}