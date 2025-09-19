/**
 * Example Jest configuration using jest-adaptive preset
 */

module.exports = {
  // Use the jest-adaptive preset for zero-config setup
  preset: 'jest-adaptive',
  
  // Optional: Add your custom configuration
  testEnvironment: 'node',
  
  // Optional: Enable debug mode for troubleshooting
  globals: {
    'jest-adaptive': {
      debug: false, // Set to true to see discovery logs
      discovery: {
        maxDepth: 10,
        extensions: ['.js', '.jsx'],
      }
    }
  },
};