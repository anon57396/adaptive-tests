# Internal Execution Plan – Adaptive Tests

This document translates our recent prioritization into concrete, actionable work. It is an internal guide for planning, implementation, validation, and release.

## Principles

- Ship small, end‑to‑end vertical slices; keep scope tight and demonstrable.
- Preserve zero‑runtime discovery guarantees for all discovery/insight commands.
- Make new features explainable: every result should have a way to “show why”.
- Prefer HTML + JSON artifacts for CI and debugging.

## Milestones Overview

- Now (next 2 weeks)
  - Smart Test Scaffolding (CLI: `scaffold`)
  - TS path alias resolution in discovery/collection
  - Discovery failure UX: friendly suggestions + top candidates + “run why” hint
  - Framework recipes: React components, Express services, Monorepo configs
- Next (3–6 weeks)
  - Interactive Visualizer (CLI: `visualize`) – HTML graph
  - Test Gap Analysis (CLI: `gaps`) – static MVP
  - PR artifacts for visualize/gaps
  - Vitest/Mocha recipes, TS templates for scaffold
- Later (6+ weeks)
  - Refactor Assistant (CLI: `refactor`) – dry‑run AST rewrite + diff + `--apply`
  - Selective TS migration of core surfaces
  - Optional IDE panel (Lens/Visualizer) once CLI stabilizes

## Milestone: Now (2 weeks)

### 1) Smart Test Scaffolding (CLI: `scaffold <path-or-name>`)

- Outcome
  - Generates `tests/adaptive/<Name>.test.js` (and `.ts` variant) with a perfect discovery signature derived from source metadata and `it(...)` placeholders per public method.
- Acceptance Criteria
  - Given a class/function file, `npx adaptive-tests scaffold src/.../UserService.js` creates a runnable test file with:
    - Signature: type, name, `exports` if named, method list (top‑level public instance methods), and optional `properties` if identified.
    - One `it` block per method with TODO comments.
    - Works for ESM and CJS export styles.
  - `--typescript` emits `.ts` test with imports typed from the public API.
- Implementation Notes
  - Reuse `analyzeModuleExports` + `extractClassInfo`/`extractFunctionInfo` for metadata.
  - Template files under `templates/scaffold/{js,ts}.txt` to keep code clean.
  - Resolve `<path-or-name>`: path wins; otherwise search by signature name and choose top Lens candidate.
- Tests
  - Fixtures: simple class, named exports, default exports, multiple exports (select primary).
  - Snapshot tests for generated files.
- Docs
  - README: add a “Scaffold” snippet.
  - New page: docs/recipes/Scaffold.md (short, copy/paste guide).

### 2) TS Path Alias Resolution

- Outcome
  - Discovery respects `tsconfig.json` paths and `baseUrl` for collection/import resolution.
- Acceptance Criteria
  - If a repo uses `paths` or `baseUrl`, discovery and “importers” resolution (for Visualizer later) resolve modules correctly.
- Implementation Notes
  - Load tsconfig (closest to root) and build a resolver map.
  - Respect `.ts`, `.tsx`, `.js`, `.jsx` priority.
  - Keep feature behind a small helper to reuse later in Visualizer/Refactor.
- Tests
  - Fixture with `baseUrl` and `paths` pointing into `src/`.

### 3) Discovery Failure UX

- Outcome
  - On failure, the error message shows:
    - “Try: npx adaptive-tests why '<sig>'”
    - Up to 3 top candidates with scores (reuse Lens `calculateScoreDetailed`).
    - A suggested signature block when we can derive it.
- Acceptance Criteria
  - Clear, actionable errors that unblock users without reading docs.
- Tests
  - Snapshot error messages for typical failures.

### 4) Framework Recipes (Docs + Tiny Examples)

- Outcome
  - React components + Express services + Monorepo (pnpm/Nx/Turbo) recipes.
- Acceptance Criteria
  - Each recipe has a minimal example and a tuned `adaptive-tests.config.js` when helpful.
- Docs
  - docs/recipes/React.md
  - docs/recipes/Express.md
  - docs/recipes/Monorepo.md

## Milestone: Next (3–6 weeks)

### 5) Interactive Visualizer (CLI: `visualize <signature-or-path>`) – HTML + JSON

- Outcome
  - Generates `visualize/<name>.html` (plus `<name>.json`) with a graph of:
    - Center node: chosen component
    - Test nodes: tests that discover it
    - Importer nodes: modules that import it (direct dependents)
