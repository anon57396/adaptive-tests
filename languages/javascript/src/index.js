/**
 * Adaptive Testing - Main exports
 *
 * MIT License - Use this anywhere
 */

const { DiscoveryEngine, getDiscoveryEngine } = require('./discovery-engine');
// TypeScript discovery should be imported from @adaptive-tests/typescript package, not here
const { AdaptiveTest, adaptiveTest } = require('./test-base');
const { ConfigLoader, DEFAULT_CONFIG } = require('./config-loader');
const { ScoringEngine } = require('./scoring-engine');
const { setLogger, getLogger } = require('./logger');

/**
 * @typedef {import('./discovery-engine').DiscoverySignature} DiscoverySignature
 * @typedef {import('./discovery-engine').TargetType} TargetType
 * @typedef {import('./discovery-engine').DiscoveryOptions} DiscoveryOptions
 */

/**
 * A convenience function to quickly discover a target without creating an engine instance directly.
 * @template T
 * @param {DiscoverySignature} signature - The signature of the target to discover.
 * @param {string} [rootPath=process.cwd()] - The root directory to scan from.
 * @returns {Promise<T>} A promise that resolves with the discovered target.
 */
async function discover(signature, rootPath = process.cwd()) {
  const engine = getDiscoveryEngine(rootPath);
  return await engine.discoverTarget(signature);
}

module.exports = {
  // Core classes
  DiscoveryEngine,
  AdaptiveTest,

  // Convenience functions
  getDiscoveryEngine,
  adaptiveTest,
  discover,

  // Configuration utilities
  ConfigLoader,
  ScoringEngine,
  DEFAULT_CONFIG,

  // Logging
  setLogger,
  getLogger,
};
