/**
 * Adaptive Testing - Main exports
 *
 * MIT License - Use this anywhere
 */

const { DiscoveryEngine, getDiscoveryEngine } = require('./discovery');
const { TypeScriptDiscoveryEngine, getTypeScriptDiscoveryEngine } = require('./typescript/discovery');
const { AdaptiveTest, adaptiveTest } = require('./test-base');

module.exports = {
  // Core classes
  DiscoveryEngine,
  AdaptiveTest,
  TypeScriptDiscoveryEngine,

  // Convenience functions
  getDiscoveryEngine,
  getTypeScriptDiscoveryEngine,
  adaptiveTest,

  // Quick discovery function
  async discover(signature, rootPath = process.cwd()) {
    const engine = getDiscoveryEngine(rootPath);
    return await engine.discoverTarget(signature);
  }
};
