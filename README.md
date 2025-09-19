# Adaptive Tests

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
```

The CLI scaffolds an `adaptive` test directory, drops in example suites, and
links any missing optional peers (such as `ts-node`).

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

## Documentation & Examples

- [Quick Start Guide](docs/QUICK_START.md)
- [Common Issues & Troubleshooting](docs/COMMON_ISSUES.md)
- [Proof & Demo Scripts](PROOF.md)
- [Examples](examples/) (`calculator`, `api-service`, `todo-app`, `typescript`, `python`)

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
