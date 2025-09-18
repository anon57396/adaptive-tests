/**
 * Calculator Class - Canonical Implementation
 * A simple calculator with history tracking
 */

class Calculator {
  constructor() {
    this.history = [];
  }

  add(a, b) {
    const result = a + b;
    this.history.push(`${a} + ${b} = ${result}`);
    return result;
  }

  subtract(a, b) {
    const result = a - b;
    this.history.push(`${a} - ${b} = ${result}`);
    return result;
  }

  multiply(a, b) {
    const result = a * b;
    this.history.push(`${a} * ${b} = ${result}`);
    return result;
  }

  divide(a, b) {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    const result = a / b;
    this.history.push(`${a} / ${b} = ${result}`);
    return result;
  }

  power(base, exponent) {
    const result = Math.pow(base, exponent);
    this.history.push(`${base} ^ ${exponent} = ${result}`);
    return result;
  }

  sqrt(n) {
    if (n < 0) {
      throw new Error('Cannot take square root of negative number');
    }
    const result = Math.sqrt(n);
    this.history.push(`√${n} = ${result}`);
    return result;
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
  }
}

module.exports = Calculator;
module.exports.Calculator = Calculator;