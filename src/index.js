/**
 * Adaptive Tests - Main Export
 */

// Export the new Discovery Engine 2.0
const { DiscoveryEngine, getDiscoveryEngine } = require('./adaptive/discovery-engine');

// Export legacy discovery for backward compatibility
const { DiscoveryEngine: LegacyDiscoveryEngine, getDiscoveryEngine: getLegacyEngine } = require('./adaptive/discovery');

// Export test base classes
const { AdaptiveTest, adaptiveTest } = require('./adaptive/test-base');

// Export discovery function for convenience
const discover = require('./adaptive/discover');

// Export configuration utilities
const { ConfigLoader, DEFAULT_CONFIG } = require('./adaptive/config-loader');
const { ScoringEngine } = require('./adaptive/scoring-engine');

module.exports = {
  // Primary exports (new engine)
  DiscoveryEngine,
  getDiscoveryEngine,

  // Test utilities
  AdaptiveTest,
  adaptiveTest,
  discover,

  // Configuration
  ConfigLoader,
  ScoringEngine,
  DEFAULT_CONFIG,

  // Legacy exports (will be removed in v3.0)
  LegacyDiscoveryEngine,
  getLegacyEngine
};