# Changelog

All notable changes to this project are documented here. Dates are omitted when historical records are unclear.

## [0.2.3]

- Shipped adaptive-tests-py 0.2.0 with configurable scoring, persistent cache, Lens-style explanations, and bundled CLI tooling
- Updated PyPI packaging metadata and wheels for the new Python release

## [0.2.2]

- Refreshed all public documentation (README, PROOF, ROADMAP, AGENTS, CONTRIBUTING) for accuracy
- Introduced markdownlint configuration and CI enforcement
- Bumped npm package metadata in preparation for publish
- Added the Discovery Lens CLI (`npx adaptive-tests why`) for deep-dive scoring diagnostics
- Aligned Python companion package version (adaptive-tests-py 0.1.1) and cleaned packaging metadata (SPDX license expression)

## [0.2.1]

- Fixed npm `bin` path warning
- Added `demo.gif` to the published package for visual documentation
- Enhanced README with an animated demonstration
- Hardened function detection regex to avoid ReDoS on untrusted input
- Moved adaptive fixtures to `fixtures/` and taught the discovery engine to skip any `tests/` directory while scanning

## [0.2.0]

- Added Python example (`examples/python/`) and companion `adaptive-tests-py` package scaffold for PyPI
- Documented cross-language recipes (React components, Node microservices, Prisma/TypeORM repositories)
- Added troubleshooting tips for signature debugging and cache management
- Added GitHub Actions workflow to publish npm and PyPI packages when a release is published

## [0.1.3]

- Pointed repository/homepage metadata to github.com/anon57396/adaptive-tests
- Updated npm README clone instructions to the same namespace

## [0.1.0]

- Initial public release of the adaptive discovery toolkit
- Shipped JavaScript discovery engine with scoring heuristics and caching
- Added TypeScript discovery support powered by the compiler API and optional `ts-node`
- Included base `AdaptiveTest` class, Jest helper, and validation scripts demonstrating refactor and bug scenarios for JS & TS examples
