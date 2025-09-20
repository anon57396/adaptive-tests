# jest-adaptive

[![npm version](https://img.shields.io/npm/v/jest-adaptive.svg)](https://www.npmjs.com/package/jest-adaptive)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Zero-config Jest plugin for adaptive test discovery. Write tests that automatically find their targets even after refactoring.

## ✨ Features

- **🚀 Zero Configuration** - Works out of the box with Jest 27+
- **🔍 Automatic Discovery** - Tests find their targets using signatures, not paths
- **♻️ Refactoring-Proof** - Move files, rename folders, tests still pass
- **🎯 Smart Globals** - Adds `discover()` and `adaptiveTest()` as Jest globals
- **📦 Multiple Formats** - Use as preset, transformer, or setup file
- **🔧 TypeScript Support** - Full TypeScript definitions included

## 📦 Installation

```bash
npm install --save-dev jest-adaptive adaptive-tests
```

or

```bash
yarn add --dev jest-adaptive adaptive-tests
```

## 🚀 Quick Start

### Option 1: Jest Preset (Recommended)

In your `jest.config.js`:

```javascript
module.exports = {
  preset: 'jest-adaptive',
  // ... your other Jest config
};
```

That's it! Now write adaptive tests:

```javascript
// No imports needed - globals are automatically available
describe('UserService', () => {
  let UserService;

  beforeAll(async () => {
    // discover() is now a global function
    UserService = await discover({
      name: 'UserService',
      type: 'class',
      methods: ['create', 'update', 'delete']
    });
  });

  test('should discover the service', () => {
    expect(UserService).toBeDefined();
  });

  test('should create users', () => {
    const service = new UserService();
    const user = service.create({ name: 'John' });
    expect(user.id).toBeDefined();
  });
});
```

### Option 2: Setup File

In your `jest.config.js`:

```javascript
module.exports = {
  setupFilesAfterEnv: ['jest-adaptive/setup'],
  // ... your other Jest config
};
```

### Option 3: Transform + Global Setup

For more control over the transformation process:

```javascript
module.exports = {
  transform: {
    '^.+\\.adaptive\\.(test|spec)\\.[jt]sx?$': 'jest-adaptive/transformer',
  },
  globals: {
    'jest-adaptive': {
      // Custom configuration
      discovery: {
        maxDepth: 10,
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      }
    }
  }
};
```

## 🎯 API

### Global Functions

jest-adaptive adds these functions to the global scope:

#### `discover(signature)`

Discover a module by its signature:

```javascript
const MyClass = await discover({
  name: 'MyClass',
  type: 'class',
  methods: ['method1', 'method2']
});
```

#### `adaptiveTest(TestClass)`

Create an adaptive test from a test class:

```javascript
class UserServiceTest extends AdaptiveTest {
  getTargetSignature() {
    return {
      name: 'UserService',
      type: 'class',
      methods: ['create', 'update']
    };
  }

  async runTests(UserService) {
    test('should work', () => {
      const service = new UserService();
      expect(service).toBeDefined();
    });
  }
}

adaptiveTest(UserServiceTest);
```

#### `getDiscoveryEngine()`

Access the discovery engine directly:

```javascript
const engine = getDiscoveryEngine();
const candidates = await engine.discoverCandidates(signature);
```

## 🔧 Configuration

### Using Preset with Custom Config

The preset can be extended with your own configuration:

```javascript
const jestAdaptive = require('jest-adaptive/preset');

module.exports = {
  ...jestAdaptive,
  testMatch: [
    ...jestAdaptive.testMatch,
    '**/my-custom-pattern/**/*.test.js'
  ],
  // Override or extend other settings
};
```

### Discovery Configuration

Customize discovery behavior through Jest globals:

```javascript
module.exports = {
  preset: 'jest-adaptive',
  globals: {
    'jest-adaptive': {
      discovery: {
        // Maximum depth for directory traversal
        maxDepth: 10,
        
        // File extensions to consider
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
        
        // Directories to skip
        skipDirectories: ['node_modules', 'dist', 'build'],
        
        // Custom scoring weights
        scoring: {
          nameMatch: 10,
          methodMatch: 5,
          pathProximity: 3
        }
      }
    }
  }
};
```

## 📝 TypeScript Support

jest-adaptive includes TypeScript definitions. For the best experience:

1. Install type definitions:

```bash
npm install --save-dev @types/jest @types/node
```

2. Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["jest", "jest-adaptive"]
  }
}
```

3. Use with full type safety:

```typescript
import type { DiscoverySignature } from 'adaptive-tests';