- Acceptance Criteria
  - Zoom/pan, hover details with Lens score snippets, search by node name.
  - CLI flags: `--depth`, `--include`, `--exclude`, `--out`.
- Implementation Notes
  - Build import graph by scanning AST `ImportDeclaration`/`require()`.
  - Node data includes path, export/methods summary; edges labeled by relation.
  - Use D3 or Cytoscape; bundle as standalone HTML + embedded JSON.
- Tests
  - Fixture: small app with 2–3 modules and 2 tests.
  - Verify JSON content and presence of key nodes/edges.
- CI
  - GitHub Action step to upload `visualize/*.html` as artifacts on PRs.

### 6) Test Gap Analysis (CLI: `gaps`) – static MVP

- Outcome
  - Reports untested components and list of public methods not mentioned in tests for tested components.
- Acceptance Criteria
  - Output: human‑readable table + `gaps.json` for tooling.
  - Optional flags: `--report untested,methods`, `--json`.
- Implementation Notes
  - Discover production components (reuse collector + metadata).
  - Parse tests for `discover()/discoverTarget()` and scan for method mentions; consider basic MemberExpression usage.
  - v2: add runtime proof mode (opt‑in) wiring to coverage to confirm method calls.
- Tests
  - Fixtures: class with 3 methods, tests calling 2 → warn for the 3rd.
- CI
  - Optional step to upload `gaps.json`/HTML artifact.

### 7) Vitest/Mocha Recipes + TS Templates

- Outcome
  - Low‑friction adoption for non‑Jest projects and TypeScript test scaffolding.

## Milestone: Later (6+ weeks)

### 8) Refactor Assistant (CLI: `refactor --move <old> --to <new>`)

- Outcome
  - Dry‑run AST rewrite of import specifiers; print diff; apply with `--apply`.
- Acceptance Criteria
  - ESM `import` and CJS `require()` supported; TS path aliases v2.
  - On unresolved rewrite, leave a clear TODO marker and continue.
- Tests
  - Fixtures for relative/aliased paths; before/after snapshots.

### 9) Selective TS Migration (Core Surfaces)

- Outcome
  - Stronger `.d.ts`, light TS adoption for critical modules (e.g., config, scoring interfaces), while keeping zero‑config JS usage.

### 10) Optional IDE Panel (Lens/Visualizer)

- Outcome
  - VS Code read‑only panel loading `why --json` and `visualize` JSON.

## Quality Gates

- Linting: markdownlint + link checker must pass.
- Tests: all suites green; new CLI features require unit tests and at least one fixture‑based e2e test.
- Coverage: keep Codecov informational; focus on engine/scoring modules via existing excludes.
- Performance Budgets: log discovery time for easy repos; document expectations and regressions.

## Instrumentation & Budgets

- Add `why --timings` to print per‑phase timings.
- Publish per‑run discovery metrics in debug mode: files scanned, candidates kept, parse failures skipped.

## Risks & Mitigations

- Import resolution for aliases → mitigate with tsconfig loader + explicit docs.
- Static “gaps” false positives → provide runtime proof mode as opt‑in.
- Visualizer scale on big repos → cache results + include/exclude globs + depth limit.
- Refactor changes correctness → default to dry‑run, diff view, and precise AST rewrites.

## Issue Seeds (create one issue per bullet)

- CLI: scaffold – JS/TS templates, metadata extraction, path-or-name resolution.
- Discovery: tsconfig path alias resolution helper.
- Discovery errors: friendly suggestions + top candidates + signature hint.
- Docs: recipes for React, Express, Monorepo.
- CLI: visualize – JSON model + HTML renderer + flags.
- CLI: gaps – static MVP + JSON + optional runtime proof design.
- CI: upload visualize/gaps artifacts on PRs.
- CLI: refactor – dry‑run AST rewrite + diff + `--apply`.
- Engine: golden fixtures and scoring breakdown golden tests.
- Instrumentation: `why --timings` + debug metrics logging.

## Success Metrics

- Time‑to‑first‑success: % users who get a passing adaptive test within 10 minutes.
- Lens usage: % discovery failures where users run `why`.
- Docs engagement: recipe page views; reduced “how do I” issues.
- Heuristic bugs: number and time‑to‑fix for mis‑ranked top candidates.
- Feature adoption: scaffold/visualize/gaps CLI calls per week (anonymous, opt‑in if needed).

## Release & Comms

- Draft release notes per milestone; include demo GIFs and a 60–90s Lens/Visualizer video.
- Keep “free + support” message: add gentle Sponsor/tip note to new CLI outputs (once per session).
