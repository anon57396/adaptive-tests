/**
 * Adaptive Testing - Main exports
 *
 * MIT License - Use this anywhere
 */

const { DiscoveryEngine, getDiscoveryEngine } = require('./discovery');
const { AdaptiveTest, adaptiveTest } = require('./test-base');

module.exports = {
  // Core classes
  DiscoveryEngine,
  AdaptiveTest,

  // Convenience functions
  getDiscoveryEngine,
  adaptiveTest,

  // Quick discovery function
  async discover(signature, rootPath = process.cwd()) {
    const engine = getDiscoveryEngine(rootPath);
    return await engine.discoverTarget(signature);
  }
};