describe('TypedService', () => {
  let TypedService: any;

  beforeAll(async () => {
    const signature: DiscoverySignature = {
      name: 'TypedService',
      type: 'class',
      methods: ['process']
    };
    
    TypedService = await discover(signature);
  });

  test('should be typed', () => {
    expect(TypedService).toBeDefined();
  });
});
```

## 🎨 Examples

### Testing React Components

```javascript
describe('Button Component', () => {
  let Button;

  beforeAll(async () => {
    Button = await discover({
      name: 'Button',
      type: 'function',
      exports: 'default'
    });
  });

  test('renders correctly', () => {
    const { render } = require('@testing-library/react');
    const { getByRole } = render(<Button>Click me</Button>);
    expect(getByRole('button')).toBeInTheDocument();
  });
});
```

### Testing Express Middleware

```javascript
describe('Auth Middleware', () => {
  let authMiddleware;

  beforeAll(async () => {
    authMiddleware = await discover({
      name: 'authMiddleware',
      type: 'function',
      exports: 'authMiddleware'
    });
  });

  test('should validate tokens', () => {
    const req = { headers: { authorization: 'Bearer token' } };
    const res = {};
    const next = jest.fn();
    
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
```

### Testing with Multiple Exports

```javascript
describe('Utils Module', () => {
  let utils;

  beforeAll(async () => {
    utils = await discover({
      exports: ['formatDate', 'parseJSON', 'debounce']
    });
  });

  test('should have all utilities', () => {
    expect(utils.formatDate).toBeDefined();
    expect(utils.parseJSON).toBeDefined();
    expect(utils.debounce).toBeDefined();
  });
});
```

## 🚦 Migration from Traditional Tests

### Before (Traditional)

```javascript
// Hardcoded import path - breaks when file moves
const UserService = require('../../../services/UserService');

describe('UserService', () => {
  test('should create users', () => {
    const service = new UserService();
    expect(service.create).toBeDefined();
  });
});
```

### After (Adaptive)

```javascript
// No hardcoded paths - automatically finds UserService
describe('UserService', () => {
  let UserService;

  beforeAll(async () => {
    UserService = await discover({
      name: 'UserService',
      type: 'class',
      methods: ['create']
    });
  });

  test('should create users', () => {
    const service = new UserService();
    expect(service.create).toBeDefined();
  });
});
```

## 🐛 Debugging

### Enable Discovery Debugging

```javascript
module.exports = {
  preset: 'jest-adaptive',
  globals: {
    'jest-adaptive': {
      debug: true,  // Enable debug output
      discovery: {
        logLevel: 'verbose'  // 'error' | 'warn' | 'info' | 'verbose'
      }
    }
  }
};
```

### Use Discovery Lens

```bash
# See why a signature matches or doesn't
npx adaptive-tests why '{"name":"UserService"}'
```

## 🤝 Compatibility

- **Jest**: 27.x, 28.x, 29.x
- **Node.js**: 16.x, 18.x, 20.x
- **TypeScript**: 4.x, 5.x
- **Adaptive Tests**: 0.2.x or higher

## 📚 Documentation

- [Adaptive Tests Documentation](https://github.com/anon57396/adaptive-tests)
- [Jest Configuration](https://jestjs.io/docs/configuration)
- [Examples](https://github.com/anon57396/adaptive-tests/tree/main/examples)

## 📄 License

MIT © Jason Kempf

## 🙏 Contributing

Contributions are welcome! Please read our [contributing guidelines](../../CONTRIBUTING.md) first.

## 🐞 Issues

Found a bug? Have a question? Please [open an issue](https://github.com/anon57396/adaptive-tests/issues).

## ⭐ Support

If this package helps your team, please consider [starring the repository](https://github.com/anon57396/adaptive-tests) and [sponsoring the project](https://github.com/sponsors/anon57396).
