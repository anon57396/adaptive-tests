# Quick Start – 5 Minutes to Resilient Tests

## 1. Install

```bash
npm install adaptive-tests
# Optional, only if you want to discover raw TypeScript sources
npm install --save-dev ts-node
```

Want to mirror the pattern in Python? `pip install adaptive-tests-py`.

## 2. Write Your First Adaptive Test

```javascript
const path = require('path');
const { getDiscoveryEngine } = require('adaptive-tests');

const engine = getDiscoveryEngine(path.resolve(__dirname, '../..'));

describe('Calculator – adaptive discovery', () => {
  let Calculator;

  beforeAll(async () => {
    Calculator = await engine.discoverTarget({
      name: 'Calculator',
      type: 'class',
      methods: ['add', 'subtract', 'multiply', 'divide']
    });
  });

  it('performs arithmetic without import paths', () => {
    const calc = new Calculator();
    expect(calc.add(2, 3)).toBe(5);
  });
});
```

The engine parses your source files with `@babel/parser`, validates the
signature against classes/functions/exports, and only requires the selected
module after validation. No brittle import paths.

## 3. Useful Signatures

```javascript
// Find a class by name
await engine.discoverTarget({ name: 'UserService', type: 'class' });

// Find a function that lives anywhere
await engine.discoverTarget({ name: 'calculateTax', type: 'function' });

// Match a class by methods and instance properties
await engine.discoverTarget({
  type: 'class',
  methods: ['login', 'logout'],
  properties: ['sessions']
});

// Regex on names works too
await engine.discoverTarget({ name: /Controller$/, type: 'class' });
```

## 4. Move Files – Tests Still Pass

1. Write an adaptive test.
2. Run it once – it will populate `.test-discovery-cache.json`.
3. Move or rename the source file.
4. Run it again – the test still finds the new location.

## 5. Helpful Commands

```bash
npm run validate   # Full demo: healthy → refactor → broken code
npm run compare    # See traditional vs adaptive output side by side
npm run demo       # Quick proof of resilience
```

## Learn More

- How It Works: docs/HOW_IT_WORKS.md
- Best Practices: docs/BEST_PRACTICES.md

## What Not To Do

```javascript
// ❌ Hardcoded relative import
const Calculator = require('../../../src/utils/Calculator');

// ✅ Adaptive discovery
const Calculator = await engine.discoverTarget({ name: 'Calculator', type: 'class' });
```

Adaptive Tests removes import maintenance from your refactoring checklist.
