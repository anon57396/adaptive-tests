# Development Guide

## 🚀 Quick Development Setup

```bash
# Clone the repository
git clone https://github.com/anon57396/adaptive-tests.git
cd adaptive-tests

# Install dependencies
npm install

# Run tests
npm test

# Run validation suite
npm run validate
```

## 📁 Project Structure

```
adaptive-tests/
├── src/                    # Core source code
│   ├── adaptive/           # Language integrations
│   ├── cli/                # CLI implementation
│   └── index.js            # Main entry point
├── tests/                  # Test suites
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── fixtures/           # Test fixtures
├── examples/               # Example projects
│   ├── javascript/         # JavaScript examples
│   ├── typescript/         # TypeScript examples
│   ├── python/             # Python examples
│   └── ...                 # Other languages
├── packages/               # Published packages
│   ├── jest-adaptive/      # Jest preset
│   ├── vite-plugin/        # Vite plugin
│   └── webpack-plugin/     # Webpack plugin
├── extensions/             # IDE extensions
│   └── vscode/             # VS Code extension
└── docs/                   # Documentation
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/unit/discovery.test.js

# Run validation suite
npm run validate

# Watch mode
npm test -- --watch
```

### Test Organization

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test language integrations
- **Validation Tests**: End-to-end scenarios proving adaptive behavior

## 🔧 Development Commands

```bash
# Build TypeScript types
npm run build:types

# Build plugins
npm run build:plugins

# Lint code
npm run lint

# Format code
npm run format

# Check markdown
npm run lint:markdown

# Check for broken links
npm run lint:links
```

## 🌍 Language Integrations

### Adding a New Language

1. Create integration file: `src/adaptive/<language>/<language>-discovery-integration.js`
2. Implement `BaseLanguageIntegration` interface
3. Add AST parser (preferably native)
4. Add tests in `tests/integration/<language>/`
5. Add example in `examples/<language>/`
6. Update documentation

### Language Integration Checklist

- [ ] AST parser implementation
- [ ] Fallback regex parser
- [ ] Class discovery
- [ ] Function discovery
- [ ] Module discovery
- [ ] Test scaffolding
- [ ] Documentation
- [ ] Examples
- [ ] Integration tests

## 📝 Code Style

### JavaScript/TypeScript

- Use ES6+ features
- Async/await over promises
- Descriptive variable names
- JSDoc comments for public APIs
- No console.log in production code

### Commit Messages

Follow conventional commits:

```
feat: add Ruby AST parser
fix: resolve Python cache issue
docs: update React quickstart
chore: update dependencies
test: add async discovery tests
```

## 🐛 Debugging

### Debug Mode

```bash
# Enable debug output
DEBUG=adaptive:* npm test

# Debug specific module
DEBUG=adaptive:discovery npm test

# Verbose CLI output
npx adaptive-tests --verbose
```

### Common Issues

1. **Discovery not finding classes**
   - Check file extensions
   - Verify AST parser is working
   - Check ignore patterns

2. **Performance issues**
   - Enable caching
   - Check for large node_modules
   - Use ignore patterns

3. **Language parser failures**
   - Verify language runtime installed
   - Check parser dependencies
   - Review fallback behavior

## 🚢 Publishing

### Pre-release Checklist

- [ ] All tests passing
- [ ] Validation suite passes
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped
- [ ] Examples working

### Release Process

```bash
# Run full validation
npm run prepublishOnly

# Bump version
npm version patch|minor|major

# Publish to npm
npm publish

# Create GitHub release
git push --tags
```

## 🤝 Contributing

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Update documentation
7. Commit with conventional commits
8. Push to your fork
9. Open pull request

### Code Review Checklist

- [ ] Tests included and passing
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Follows code style
- [ ] Performance considered
- [ ] Edge cases handled

## 📚 Resources

### Internal Documentation

- [Architecture Overview](../docs/HOW_IT_WORKS.md)
- [API Reference](../docs/API_REFERENCE.md)
- [Language Integration Guide](../src/adaptive/README.md)

### External Resources

- [GitHub Discussions](https://github.com/anon57396/adaptive-tests/discussions)
- [Issue Tracker](https://github.com/anon57396/adaptive-tests/issues)
- [npm Package](https://www.npmjs.com/package/adaptive-tests)

## 🔍 Useful Commands

```bash
# Find TODO comments
grep -r "TODO" src/

# Check bundle size
npm run build && du -sh dist/

# List all npm scripts
npm run

# Check for outdated dependencies
npm outdated

# Audit for vulnerabilities
npm audit
```

## 💡 Development Tips

1. **Use the VS Code Extension**: Install our extension for better development experience
2. **Run validate frequently**: Catches issues early
3. **Test with examples**: Use example projects to verify changes
4. **Check multiple languages**: Ensure changes don't break other integrations
5. **Document as you go**: Update docs with code changes

## 🏗️ Architecture Principles

1. **Discovery First**: Always prioritize discovery accuracy
2. **AST Over Regex**: Use proper parsers when available
3. **Fail Gracefully**: Always have fallbacks
4. **Cache Aggressively**: Performance matters
5. **Developer Experience**: Make it easy to use

## 🎯 Performance Guidelines

- Discovery should complete in <100ms for small projects
- Cache hit rate should be >80%
- Memory usage should stay under 100MB
- Support projects with 10,000+ files

## 🔐 Security

- Never execute discovered code during discovery
- Sanitize all file paths
- Validate all user input
- Use AST parsing to avoid code injection
- Keep dependencies updated

---

Questions? Open a [discussion](https://github.com/anon57396/adaptive-tests/discussions) or check our [troubleshooting guide](../docs/TROUBLESHOOTING.md).