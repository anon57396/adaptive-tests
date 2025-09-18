# Contributing to Adaptive Tests

This is a simple idea that should have existed years ago. Help make it better.

## The Vision

Tests should validate functionality, not file locations. This project shows how.

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
- Create video tutorials

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
```

This ensures:

- Tests pass with working code
- Tests survive refactoring
- Tests fail on actual bugs

## License

By contributing, you agree that your contributions will be licensed under MIT.
