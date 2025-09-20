# Contributing to Adaptive Tests

This is a simple idea that should have existed years ago. Help make it better.

## The Vision

Tests should validate functionality, not file locations. This project shows how.

## Development Setup

### Prerequisites

- **Node.js**: Version 16.0.0 or higher (see `engines` field in package.json)
- **npm**: Version 7.0.0 or higher
- **Git**: For cloning the repository

### Getting Started

```bash
# Clone the repository
git clone https://github.com/anon57396/adaptive-tests.git
cd adaptive-tests

# Install dependencies
npm install

# Run tests to verify setup
npm test

# Run the validation script
npm run validate
```

### VS Code Extension Development

If you're working on the VS Code extension:

```bash
cd extensions/vscode-adaptive-tests
npm install
npm run compile

# Open VS Code and press F5 to launch the extension development host
```

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing. We are committed to providing a welcoming and inclusive environment for all contributors.

## How to Contribute

### Share Your Use Cases

- Port the pattern to other languages (Python, Go, Rust, etc.)
- Add framework-specific examples (React, Angular, Express, etc.)
- Share your refactoring horror stories and how this helped

### Improve the Core

- Make discovery faster
- Add smarter caching strategies
- Support more module systems (ESM, TypeScript, etc.)
- Add better error messages when discovery fails

### Documentation

- Add more examples
- Translate documentation
- Write blog posts about your experience
- Create example projects and demos

## Guidelines

1. **Keep it simple** – Copy/paste friendly, no heavy setup
2. **Minimal, explicit deps** – Engine depends on `@babel/parser`; TypeScript support uses optional `ts-node`
3. **Real validation only** – Tests must assert behaviour, not just pass
4. **Multi-language friendly** – JS/TS today, Python companion available

## Testing

Before submitting a PR:

```bash
npm run validate
npm test
npm run check:binaries
```

This ensures:

- Tests pass with working code
- Tests survive refactoring
- Tests fail on actual bugs
- No platform-specific Go binaries are accidentally committed

## License

By contributing, you agree that your contributions will be licensed under MIT.
