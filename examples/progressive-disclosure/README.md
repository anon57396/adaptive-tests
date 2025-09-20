# Progressive Disclosure Example

This example demonstrates how to progressively adopt Adaptive Tests features, starting simple and advancing to more powerful patterns as needed.

## The Journey: From Zero to Hero

### Layer 1: 🎭 Invisible Mode (Zero Learning)

**Scenario:** You have existing tests that break when files move.

**Before (Broken after refactoring):**

```javascript
// tests/user.test.js
const UserService = require('../src/services/UserService'); // ❌ Breaks when moved

test('should create user', () => {
  const service = new UserService();
  expect(service.createUser('Alice')).toBeDefined();
});
```

**After (Invisible mode enabled):**

```bash
npx adaptive-tests enable-invisible
npm test  # ✅ Now passes even after moving files
```

Same code, zero changes, but now resilient to refactoring!

### Layer 2: 📚 Standard API (Simple & Direct)

**Scenario:** Writing new tests, want explicit control.

```javascript
// tests/user-discover.test.js
const { discover } = require('adaptive-tests');

test('should create user with discovery', async () => {
  // Simple, clean, no ceremony
  const UserService = await discover('UserService');

  const service = new UserService();
  expect(service.createUser('Bob')).toBeDefined();
});

test('should work with detailed signatures', async () => {
  // More specific when needed
  const UserService = await discover({
    name: 'UserService',
    type: 'class',
    methods: ['createUser', 'updateUser']
  });

  const service = new UserService();
  expect(service.createUser('Charlie')).toBeDefined();
  expect(service.updateUser('Charlie', { age: 30 })).toBeDefined();
});
```

### Layer 3: 🔧 Advanced API (Structured & Powerful)

**Scenario:** Complex setup, tooling integration, or cross-language consistency.

```javascript
// tests/user-adaptive-class.test.js
const { AdaptiveTest } = require('adaptive-tests');

class UserServiceAdaptiveTest extends AdaptiveTest {
  // Structured signature for tooling
  getTargetSignature() {
    return {
      name: 'UserService',
      type: 'class',
      methods: ['createUser', 'updateUser', 'deleteUser'],
      properties: ['database', 'validator']
    };
  }

  // Complex setup/teardown
  async beforeDiscovery() {
    this.testDb = await createTestDatabase();
  }

  async afterDiscovery(Target) {
    // Configure discovered service
    Target.prototype.database = this.testDb;
  }

  async runTests(Target) {
    describe('UserService (Advanced)', () => {
      beforeEach(async () => {
        await this.testDb.clear();
      });

      test('should persist users', async () => {
        const service = new Target();
        const user = await service.createUser('Diana');

        expect(user.id).toBeDefined();
        expect(await this.testDb.findUser(user.id)).toEqual(user);
      });

      test('should validate user data', async () => {
        const service = new Target();
        await expect(
          service.createUser('')  // Invalid name
        ).rejects.toThrow('Name required');
      });
    });
  }

  async afterTests() {
    await this.testDb.close();
  }
}

// Initialize the test
new UserServiceAdaptiveTest();
```

## When to Use Each Layer

### Start with Invisible Mode When

- ✅ You have existing tests
- ✅ You want zero learning curve
- ✅ You're "vibe coding" and want safety net
- ✅ You're prototyping or exploring

### Upgrade to Standard API When

- ✅ Writing new tests
- ✅ You want explicit control
- ✅ Simple signatures are sufficient
- ✅ You prefer functional style

### Advance to Class API When

- ✅ You need complex lifecycle hooks
- ✅ You're building tooling or generators
- ✅ You want cross-language consistency
- ✅ You have shared test infrastructure needs

## Migration Path

### From Invisible → Standard

```javascript
// You can mix approaches in the same test file
const UserService = require('../UserService');  // Still works via invisible mode

test('mixed approach', async () => {
  // But new tests can use explicit discovery
  const PaymentService = await discover('PaymentService');

  const userService = new UserService();
  const paymentService = new PaymentService();

  // Use both together
});
```

### From Standard → Advanced

```javascript
// Start simple
const UserService = await discover('UserService');

// Refactor to class when complexity grows
class UserServiceAdaptiveTest extends AdaptiveTest {
  getTargetSignature() {
    return { name: 'UserService', type: 'class' };
  }

  async runTests(Target) {
    // Move your existing tests here
    // Add complex setup as needed
  }
}
```

## Key Benefits of Progressive Approach

1. **No vendor lock-in** - Each layer is optional
2. **Learn at your own pace** - Start simple, advance when ready
3. **Preserve existing knowledge** - Build on what you know
4. **Power when needed** - Advanced features available but not required
5. **Team flexibility** - Different team members can use different layers

## Try It Yourself

```bash
# Clone this example
git clone https://github.com/anon57396/adaptive-tests.git
cd adaptive-tests/examples/progressive-disclosure

# Install dependencies
npm install

# Try invisible mode
npm run test:invisible

# Try standard API
npm run test:standard

# Try advanced API
npm run test:advanced
```

Each test demonstrates the same functionality with increasing sophistication. Choose the level that matches your needs!
