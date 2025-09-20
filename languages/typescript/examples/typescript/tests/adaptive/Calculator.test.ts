import path from 'path';
import { getTypeScriptDiscoveryEngine } from '@adaptive-tests/typescript';

describe('TypeScript Calculator - Adaptive Tests', () => {
  const engine = getTypeScriptDiscoveryEngine(path.resolve(__dirname, '../..'));
  let Calculator: typeof import('../../src/Calculator').Calculator;
  let calc: import('../../src/Calculator').Calculator;

  beforeAll(async () => {
    Calculator = await engine.discoverTarget({
      name: 'Calculator',
      type: 'class',
      methods: ['add', 'subtract', 'multiply', 'divide', 'power', 'sqrt', 'clearHistory'],
      exports: 'Calculator'
    });
  });

  beforeEach(() => {
    calc = new Calculator();
  });

  it('discovers the Calculator class', () => {
    expect(typeof Calculator).toBe('function');
    expect(calc).toBeInstanceOf(Calculator);
  });

  it('adds two numbers', () => {
    expect(calc.add(4, 6)).toBe(10);
  });

  it('detects division by zero', () => {
    expect(() => calc.divide(4, 0)).toThrow('Division by zero');
  });

  it('tracks and clears history', () => {
    calc.add(1, 2);
    calc.multiply(2, 5);
    expect(calc.getHistory()).toHaveLength(2);
    calc.clearHistory();
    expect(calc.getHistory()).toHaveLength(0);
  });
});
