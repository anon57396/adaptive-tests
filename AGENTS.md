# AGENTS.md

Guidance for any AI or automation working inside this repository.

## Core Principles

1. **Tests first** – run `npm test` and `npm run validate` before publishing or
   recommending changes. These commands exercise both traditional and adaptive
   suites.
2. **Prefer the unified engine** – the source of truth lives in
   `src/adaptive/discovery-engine.js`. Avoid introducing or using any legacy
   `discovery.js` entry points. If you see `getLegacyEngine` in the public API,
   it is a thin deprecation shim around the v2 engine—prefer `getDiscoveryEngine`.
3. **Zero-runtime discovery** – the engine parses candidates with
   `@babel/parser`. If you contribute features, keep the static-analysis
   guarantees intact (no `require()` during discovery).
4. **Respect documentation** – README, Quick Start guides, and `docs/` are part
   of the public story. Keep them aligned with the code.

## Useful Commands

### Testing

- `npm test` – run every suite (traditional + adaptive)
- `npm run test:traditional` – JavaScript traditional suites
- `npm run test:adaptive` – JavaScript adaptive suites
- `npm run test:typescript` – TypeScript traditional + adaptive suites
- `jest <path>` – target a single test file in watch/edit loops

### Validation & Demos

- `npm run validate` – end-to-end demonstration: healthy → refactor → broken
- `npm run demo` / `npm run demo:full` – same as `validate`
- `npm run compare` – side-by-side traditional vs adaptive output

### Simulator Scripts

- `npm run refactor` / `npm run restore` – move the JS calculator around
- `npm run refactor:ts` / `npm run restore:ts` – TypeScript calculator moves
- `npm run demo:broken` / `npm run restore:broken` – introduce/fix JS bugs
- `npm run demo:broken:ts` / `npm run restore:broken:ts` – TypeScript bug flow

## Architecture Snapshot

- `src/adaptive/discovery-engine.js` – AST-driven discovery engine (async I/O,
  zero-runtime static analysis)
- `src/adaptive/scoring-engine.js` – heuristic scoring applied during discovery
- `src/adaptive/test-base.js` – base class plus helper for Jest-style suites
- `src/adaptive/typescript/discovery.js` – thin TypeScript façade (same API)
- `src/index.js` – public entry point, re-exporting the v2 surface

Supporting directories:

- `examples/` – calculators, services, and TypeScript examples (traditional vs
  adaptive)
- `packages/adaptive-tests-py/` – Python companion package
- `scripts/demo/` – automation used by the validation script

## Contribution Checklist

1. Keep signatures and tests passing (`npm test`, `npm run validate`).
2. Use the v2 helpers (`getDiscoveryEngine`, `discover`, `adaptiveTest`).
3. Update documentation and CHANGELOG when behaviour changes user-facing
   features.
4. When editing discovery logic, add or update fixtures in
   `tests/fixtures/` + adaptive suites under `tests/adaptive/` to prove the new
   behaviour.

## Support Channels

- Bug reports / feature requests: [GitHub Issues](https://github.com/anon57396/adaptive-tests/issues)
- Package consumers: npm [`adaptive-tests`](https://www.npmjs.com/package/adaptive-tests) &
  PyPI [`adaptive-tests-py`](https://pypi.org/project/adaptive-tests-py/)

Remember: this repository is public. Treat every script, code comment, and issue
reply as something future users will read.
