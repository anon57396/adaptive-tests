import { Calculator } from '../../src/Calculator';

describe('TypeScript Calculator - Traditional Tests', () => {
  let calc: Calculator;

  beforeEach(() => {
    calc = new Calculator();
  });

  describe('Basic operations', () => {
    it('adds two numbers', () => {
      expect(calc.add(2, 3)).toBe(5);
    });

    it('subtracts two numbers', () => {
      expect(calc.subtract(5, 2)).toBe(3);
    });

    it('multiplies two numbers', () => {
      expect(calc.multiply(4, 3)).toBe(12);
    });

    it('divides two numbers', () => {
      expect(calc.divide(8, 2)).toBe(4);
    });

    it('throws on division by zero', () => {
      expect(() => calc.divide(5, 0)).toThrow('Division by zero');
    });
  });

  describe('Advanced operations', () => {
    it('computes power', () => {
      expect(calc.power(2, 4)).toBe(16);
    });

    it('computes square roots', () => {
      expect(calc.sqrt(9)).toBe(3);
    });

    it('rejects negative square roots', () => {
      expect(() => calc.sqrt(-1)).toThrow('Cannot take square root of negative number');
    });
  });

  it('tracks calculation history', () => {
    calc.add(1, 2);
    calc.multiply(3, 3);
    const history = calc.getHistory();
    expect(history).toEqual(['1 + 2 = 3', '3 * 3 = 9']);
  });

  it('clears calculation history', () => {
    calc.add(10, 5);
    calc.clearHistory();
    expect(calc.getHistory()).toHaveLength(0);
  });
});
