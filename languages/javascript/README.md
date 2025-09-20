# Adaptive Tests for JavaScript/Node.js

[![npm version](https://img.shields.io/npm/v/adaptive-tests.svg)](https://www.npmjs.com/package/adaptive-tests)
[![Coverage](https://img.shields.io/codecov/c/github/anon57396/adaptive-tests?label=coverage)](https://codecov.io/gh/anon57396/adaptive-tests)

> **The only testing framework built for AI-driven development**

When AI agents rapidly reshape your codebase, traditional tests break constantly. Adaptive Tests uses **zero-runtime discovery** powered by AST analysis to find code by structure, not file paths. Your tests adapt as AI builds.

**Stop wasting AI cycles on import maintenance.** Move files, rename directories, refactor into new layers—adaptive suites still find the code they care about, while traditional suites keep failing with import errors.

---

## Quick Start

### Option 1: Zero-Config with jest-adaptive

```bash
npm install --save-dev jest-adaptive adaptive-tests
```

Add to your `jest.config.js`:

```javascript
module.exports = {
  preset: 'jest-adaptive',
};
```

Now `discover()` and `adaptiveTest()` are available as globals in all tests!

### Option 2: Standard Installation

```bash
npm install adaptive-tests
```

Then use directly in tests:

```javascript
const { discover } = require('adaptive-tests');

it('authenticates a user', async () => {
  const AuthService = await discover({
    name: 'AuthService',
    type: 'class',
    methods: ['login', 'logout'],
    properties: ['sessions']
  });

  const service = new AuthService();
  const result = await service.login({ username: 'ada', password: 'secret' });

  expect(result.success).toBe(true);
});
```

---

## 🎭 Invisible Mode (Experimental)

**Broken import? One command fixes it:**

```bash
npx adaptive-tests enable-invisible
```

Your existing tests can automatically adapt when imports break during refactoring. No code changes. Opt‑in only.

**When you see:**
```text
Error: Cannot find module './UserService'
```

**Just run:**
```bash
npx adaptive-tests enable-invisible
npm test  # Tests now pass
```

---

## Core API

### `discover(signature, rootPath?)`

The primary API for finding code by structure:

```javascript
const { discover } = require('adaptive-tests');

// Simple discovery
const Calculator = await discover('Calculator');

// Detailed signature
const UserService = await discover({
  name: 'UserService',
  type: 'class',
  methods: ['findById', 'create', 'update'],
  properties: ['repository']
});

// With custom root path
const PaymentGateway = await discover({
  name: 'PaymentGateway',
  type: 'class'
}, './src/payments');
```

### `getDiscoveryEngine(rootPath?)`

For reusable engine instances:

```javascript
const { getDiscoveryEngine } = require('adaptive-tests');

const engine = getDiscoveryEngine('./src');
const Calculator = await engine.discoverTarget('Calculator');
const UserService = await engine.discoverTarget('UserService');
```

### `AdaptiveTest` Class

For structured, reusable test patterns:

```javascript
const { AdaptiveTest } = require('adaptive-tests');

class CalculatorTest extends AdaptiveTest {
  getTargetSignature() {
    return {
      name: 'Calculator',
      type: 'class',
      methods: ['add', 'subtract']
    };
  }

  async runTests(Calculator) {
    test('adds numbers', () => {
      const calc = new Calculator();
      expect(calc.add(2, 3)).toBe(5);
    });
  }
}

// Use in Jest
describe('Calculator', () => {
  const calcTest = new CalculatorTest();
  calcTest.run();
});
```

---

## Framework Integration

### Jest

Use the jest-adaptive preset for the best experience:

```javascript
// jest.config.js
module.exports = {
  preset: 'jest-adaptive',
  // your other Jest config
};
```

### Vitest

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    // Add the vite plugin
    require('./plugins/vite')()
  ]
});
```

### Webpack

```javascript
// webpack.config.js
const AdaptiveTestsPlugin = require('./plugins/webpack');

module.exports = {
  plugins: [
    new AdaptiveTestsPlugin()
  ]
};
```

---

## CLI Commands

### Initialize Project

```bash
npx adaptive-tests init
```

Interactive setup wizard that configures your project for adaptive testing.

### Generate Tests

```bash
# Single file
npx adaptive-tests scaffold src/services/UserService.js

# Entire directory
npx adaptive-tests scaffold --batch src/

# With TypeScript
npx adaptive-tests scaffold --typescript src/Calculator.ts
```

### Migrate Existing Tests

```bash
npx adaptive-tests migrate tests/
```

Converts traditional tests to adaptive tests automatically.

### Debug Discovery

```bash
npx adaptive-tests why '{"name":"Calculator"}'
```

Shows why a signature matched (or didn't) with detailed scoring.

### Enable Invisible Mode

```bash
npx adaptive-tests enable-invisible  # Enable
npx adaptive-tests enable-invisible --undo  # Disable
```

---

## Examples

This package includes complete examples:

### Calculator Example
- Location: `./languages/javascript/examples/calculator/`
- Demonstrates: Basic class discovery, method testing
- Run: `npm run test:calculator`

### API Service Example
- Location: `./examples/api-service/`
- Demonstrates: Express routes, middleware, async patterns
- Run: `npm run test:api-service`

### Todo App Example
- Location: `./examples/todo-app/`
- Demonstrates: Complex business logic, service layer
- Run: `npm run test:todo-app`

### Run All Examples
```bash
npm run test:examples
```

---

## Templates

Get started quickly with framework templates:

### Available Templates

| Template | Description | Usage |
|----------|-------------|-------|
| `nextjs` | Next.js 13+ with App Router | `npx create-adaptive-app my-app --template nextjs` |
| `vite` | Vite + React, lightning fast | `npx create-adaptive-app my-app --template vite` |
| `cra` | Create React App | `npx create-adaptive-app my-app --template cra` |
| `express` | Express.js API | `npx create-adaptive-app my-app --template express` |

### Template Usage

```bash
# Interactive selection
npx create-adaptive-app my-project

# Specific template
npx create-adaptive-app my-project --template nextjs

# Manual copy
cp -r ./templates/nextjs-adaptive my-project
cd my-project
npm install
```

---

## Configuration

### Basic Configuration

Create `adaptive-tests.config.js`:

```javascript
module.exports = {
  discovery: {
    // Directories to search
    include: ['src/**/*.js', 'lib/**/*.js'],

    // Directories to skip
    exclude: ['node_modules', 'dist', 'build'],

    // Maximum search depth
    maxDepth: 10,

    // Enable caching
    cache: true
  },

  scoring: {
    // Boost exact name matches
    exactNameWeight: 50,

    // Boost method signature matches
    methodWeight: 20,

    // Minimum score to consider a match
    threshold: 40
  }
};
```

### Advanced Configuration

```javascript
module.exports = {
  discovery: {
    // Custom AST parsers
    parsers: {
      '.jsx': 'babel',
      '.mjs': 'babel'
    },

    // Custom ignore patterns
    ignore: [
      '**/test/**',
      '**/*.test.js',
      '**/node_modules/**'
    ],

    // Follow symbolic links
    followSymlinks: false,

    // Timeout for discovery (ms)
    timeout: 30000
  },

  // Language-specific settings
  languages: {
    javascript: {
      // Parse JSX syntax
      jsx: true,

      // Parse decorators
      decorators: true,

      // Parse class properties
      classProperties: true
    }
  }
};
```

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
npm run test:unit         # Unit tests
npm run test:integration  # Integration tests
npm run test:examples     # Example tests
npm run test:cli          # CLI tests
```

### Coverage

```bash
npm run test:coverage
```

### Validation

```bash
npm run validate
```

Runs the complete validation suite that proves adaptive tests work as advertised.

---

## Performance

### Benchmarks

- **First discovery**: ~5ms
- **Cached discovery**: <1ms
- **Zero runtime overhead** after discovery
- **50-70% faster** than v0.2.4

### Optimization Tips

1. **Use caching**: Enable in config for faster subsequent runs
2. **Limit search scope**: Use specific include patterns
3. **Exclude large directories**: Skip node_modules, dist, etc.
4. **Reuse engines**: Create one engine per test file

```javascript
// Good: Reuse engine
const engine = getDiscoveryEngine();
const Service1 = await engine.discoverTarget('Service1');
const Service2 = await engine.discoverTarget('Service2');

// Avoid: Creating multiple engines
const Service1 = await discover('Service1');
const Service2 = await discover('Service2');
```

---

## Troubleshooting

### Common Issues

**Discovery fails**
```bash
# Debug with why command
npx adaptive-tests why '{"name":"Calculator"}'
```

**Performance issues**
```javascript
// Limit search scope
const Calculator = await discover('Calculator', './src/math');
```

**Import errors after refactoring**
```bash
# Enable invisible mode
npx adaptive-tests enable-invisible
```

**Tests pass locally but fail in CI**
```bash
# Check discovery paths
npx adaptive-tests why '{"name":"YourClass"}' --json
```

### Getting Help

- 🐛 [Issues](https://github.com/anon57396/adaptive-tests/issues) - Bug reports
- 💬 [Discussions](https://github.com/anon57396/adaptive-tests/discussions) - Community support
- 📚 [Documentation](https://anon57396.github.io/adaptive-tests/) - Complete docs

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone and setup
git clone https://github.com/anon57396/adaptive-tests.git
cd adaptive-tests/languages/javascript
npm install

# Run tests
npm test

# Run examples
npm run test:examples
```

---

## License

MIT - See [LICENSE](../../LICENSE) for details.

---

**Ready to make your tests refactoring-proof?**

```bash
npm install adaptive-tests
```

Start with the [Quick Start](#quick-start) guide above!