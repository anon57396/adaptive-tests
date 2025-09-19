# Adaptive Tests

[![Docs](https://img.shields.io/badge/docs-website-blue)](https://anon57396.github.io/adaptive-tests/)
[![npm version](https://img.shields.io/npm/v/adaptive-tests.svg)](https://www.npmjs.com/package/adaptive-tests)

Documentation: [https://anon57396.github.io/adaptive-tests/](https://anon57396.github.io/adaptive-tests/)

If this project helps you, please consider supporting it via the Sponsor button (GitHub Sponsors) or your preferred tip link. Thank you!

Adaptive Tests keeps your suites green no matter how you reorganise your code. The
engine uses **zero-runtime discovery** powered by AST analysis, so test targets are
resolved without ever `require`-ing application modules during discovery. Move
files, rename directories, refactor into new layers—adaptive suites still find the
code they care about, while traditional suites keep failing with import errors.

---

## Why Teams Adopt Adaptive Tests

- **Zero-runtime discovery** – candidate modules are inspected with `@babel/parser`
  instead of `require()`, eliminating side effects and making discovery completely
  deterministic.
- **Async-first scanning** – the engine walks large repositories with
  `fs.promises`, keeping Jest/Node responsive.
- **Deep structural signatures** – classes, functions, inheritance chains,
  methods, and instance properties are validated from the AST before a module is
  ever loaded.
- **Robust caching** – canonical JSON cache keys and mtime-aware entries avoid
  stale hits while keeping repeat runs fast.
- **Drop-in tooling** – CLI, factory helpers, and an abstract Jest base class mean
  you can adopt a single file at a time or migrate whole suites.

---

## Quick Start

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

## CLI Helper

```bash
npx adaptive-tests init
npx adaptive-tests scaffold src/services/UserService.js
npx adaptive-tests scaffold --batch src/  # Scaffold entire directory
```

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

---

## CI/CD Strategy

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

## 🎯 VS Code Extension

**NEW!** Install the VS Code extension for a visual discovery experience:

- **Discovery Lens**: Interactive webview showing how discovery works visually
- **Smart Scaffolding**: Right-click any file to generate adaptive tests
- **CodeLens Integration**: See inline hints and generate tests directly from your code
- **Live Discovery**: Watch the discovery engine find your code in real-time

[Learn more about the VS Code extension →](extensions/vscode-adaptive-tests/README.md)

## Documentation & Examples

- [Quick Start Guide](docs/QUICK_START.md)
- [Common Issues & Troubleshooting](docs/COMMON_ISSUES.md)
- [How It Works](docs/HOW_IT_WORKS.md)
- [Best Practices](docs/BEST_PRACTICES.md)
- [CI/CD Strategy](docs/CI_STRATEGY.md)
- Prompt Guide (AIs & automation): PROMPT_GUIDE.md
- [API Reference](https://anon57396.github.io/adaptive-tests/api/)
- [Java Quick Start](docs/JAVA_QUICKSTART.md)
- [PHP Quick Start](docs/PHP_QUICKSTART.md)
- [VS Code Extension](extensions/vscode-adaptive-tests/README.md)
- [Proof & Demo Scripts](PROOF.md)
- [Examples](examples/) (`calculator`, `api-service`, `todo-app`, `typescript`, `python`, `php`)

Every example exposes both **traditional** and **adaptive** suites so you can see
the contrast immediately.

---

## Publishing

Adaptive Tests ships on npm and PyPI:

- npm: [`adaptive-tests`](https://www.npmjs.com/package/adaptive-tests)
- PyPI: [`adaptive-tests-py`](https://pypi.org/project/adaptive-tests-py/)

When you are ready to publish a new release:

1. Ensure `npm test` and `npm run validate` are green.
2. Update [`CHANGELOG.md`](CHANGELOG.md) with release notes.
3. `npm version <patch|minor|major>` followed by `npm publish`.
4. `cd packages/adaptive-tests-py && python -m build && python -m twine upload dist/*`.

---

## Contributing & Support

Issues and pull requests are welcome—see [CONTRIBUTING.md](CONTRIBUTING.md). If you
run into discovery problems, start with `docs/COMMON_ISSUES.md` or reach out in an
issue with the failing signature plus a minimal reproduction.

Adaptive Tests is released under the [MIT license](LICENSE).
