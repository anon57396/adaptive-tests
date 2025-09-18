# Common Issues & Solutions for Adaptive Testing

## ⚠️ Issues You WILL Encounter

### 1. Test Files Being Discovered and Executed
**Problem**: Discovery engine finds and requires test files, causing:
- `Cannot nest a describe inside a test` errors
- Test suites executing during discovery
- Massive console output during test runs

**Solution**: Already fixed in framework - test files (`.test.js`, `.spec.js`) are automatically excluded from discovery.

### 2. Module Discovery Confusion
**Problem**: Trying to discover modules with multiple exports doesn't work as expected:
```javascript
// THIS DOESN'T WORK
await engine.discoverTarget({
  type: 'module',
  exports: ['processArray', 'transformData']  // ❌ Array not supported
});
```

**Solution**: Discover functions individually:
```javascript
// THIS WORKS
const processArray = await engine.discoverTarget({
  name: 'processArray',
  type: 'function'
});
```

### 3. Scripts/Demos Polluting Discovery
**Problem**: Random JS files (demos, scripts, migrations) get discovered and executed, potentially calling `process.exit()` or running unintended code.

**Solution**: Keep non-production code in these excluded directories:
- `/scripts` - Utility scripts
- `/build` - Build outputs
- `/dist` - Distribution files
- `/coverage` - Test coverage reports

### 4. Require Cache Stale Module Issues
**Problem**: When testing file moves or dynamic changes, you get old versions of modules.

**Solution**: Clear both discovery and require cache:
```javascript
engine.clearCache();  // Clear discovery cache
Object.keys(require.cache).forEach(key => {
  if (key.includes('YourModule')) {
    delete require.cache[key];
  }
});
```

### 5. Wrong Module Being Discovered
**Problem**: Discovery engine finds "BrokenCalculator.js" instead of "Calculator.js" due to path scoring or naming.

**Solution**: Use more specific signatures:
```javascript
await engine.discoverTarget({
  name: 'Calculator',
  type: 'class',
  methods: ['add', 'subtract'],  // More specific
  exports: 'Calculator'          // Exact export name
});
```

### 6. Tests Fail After Moving Files
**Problem**: After moving target files, tests can't find them.

**Solution**: This is actually GOOD - it means you have hardcoded paths! Convert to adaptive:
```javascript
// BAD - Hardcoded path
const Calculator = require('../src/Calculator');

// GOOD - Adaptive discovery
const Calculator = await engine.discoverTarget({
  name: 'Calculator',
  type: 'class'
});
```

## 📋 Checklist for New Adaptive Tests

- [ ] Use discovery engine, not require/import
- [ ] Clear cache in beforeEach if testing mutations
- [ ] Put test files in `/tests` directory
- [ ] Keep utility scripts in `/scripts` directory
- [ ] Use specific signatures (name + type + methods)
- [ ] Test that your tests survive file moves

## 🚨 Red Flags Your Tests Aren't Adaptive

1. Your tests break when files move
2. You see `require('../../../src/something')`
3. Tests fail with "Cannot find module" after refactoring
4. You're using mocks instead of discovering real implementations
5. Your test file has more setup code than actual tests

## 💡 Pro Tips

1. **Start simple**: Just use `name` and `type` in your signature
2. **Add specificity if needed**: Add `methods` array if multiple matches
3. **Use patterns**: `name: /User.*Service/` for flexible matching
4. **Cache is your friend**: Don't clear it unless you need to
5. **Test the behavior**: Focus on what the code does, not where it lives

## 🐛 Debug Mode

If discovery isn't finding your module:

```javascript
// See what's being discovered
const engine = getDiscoveryEngine();
engine.clearCache();  // Force fresh scan

// Try minimal signature first
const result = await engine.discoverTarget({
  name: 'YourModule'
});

// Then add constraints
const result = await engine.discoverTarget({
  name: 'YourModule',
  type: 'class',
  methods: ['someMethod']
});
```

## Still Stuck?

The discovery engine prefers:
- Files in `/src`, `/lib`, `/app` directories (+12 to +4 points)
- Files NOT in `/tests`, `/mocks`, `/fixtures` (-15 to -50 points)
- Exact name matches (+45 points)
- Files with matching method names mentioned (+3 per method)

Check your file location and naming!