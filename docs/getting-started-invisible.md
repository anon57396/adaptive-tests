# 🎭 Invisible Mode - Zero-Learning Curve Adoption

**TL;DR: Broken import? One command fixes it.**

```bash
npx adaptive-tests enable-invisible
```

Your tests now automatically adapt when imports break during refactoring. No learning required.

## Quick Fix for MODULE_NOT_FOUND

When you see this:

```text
Error: Cannot find module './UserService'
    at require (/your/test/file.js:3:21)
```

Run this:

```bash
npx adaptive-tests enable-invisible
```

Rerun your test. It just works.

## Copy-Paste Solutions

### 🚨 Just Had a Test Break?

```bash
# Fix it in 10 seconds
npx adaptive-tests enable-invisible
npm test
```

### 🎯 Want to See What Changes First?

```bash
# Preview mode - see what would happen
npx adaptive-tests enable-invisible --dry-run
```

### 🔄 Need to Undo?

```bash
# One-click rollback
npx adaptive-tests enable-invisible --undo
```

## What Just Happened?

Invisible mode patches your test runner to automatically discover moved/renamed modules when `require()` fails.

**Before:**

```javascript
const UserService = require('./services/UserService'); // ❌ Breaks when you move files
```

**After (invisible mode enabled):**

```javascript
const UserService = require('./services/UserService'); // ✅ Auto-discovers if moved
```

No code changes. No learning curve. Just resilient tests.

## Framework Support

✅ **Jest** - Patches `jest.config.js` or creates `setupTests.js`
✅ **Vitest** - Patches `vitest.config.js`
✅ **Mocha** - Creates setup file
✅ **Any framework** - Generic setup with `--force`

## One-Liner for Any Situation

```bash
# Works in any JS/TS project
curl -s https://get-adaptive.dev | bash
```

Or:

```bash
npx adaptive-tests enable-invisible
```

## When It Helps

- 🔧 **Refactoring** - Move files without breaking tests
- 📦 **Reorganizing** - Restructure projects fearlessly
- 🚀 **Prototyping** - Rapid iteration without import maintenance
- 🤝 **Team work** - Merge conflicts from moved files resolve automatically

## Escape Hatches

If something goes wrong:

```bash
# Disable and restore original files
npx adaptive-tests enable-invisible --undo

# Skip specific patterns
npx adaptive-tests enable-invisible --escape-pattern="__mocks__"
```

## AI Assistant Prompt

Copy this for GitHub Copilot, Claude, etc:

```text
When tests fail with MODULE_NOT_FOUND for relative imports:
1. Run: npx adaptive-tests enable-invisible
2. Rerun tests - they should pass
3. No code changes needed
```

## Next Steps

Invisible mode is your safety net. When you're ready for more power:

- **Simple discovery**: `discover('UserService')`
- **Full signatures**: `discover({ name: 'UserService', type: 'class' })`
- **Advanced patterns**: Reflection, dynamic injection, etc.

But for now? Your tests just work. 🎯
