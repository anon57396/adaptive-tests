# Quick Start - Writing Your First Adaptive Test

## 30-Second Version

```javascript
// 1. Import discovery engine
const { getDiscoveryEngine } = require('adaptive-tests');
const engine = getDiscoveryEngine();

// 2. Discover your target dynamically
const Calculator = await engine.discoverTarget({
  name: 'Calculator',
  type: 'class'
});

// 3. Test it normally
const calc = new Calculator();
expect(calc.add(2, 3)).toBe(5);
```

**That's it!** Your test will now find `Calculator` wherever it lives.

## Full Example

```javascript
const path = require('path');
const { getDiscoveryEngine } = require('adaptive-tests');

// Create engine starting from your project root
const engine = getDiscoveryEngine(path.resolve(__dirname, '../..'));

describe('Calculator - Adaptive Tests', () => {
  let Calculator;

  beforeAll(async () => {
    // Discover the Calculator class dynamically
    Calculator = await engine.discoverTarget({
      name: 'Calculator',
      type: 'class',
      methods: ['add', 'subtract', 'multiply', 'divide']
    });
  });

  test('should perform calculations', () => {
    const calc = new Calculator();
    expect(calc.add(5, 3)).toBe(8);
    expect(calc.multiply(4, 7)).toBe(28);
  });
});
```

## Discovery Signatures

### Find a Class by Name
```javascript
await engine.discoverTarget({
  name: 'UserService',
  type: 'class'
});
```

### Find a Function
```javascript
await engine.discoverTarget({
  name: 'validateEmail',
  type: 'function'
});
```

### Find by Methods (When Multiple Classes Have Same Name)
```javascript
await engine.discoverTarget({
  name: 'Logger',
  type: 'class',
  methods: ['info', 'error', 'debug']  // Finds the Logger with these methods
});
```

### Find Using Patterns
```javascript
await engine.discoverTarget({
  name: /User.*/,  // Matches UserService, UserController, etc.
  type: 'class'
});
```

## What NOT to Do

```javascript
// ❌ DON'T DO THIS - Hardcoded path
const Calculator = require('../../../src/utils/Calculator');

// ❌ DON'T DO THIS - Will break when file moves
import { Calculator } from './Calculator';

// ❌ DON'T DO THIS - Too much mocking
jest.mock('../../../src/utils/Calculator');

// ✅ DO THIS - Adaptive discovery
const Calculator = await engine.discoverTarget({ name: 'Calculator' });
```

## Move Files, Tests Still Pass!

With adaptive tests, you can:
- Move `Calculator.js` to any directory
- Rename the file (as long as class name stays the same)
- Reorganize your entire project structure
- Tests will still find and test your code!

## Try It Yourself

1. Write an adaptive test for your class
2. Run the test - it passes ✅
3. Move your class to a completely different directory
4. Run the test again - it still passes! ✅

That's the power of adaptive testing!