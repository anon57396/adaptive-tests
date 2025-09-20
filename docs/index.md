---
layout: default
title: Adaptive Tests Documentation
---

> Tests that find your code, not your folders.

## 🚀 Quick Start

```bash
npm install --save-dev adaptive-tests
```

```javascript
const { discover } = require('adaptive-tests');

test('finds my service automatically', async () => {
  const UserService = await discover({
    name: 'UserService',
    type: 'class',
    methods: ['create', 'update', 'delete']
  });

  const service = new UserService();
  expect(service.create({ name: 'Ada' })).toBeTruthy();
});
```

## 📖 Documentation

### Getting Started

- [How It Works](HOW_IT_WORKS.md)
- [Migration Guide](MIGRATION_GUIDE.md)
- [Best Practices](BEST_PRACTICES.md)

### Framework Guides

- [React Quick Start](REACT_QUICKSTART.md)
- [Vue.js Quick Start](VUE_QUICKSTART.md)
- [Express Quick Start](EXPRESS_QUICKSTART.md)
- [Java Quick Start](JAVA_QUICKSTART.md)
- [PHP Quick Start](PHP_QUICKSTART.md)

### Reference

- [API Reference](API_REFERENCE.md)
- [CI/CD Strategy](CI_STRATEGY.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [Common Issues](COMMON_ISSUES.md)

### GitHub Integration

- [GitHub Action](GITHUB_ACTION.md)
- [Automated Publishing](AUTOMATED_PUBLISHING.md)

## 🎯 Why Adaptive Tests?

### The Problem

Traditional tests break when you refactor:

```javascript
// This breaks when you move Calculator.js
import { Calculator } from '../src/utils/Calculator';
```

### The Solution

Adaptive tests find your code automatically:

```javascript
// This works no matter where Calculator lives
const Calculator = await discover({ name: 'Calculator' });
```

## ✨ Features

- **🔍 Smart Discovery** - Finds classes, functions, and modules by structure
- **🚀 Zero Configuration** - Works out of the box with Jest
- **🌍 Multi-language** - Core JS/TS; others beta/experimental
- **⚡ Fast** - AST-based parsing with intelligent caching
- **🛠️ VS Code Extension** - Visual discovery tools and scaffolding
- **🔄 CI/CD Ready** - GitHub Actions integration

## 💬 Community

- [GitHub Discussions](https://github.com/anon57396/adaptive-tests/discussions) - Ask questions, share ideas
- [Issue Tracker](https://github.com/anon57396/adaptive-tests/issues) - Report bugs, request features
- [Examples](https://github.com/anon57396/adaptive-tests/tree/main/languages/javascript/examples) - See it in action

## 📊 Language Support

| Language | AST Parser | Status |
|----------|------------|--------|
| JavaScript | Babel | ✅ Stable |
| TypeScript | TypeScript Compiler | ✅ Stable |
| Python | Native ast module | 🟡 Beta |
| Java | JavaParser | 🟡 Beta |
| PHP | token_get_all / nikic/php-parser | 🟡 Beta |
| Ruby | Ripper | 🧪 Experimental |
| Go | go/parser (via tree‑sitter bindings) | 🧪 Experimental |
| Rust | Lezer (rust) | 🧪 Experimental |
| Wolfram | CodeParse | 🧪 Experimental |

Status legend: Stable = production‑ready; Beta = broadly usable with caveats; Experimental = early support, subject to change.

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](https://github.com/anon57396/adaptive-tests/blob/main/CONTRIBUTING.md).

## 📄 License

MIT - See [LICENSE](https://github.com/anon57396/adaptive-tests/blob/main/LICENSE) for details.
