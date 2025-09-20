module.exports = {
  "testEnvironment": "node",
  "roots": [
    "<rootDir>/tests",
    "<rootDir>/examples"
  ],
  "testMatch": [
    "**/*.test.(js|ts)"
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        "tsconfig": "<rootDir>/tsconfig.json",
        "diagnostics": false
      }
    ]
  },
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json"
  ],
  "moduleNameMapper": {
    "^adaptive-tests$": "<rootDir>/src/index.js",
    "^adaptive-tests/(.*)$": "<rootDir>/src/$1",
    "^@adaptive-tests/javascript$": "<rootDir>/src/index.js"
  },
  "collectCoverageFrom": [
    "src/**/*.{js,ts}",
    "!src/**/index.js"
  ],
  "coverageDirectory": "<rootDir>/coverage",
  "clearMocks": true,
  "resetMocks": true,
  "restoreMocks": true
};
