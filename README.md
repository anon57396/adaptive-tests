# Adaptive Tests: AI-Ready Testing Infrastructure

[![Docs](https://img.shields.io/badge/docs-website-blue)](https://anon57396.github.io/adaptive-tests/)
[![Coverage](https://img.shields.io/codecov/c/github/anon57396/adaptive-tests?label=coverage)](https://codecov.io/gh/anon57396/adaptive-tests)
[![npm version](https://img.shields.io/npm/v/adaptive-tests.svg)](https://www.npmjs.com/package/adaptive-tests)
[![PyPI version](https://img.shields.io/pypi/v/adaptive-tests-py.svg)](https://pypi.org/project/adaptive-tests-py/)
[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Development%20Alpha-yellow)](extensions/vscode-adaptive-tests/README.md)
[![GitHub Action](https://img.shields.io/badge/GitHub%20Action-Available-green?logo=github)](https://github.com/marketplace/actions/adaptive-tests)

Documentation: [https://anon57396.github.io/adaptive-tests/](https://anon57396.github.io/adaptive-tests/)

> **The only testing framework built for AI-driven development**

When AI agents rapidly reshape your codebase, traditional tests break constantly. Adaptive Tests uses **zero-runtime discovery** powered by AST analysis to find code by structure, not file paths. Your tests adapt as AI builds.

**Stop wasting AI cycles on import maintenance.** Move files, rename directories, refactor into new layers—adaptive suites still find the code they care about, while traditional suites keep failing with import errors.

If this project helps you, please consider supporting it via the Sponsor button (GitHub Sponsors) or your preferred tip link. Thank you!

---

## Table of Contents

- [CI/CD Integration](#ci-cd-integration)
- [VS Code Extension (Development Alpha)](#vs-code-extension-development-alpha)
- [Why AI-Powered Teams Choose Adaptive Tests](#why-ai-powered-teams-choose-adaptive-tests)
- [Quick Start](#quick-start)
  - [Invisible Mode (Zero Learning Curve)](#-new-invisible-mode-zero-learning-curve)
- [Framework Templates](#framework-templates)
- [CLI Helper](#cli-helper)
- [Validation Flow](#validation-flow)
- [CI/CD Strategy](#ci-cd-strategy)
- [Documentation & Examples](#documentation--examples)
- [Publishing](#publishing)
- [For Developers](#for-developers)
- [Contributing & Support](#contributing--support)

---

## <a id="ci-cd-integration"></a>🚀 CI/CD Integration

You can run adaptive tests in CI using either the official GitHub Action (if available) or a standard Node.js job.

### Option A: Official Action (if available)

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
```

The action typically:

- ✅ Runs adaptive tests
- 🔍 Discovers components
- 📊 Generates coverage (optional)
- 💬 Adds PR comments (optional)
- 🏗️ Can scaffold tests (optional)

### Option B: Manual Setup (recommended fallback)

```yaml
env:
  CI: true

steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v5
    with:
      node-version: '20'
      cache: 'npm'
  - run: npm ci
  - run: npm run test:adaptive
```

[See CI examples and guidance →](docs/GITHUB_ACTION.md)

---

## <a id="vs-code-extension-development-alpha"></a>🎯 VS Code Extension (Development Alpha)

Experience the power of adaptive testing with our VS Code extension currently in development:

### ✨ Key Features

- **🔍 Discovery Lens**: Visualize how adaptive-tests finds your code with an interactive, beautiful webview
- **📁 Batch Scaffolding**: Right-click any folder to generate tests for all files inside
- **🎯 Smart Context Menus**: "Scaffold Test" for new files, "Open Test" for files with existing tests
- **💡 CodeLens Integration**: See test hints directly in your code
- **📊 Discovery Tree View**: Browse discovery results in the activity bar
- **🌐 Multi-Language Support**: JavaScript, TypeScript, Python, Java, PHP

### 🛠️ Development Setup

To test the extension during development:

```bash
cd extensions/vscode-adaptive-tests
npm install
# Open in VS Code and press F5 to launch Extension Development Host
```

### 🚀 Installation

The extension will be available on the VS Code Marketplace. For now, use the development setup above.

[Learn more about the VS Code extension →](extensions/vscode-adaptive-tests/README.md)

---

## Why AI-Powered Teams Choose Adaptive Tests

- **AI-velocity resilience** – When AI agents refactor aggressively, tests survive automatically without import fixing cycles
- **Zero-runtime discovery** – candidate modules are inspected with `@babel/parser` instead of `require()`, eliminating side effects and making discovery completely deterministic
- **Autonomous development ready** – Built for the era where AI reshapes codebases faster than humans can maintain test imports
- **Deep structural signatures** – classes, functions, inheritance chains, methods, and instance properties are validated from the AST before a module is ever loaded
- **Async-first scanning** – the engine walks large repositories with `fs.promises`, keeping Jest/Node responsive during rapid AI-driven changes
- **Drop-in tooling** – CLI, factory helpers, and an abstract Jest base class mean you can adopt a single file at a time or migrate whole suites

---

## Quick Start

### 🎭 New: Invisible Mode (Zero Learning Curve)

**Broken import? One command fixes it:**

```bash
npx adaptive-tests enable-invisible
```

Your existing tests now automatically adapt when imports break during refactoring. No code changes. No learning required.

**When you see:**

```text
Error: Cannot find module './UserService'
```

**Just run:**

```bash
npx adaptive-tests enable-invisible
npm test  # Tests now pass
```

Invisible mode auto-detects your test framework (Jest/Vitest/Mocha) and patches it to use adaptive discovery when `require()` fails. Perfect for vibe coders who want refactor-safe tests without complexity.

[📖 Full invisible mode guide →](docs/getting-started-invisible.md)

---

### Option 1: Zero-Config with jest-adaptive (New!)

```bash
npm install --save-dev jest-adaptive adaptive-tests
```

Add to your `jest.config.js`:

```javascript
module.exports = {
  preset: 'jest-adaptive',
};
```

Now `discover()` and `adaptiveTest()` are available as globals in all tests!

### Option 2: Standard Installation

```bash
npm install adaptive-tests
```

Optional for TypeScript source discovery (tests will still run against compiled
output if you skip this):

```bash
npm install --save-dev ts-node
```

Python teams can mirror the same patterns with the companion package:

```bash
pip install adaptive-tests-py
```

PHP teams can use the built-in PHP discovery support:

```bash
# Generate PHPUnit tests from PHP classes
npx adaptive-tests scaffold src/Calculator.php
```

Java teams can scaffold JUnit 5 tests directly:

```bash
# Generate a JUnit test alongside src/test/java
npx adaptive-tests scaffold src/main/java/com/example/CustomerService.java
```

Once installed, discover code directly from a test:

```javascript
const { discover } = require('adaptive-tests');

it('authenticates a user', async () => {
  const AuthService = await discover({
    name: 'AuthService',
    type: 'class',
    methods: ['login', 'logout'],
    properties: ['sessions']
  });

  const service = new AuthService();
  const result = await service.login({ username: 'ada', password: 'secret' });

  expect(result.success).toBe(true);
});
```

Need a reusable engine? Grab one from the factory:

```javascript
const { getDiscoveryEngine } = require('adaptive-tests');
const engine = getDiscoveryEngine(process.cwd());
```

---

## Framework Templates

Jumpstart your adaptive testing with pre-configured templates for popular frameworks:

### Available Templates

| Template | Framework | Features |
|----------|-----------|----------|
| `nextjs-adaptive` | Next.js 13+ | App Router, TypeScript, React Server Components ready |
| `vite-adaptive` | Vite + React | Lightning fast HMR, TypeScript, modern tooling |
| `cra-adaptive` | Create React App | Classic React setup, TypeScript support |
| `express-adaptive` | Express.js | REST API, middleware testing, async route handlers |

### Quick Setup

```bash
# Interactive CLI
npx create-adaptive-app my-project

# Manual template usage
git clone https://github.com/anon57396/adaptive-tests.git
cp -r adaptive-tests/templates/nextjs-adaptive my-project
cd my-project
npm install
```

### What's Included

Each template comes with:

- ✅ **Pre-configured adaptive tests** - Example components with adaptive test suites
- ✅ **Jest setup** - Configured for both traditional and adaptive testing
- ✅ **TypeScript support** - Full type definitions and tsconfig
- ✅ **VS Code integration** - Recommended extensions and settings
- ✅ **Best practices** - Folder structure and naming conventions
- ✅ **CI/CD ready** - GitHub Actions workflows included

### Template Details

#### Next.js Template

```bash
templates/nextjs-adaptive/
├── src/
│   └── components/       # Example components with tests
├── tests/
│   ├── adaptive/         # Adaptive test suites
│   └── traditional/      # Traditional test comparison
├── jest.config.js        # Dual-mode Jest configuration
└── package.json          # Pre-configured dependencies
```

#### Vite Template

```bash
templates/vite-adaptive/
├── src/
│   ├── components/       # React components
│   └── test/
│       └── setup.ts      # Vitest/Jest setup
├── tests/
│   └── adaptive/         # Adaptive tests
└── vite.config.ts        # Test configuration
```

#### Express Template

```bash
templates/express-adaptive/
├── src/
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   └── services/         # Business logic
├── tests/
│   └── adaptive/         # API and service tests
└── package.json          # Node.js dependencies
```

### Customizing Templates

After copying a template:

1. **Update package.json** with your project details
2. **Modify the example components** to match your needs
3. **Run tests** to ensure everything works: `npm test`
4. **Add your own adaptive tests** using the examples as guides

### Creating Your Own Template

To create a custom template:

```bash
# Start with any existing project
npx adaptive-tests init

# Add example components and tests
npx adaptive-tests scaffold src/components/MyComponent.tsx

# Configure Jest for dual-mode testing
# (See templates/*/jest.config.js for examples)
```

---

## CLI Helper

```bash
npx adaptive-tests init                                      # Interactive setup wizard
npx adaptive-tests migrate tests                            # Convert traditional tests to adaptive
npx adaptive-tests scaffold src/services/UserService.js     # Generate test from source
npx adaptive-tests scaffold --batch src/                    # Scaffold entire directory
```

### Migration Tool (New!)

Automatically convert your existing traditional tests to adaptive tests:

```bash
npx adaptive-tests migrate [directory]
```

The migration tool:

- Analyzes your existing test files to extract imports and test structure
- Identifies the classes/modules being tested and their methods
- Generates adaptive test files that use `discover()` instead of hardcoded imports
- Preserves your test logic structure while making imports refactor-proof

Migration strategies:

1. **Create new files** (default) - Creates `*.adaptive.test.js` alongside originals
2. **Replace existing** - Backs up originals and replaces them

### Scaffold Command

Use `npx adaptive-tests scaffold --help` for all options. Helpful flags include:

- `--typescript` – emit `.test.ts`
- `--force` – overwrite existing test files
- `--apply-assertions` – generate starter assertions (defaults to TODOs)
- `--all-exports` / `--export <Name>` – control multi-export files
- `--batch <dir>` – scaffold an entire directory
- `--json` – machine-readable output

The CLI scaffolds an `adaptive` test directory, drops in example suites, and
links any missing optional peers (such as `ts-node`). Additional CLI helpers
include the Discovery Lens (`why`) and refactor scripts documented below.

Need visibility into why a signature matched (or didn’t)? Use the Discovery
Lens companion:

```bash
npx adaptive-tests why '{"name":"UserService"}'
npx adaptive-tests why '{"name":"UserService"}' --json
```

The `why` command prints a ranked list of candidates with score breakdowns and
optional JSON output for tooling.

### Coverage Notes

`npm run test:coverage` reports on the adaptive engine and core utilities. Jest
intentionally skips the CLI wrappers and the testing base class (`collectCoverageFrom`
excludes `src/cli/**` and `src/adaptive/test-base.js`) so that coverage reflects
the static analysis engine itself. If you need coverage for the CLI, run Jest
against those folders explicitly.

---

## Validation Flow

The repository ships with a validation script that proves adaptive suites behave
the way we advertise:

```bash
npm run validate
```

The script runs four scenarios:

1. ✅ Both traditional and adaptive suites pass on healthy code.
2. ✅ After a refactor, traditional suites fail with import errors, adaptive suites
   keep passing.
3. ✅ When we introduce real bugs, both suites fail with assertion errors.
4. ✅ TypeScript mirrors the JavaScript story.

> ℹ️ Python (pytest) and Java (Maven) demos only run when those runtimes are
> available. In sandboxed or offline environments the validator reports those
> scenarios as “skipped” so the core JavaScript/TypeScript proof still completes.

---

## <a id="ci-cd-strategy"></a>CI/CD Strategy

### Why Adaptive Tests Excel in CI/CD

Traditional CI requires complex dependency tracking to run only affected tests. **Adaptive tests flip this paradigm** — since they're resilient to refactoring, you can run the entire suite without fear of false failures from moved files!

### Our Two-Track Approach

1. **Traditional Tests** → Run only changed tests for quick feedback
2. **Adaptive Tests** → Run ALL of them (they won't break from refactoring!)

```yaml
# In .github/workflows/ci.yml
jobs:
  traditional-tests:
    # Quick feedback on direct changes
    run: npx jest --onlyChanged

  adaptive-tests:
    # Comprehensive coverage, resilient to refactoring
    run: npm run test:adaptive
```

### The Key Insight

You don't need complex test selection for adaptive tests because:

- ✅ They survive file moves and renames
- ✅ They're fast enough to run completely
- ✅ They catch real bugs, not import errors

**Example**: Move `Calculator.js` to a new folder?

- Traditional tests: ❌ `Cannot find module '../src/Calculator'`
- Adaptive tests: ✅ Find it automatically and pass!

[Read the full CI/CD strategy →](docs/CI_STRATEGY.md)

---

## Documentation & Examples

### Getting Started

- [Quick Start Guide](docs/QUICK_START.md)
- [Migration Guide](docs/MIGRATION_GUIDE.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- [Common Issues](docs/COMMON_ISSUES.md)

### Framework Guides

- [React Quick Start](docs/REACT_QUICKSTART.md)
- [Vue.js Quick Start](docs/VUE_QUICKSTART.md)
- [Express Quick Start](docs/EXPRESS_QUICKSTART.md)
- [Java Quick Start](docs/JAVA_QUICKSTART.md)
- [PHP Quick Start](docs/PHP_QUICKSTART.md)

### Technical Documentation

- [How It Works](docs/HOW_IT_WORKS.md)
- [API Reference](docs/API_REFERENCE.md)
- [Best Practices](docs/BEST_PRACTICES.md)
- [CI/CD Strategy](docs/CI_STRATEGY.md)
- Prompt Guide (AIs & automation): PROMPT_GUIDE.md

### Extensions & Tools

- [VS Code Extension](extensions/vscode-adaptive-tests/README.md)
- [Proof & Demo Scripts](PROOF.md)
- [Examples](examples/) (`calculator`, `api-service`, `todo-app`, `typescript`, `python`, `php`, `java`)

Every example exposes both **traditional** and **adaptive** suites so you can see
the contrast immediately.

---

## Publishing

Adaptive Tests ships on npm and PyPI:

- npm: [`adaptive-tests`](https://www.npmjs.com/package/adaptive-tests)
- PyPI: [`adaptive-tests-py`](https://pypi.org/project/adaptive-tests-py/)

When you are ready to publish a new release:

1. Ensure `npm test` and `npm run validate` are green.
2. Run `npm run build:plugins` so the Vite/Webpack packages ship with fresh `dist/` artifacts.
3. Optionally run `npm run clean:artifacts` before zipping or sharing the repo snapshot.
4. Update [`CHANGELOG.md`](CHANGELOG.md) with release notes.
5. `npm version <patch|minor|major>` followed by `npm publish`.
6. `cd packages/adaptive-tests-py && python -m build && python -m twine upload dist/*`.

---

## <a id="for-developers"></a>🧑‍💻 For Developers

### Developer Setup

```bash
# Clone and setup
git clone https://github.com/anon57396/adaptive-tests.git
cd adaptive-tests
npm run dev:setup  # Automated developer setup

# Development commands
npm test           # Run tests
npm run validate   # Run validation suite
npm run dev        # Start development mode
```

### Resources

- **[Development Guide](.github/DEVELOPMENT.md)** - Complete developer documentation
- **[GitHub Discussions](https://github.com/anon57396/adaptive-tests/discussions)** - Ask questions, share ideas
- **[Issue Tracker](https://github.com/anon57396/adaptive-tests/issues)** - Report bugs, request features
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute
- **[API Docs](https://anon57396.github.io/adaptive-tests/)** - Full documentation

### Project Health

- ✅ Tests running in CI with coverage
- ✅ Multi-language support (JS, TS, Python, Java, PHP)
- ✅ Codecov reporting and GitHub Actions CI/CD

## Contributing & Support

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Get Help:**

- 💬 [GitHub Discussions](https://github.com/anon57396/adaptive-tests/discussions) - Community support
- 🐛 [Issues](https://github.com/anon57396/adaptive-tests/issues) - Bug reports
- 📚 [Documentation](https://anon57396.github.io/adaptive-tests/) - Complete docs
- 📖 [Common Issues](docs/COMMON_ISSUES.md) - Troubleshooting

Adaptive Tests is released under the [MIT license](LICENSE).
