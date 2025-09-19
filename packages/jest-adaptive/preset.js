/**
 * Jest Preset for Adaptive Tests
 * 
 * This preset automatically configures Jest to work with adaptive-tests.
 * It sets up globals, transformers, and test patterns optimized for adaptive testing.
 */

module.exports = {
  // Use Node test environment (can be overridden)
  testEnvironment: 'node',

  // Setup adaptive globals after Jest environment is ready
  setupFilesAfterEnv: [require.resolve('./setup.js')],

  // Test file patterns - include both traditional and adaptive patterns
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
    '**/?(*.)+(adaptive).[jt]s?(x)',
    '**/tests/**/*.(test|spec|adaptive).[jt]s?(x)'
  ],

  // Transform adaptive test files
  transform: {
    '^.+\\.adaptive\\.[jt]sx?$': require.resolve('./transformer.js'),
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],

  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/tests/**',
  ],

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Global configuration for adaptive-tests
  globals: {
    'jest-adaptive': {
      discovery: {
        maxDepth: 10,
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
        skipDirectories: ['node_modules', 'dist', 'build', 'coverage', '.git'],
      }
    }
  },

  // Module name mapper for common patterns
  moduleNameMapper: {
    // Allow @ alias for src directory
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
  ],

  // Watch mode ignore patterns
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '\\.cache',
  ],
};