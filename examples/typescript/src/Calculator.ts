/**
 * TypeScript Calculator - Canonical Implementation
 */

export class Calculator {
  private history: string[] = [];

  add(a: number, b: number): number {
    const result = a + b;
    this.history.push(`${a} + ${b} = ${result}`);
    return result;
  }

  subtract(a: number, b: number): number {
    const result = a - b;
    this.history.push(`${a} - ${b} = ${result}`);
    return result;
  }

  multiply(a: number, b: number): number {
    const result = a * b;
    this.history.push(`${a} * ${b} = ${result}`);
    return result;
  }

  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    const result = a / b;
    this.history.push(`${a} / ${b} = ${result}`);
    return result;
  }

  power(base: number, exponent: number): number {
    const result = Math.pow(base, exponent);
    this.history.push(`${base} ^ ${exponent} = ${result}`);
    return result;
  }

  sqrt(value: number): number {
    if (value < 0) {
      throw new Error('Cannot take square root of negative number');
    }
    const result = Math.sqrt(value);
    this.history.push(`√${value} = ${result}`);
    return result;
  }

  getHistory(): string[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}
