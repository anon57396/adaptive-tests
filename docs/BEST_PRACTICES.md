# Best Practices for Discoverable Code

## Table of Contents

- [Exports and modules](#exports-and-modules)
- [File and directory layout](#file-and-directory-layout)
- [Structure that matches signatures](#structure-that-matches-signatures)
- [TypeScript](#typescript)
- [Dynamic patterns](#dynamic-patterns)
- [Scoring configuration](#scoring-configuration)
- [Caching and iterations](#caching-and-iterations)

These tips help adaptive discovery consistently find the right targets with
minimal configuration.

## Exports and modules

- Prefer a clear, stable export name for the primary symbol (`module.exports = UserService` or `export class UserService {}`).
- Avoid multiple top‑level classes with similar names in the same file — split into separate files where practical.
- For named exports, keep the exported name aligned with the class/function name.

## File and directory layout

- Place production code under positively scored folders (default: `/src/`, `/lib/`, `/app/`).
- Keep tests, mocks, stubs, fixtures under negatively scored folders (default: `/tests/`, `/__mocks__/`, `/fixtures/`).
- Use meaningful file names that match the symbol name (e.g., `UserService.js`).

## Structure that matches signatures

- If you’ll discover by methods/properties, ensure those are on the prototype or set in the constructor.
- For classes with required constructor args, prefer method/property signatures over strict `extends`/`instanceof` checks.
- Start with a minimal signature (just `name`) and add constraints as needed.

## TypeScript

- Install `ts-node` (optional) to discover `.ts` sources directly.
- Keep your .ts file names and export names aligned — the extension scoring favors `.ts` by default.

## Dynamic patterns

- Minimize dynamic/magic export patterns (computed export names, heavy runtime metaprogramming). Static analysis can’t verify those.
- If needed, add a custom scorer in `adaptive-tests.config.js` to boost or penalize specific paths or patterns.

## Scoring configuration

- Tune `discovery.scoring.paths` to reflect your project’s conventions.
- Consider enabling a modest recency bonus to bias toward fresh edits when ranking ties.
- Use the Discovery Lens CLI to confirm your changes: `npx adaptive-tests why '{"name":"X"}'`.

## Caching and iterations

- On first run, a cache warms up (`.test-discovery-cache.json`). After major structure changes, call `await engine.clearCache()` or re‑run tests to refresh.
- Use `why --json` outputs in CI to track regressions in discovery behavior over time.
