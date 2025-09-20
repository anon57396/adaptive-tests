module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/examples'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleNameMapper: {
    '^@adaptive-tests/typescript$': '<rootDir>/index.js',
    '^@adaptive-tests/typescript/(.*)$': '<rootDir>/src/$1',
    '^@adaptive-tests/javascript$': '<rootDir>/node_modules/@adaptive-tests/javascript/src/index.js',
    '^@adaptive-tests/javascript/src/(.*)$': '<rootDir>/node_modules/@adaptive-tests/javascript/src/$1'
  }
};
