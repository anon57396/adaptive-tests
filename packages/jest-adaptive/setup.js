/**
 * Jest Setup File for Adaptive Tests
 * 
 * This file is executed after the Jest test environment is set up.
 * It adds adaptive-tests functions to the global scope.
 */

// Check if we're in a Jest environment
if (typeof global === 'undefined') {
  throw new Error('jest-adaptive setup must be run in a Jest environment');
}

// Try to load adaptive-tests
let adaptiveTests;
try {
  adaptiveTests = require('adaptive-tests');
} catch (error) {
  console.error(
    '\n⚠️  jest-adaptive requires adaptive-tests to be installed.\n' +
    'Please run: npm install --save-dev adaptive-tests\n'
  );
  throw error;
}

// Extract the functions we want to make global
const {
  discover,
  adaptiveTest,
  getDiscoveryEngine,
  AdaptiveTest,
} = adaptiveTests;

// Validate that we got the expected exports
if (!discover || !getDiscoveryEngine) {
  throw new Error(
    'jest-adaptive: adaptive-tests exports are missing expected functions. ' +
    'Please ensure you have adaptive-tests version 0.2.0 or higher.'
  );
}

// Get configuration from Jest globals if available
const config = global['jest-adaptive'] || {};
const discoveryConfig = config.discovery || {};

// Create wrapped versions with config applied
const configuredDiscover = async (signature) => {
  const engine = getDiscoveryEngine();
  
  // Apply configuration if provided
  if (discoveryConfig.maxDepth) {
    engine.maxDepth = discoveryConfig.maxDepth;
  }
  if (discoveryConfig.extensions) {
    engine.extensions = discoveryConfig.extensions;
  }
  if (discoveryConfig.skipDirectories) {
    engine.skipDirectories = discoveryConfig.skipDirectories;
  }
  
  // Enable debug mode if requested
  if (config.debug) {
    console.log('[jest-adaptive] Discovering:', JSON.stringify(signature, null, 2));
    const result = await discover(signature);
    console.log('[jest-adaptive] Found:', result ? 'Success' : 'Failed');
    return result;
  }
  
  return discover(signature);
};

// Create a helper for lazy discovery (useful for large test suites)
const lazyDiscover = (signature) => {
  let cached = null;
  return async () => {
    if (!cached) {
      cached = await configuredDiscover(signature);
    }
    return cached;
  };
};

// Create a batch discovery helper
const discoverAll = async (signatures) => {
  const results = await Promise.all(
    signatures.map(sig => configuredDiscover(sig))
  );
  
  // Return an object keyed by signature name
  return signatures.reduce((acc, sig, index) => {
    const key = sig.name || sig.exports || `discovery_${index}`;
    acc[key] = results[index];
    return acc;
  }, {});
};

// Add functions to global scope
global.discover = configuredDiscover;
global.adaptiveTest = adaptiveTest;
global.getDiscoveryEngine = getDiscoveryEngine;
global.AdaptiveTest = AdaptiveTest;
global.lazyDiscover = lazyDiscover;
global.discoverAll = discoverAll;

// Add TypeScript type declarations to global namespace
if (global.process && global.process.env.NODE_ENV !== 'production') {
  // Development-time type hints
  global.discover.__TYPE__ = 'function discover(signature: DiscoverySignature): Promise<any>';
  global.adaptiveTest.__TYPE__ = 'function adaptiveTest(TestClass: typeof AdaptiveTest): void';
  global.getDiscoveryEngine.__TYPE__ = 'function getDiscoveryEngine(): DiscoveryEngine';
}

// Add custom Jest matchers for adaptive tests
if (global.expect && global.expect.extend) {
  global.expect.extend({
    // Check if a value was successfully discovered
    toBeDiscovered(received) {
      const pass = received != null && received !== undefined;
      return {
        pass,
        message: () => pass
          ? `Expected ${received} not to be discovered`
          : `Expected value to be discovered, but got ${received}`,
      };
    },
    
    // Check if a discovered class has expected methods
    toHaveMethods(received, expectedMethods) {
      if (typeof received !== 'function') {
        return {
          pass: false,
          message: () => `Expected ${received} to be a class/constructor`,
        };
      }
      
      const prototype = received.prototype || {};
      const missing = expectedMethods.filter(
        method => typeof prototype[method] !== 'function'
      );
      
      const pass = missing.length === 0;
      return {
        pass,
        message: () => pass
          ? `Expected ${received.name} not to have methods: ${expectedMethods.join(', ')}`
          : `Expected ${received.name} to have methods: ${missing.join(', ')}`,
      };
    },
  });
}

// Log setup success in debug mode
if (config.debug) {
  console.log('[jest-adaptive] Global functions added:');
  console.log('  - discover()');
  console.log('  - adaptiveTest()');
  console.log('  - getDiscoveryEngine()');
  console.log('  - lazyDiscover()');
  console.log('  - discoverAll()');
  console.log('[jest-adaptive] Custom matchers added:');
  console.log('  - expect().toBeDiscovered()');
  console.log('  - expect().toHaveMethods([])');
}

// Export for direct use if needed
module.exports = {
  discover: configuredDiscover,
  adaptiveTest,
  getDiscoveryEngine,
  AdaptiveTest,
  lazyDiscover,
  discoverAll,
};