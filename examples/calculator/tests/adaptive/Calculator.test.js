/**
 * Adaptive Test - Survives any refactoring!
 */

const { AdaptiveTest } = require('../../../../src/adaptive/test-base');
const { getDiscoveryEngine } = require('../../../../src/adaptive/discovery');

class CalculatorAdaptiveTest extends AdaptiveTest {
  getTargetSignature() {
    return {
      name: 'Calculator',
      type: 'class',
      methods: ['add', 'subtract', 'multiply', 'divide'],
      exports: 'Calculator'
    };
  }
}

// Setup adaptive discovery
const engine = getDiscoveryEngine(require('path').resolve(__dirname, '../../../..'));

describe('Calculator - Adaptive Tests', () => {
  let Calculator;
  let calc;

  beforeAll(async () => {
    // Discover the Calculator class wherever it lives
    Calculator = await engine.discoverTarget({
      name: 'Calculator',
      type: 'class',
      methods: ['add', 'subtract', 'multiply', 'divide'],
      exports: 'Calculator'
    });
  });

  beforeEach(() => {
    calc = new Calculator();
  });

  test('should discover Calculator class', () => {
    expect(Calculator).toBeDefined();
    expect(typeof Calculator).toBe('function');
  });

  describe('Basic Operations', () => {
    test('adds two numbers', () => {
      expect(calc.add(2, 3)).toBe(5);
    });

    test('subtracts two numbers', () => {
      expect(calc.subtract(5, 3)).toBe(2);
    });

    test('multiplies two numbers', () => {
      expect(calc.multiply(3, 4)).toBe(12);
    });

    test('divides two numbers', () => {
      expect(calc.divide(10, 2)).toBe(5);
    });

    test('throws on division by zero', () => {
      expect(() => calc.divide(5, 0)).toThrow('Division by zero');
    });
  });

  describe('Advanced Operations', () => {
    test('calculates power', () => {
      expect(calc.power(2, 3)).toBe(8);
    });

    test('calculates square root', () => {
      expect(calc.sqrt(16)).toBe(4);
    });

    test('throws on negative square root', () => {
      expect(() => calc.sqrt(-4)).toThrow('Cannot take square root of negative number');
    });
  });

  describe('History', () => {
    test('tracks operation history', () => {
      calc.add(1, 2);
      calc.multiply(3, 4);
      const history = calc.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toBe('1 + 2 = 3');
      expect(history[1]).toBe('3 * 4 = 12');
    });

    test('clears history', () => {
      calc.add(1, 2);
      calc.clearHistory();
      expect(calc.getHistory()).toHaveLength(0);
    });
  });
});