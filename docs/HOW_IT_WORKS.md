# How It Works – Discovery, Scoring, and “Why”

## Table of Contents

- [Language Integrations At A Glance](#language-integrations-at-a-glance)
- [Scoring Categories](#scoring-categories)
- [Lifecycle](#lifecycle)
- [Using Discovery Lens to Debug](#using-discovery-lens-to-debug)
- [Configuration Pointers](#configuration-pointers)

This guide explains exactly how the discovery engine ranks candidates and how to
use the Discovery Lens CLI to verify the reasoning in your own repo.

## Language Integrations At A Glance

| Language    | Discovery Strategy                                                                 | CLI Hooks                                     | Scaffold Output               | Notes |
|-------------|-------------------------------------------------------------------------------------|-----------------------------------------------|--------------------------------|-------|
| JavaScript  | In-process heuristics over Babel AST (`src/adaptive/discovery-engine.js`)           | `discover`, `why`, `scaffold`, `enable-invisible` | Jest suites (JavaScript)       | Baseline experience with telemetry + invisible mode |
| TypeScript  | DiscoveryEngine with TS extensions (`src/adaptive/typescript/discovery.js`)         | `discover`, `why`, `scaffold`                  | Jest suites (ts-jest)          | Resolves path aliases through `tsconfig-resolver.js` |
| Python      | `spawnSync` bridge running `ast.parse` (`src/adaptive/python/python-discovery-integration.js`) | `discover`, `scaffold`, `why` (signature hints) | Pytest skeletons               | Requires local `python3`; 5 s timeout + 1 MB buffer |
| Java        | `java-parser` AST collector (`src/adaptive/java/java-discovery-collector.js`)       | `discover`, `scaffold`                        | JUnit tests                    | Auto-detects Maven/Gradle layouts |
| Go          | Tree-sitter (`tree-sitter-go`) collector (`src/adaptive/go/go-discovery-collector.js`) | `discover`, `scaffold`                        | Go test skeletons              | Optional dependency; graceful fallback when parser missing |
| PHP         | Native PHP bridge with `php-parser` fallback (`src/adaptive/php/php-discovery-collector.js`) | `discover`, `scaffold`                        | PHPUnit cases                  | Captures namespaces, traits, and functions |
| Ruby        | Ripper AST fallbacks with caching (`src/adaptive/ruby/ruby-discovery-integration.js`) | `discover`, `scaffold`                        | RSpec skeletons                | 2 s interpreter checks + bounded cache |
| Rust        | Lezer-based parser (`src/adaptive/rust/rust-discovery-collector.js`)                | `discover`, `scaffold`                        | Rust test modules (`#[cfg(test)]`) | Infers crate/module names for output paths |
| Wolfram     | Wolfram CLI bridge (`src/adaptive/wolfram/wolfram-discovery-collector.js`)          | `discover`                                   | _Not yet available_            | Scaffolding tracked on roadmap |

Run Discovery Lens:

```bash
npx adaptive-tests why '{"name":"UserService"}'
# Or machine‑readable output
npx adaptive-tests why '{"name":"UserService"}' --json
```

Each candidate receives points from distinct categories. The CLI shows a
ranked list plus a per‑factor breakdown so you can see where points came from.

## Scoring Categories

- Path
  - What: Directory path hints (positive/negative)
  - Defaults: Favors `/src/`, `/app/`, `/lib/`, `/core/`; penalizes `/tests/`,
    `/__mocks__/`, `/fixtures/`, `/tmp/`, etc.
  - Tuning: `adaptive-tests.config.js → discovery.scoring.paths.{positive|negative}`
  - Verify: `why` shows entries like `+12 (path /src/)`, `-30 (path /mocks/)`

- File Name
  - What: How closely the file name matches the signature’s `name`
  - Defaults: exactMatch 45, caseInsensitive 30, partialMatch 8, regexMatch 12
  - Tuning: `discovery.scoring.fileName`
  - Verify: `why` shows `(+45 fileName UserService)` for exact matches

- Type Hints
  - What: Lightweight content hints that a file contains a class/function/module
  - Triggers: regex checks in content (e.g., `class X`, function patterns, export tokens)
  - Defaults: class 15, function 12, module 10
  - Tuning: `discovery.scoring.typeHints`
  - Verify: `(+15 typeHints class)` style entries

- Methods (mentions)
  - What: Mentions of method names in file content (not structural validation yet)
  - Defaults: `perMention: 3`, capped by `maxMentions: 5`
  - Tuning: `discovery.scoring.methods`
  - Verify: `(+3 methods login, logout)`
  - Note: Structural method validation happens later after the module is loaded

- Exports (hints)
  - What: Whether content suggests a named/default export consistent with the signature
  - Recognized: `module.exports = X`, `exports.X = ...`, `export default X`,
    `export { X }`, `export class X` etc.
  - Defaults: 30 points
  - Tuning: `discovery.scoring.exports`
  - Verify: `(+30 exports UserService)`

- Name Mentions
  - What: Mentions of the target `name` in content (non‑regex signature names)
  - Defaults: `perMention: 2`, `maxMentions: 5`
  - Tuning: `discovery.scoring.names`
  - Verify: `(+2 nameMentions UserService)`

- Custom
  - What: User‑supplied scorers run for each candidate
  - API: `discovery.scoring.custom = [ (candidate, signature, content) => number ]`
  - Verify: `why` labels custom contributions (e.g., `(+10 custom myRule)`) if you name your scorer

- Recency
  - What: mtime‑based bonus for fresher files
  - Defaults: `maxBonus: 0` (off), optional `halfLifeHours`
  - Tuning: `discovery.scoring.recency`
  - Verify: `(+N recency mtime)` shows the decayed bonus when enabled

Notes:

- Extensions also factor into scoring (e.g., `.ts` > `.js` by default). See
  `discovery.scoring.extensions`.
- Final score = base scoring (above) + optional recency bonus.

## Lifecycle

1. Candidate Collection

- `extensions` filter, test files excluded, directory skip list applied.

1. Scoring (static)

- The categories above accumulate a raw score.

1. Recency Bonus (optional)

- Added if enabled (half‑life decay).

1. Structural Validation (dynamic)

- The engine loads top candidates in order and validates type/name/methods/
  properties/inheritance against the signature. Only validated targets are
  returned to tests.

## Using Discovery Lens to Debug

- Unexpected top hit?
  - Run `npx adaptive-tests why '{"name":"X"}' --json`
  - Inspect `details[]` for large positives/negatives (paths, fileName, etc.)
  - Adjust `adaptive-tests.config.js` to nudge scores.

- Not finding the intended file?
  - Start simple: `{ name: "ClassName" }` and add constraints incrementally.
  - Use the suggested signature at the end of `why` output to refine your tests.

## Configuration Pointers

- File: `adaptive-tests.config.js`
- Field: `discovery.scoring.*` (paths, fileName, extensions, typeHints, methods,
  exports, names, target, custom, recency)
- Defaults: See `DEFAULT_CONFIG` exported by the package and `docs/COMMON_ISSUES.md` for troubleshooting.
