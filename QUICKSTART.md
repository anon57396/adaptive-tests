# Quick Start - 5 Minutes to Better Testing

## 1. See It Work (30 seconds)

```bash
git clone https://github.com/adaptive-tests/adaptive-tests.git
cd adaptive-tests
npm install
npm run validate
# Full suite: adaptive discovery + calculator demos
npm test
```

Watch as:
- ✅ Both test suites pass with working code
- ✅ Traditional breaks when files move, adaptive survives
- ✅ Both catch real bugs (adaptive tests aren't fake!)

## 2. Try It Yourself (2 minutes)

```bash
# Interactive comparison
npm run compare

# Break something and watch both fail
npm run demo:broken
npm test

# Move files and watch only traditional fail
npm run refactor
npm test
```

## 3. Use It In Your Project (2 minutes)

Copy these two files to your project:
- `src/adaptive/discovery.js` - Finds your components
- `src/adaptive/test-base.js` - Base test class

Write your first adaptive test:

```javascript
const { getDiscoveryEngine } = require('./adaptive/discovery');

describe('My Component', () => {
  let MyComponent;

  beforeAll(async () => {
    const engine = getDiscoveryEngine();
    MyComponent = await engine.discoverTarget({
      name: 'MyComponent',
      type: 'class',
      methods: ['doSomething']
    });
  });

  test('does something', () => {
    const instance = new MyComponent();
    expect(instance.doSomething()).toBe('expected');
  });
});
```

## That's It!

Your test will now find `MyComponent` wherever it lives. Move it anywhere. Rename the file. Reorganize your entire project. The test still works.

No more fixing imports. Ever.

## Common Patterns

### Finding a class
```javascript
await engine.discoverTarget({
  name: 'UserService',
  type: 'class',
  methods: ['createUser', 'deleteUser']
});
```

### Finding a function
```javascript
await engine.discoverTarget({
  name: 'calculateTax',
  type: 'function'
});
```

### Finding a React component
```javascript
await engine.discoverTarget({
  name: 'Button',
  exports: 'Button',
  type: 'function'  // or 'class' for class components
});
```

## FAQ

**Does it slow down tests?**
First run: ~100ms. After that: <10ms with caching.

**Does it work with TypeScript?**
Yes. See `examples/typescript/`.

**What about my framework?**
Works with any test runner (Jest, Mocha, Vitest) and any framework.

**Is this production ready?**
We use it in production. It's just a pattern, not a framework.

## Next Steps

- Read the [full documentation](README.md)
- Check out [more examples](examples/)
- [Contribute](CONTRIBUTING.md) improvements
- Star the repo if this helped you!

---

Stop fixing test imports. Start testing what matters.