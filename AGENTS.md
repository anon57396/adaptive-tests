# AGENTS.md

Guidance for any AI or automation working inside this repository.

## Mission-Critical Context

This project is the **AI-ready testing foundation** for the autonomous development era. As AI agents increasingly reshape codebases at velocity, adaptive-tests ensures testing infrastructure doesn't break through AST-based analysis instead of brittle file path imports.

**The paradigm shift:** While traditional tests break when AI agents refactor, adaptive tests survive by finding code through structure, not file paths. This eliminates the import maintenance cycles that waste AI capabilities on busywork instead of feature development.

The standards for code quality, documentation, and reliability are exceptionally high. Every contribution must reflect a commitment to perfection and a deep understanding of the project's role in enabling autonomous development workflows. Mediocrity will not be accepted.

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

## Multi-Agent Collaboration Contract

We often have several AI agents working **simultaneously on `main`**. To keep the
experience sane for humans and bots alike:

1. **Never delete, revert, or rewrite someone else's work-in-progress.** If a file
   already has uncommitted edits, assume they are intentional. Do not stage reverts
   or remove paths from the working tree unless explicitly instructed.
2. **Do not touch untracked paths without approval.** If `git status` shows
   untracked files or directories (e.g. local prototypes), leave them alone and
   escalate to a human maintainer.
2. **Stay scoped.** Limit edits to the files relevant to your assigned task. Avoid
   opportunistic "drive-by" cleanups that could interfere with parallel efforts.
3. **Surface conflicts, don't resolve silently.** When you detect contradictory
   modifications, stop and ask for guidance instead of force-merging, deleting, or
   undoing other agents' changes.
4. **Document assumptions in the final summary** so other agents (and humans)
   understand what you touched and what you deliberately left alone.

### Safety Alert — 2025-09-20
> Codex AI accidentally deleted the untracked directory `src/adaptive/enhanced/`,
> causing a loss of work for another contributor. Do not remove or rename
> untracked files. When in doubt, stop and ask.

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
- `languages/python/` – Python companion package
- `extensions/vscode-adaptive-tests/` – VS Code extension for Discovery Lens and scaffolding
- `templates/` – Framework templates (Next.js, Vite, CRA, Express) with pre-configured adaptive tests
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
- VS Code Extension: [Development Alpha](extensions/vscode-adaptive-tests/README.md)

## Integration Notes

This adaptive testing framework is designed to work with various development workflows and testing strategies. It integrates well with existing CI/CD pipelines and development tools while providing resilient test discovery that survives code refactoring.

Remember: this repository is public. Treat every script, code comment, and issue
reply as something future users will read.
