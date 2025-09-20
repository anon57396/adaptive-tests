/**
 * ESM module with string utilities
 */

export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const reverse = (str) => {
  return str.split('').reverse().join('');
};

export const isPalindrome = (str) => {
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === reverse(cleaned);
};

export const camelCase = (str) => {
  return str
    .split(/[\s-_]+/)
    .map((word, index) =>
      index === 0 ? word.toLowerCase() : capitalize(word)
    )
    .join('');
};

export const kebabCase = (str) => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
};

export class StringBuilder {
  constructor(initial = '') {
    this.value = initial;
  }

  append(str) {
    this.value += str;
    return this;
  }

  prepend(str) {
    this.value = str + this.value;
    return this;
  }

  clear() {
    this.value = '';
    return this;
  }

  toString() {
    return this.value;
  }
}

// Named exports
export { capitalize as cap, reverse as rev };

// Default export
export default {
  capitalize,
  reverse,
  isPalindrome,
  camelCase,
  kebabCase,
  StringBuilder
};