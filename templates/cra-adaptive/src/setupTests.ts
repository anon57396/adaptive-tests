// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { getDiscoveryEngine } from 'adaptive-tests';

// Initialize the discovery engine for adaptive tests
const discoveryEngine = getDiscoveryEngine(process.cwd());

// Make discovery engine globally available
(global as any).discoveryEngine = discoveryEngine;

// Add custom matcher for discovery testing
expect.extend({
  async toBeDiscoverable(received: any, signature: any) {
    try {
      const result = await discoveryEngine.discoverTarget(signature);
      return {
        pass: result !== null,
        message: () =>
          result
            ? `Expected ${signature.name} not to be discoverable`
            : `Expected ${signature.name} to be discoverable`,
      };
    } catch (error: any) {
      return {
        pass: false,
        message: () => `Discovery failed: ${error.message}`,
      };
    }
  },
});

// Mock window.matchMedia for responsive component tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});