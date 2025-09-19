// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Setup adaptive-tests discovery engine
const { getDiscoveryEngine } = require('adaptive-tests');

// Initialize discovery engine with project root
global.discoveryEngine = getDiscoveryEngine(process.cwd());

// Add custom matchers if needed
expect.extend({
  toBeDiscoverable(received, signature) {
    const engine = global.discoveryEngine;
    try {
      const result = engine.discoverSync(signature);
      return {
        pass: result !== null,
        message: () => result
          ? `Expected ${signature.name} not to be discoverable`
          : `Expected ${signature.name} to be discoverable`
      };
    } catch (error) {
      return {
        pass: false,
        message: () => `Discovery failed: ${error.message}`
      };
    }
  }
});