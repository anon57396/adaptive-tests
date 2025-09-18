/**
 * Adaptive Testing - Main exports
 *
 * MIT License - Use this anywhere
 */

const { DiscoveryEngine, getDiscoveryEngine } = require('./discovery');
const { TypeScriptDiscoveryEngine, getTypeScriptDiscoveryEngine } = require('./typescript/discovery');
const { AdaptiveTest, adaptiveTest } = require('./test-base');

/**
 * @typedef {import('./discovery').DiscoverySignature} DiscoverySignature
 * @typedef {import('./discovery').TargetType} TargetType
 * @typedef {import('./discovery').DiscoveryOptions} DiscoveryOptions
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
  TypeScriptDiscoveryEngine,

  // Convenience functions
  getDiscoveryEngine,
  getTypeScriptDiscoveryEngine,
  adaptiveTest,
  discover,
};