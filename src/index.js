/**
 * Adaptive Tests - Public API
 */

const adaptive = require('./adaptive');

const LegacyDiscoveryEngine = adaptive.DiscoveryEngine;
function getLegacyEngine(...args) {
  console.warn('[adaptive-tests] getLegacyEngine is deprecated. Use getDiscoveryEngine instead.');
  return adaptive.getDiscoveryEngine(...args);
}

module.exports = {
  ...adaptive,
  LegacyDiscoveryEngine,
  getLegacyEngine,
};
