# GitHub Action for Adaptive Tests

[![GitHub Marketplace](https://img.shields.io/badge/Marketplace-Adaptive%20Tests-green?logo=github)](https://github.com/marketplace/actions/adaptive-tests)
[![Action Status](https://github.com/anon57396/adaptive-tests/workflows/CI/badge.svg)](https://github.com/anon57396/adaptive-tests/actions)

Use the official Marketplace action to run adaptive tests in CI. If your organization restricts Marketplace actions, use the manual Node.js job shown below.

## Quick Start

If you are using the official action:

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
```

Otherwise, use this manual setup:

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v5
    with:
      node-version: '20'
      cache: 'npm'
  - run: npm ci
  - run: npm run test:adaptive
```

The action automatically detects your project type and runs adaptive tests.

## Installation

### Option 1: Simple (Recommended)

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: adaptive-tests-action/adaptive-tests@v1
```

### Option 2: With Configuration

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
  with:
    command: test
    coverage: true
    fail-on-missing: true
```

### Option 3: Multiple Commands

```yaml
steps:
  # Run tests
  - uses: adaptive-tests-action/adaptive-tests@v1
    with:
      command: test

  # Validate discoveries
  - uses: adaptive-tests-action/adaptive-tests@v1
    with:
      command: validate

  # Auto-scaffold new tests
  - uses: adaptive-tests-action/adaptive-tests@v1
    with:
      command: scaffold
```

## Features

### 🧪 Test Running

Automatically runs all adaptive tests and reports results:

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
  with:
    command: test
    test-pattern: '**/*.adaptive.test.js'
    coverage: true
```

### 🔍 Component Discovery

Discover components in your codebase:

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
  with:
    command: discover
    language: javascript
    discovery-signature: |
      {
        "type": "component",
        "framework": "react"
      }
```

### 🏗️ Test Scaffolding

Automatically create tests for new components:

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
  with:
    command: scaffold
    language: typescript
```

### ✅ Discovery Validation

Ensure all discovered components still exist:

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
  with:
    command: validate
    fail-on-missing: true
```

## Configuration

### Inputs

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `command` | Command to run (`test`, `discover`, `scaffold`, `validate`) | `test` | No |
| `working-directory` | Working directory | `.` | No |
| `config-file` | Path to config file | `adaptive-tests.config.js` | No |
| `test-pattern` | Test file pattern | `**/*.adaptive.test.js` | No |
| `coverage` | Generate coverage report | `false` | No |
| `fail-on-missing` | Fail if components missing | `true` | No |
| `language` | Language for discovery | `javascript` | No |
| `node-version` | Node.js version | `18` | No |
| `cache` | Cache node_modules | `true` | No |

### Outputs

| Output | Description |
|--------|-------------|
| `test-results` | Test results in JSON format |
| `coverage-report` | Path to coverage report |
| `discovered-components` | List of discovered components |

## Examples

### React Application

```yaml
name: React Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: adaptive-tests-action/adaptive-tests@v1
        with:
          test-pattern: 'src/**/*.adaptive.test.{js,jsx}'
          coverage: true
```

### Python Project

```yaml
name: Python Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - uses: adaptive-tests-action/adaptive-tests@v1
        with:
          language: python
          test-pattern: 'tests/**/test_*.py'
```

### Monorepo

```yaml
name: Monorepo Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package:
          - packages/frontend
          - packages/backend
          - packages/shared

    steps:
      - uses: actions/checkout@v4

      - uses: adaptive-tests-action/adaptive-tests@v1
        with:
          working-directory: ${{ matrix.package }}
          coverage: true
```

### Pull Request Comments

The action automatically comments on pull requests with test results:

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
  with:
    command: test
    coverage: true
  # Results automatically posted to PR!
```

Example comment:

> ## 🧪 Adaptive Tests Results
>
> **Status:** ✅ Passed
> **Total Tests:** 42
> **Passed:** 42
> **Failed:** 0
> **Duration:** 1,234ms

## Advanced Usage

### Matrix Testing

Test across multiple Node versions:

```yaml
strategy:
  matrix:
    node-version: [16, 18, 20]

steps:
  - uses: adaptive-tests-action/adaptive-tests@v1
    with:
      node-version: ${{ matrix.node-version }}
```

### Conditional Scaffolding

Only scaffold on PRs:

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
  if: github.event_name == 'pull_request'
  with:
    command: scaffold
```

### Custom Install Command

Use yarn or pnpm:

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
  with:
    install-command: yarn install --frozen-lockfile
```

### Discovery with Custom Signature

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
  with:
    command: discover
    discovery-signature: |
      {
        "type": "service",
        "patterns": ["@Injectable", "@Service"],
        "methods": ["findAll", "findOne"]
      }
```

## Comparison with Traditional Test Actions

| Feature | Adaptive Tests Action | Jest Action | Mocha Action |
|---------|----------------------|-------------|--------------|
| Survives refactoring | ✅ | ❌ | ❌ |
| Auto-discovery | ✅ | ❌ | ❌ |
| Multi-language | ✅ | ❌ | ❌ |
| Zero config | ✅ | ❌ | ❌ |
| PR comments | ✅ | ⚠️ | ⚠️ |
| Coverage | ✅ | ✅ | ✅ |

## Troubleshooting

### Action fails with "adaptive-tests not found"

The action automatically installs adaptive-tests if not present. If this fails:

```yaml
- run: npm install adaptive-tests --save-dev
- uses: adaptive-tests-action/adaptive-tests@v1
```

### Tests pass locally but fail in CI

Check that your discovery signatures match the CI environment:

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
  with:
    command: validate
    fail-on-missing: false  # Set to false for debugging
```

### Coverage reports not generated

Ensure coverage is enabled:

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
  with:
    command: test
    coverage: true
```

## Migration from Existing CI

### From Jest

```yaml
# Before (Jest)
- run: npm test

# After (Adaptive Tests)
- uses: adaptive-tests-action/adaptive-tests@v1
```

### From Custom Scripts

```yaml
# Before
- run: |
    npm install
    npm run test:unit
    npm run test:integration

# After
- uses: adaptive-tests-action/adaptive-tests@v1
  with:
    test-pattern: '**/*.{unit,integration}.test.js'
```

## Contributing

We welcome contributions! See our [Contributing Guide](../CONTRIBUTING.md).

## License

MIT - See [LICENSE](../LICENSE) for details.

## Support

- 🐛 Issues: [GitHub Issues](https://github.com/anon57396/adaptive-tests/issues)
- 🌐 Repository: [GitHub](https://github.com/anon57396/adaptive-tests)

---

**Ready to make your tests refactoring-proof?** Add the action to your workflow now:

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
```
