module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/examples', '<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  moduleFileExtensions: ['js', 'jsx', 'json'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/index.js'
  ],
  coverageDirectory: 'coverage',
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Disable Haste to avoid module collision issues
  haste: {
    enableSymlinks: false,
    throwOnModuleCollision: false
  }
};