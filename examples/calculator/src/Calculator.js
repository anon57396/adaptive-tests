/**
 * Broken Calculator Class - Intentionally buggy to prove tests catch real errors
 * This demonstrates that adaptive tests fail for legitimate reasons
 */

class Calculator {
  constructor() {
    this.history = [];
  }

  add(a, b) {
    // BUG: Should be a + b, not a - b
    const result = a - b;
    this.history.push(`${a} + ${b} = ${result}`);
    return result;
  }

  subtract(a, b) {
    const result = a - b;
    this.history.push(`${a} - ${b} = ${result}`);
    return result;
  }

  multiply(a, b) {
    // BUG: Should be a * b, not a + b
    const result = a + b;
    this.history.push(`${a} * ${b} = ${result}`);
    return result;
  }

  divide(a, b) {
    // BUG: Missing zero check
    const result = a / b;
    this.history.push(`${a} / ${b} = ${result}`);
    return result;
  }

  power(base, exponent) {
    // BUG: Should use Math.pow, not multiplication
    const result = base * exponent;
    this.history.push(`${base} ^ ${exponent} = ${result}`);
    return result;
  }

  sqrt(n) {
    // BUG: Missing negative check
    const result = Math.sqrt(n);
    this.history.push(`√${n} = ${result}`);
    return result;
  }

  getHistory() {
    return [...this.history];
  }

  clearHistory() {
    // BUG: Doesn't actually clear history
    // this.history = [];
  }
}

module.exports = Calculator;