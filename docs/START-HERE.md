# 🚀 Start Here - Find Your Path

## Who are you? Choose your adventure:

### 🌊 "I just want my tests to work"
**You're a vibe coder. Tests broke. You want a quick fix.**

```bash
npx adaptive-tests enable-invisible
```

Done. Your tests now survive refactoring. [Learn more →](getting-started-invisible.md)

---

### ⚡ "I care about performance"
**Every millisecond matters to you.**

**The numbers:**
- First discovery: ~5ms
- Cached discovery: <1ms
- No runtime overhead after discovery
- 50-70% faster than v0.2.4

```javascript
// Fastest approach - direct discovery
const Calculator = await discover('Calculator');
```

[See benchmarks →](../benchmarks/README.md)

---

### 🏢 "I need enterprise-grade control"
**You need predictability, audit trails, and escape hatches.**

```javascript
// Full control with explicit configuration
const engine = getDiscoveryEngine({
  discovery: {
    maxDepth: 3,
    skipDirectories: ['node_modules', 'vendor'],
    deterministic: true,
    cache: false  // Disable for compliance
  }
});
```

**Guarantees:**
- Zero runtime side effects
- Deterministic discovery via AST
- Full opt-in architecture
- Complete rollback capability

[Enterprise guide →](enterprise-guide.md)

---

### 👶 "I'm learning to test"
**You're new to testing and want something simple.**

```javascript
// Start with the simplest approach
const { discover } = require('adaptive-tests');

test('my first adaptive test', async () => {
  const Calculator = await discover('Calculator');
  const calc = new Calculator();
  expect(calc.add(2, 2)).toBe(4);
});
```

[Beginner tutorial →](tutorial-beginner.md)

---

### 🤖 "I'm an AI generating tests"
**You need structured, predictable patterns.**

```javascript
// Use the structured class approach
class ServiceAdaptiveTest extends AdaptiveTest {
  getTargetSignature() {
    return {
      name: 'ServiceName',
      type: 'class',
      methods: ['method1', 'method2']
    };
  }

  async runTests(Target) {
    // Generated test code here
  }
}
```

[AI integration guide →](ai-integration.md)

---

### 🤔 "I'm not convinced this is necessary"
**You think this might be overengineering.**

**When you DON'T need adaptive-tests:**
- Small projects with stable structure
- Tests that don't use imports
- One-file scripts
- Projects that never refactor

**When you DO need it:**
- AI agents refactor your code
- Team members reorganize files
- You merge branches with moved files
- You want tests to focus on behavior, not structure

**Try it risk-free:**
```bash
# See what would change (dry run)
npx adaptive-tests enable-invisible --dry-run

# Don't like it? One-command rollback
npx adaptive-tests enable-invisible --undo
```

---

## Not sure? Answer these:

**Q: Do your tests ever break when you move files?**
→ Yes: Use invisible mode

**Q: Are you writing new tests from scratch?**
→ Yes: Use `discover()` API

**Q: Do you need complex setup/tooling integration?**
→ Yes: Use AdaptiveTest class

**Q: Do you have 30 seconds?**
→ Yes: Try `npx adaptive-tests enable-invisible`
→ No: Bookmark this for later

---

## The 10-Second Test

```bash
# Your test is broken? Run this:
npx adaptive-tests enable-invisible
npm test

# If it works, you're done
# If not, it didn't change your code anyway
```

No commitment. No lock-in. No learning required.

[Full documentation →](../README.md) | [Report issue →](https://github.com/anon57396/adaptive-tests/issues)