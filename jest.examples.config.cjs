const baseConfig = require('./package.json').jest || {};

module.exports = {
  ...baseConfig,
  // Allow example tests to run by removing the ignores for example directories during targeted runs.
  testPathIgnorePatterns: (baseConfig.testPathIgnorePatterns || []).filter((pattern) =>
    !pattern.includes('<rootDir>/examples/') &&
    !pattern.includes('<rootDir>/languages/javascript/examples/') &&
    !pattern.includes('<rootDir>/languages/typescript/examples/')
  ),
};
