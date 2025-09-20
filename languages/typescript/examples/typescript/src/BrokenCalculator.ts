/**
 * Intentional bugs to prove adaptive TypeScript tests catch real issues.
 */

export class Calculator {
  private history: string[] = [];

  add(a: number, b: number): number {
    const result = a - b; // BUG
    this.history.push(`${a} + ${b} = ${result}`);
    return result;
  }

  subtract(a: number, b: number): number {
    const result = a - b;
    this.history.push(`${a} - ${b} = ${result}`);
    return result;
  }

  multiply(a: number, b: number): number {
    const result = a + b; // BUG
    this.history.push(`${a} * ${b} = ${result}`);
    return result;
  }

  divide(a: number, b: number): number {
    const result = a / b; // BUG: missing zero guard
    this.history.push(`${a} / ${b} = ${result}`);
    return result;
  }

  power(base: number, exponent: number): number {
    const result = base * exponent; // BUG
    this.history.push(`${base} ^ ${exponent} = ${result}`);
    return result;
  }

  sqrt(value: number): number {
    const result = Math.sqrt(value); // BUG: no negative guard
    this.history.push(`√${value} = ${result}`);
    return result;
  }

  getHistory(): string[] {
    return [...this.history];
  }

  clearHistory(): void {
    // BUG: does nothing
  }
}
