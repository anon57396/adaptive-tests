const baseConfig = require('./package.json').jest || {};

module.exports = {
  ...baseConfig,
  // Allow example tests to run by removing the <rootDir>/examples/ ignore during targeted runs.
  testPathIgnorePatterns: (baseConfig.testPathIgnorePatterns || []).filter(
    (pattern) => !pattern.includes('<rootDir>/examples/')
  ),
};
