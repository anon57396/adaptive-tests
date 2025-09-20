# Troubleshooting Guide

## Common Issues and Solutions

This comprehensive guide helps you resolve common issues with adaptive-tests across all supported languages and frameworks.

---

## Table of Contents

- [Discovery Issues](#discovery-issues)
- [Performance Problems](#performance-problems)
- [Language-Specific Issues](#language-specific-issues)
- [VS Code Extension Issues](#vs-code-extension-issues)
- [CI/CD Problems](#cicd-problems)
- [Error Messages](#error-messages)

---

## Discovery Issues

### "No candidates found for signature"

**Symptoms**:

```text
Error: No candidates found for signature {"name":"MyComponent"}
```

**Solutions**:

1. **Check the exact export name**:

```bash
# See what's actually exported
npx adaptive-tests analyze src/components/MyComponent.js
```

1. **Use the Discovery Lens to debug**:

```bash
# See why discovery is failing
npx adaptive-tests why '{"name":"MyComponent"}' --json
```

1. **Verify file is in search path**:

```javascript
const Component = await discover({
  name: 'MyComponent'
}, {
  searchPaths: ['./src', './components', './lib'],
  verbose: true  // See where it's searching
});
```

1. **Check for case sensitivity issues**:

```javascript
// Wrong - case mismatch
{ name: 'mycomponent' }

// Correct - exact case
{ name: 'MyComponent' }
```

### "Multiple candidates found, ambiguous match"

**Problem**: Multiple files export the same name

**Solutions**:

1. **Add more specific criteria**:

```javascript
const Service = await discover({
  name: 'UserService',
  type: 'class',
  methods: ['login', 'logout'],  // More specific
  path: 'services'  // Path hint
});
```

1. **Use full path matching**:

```javascript
const Service = await discover({
  name: 'UserService',
  fullPath: 'src/services/UserService.js'
});
```

### Discovery is too slow

**Solutions**:

1. **Enable caching**:

```javascript
// In jest.setup.js or test setup
const { enablePersistentCache } = require('adaptive-tests');
enablePersistentCache({
  cacheDir: '.adaptive-cache',
  maxAge: 86400000  // 24 hours
});
```

1. **Limit search scope**:

```javascript
// Don't search node_modules or build directories
const engine = getDiscoveryEngine(process.cwd(), {
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  maxDepth: 5
});
```

1. **Use specific file extensions**:

```javascript
const Component = await discover({
  name: 'Component'
}, {
  extensions: ['.tsx', '.jsx'],  // Don't check .js, .ts, etc.
});
```

---

## Performance Problems

### Tests run slowly

**Solutions**:

1. **Parallelize test execution**:

```json
// package.json
{
  "scripts": {
    "test": "jest --maxWorkers=50%"
  }
}
```

1. **Cache discovery results between runs**:

```javascript
// jest.config.js
module.exports = {
  globals: {
    'adaptive-tests': {
      cache: true,
      cacheDirectory: '.jest-adaptive-cache'
    }
  }
};
```

1. **Pre-warm the cache**:

```bash
# Run before tests to build cache
npx adaptive-tests warm --all
```

### Memory leaks during testing

**Symptoms**: Tests consume increasing memory, eventual crash

**Solutions**:

1. **Clear cache between test suites**:

```javascript
afterAll(() => {
  const { clearCache } = require('adaptive-tests');
  clearCache();
});
```

1. **Limit cache size**:

```javascript
const { setMaxCacheSize } = require('adaptive-tests');
setMaxCacheSize(100);  // Max 100 cached modules
```

1. **Use worker isolation**:

```json
// jest.config.js
{
  "testRunner": "jest-runner-isolated"
}
```

---

## Language-Specific Issues

### JavaScript/TypeScript

#### Issue: "Cannot use import statement outside a module"

**Solution**:

```json
// package.json
{
  "type": "module"
}
```

Or use Babel:

```javascript
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }]
  ]
};
```

#### Issue: TypeScript types not found

**Solution**:

```bash
npm install --save-dev ts-node @types/node
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "allowJs": true,
    "resolveJsonModule": true
  }
}
```

### Java

#### Issue: "Maven project not detected"

**Solution**:

```bash
# Ensure pom.xml exists
ls pom.xml

# Install Java CLI
cd languages/java
mvn clean install
```

#### Issue: "Package structure doesn't match"

**Solution**: Ensure proper Maven/Gradle structure:

```text
src/
├── main/
│   └── java/
│       └── com/example/YourClass.java
└── test/
    └── java/
        └── com/example/YourClassTest.java
```

### PHP

#### Issue: "Composer autoload not found"

**Solution**:

```bash
composer install
composer dump-autoload
```

#### Issue: "PHPUnit not configured"

**Solution**:

```xml
<!-- phpunit.xml -->
<phpunit bootstrap="vendor/autoload.php">
  <testsuites>
    <testsuite name="adaptive">
      <directory>tests/adaptive</directory>
    </testsuite>
  </testsuites>
</phpunit>
```

### Python

#### Issue: "Module not found"

**Solution**:

```bash
# Add project to Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Or in test file
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
```

#### Issue: "Invalid signature for Python"

**Solution**: Use Python-specific signatures:

```python
# discover.json
{
  "name": "Calculator",
  "type": "class",
  "methods": ["add", "subtract"],
  "module": "src.utils.calculator"
}
```

---

## VS Code Extension Issues

### Extension not activating

**Solutions**:

1. **Check extension logs**:
   - Open Command Palette: `Cmd/Ctrl + Shift + P`
   - Run: "Developer: Show Extension Logs"
   - Select: "Adaptive Tests"

1. **Reload VS Code window**:
   - Command Palette: "Developer: Reload Window"

1. **Check workspace trust**:
   - Ensure workspace is trusted
   - Check: File > Preferences > Settings > Security

### Discovery Lens not showing results

**Solutions**:

1. **Verify adaptive-tests is installed**:

```bash
npm list adaptive-tests
```

1. **Check webview developer tools**:
   - Command Palette: "Developer: Open Webview Developer Tools"
   - Check for JavaScript errors

1. **Reset extension state**:
   - Command Palette: "Adaptive Tests: Reset State"

### CodeLens not appearing

**Solutions**:

1. **Enable CodeLens in settings**:

```json
// .vscode/settings.json
{
  "editor.codeLens": true,
  "adaptive-tests.codeLens.enabled": true
}
```

1. **Check file type is supported**:
   - Supported: .js, .jsx, .ts, .tsx, .java, .php, .py
   - Not supported: .vue, .svelte (yet)

---

## CI/CD Problems

### Tests fail in CI but pass locally

**Common causes**:

1. **Different Node.js versions**:

```yaml
# .github/workflows/test.yml
- uses: actions/setup-node@v3
  with:
    node-version: '18'  # Match local version
```

1. **Missing dependencies**:

```yaml
- run: npm ci  # Use ci instead of install
```

1. **File path case sensitivity**:

```javascript
// Wrong - works on Windows/Mac, fails on Linux
import Component from './MyComponent';

// Correct - exact case
import Component from './myComponent';
```

### GitHub Actions timeout

**Solutions**:

```yaml
jobs:
  test:
    timeout-minutes: 30  # Increase timeout
    steps:
      - uses: actions/cache@v3
        with:
          path: |
            ~/.npm
            .adaptive-cache
          key: ${{ runner.os }}-adaptive-${{ hashFiles('**/package-lock.json') }}
```

---

## Error Messages

### "ENOENT: no such file or directory"

**Cause**: File path issues, often on Windows

**Solution**:

```javascript
// Use path.join instead of string concatenation
const path = require('path');
const testPath = path.join(__dirname, 'tests', 'adaptive');
```

### "Cannot read property 'discover' of undefined"

**Cause**: Incorrect import

**Solution**:

```javascript
// Wrong
import discover from 'adaptive-tests';

// Correct
import { discover } from 'adaptive-tests';
// or
const { discover } = require('adaptive-tests');
```

### "Maximum call stack exceeded"

**Cause**: Circular dependencies or infinite recursion

**Solution**:

```javascript
// Add cycle detection
const { discover } = require('adaptive-tests');

const Module = await discover({
  name: 'Module'
}, {
  detectCycles: true,
  maxDepth: 10
});
```

### "Jest encountered an unexpected token"

**Cause**: ES6 modules not transpiled

**Solution**:

```javascript
// jest.config.js
module.exports = {
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(adaptive-tests)/)'
  ]
};
```

---

## Debug Mode

Enable verbose logging for detailed troubleshooting:

```bash
# Set environment variable
DEBUG=adaptive-tests:* npm test

# Or in code
process.env.DEBUG = 'adaptive-tests:*';
```

Debug categories:

- `adaptive-tests:discovery` - Discovery engine logs
- `adaptive-tests:cache` - Cache operations
- `adaptive-tests:ast` - AST parsing details
- `adaptive-tests:score` - Scoring algorithm

---

## Getting More Help

1. **Check existing issues**: [GitHub Issues](https://github.com/anon57396/adaptive-tests/issues)

1. **Ask on GitHub**: [Open a discussion](https://github.com/anon57396/adaptive-tests/discussions)

1. **Provide reproduction**:

```bash
# Create minimal reproduction
npx create-adaptive-repro my-issue
```

1. **Include debug info**:

```bash
npx adaptive-tests debug --system-info > debug.log
```

When reporting issues, include:

- Adaptive-tests version
- Node.js/Python/Java version
- Operating system
- Error messages
- Minimal code to reproduce

---

## Quick Fixes Checklist

- [ ] Is adaptive-tests installed? (`npm list adaptive-tests`)
- [ ] Are you using the latest version? (`npm update adaptive-tests`)
- [ ] Is the file path correct? (case-sensitive on Linux)
- [ ] Is the export name exact? (case-sensitive)
- [ ] Did you clear the cache? (`npx adaptive-tests clear-cache`)
- [ ] Are all dependencies installed? (`npm ci`)
- [ ] Is TypeScript configured? (`ts-node` installed?)
- [ ] Is the signature valid JSON? (`npx adaptive-tests validate`)

---

## Prevention Tips

1. **Use TypeScript** for better IDE support and type checking
1. **Enable linting** to catch issues early
1. **Add pre-commit hooks** for consistency
1. **Document your patterns** for team members
1. **Keep dependencies updated** regularly
1. **Test on multiple platforms** if deploying broadly
1. **Use the VS Code extension** for visual debugging

Remember: Most issues are related to paths, exports, or configuration. When in doubt, use the Discovery Lens (`npx adaptive-tests why`) to see what the engine sees!
