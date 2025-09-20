/**
 * ESM module with math utilities
 */

export function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

export function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

export function isPrime(n) {
  if (n <= 1) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

export function gcd(a, b) {
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

export function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

export const MathConstants = {
  PI: Math.PI,
  E: Math.E,
  GOLDEN_RATIO: 1.618033988749895
};

export default {
  fibonacci,
  factorial,
  isPrime,
  gcd,
  lcm,
  constants: MathConstants
};