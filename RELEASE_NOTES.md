# Release v0.2.5 - AST-First Architecture & Developer Experience

## 🎯 Major Improvements

### AST-First Testing Architecture

- **All languages now use native AST parsers** as the primary discovery method
- Ruby: Native Ripper AST parser
- PHP: Native token_get_all parser
- Rust: syn crate via rust-ast-bridge
- Wolfram: CodeParse integration for symbolic computation
- Three-tier fallback strategy ensures 100% availability

### Python Fixes

- Fixed Signature API compatibility issues
- Fixed cache decorator unhashable dict error
- Fixed module-level discovery for `__init__.py` files
- All Python tests now passing (12/12)

### Developer Experience

- Added automated developer setup script (`npm run dev:setup`)
- Created comprehensive development guide (`.github/DEVELOPMENT.md`)
- Added GitHub Discussion templates for Q&A, Ideas, Show & Tell
- Configured Dependabot for automated dependency updates
- Added welcome workflow for new contributors

### Documentation & Platform Strategy

- **Single platform strategy**: Everything on GitHub (Pages, Discussions, Issues)
- Removed all external platform references (Discord, videos, etc.)
- Fixed all broken links to point to correct GitHub resources
- Created GitHub Pages documentation site structure
- Updated all quickstart guides for consistency

## 🐛 Bug Fixes

- Fixed Python Signature class missing parameters (type, properties, exports)
- Fixed Python cache decorator with unhashable dict arguments
- Fixed Python module discovery for package **init**.py files
- Fixed `.adaptive-tests-cache.json` files being tracked in git
- Fixed broken GitHub Marketplace and issues links
- Fixed markdown linting issues (reduced from 500+ to 74)

## 🚀 New Features

- Wolfram Language support with pattern-based discovery
- GitHub Actions welcome workflow for first-time contributors
- Dependabot configuration for all package ecosystems
- Interactive demo guide for GitHub Pages
- Developer setup automation script

## 📚 Documentation

- Added comprehensive development guide
- Created GitHub Pages documentation structure
- Updated all framework quickstart guides
- Removed all video/external platform references
- Fixed all broken documentation links

## 💻 Language Support Status

| Language | Parser | Status |
|----------|---------|---------|
| JavaScript | Babel | ✅ Full AST |
| TypeScript | TS Compiler | ✅ Full AST |
| Python | ast module | ✅ Full AST |
| Ruby | Ripper | ✅ Full AST |
| PHP | token_get_all | ✅ Full AST |
| Rust | syn | ✅ Full AST |
| Go | go/parser | ✅ Full AST |
| Java | JavaParser | ✅ Full AST |
| Wolfram | CodeParse | ✅ Full AST |

## 🔄 Breaking Changes

None - this release maintains full backward compatibility.

## 📦 Installation

```bash
npm install --save-dev adaptive-tests@0.2.5
```

## 🙏 Thanks

Special thanks to contributors and the community for feedback and testing.

---

**Full Changelog**: [v0.2.2...main](https://github.com/anon57396/adaptive-tests/compare/v0.2.2...main)
