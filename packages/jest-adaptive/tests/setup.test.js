/**
 * Tests for jest-adaptive setup
 */

// Mock adaptive-tests before requiring setup
jest.mock('adaptive-tests', () => ({
  discover: jest.fn(async (signature) => {
    // Mock implementation that returns a fake class
    return class MockedClass {
      constructor() {
        this.name = signature.name;
      }
    };
  }),
  adaptiveTest: jest.fn(),
  getDiscoveryEngine: jest.fn(() => ({
    discoverTarget: jest.fn(),
  })),
  AdaptiveTest: class {},
}));

describe('jest-adaptive setup', () => {
  beforeEach(() => {
    // Clear any previous global assignments
    delete global.discover;
    delete global.adaptiveTest;
    delete global.getDiscoveryEngine;
    delete global.lazyDiscover;
    delete global.discoverAll;
    // Clear module cache to ensure fresh require
    delete require.cache[require.resolve('../setup')];
  });

  test('should add functions to global scope', () => {
    // Require setup to execute it
    require('../setup');

    // Check that globals were added
    expect(global.discover).toBeDefined();
    expect(typeof global.discover).toBe('function');
    expect(global.adaptiveTest).toBeDefined();
    expect(typeof global.adaptiveTest).toBe('function');
    expect(global.getDiscoveryEngine).toBeDefined();
    expect(typeof global.getDiscoveryEngine).toBe('function');
    expect(global.lazyDiscover).toBeDefined();
    expect(typeof global.lazyDiscover).toBe('function');
    expect(global.discoverAll).toBeDefined();
    expect(typeof global.discoverAll).toBe('function');
  });

  test('discover should work with configuration', async () => {
    // Set up configuration
    global['jest-adaptive'] = {
      discovery: {
        maxDepth: 5,
        extensions: ['.js', '.ts'],
      },
    };

    // Require setup
    require('../setup');

    // Test discover
    const result = await global.discover({
      name: 'TestClass',
      type: 'class',
    });

    expect(result).toBeDefined();
    expect(result.name).toBe('MockedClass');
  });

  test('lazyDiscover should cache results', async () => {
    require('../setup');

    const signature = { name: 'TestClass', type: 'class' };
    const lazy = global.lazyDiscover(signature);

    // Call multiple times
    const result1 = await lazy();
    const result2 = await lazy();
    const result3 = await lazy();

    // Should be the same instance (cached)
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });

  test('discoverAll should discover multiple signatures', async () => {
    require('../setup');

    const signatures = [
      { name: 'ClassA', type: 'class' },
      { name: 'ClassB', type: 'class' },
      { name: 'ClassC', type: 'class' },
    ];

    const results = await global.discoverAll(signatures);

    expect(results).toBeDefined();
    expect(results.ClassA).toBeDefined();
    expect(results.ClassB).toBeDefined();
    expect(results.ClassC).toBeDefined();
  });

  test('should add custom Jest matchers', () => {
    // Mock expect.extend
    const mockExtend = jest.fn();
    const originalExpect = global.expect;
    global.expect = {
      extend: mockExtend,
    };

    require('../setup');

    // Restore original expect before assertions
    global.expect = originalExpect;

    // Check that matchers were added
    expect(mockExtend).toHaveBeenCalled();
    const matchers = mockExtend.mock.calls[0][0];
    expect(matchers.toBeDiscovered).toBeDefined();
    expect(matchers.toHaveMethods).toBeDefined();
  });

  test('toBeDiscovered matcher should work', () => {
    global.expect = {
      extend: jest.fn(),
    };

    require('../setup');

    const matchers = global.expect.extend.mock.calls[0][0];
    const toBeDiscovered = matchers.toBeDiscovered;

    // Test with discovered value
    expect(toBeDiscovered({ someValue: true })).toEqual({
      pass: true,
      message: expect.any(Function),
    });

    // Test with null
    expect(toBeDiscovered(null)).toEqual({
      pass: false,
      message: expect.any(Function),
    });

    // Test with undefined
    expect(toBeDiscovered(undefined)).toEqual({
      pass: false,
      message: expect.any(Function),
    });
  });

  test('toHaveMethods matcher should work', () => {
    global.expect = {
      extend: jest.fn(),
    };

    require('../setup');

    const matchers = global.expect.extend.mock.calls[0][0];
    const toHaveMethods = matchers.toHaveMethods;

    // Create a mock class
    class TestClass {
      method1() {}
      method2() {}
    }

    // Test with correct methods
    expect(toHaveMethods(TestClass, ['method1', 'method2'])).toEqual({
      pass: true,
      message: expect.any(Function),
    });

    // Test with missing methods
    expect(toHaveMethods(TestClass, ['method1', 'method3'])).toEqual({
      pass: false,
      message: expect.any(Function),
    });

    // Test with non-function
    expect(toHaveMethods({}, ['method1'])).toEqual({
      pass: false,
      message: expect.any(Function),
    });
  });
});