# Changelog

## [0.2.1] - 2024-09-18

- Fixed npm package.json bin path warning
- Added demo.gif to package for visual documentation
- Enhanced README with animated demonstration
- Hardened function detection regex to avoid ReDoS on untrusted input

## [0.2.0] - 2024-09-18

- Added Python example (`examples/python/`) and companion `adaptive-tests-py` package scaffold for PyPI
- Documented cross-language recipes (React components, Node microservices, Prisma/TypeORM repositories)
- Added troubleshooting tips for signature debugging and cache management
- Added GitHub Actions workflow to publish npm and PyPI packages when a release is published

## [0.1.3] - 2025-09-18

- Point repository/homepage metadata to github.com/anon57396/adaptive-tests
- Update npm README clone instructions to the same namespace

All notable changes to this project will be documented in this file.

## [0.1.0] - 2025-09-18

- Initial public release of the adaptive discovery toolkit
- Ships JavaScript discovery engine with scoring heuristics and caching
- Adds TypeScript discovery support powered by the compiler API and optional `ts-node`
- Includes base `AdaptiveTest` class, Jest helper, and validation scripts demonstrating refactor and bug scenarios for JS & TS examples
