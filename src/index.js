/**
 * Adaptive Tests - Public API
 */

const adaptive = require('./adaptive');
const { getLogger } = require('./adaptive/logger');

const LegacyDiscoveryEngine = adaptive.DiscoveryEngine;
function getLegacyEngine(...args) {
  getLogger().warn('[adaptive-tests] getLegacyEngine is deprecated. Use getDiscoveryEngine instead.');
  return adaptive.getDiscoveryEngine(...args);
}

module.exports = {
  ...adaptive,
  LegacyDiscoveryEngine,
  getLegacyEngine,
};
