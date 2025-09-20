/**
 * Adaptive tests for ESM math utilities
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { getDiscoveryEngine } from '../../../src/index.mjs';

describe('Math Utils - Adaptive Discovery (ESM)', () => {
  let mathUtils;
  let engine;

  beforeAll(async () => {
    engine = getDiscoveryEngine();

    // Discover ESM module with math functions
    mathUtils = await engine.discoverTarget({
      name: 'math-utils',
      exports: ['fibonacci', 'factorial', 'isPrime', 'gcd', 'lcm'],
      type: 'module',
      moduleType: 'esm'
    });
  });

  test('should discover math-utils module', () => {
    expect(mathUtils).toBeDefined();
  });

  test('should discover fibonacci function', () => {
    expect(mathUtils.fibonacci).toBeDefined();
    expect(typeof mathUtils.fibonacci).toBe('function');

    expect(mathUtils.fibonacci(0)).toBe(0);
    expect(mathUtils.fibonacci(1)).toBe(1);
    expect(mathUtils.fibonacci(5)).toBe(5);
    expect(mathUtils.fibonacci(10)).toBe(55);
  });

  test('should discover factorial function', () => {
    expect(mathUtils.factorial).toBeDefined();

    expect(mathUtils.factorial(0)).toBe(1);
    expect(mathUtils.factorial(5)).toBe(120);
    expect(mathUtils.factorial(7)).toBe(5040);
  });

  test('should discover isPrime function', () => {
    expect(mathUtils.isPrime).toBeDefined();

    expect(mathUtils.isPrime(2)).toBe(true);
    expect(mathUtils.isPrime(17)).toBe(true);
    expect(mathUtils.isPrime(4)).toBe(false);
    expect(mathUtils.isPrime(100)).toBe(false);
  });

  test('should discover gcd and lcm functions', () => {
    expect(mathUtils.gcd).toBeDefined();
    expect(mathUtils.lcm).toBeDefined();

    expect(mathUtils.gcd(12, 8)).toBe(4);
    expect(mathUtils.gcd(17, 19)).toBe(1);

    expect(mathUtils.lcm(12, 8)).toBe(24);
    expect(mathUtils.lcm(5, 7)).toBe(35);
  });

  test('should discover exported constants', () => {
    expect(mathUtils.MathConstants).toBeDefined();
    expect(mathUtils.MathConstants.PI).toBeCloseTo(3.14159, 5);
    expect(mathUtils.MathConstants.E).toBeCloseTo(2.71828, 5);
    expect(mathUtils.MathConstants.GOLDEN_RATIO).toBeCloseTo(1.61803, 5);
  });
});

describe('Default Export Discovery (ESM)', () => {
  let defaultExport;

  beforeAll(async () => {
    const engine = getDiscoveryEngine();

    // Discover default export
    defaultExport = await engine.discoverTarget({
      name: 'math-utils',
      exportType: 'default',
      type: 'module',
      moduleType: 'esm'
    });
  });

  test('should discover default export with all functions', () => {
    expect(defaultExport).toBeDefined();
    expect(defaultExport.fibonacci).toBeDefined();
    expect(defaultExport.factorial).toBeDefined();
    expect(defaultExport.isPrime).toBeDefined();
    expect(defaultExport.constants).toBeDefined();
  });
});
