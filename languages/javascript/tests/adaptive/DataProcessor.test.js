/**
 * Adaptive test for DataProcessor module
 * Demonstrates discovery of modules with multiple named exports
 */

const path = require('path');
const { getDiscoveryEngine } = require('../../languages/javascript/src/discovery-engine');

const engine = getDiscoveryEngine(path.resolve(__dirname, '../..'));

describe('DataProcessor - Adaptive Discovery', () => {
  let dataProcessor;

  beforeAll(async () => {
    // Discover a module with multiple exports
    // For modules with named exports, we need to look for the specific function
    const processArrayFunc = await engine.discoverTarget({
      name: 'processArray',
      type: 'function'
    });

    const transformDataFunc = await engine.discoverTarget({
      name: 'transformData',
      type: 'function'
    });

    const validateDataFunc = await engine.discoverTarget({
      name: 'validateData',
      type: 'function'
    });

    // Reconstruct the module object from discovered functions
    dataProcessor = {
      processArray: processArrayFunc,
      transformData: transformDataFunc,
      validateData: validateDataFunc
    };
  });

  test('should discover DataProcessor module', () => {
    expect(dataProcessor).toBeDefined();
    expect(dataProcessor.processArray).toBeDefined();
    expect(dataProcessor.transformData).toBeDefined();
    expect(dataProcessor.validateData).toBeDefined();
  });

  describe('processArray()', () => {
    const numbers = [1, 2, 3, 4, 5];

    test('should calculate sum', () => {
      expect(dataProcessor.processArray(numbers, 'sum')).toBe(15);
    });

    test('should calculate average', () => {
      expect(dataProcessor.processArray(numbers, 'average')).toBe(3);
    });

    test('should find max value', () => {
      expect(dataProcessor.processArray(numbers, 'max')).toBe(5);
    });

    test('should find min value', () => {
      expect(dataProcessor.processArray(numbers, 'min')).toBe(1);
    });

    test('should handle empty arrays', () => {
      expect(dataProcessor.processArray([], 'sum')).toBe(0);
      expect(dataProcessor.processArray([], 'average')).toBe(0);
    });

    test('should handle invalid input', () => {
      expect(dataProcessor.processArray(null, 'sum')).toEqual([]);
      expect(dataProcessor.processArray('not an array', 'sum')).toEqual([]);
    });
  });

  describe('transformData()', () => {
    test('should transform strings to uppercase', () => {
      expect(dataProcessor.transformData('hello', 'uppercase')).toBe('HELLO');
    });

    test('should double numbers', () => {
      expect(dataProcessor.transformData(5, 'double')).toBe(10);
    });

    test('should stringify data', () => {
      expect(dataProcessor.transformData({ key: 'value' }, 'stringify')).toBe('{"key":"value"}');
    });

    test('should handle null data', () => {
      expect(dataProcessor.transformData(null, 'uppercase')).toBeNull();
    });

    test('should return data unchanged for unknown transform', () => {
      expect(dataProcessor.transformData('test', 'unknown')).toBe('test');
    });
  });

  describe('validateData()', () => {
    test('should validate required data', () => {
      const result = dataProcessor.validateData(null, { required: true });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data is required');
    });

    test('should validate minimum length', () => {
      const result = dataProcessor.validateData('ab', { minLength: 3 });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/at least 3 characters/);
    });

    test('should validate data type', () => {
      const result = dataProcessor.validateData(123, { type: 'string' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data must be of type string');
    });

    test('should pass valid data', () => {
      const result = dataProcessor.validateData('valid string', {
        required: true,
        minLength: 5,
        type: 'string'
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

/**
 * This test showcases:
 * - Discovery of modules (not classes)
 * - Working with multiple named exports
 * - No hardcoded paths to DataProcessor.js
 * - Tests work even if the module is moved or renamed
 */