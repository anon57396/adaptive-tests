# Migration Guide

## Migrating from Traditional Tests to Adaptive Tests

This guide helps you migrate existing test suites to adaptive tests, whether you're starting fresh or maintaining both approaches side-by-side.

## Table of Contents

- [Quick Migration](#quick-migration)
- [Gradual Migration Strategy](#gradual-migration-strategy)
- [Framework-Specific Guides](#framework-specific-guides)
- [Common Patterns](#common-patterns)
- [Troubleshooting Migration](#troubleshooting-migration)

---

## Quick Migration

For a single test file:

```bash
# 1. Install adaptive-tests
npm install adaptive-tests

# 2. Generate adaptive version of existing test
npx adaptive-tests scaffold src/components/Button.js --output-dir tests/adaptive

# 3. Compare traditional vs adaptive
npm test -- tests/traditional/Button.test.js  # Traditional
npm test -- tests/adaptive/Button.test.js     # Adaptive
```

---

## Gradual Migration Strategy

### Phase 1: Parallel Testing (Recommended)

Run both traditional and adaptive tests during transition:

```javascript
// package.json
{
  "scripts": {
    "test": "npm run test:traditional && npm run test:adaptive",
    "test:traditional": "jest tests/traditional",
    "test:adaptive": "jest tests/adaptive",
    "test:watch": "jest --watch"
  }
}
```

### Phase 2: File-by-File Migration

1. **Start with leaf components** (no dependencies):

```bash
npx adaptive-tests scaffold src/utils/validators.js
npx adaptive-tests scaffold src/components/Button.js
```

1. **Move to service layers**:

```bash
npx adaptive-tests scaffold src/services/AuthService.js
npx adaptive-tests scaffold src/services/DataService.js
```

1. **Finish with integration tests**:

```bash
npx adaptive-tests scaffold src/api/endpoints.js
```

### Phase 3: Consolidation

Once confident, remove traditional tests:

```bash
rm -rf tests/traditional
mv tests/adaptive tests
```

---

## Framework-Specific Guides

### React Applications

#### Before (Traditional Test)

```javascript
// tests/Button.test.js
import Button from '../src/components/Button';
import { render, fireEvent } from '@testing-library/react';

test('handles click', () => {
  const onClick = jest.fn();
  const { getByText } = render(<Button onClick={onClick}>Click me</Button>);
  fireEvent.click(getByText('Click me'));
  expect(onClick).toHaveBeenCalled();
});
```

#### After (Adaptive Test)

```javascript
// tests/adaptive/Button.test.js
const { discover } = require('adaptive-tests');
const { render, fireEvent } = require('@testing-library/react');

test('handles click', async () => {
  const Button = await discover({
    name: 'Button',
    type: 'function',  // or 'class' for class components
    exports: 'default'
  });

  const onClick = jest.fn();
  const { getByText } = render(<Button onClick={onClick}>Click me</Button>);
  fireEvent.click(getByText('Click me'));
  expect(onClick).toHaveBeenCalled();
});
```

### Express APIs

#### Before (Traditional Express Test)

```javascript
// tests/userRoutes.test.js
const request = require('supertest');
const app = require('../src/app');

test('GET /users returns list', async () => {
  const response = await request(app).get('/users');
  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
});
```

#### After (Adaptive Express Test)

```javascript
// tests/adaptive/userRoutes.test.js
const { discover } = require('adaptive-tests');
const request = require('supertest');

test('GET /users returns list', async () => {
  const app = await discover({
    name: 'app',
    type: 'const',
    exports: 'default'
  });

  const response = await request(app).get('/users');
  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
});
```

### Vue.js Components

#### Before

```javascript
import { mount } from '@vue/test-utils';
import Counter from '@/components/Counter.vue';

test('increments count', () => {
  const wrapper = mount(Counter);
  wrapper.find('button').trigger('click');
  expect(wrapper.text()).toContain('1');
});
```

#### After

```javascript
const { discover } = require('adaptive-tests');
const { mount } = require('@vue/test-utils');

test('increments count', async () => {
  const Counter = await discover({
    name: 'Counter',
    type: 'vue-component',
    exports: 'default'
  });

  const wrapper = mount(Counter);
  wrapper.find('button').trigger('click');
  expect(wrapper.text()).toContain('1');
});
```

### Angular Services

#### Before (Traditional Angular Test)

```typescript
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../src/services/auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  it('authenticates user', () => {
    expect(service.login('user', 'pass')).toBeTruthy();
  });
});
```

#### After (Adaptive Angular Test)

```typescript
import { discover } from 'adaptive-tests';
import { TestBed } from '@angular/core/testing';

describe('AuthService', () => {
  let AuthService: any;

  beforeAll(async () => {
    AuthService = await discover({
      name: 'AuthService',
      type: 'class',
      methods: ['login', 'logout']
    });
  });

  it('authenticates user', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(AuthService);
    expect(service.login('user', 'pass')).toBeTruthy();
  });
});
```

---

## Common Patterns

### Pattern 1: Testing Multiple Exports

```javascript
// When a module exports multiple items
const { discover } = require('adaptive-tests');

test('uses multiple exports', async () => {
  const validators = await discover({
    name: 'validators',
    exports: ['isEmail', 'isPhone', 'isURL']
  });

  expect(validators.isEmail('test@example.com')).toBe(true);
  expect(validators.isPhone('555-1234')).toBe(true);
  expect(validators.isURL('https://example.com')).toBe(true);
});
```

### Pattern 2: Mocking Dependencies

```javascript
// Adaptive tests work seamlessly with jest.mock
jest.mock('axios');

test('fetches data', async () => {
  const DataService = await discover({
    name: 'DataService',
    type: 'class',
    methods: ['fetchUsers']
  });

  const axios = require('axios');
  axios.get.mockResolvedValue({ data: ['user1', 'user2'] });

  const service = new DataService();
  const users = await service.fetchUsers();
  expect(users).toEqual(['user1', 'user2']);
});
```

### Pattern 3: Testing Private Methods

```javascript
// Adaptive tests can discover internal methods
const InternalAPI = await discover({
  name: 'InternalAPI',
  type: 'class',
  methods: ['_validateInput', '_processData'],  // Private methods
  internal: true  // Enable internal discovery
});
```

### Pattern 4: Dynamic Imports

```javascript
// For code-splitting and lazy loading
test('lazy loads component', async () => {
  const LazyComponent = await discover({
    name: 'LazyComponent',
    lazy: true,  // Enables dynamic import handling
    chunk: 'components'  // Optional: specify webpack chunk
  });

  // Component is loaded only when needed
  const instance = await LazyComponent();
  expect(instance).toBeDefined();
});
```

---

## Troubleshooting Migration

### Issue: Discovery Can't Find Module

**Symptom**: `Error: No candidates found for signature`

**Solutions**:

```bash
# 1. Check if module is in search paths
npx adaptive-tests why '{"name":"YourModule"}'

# 2. Verify export structure
npx adaptive-tests analyze src/YourModule.js

# 3. Add custom search paths
const { discover } = require('adaptive-tests');

const Module = await discover({
  name: 'Module'
}, {
  searchPaths: ['./src', './lib', './custom-folder']
});
```

### Issue: TypeScript Types Not Recognized

**Solution**: Install TypeScript support:

```bash
npm install --save-dev ts-node @types/node
```

```javascript
// tsconfig.json
{
  "compilerOptions": {
    "allowJs": true,
    "esModuleInterop": true
  }
}
```

### Issue: Tests Pass Individually but Fail Together

**Cause**: Module caching conflicts

**Solution**: Clear cache between tests:

```javascript
beforeEach(() => {
  // Clear adaptive cache
  const { clearCache } = require('adaptive-tests');
  clearCache();
});
```

### Issue: Performance Degradation

**Solutions**:

1. **Enable persistent caching**:

```javascript
// jest.setup.js
const { enablePersistentCache } = require('adaptive-tests');
enablePersistentCache({
  cacheDir: '.adaptive-cache',
  maxAge: 7 * 24 * 60 * 60 * 1000  // 1 week
});
```

1. **Limit search scope**:

```javascript
const Component = await discover({
  name: 'Component'
}, {
  searchPaths: ['./src/components'],  // Don't search entire project
  maxDepth: 3  // Limit directory depth
});
```

---

## Migration Checklist

- [ ] Install adaptive-tests package
- [ ] Set up parallel test structure (traditional + adaptive)
- [ ] Migrate leaf components first
- [ ] Update CI/CD pipelines
- [ ] Train team on adaptive patterns
- [ ] Monitor test performance
- [ ] Remove traditional tests once confident
- [ ] Document team-specific patterns

---

## Getting Help

- **GitHub Discussions**: [Join the discussion](https://github.com/anon57396/adaptive-tests/discussions)
- **Examples**: See `languages/javascript/examples/` for JavaScript migrations and `languages/typescript/examples/` for TypeScript samples
- **Issues**: [GitHub Issues](https://github.com/anon57396/adaptive-tests/issues)
- **Docs**: [Full documentation](https://anon57396.github.io/adaptive-tests/)

---

## Next Steps

1. Start with a single test file
2. Run both versions side-by-side
3. Gradually expand coverage
4. Share your migration story!

Remember: You don't need to migrate everything at once. Adaptive tests can coexist with traditional tests indefinitely.
