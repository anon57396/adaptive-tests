/**
 * DataProcessor - Another test fixture with different export patterns
 * Demonstrates adaptive discovery with named exports
 */

function processArray(arr, operation) {
  if (!Array.isArray(arr)) return [];

  switch(operation) {
    case 'sum':
      return arr.reduce((a, b) => a + b, 0);
    case 'average':
      return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    case 'max':
      return Math.max(...arr);
    case 'min':
      return Math.min(...arr);
    default:
      return arr;
  }
}

function transformData(data, transformType) {
  if (!data) return null;

  switch(transformType) {
    case 'uppercase':
      return typeof data === 'string' ? data.toUpperCase() : data;
    case 'double':
      return typeof data === 'number' ? data * 2 : data;
    case 'stringify':
      return JSON.stringify(data);
    default:
      return data;
  }
}

function validateData(data, rules = {}) {
  const errors = [];

  if (rules.required && !data) {
    errors.push('Data is required');
  }

  if (rules.minLength && data && data.length < rules.minLength) {
    errors.push(`Data must be at least ${rules.minLength} characters`);
  }

  if (rules.type && data && typeof data !== rules.type) {
    errors.push(`Data must be of type ${rules.type}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  processArray,
  transformData,
  validateData
};