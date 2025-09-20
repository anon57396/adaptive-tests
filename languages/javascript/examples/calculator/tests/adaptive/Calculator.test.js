const { discover } = require('@adaptive-tests/javascript');

/**
 * Adaptive Tests for Calculator
 *
 * These tests will automatically find Calculator even if it moves.
 * Generated from: languages/javascript/examples/calculator/src/Calculator.js
 */

describe('Calculator', () => {
  let Calculator;

  beforeAll(async () => {
    // Discover the module using its signature within the calculator example directory
    Calculator = await discover({
      name: 'Calculator',
      type: 'class',
      methods: [
        'add',
        'subtract',
        'multiply',
        'divide',
        'power',
        'sqrt',
        'getHistory',
        'clearHistory'
      ]
    }, '.');
  });

  test('should discover Calculator', () => {
    expect(Calculator).toBeDefined();
    expect(typeof Calculator).toBe('function');
  });

  describe('Methods', () => {
    test('should add', () => {
      const instance = new Calculator();
      expect(instance.add(2, 3)).toBe(5);
    });

    test('should subtract', () => {
      const instance = new Calculator();
      expect(instance.subtract(5, 2)).toBe(3);
    });

    test('should multiply', () => {
      const instance = new Calculator();
      expect(instance.multiply(3, 4)).toBe(12);
    });

    test('should divide', () => {
      const instance = new Calculator();
      expect(instance.divide(10, 2)).toBe(5);
      expect(() => instance.divide(5, 0)).toThrow('Division by zero');
    });

    test('should power', () => {
      const instance = new Calculator();
      expect(instance.power(2, 3)).toBe(8);
    });

    test('should sqrt', () => {
      const instance = new Calculator();
      expect(instance.sqrt(16)).toBe(4);
      expect(() => instance.sqrt(-1)).toThrow('Cannot take square root of negative number');
    });

    test('should get history', () => {
      const instance = new Calculator();
      instance.add(1, 1);
      expect(instance.getHistory()).toEqual(['1 + 1 = 2']);
    });

    test('should clear history', () => {
      const instance = new Calculator();
      instance.add(1, 1);
      instance.multiply(2, 3);
      expect(instance.getHistory()).toHaveLength(2);

      instance.clearHistory();
      expect(instance.getHistory()).toEqual([]);
    });
  });
});
