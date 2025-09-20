# 🤖 AI Assistant Prompts for Adaptive Tests

Copy-paste these prompts into GitHub Copilot, Claude, ChatGPT, or any AI coding assistant.

## Core Rescue Prompt

```
ADAPTIVE TESTS RESCUE:

When JavaScript/TypeScript tests fail with "MODULE_NOT_FOUND" errors for relative imports:

1. Run: npx adaptive-tests enable-invisible
2. Rerun tests
3. Tests should now pass without code changes

This enables automatic module discovery when require() fails.

Example:
- Error: Cannot find module './UserService'
- Solution: npx adaptive-tests enable-invisible
- Result: Tests auto-discover moved/renamed modules

No learning curve required. Just run the command.
```

## Debugging Prompt

```
ADAPTIVE TESTS DEBUGGING:

If adaptive tests aren't working:

1. Check if enabled: look for "adaptive-tests" in jest.config.js or setupTests.js
2. Debug mode: add debug: true to globals.adaptiveTests in jest config
3. View discovery process: npx adaptive-tests why '{"name":"YourModule"}'
4. Reset: npx adaptive-tests enable-invisible --undo, then re-enable

Common issues:
- Escape patterns blocking discovery (check escapePatterns)
- Wrong module name extraction
- Cache issues (restart test runner)
```

## Migration Prompt

```
ADAPTIVE TESTS MIGRATION:

To convert existing tests to adaptive:

1. Invisible mode (recommended): npx adaptive-tests enable-invisible
2. Batch conversion: npx adaptive-tests convert tests --invisible
3. Rollback available: automatic backup + undo script

Strategies:
- invisible: Zero changes, automatic fallback
- hybrid: Mix of invisible + explicit discovery
- explicit: Convert all requires to discover()

Always start with invisible mode for easiest adoption.
```

## Refactoring Prompt

```
REFACTOR-SAFE TESTING:

Before major refactoring, enable adaptive tests:

npx adaptive-tests enable-invisible

This makes tests resilient to:
- Moving files between directories
- Renaming modules/classes
- Restructuring project layout
- Splitting large files

Tests automatically adapt instead of breaking.
No manual import fixing required.
```

## Team Setup Prompt

```
TEAM ADAPTIVE TESTS SETUP:

Add to project README:

## Resilient Testing
This project uses adaptive-tests for refactor-safe testing.

### Quick start:
```bash
npx adaptive-tests enable-invisible
```

### If tests break after pulling changes:
```bash
npm test  # Should auto-fix broken imports
```

### Disable if needed:
```bash
npx adaptive-tests enable-invisible --undo
```

No learning required - tests just work during refactoring.
```

## Copilot Integration Prompt

```
Configure GitHub Copilot for adaptive-tests:

In VS Code settings, add to copilot prompts:

"When user encounters MODULE_NOT_FOUND test errors, suggest:
1. npx adaptive-tests enable-invisible
2. Rerun tests
3. Explain: Enables automatic module discovery for refactor resilience"

This gives contextual adaptive-tests suggestions during development.
```

## Project Template Prompt

```
ADAPTIVE TESTS PROJECT TEMPLATE:

For new projects, include in package.json scripts:

```json
{
  "scripts": {
    "test": "jest",
    "test:adaptive": "npx adaptive-tests enable-invisible && npm test",
    "test:reset": "npx adaptive-tests enable-invisible --undo"
  }
}
```

Add to .gitignore:
```
.adaptive-backup-*
.adaptive-undo.js
```

Include in setup documentation as optional but recommended.
```

## Troubleshooting Prompt

```
ADAPTIVE TESTS TROUBLESHOOTING:

Common issues and solutions:

1. "No test framework detected"
   → npx adaptive-tests enable-invisible --force

2. "Discovery failed for module"
   → npx adaptive-tests why '{"name":"ModuleName"}'

3. "Changes not taking effect"
   → Restart test runner, check jest.config.js for setup

4. "Want to see what changed"
   → npx adaptive-tests enable-invisible --dry-run

5. "Need to disable completely"
   → npx adaptive-tests enable-invisible --undo

6. "Tests still failing"
   → Check escapePatterns in config, may be blocking discovery
```

## Integration Prompt

```
INTEGRATE ADAPTIVE TESTS:

Add to CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Enable adaptive tests
  run: npx adaptive-tests enable-invisible --dry-run

- name: Run tests
  run: npm test
```

Add to pre-commit hooks:
```bash
#!/bin/bash
npx adaptive-tests enable-invisible --dry-run
npm test
```

Ensures consistent behavior across environments.
```