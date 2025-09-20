# @adaptive-tests/javascript

**AI-ready testing infrastructure for JavaScript and Node.js projects**

## Quick Start

```bash
# Install
npm install @adaptive-tests/javascript

# Use in your tests
const { discover } = require('@adaptive-tests/javascript');

describe('My Tests', () => {
  let MyClass;

  beforeAll(async () => {
    MyClass = await discover({
      name: 'MyClass',
      type: 'class',
      methods: ['methodA', 'methodB']
    });
  });

  test('works', () => {
    const instance = new MyClass();
    expect(instance.methodA()).toBeDefined();
  });
});
```

## Features

- 🔍 **Smart Discovery** - Find classes and functions by signature, not hardcoded paths
- 🚀 **Zero Configuration** - Works out of the box with any JavaScript project
- 🧠 **AI-Ready** - Designed for AI-assisted development workflows
- 📦 **Self-Contained** - No dependencies on other language packages

## Framework-Specific Guides

- [React Integration](docs/REACT_QUICKSTART.md)
- [Vue Integration](docs/VUE_QUICKSTART.md)
- [Express Integration](docs/EXPRESS_QUICKSTART.md)

## API Reference

See the main [API Reference](../../docs/API_REFERENCE.md) for detailed documentation.

## Examples

Check out the `examples/` directory for working examples:
- Calculator (basic class discovery)
- API Service (REST API testing)
- Todo App (CRUD operations)

## License

MIT