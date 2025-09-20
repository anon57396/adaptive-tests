import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { getDiscoveryEngine } from 'adaptive-tests';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Initialize adaptive-tests discovery engine
const discoveryEngine = getDiscoveryEngine(process.cwd());

// Make discovery engine available globally
(globalThis as any).discoveryEngine = discoveryEngine;

// Add custom matchers for adaptive testing
expect.extend({
  async toBeDiscoverable(received: any, signature: any) {
    try {
      const result = await discoveryEngine.discoverTarget(signature);
      return {
        pass: result !== null,
        message: () =>
          result
            ? `Expected ${signature.name} not to be discoverable`
            : `Expected ${signature.name} to be discoverable with signature: ${JSON.stringify(signature)}`,
        actual: result,
        expected: signature,
      };
    } catch (error: any) {
      return {
        pass: false,
        message: () => `Discovery failed: ${error.message}`,
      };
    }
  },
});