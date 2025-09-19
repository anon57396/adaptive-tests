const { discover } = require('adaptive-tests');

/**
 * Adaptive Tests for Calculator
 *
 * These tests will automatically find Calculator even if it moves.
 * Generated from: examples/calculator/src/Calculator.js
 */

describe('Calculator', () => {
  let Calculator;

  beforeAll(async () => {
    // Discover the module using its signature
    Calculator = await discover({
        "name": "Calculator",
        "type": "class",
        "methods": [
            "add",
            "subtract",
            "multiply",
            "divide",
            "power",
            "sqrt",
            "getHistory",
            "clearHistory"
        ]
    });
  });

  test('should discover Calculator', () => {
    expect(Calculator).toBeDefined();
    expect(typeof Calculator).toBe('function');
    
  });

  describe('Methods', () => {
  test('should add', () => {
    // TODO: Implement test for add
    const instance = new Calculator();
    expect(instance.add()).toBeDefined();
  });

  test('should subtract', () => {
    // TODO: Implement test for subtract
    const instance = new Calculator();
    expect(instance.subtract()).toBeDefined();
  });

  test('should multiply', () => {
    // TODO: Implement test for multiply
    const instance = new Calculator();
    expect(instance.multiply()).toBeDefined();
  });

  test('should divide', () => {
    // TODO: Implement test for divide
    const instance = new Calculator();
    expect(instance.divide()).toBeDefined();
  });

  test('should power', () => {
    // TODO: Implement test for power
    const instance = new Calculator();
    expect(instance.power()).toBeDefined();
  });

  test('should sqrt', () => {
    // TODO: Implement test for sqrt
    const instance = new Calculator();
    expect(instance.sqrt()).toBeDefined();
  });

  test('should get history', async () => {
    // TODO: Implement test for getHistory
    const instance = new Calculator();
    await expect(instance.getHistory()).toBeDefined();
  });

  test('should clear history', () => {
    // TODO: Implement test for clearHistory
    const instance = new Calculator();
    expect(instance.clearHistory()).toBeDefined();
  });
  });
});
