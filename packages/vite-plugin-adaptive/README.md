# vite-plugin-adaptive

[![npm version](https://img.shields.io/npm/v/vite-plugin-adaptive.svg)](https://www.npmjs.com/package/vite-plugin-adaptive)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Vite plugin for adaptive-tests with build-time discovery optimization, HMR integration, and development enhancements.

## ✨ Features

- **⚡ Build-time Optimization** - Pre-discover test targets during build
- **🔥 HMR Support** - Instant updates when test targets change
- **📊 Bundle Analysis** - Track size impact of discovered modules
- **🎯 Smart Caching** - Cache discovery results for faster builds
- **🔍 Discovery API** - Development server endpoint for discovery
- **📝 Manifest Generation** - Export discovery manifest for CI/CD

## 📦 Installation

```bash
npm install --save-dev vite-plugin-adaptive adaptive-tests
```

or

```bash
yarn add --dev vite-plugin-adaptive adaptive-tests
```

## 🚀 Quick Start

Add to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import adaptiveTests from 'vite-plugin-adaptive';

export default defineConfig({
  plugins: [
    adaptiveTests({
      // Options
    }),
  ],
});
```

## 🔧 Configuration

```typescript
adaptiveTests({
  // Enable discovery caching
  cache: true, // default: true

  // Enable HMR for adaptive test files
  hmr: true, // default: true

  // File patterns to include
  include: ['**/*.adaptive.{test,spec}.{js,jsx,ts,tsx}'], // default

  // File patterns to exclude
  exclude: ['node_modules/**', 'dist/**'], // default

  // Enable build-time discovery optimization
  optimizeDiscovery: true, // default: true

  // Enable debug logging
  debug: false, // default: false

  // Pre-discover signatures at build time
  preDiscovery: [
    { name: 'UserService', type: 'class' },
    { name: 'AuthService', type: 'class' },
  ],

  // Enable bundle size analysis
  analyzeBundleSize: false, // default: false
});
```

## 🎯 How It Works

### Build-Time Discovery

The plugin analyzes your adaptive test files during build to:

1. **Extract discovery signatures** from `discover()` calls
2. **Cache results** for faster subsequent builds
3. **Optimize imports** by pre-resolving paths
4. **Track dependencies** for smart invalidation

### HMR Integration

When a source file changes:

1. Plugin detects which discoveries are affected
2. Invalidates relevant cache entries
3. Triggers HMR update for test files
4. Tests re-run with fresh discoveries

### Development Server API

The plugin adds a discovery endpoint to the dev server:

```javascript
// Available at /_adaptive/discover
fetch('/_adaptive/discover', {
  method: 'POST',
  body: JSON.stringify({
    name: 'UserService',
    type: 'class',
    methods: ['create', 'update'],
  }),
});
```

## 📊 Bundle Analysis

Enable bundle analysis to track the size impact of discovered modules:

```typescript
adaptiveTests({
  analyzeBundleSize: true,
});
```

Output:
```
[vite-plugin-adaptive] Bundle Size Analysis:

  • UserService: 12.5 KB
  • AuthService: 8.3 KB
  • DataProcessor: 15.7 KB

  Total: 36.5 KB
```

## 🗂️ Discovery Manifest

The plugin can generate a manifest file for CI/CD:

```json
{
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00Z",
  "discoveries": [
    {
      "signature": {
        "name": "UserService",
        "type": "class",
        "methods": ["create", "update", "delete"]
      },
      "file": "src/services/UserService.ts",
      "resolvedPath": "dist/services/UserService.js",
      "bundleSize": 12500
    }
  ]
}
```

## 🔥 HMR Example

```typescript
// test.adaptive.spec.ts
describe('UserService', () => {
  let UserService;

  beforeAll(async () => {
    // This discovery is optimized by the plugin
    UserService = await discover({
      name: 'UserService',
      type: 'class',
    });
  });

  test('should create users', () => {
    const service = new UserService();
    // Test will re-run when UserService changes
    expect(service.create).toBeDefined();
  });
});
```

## 🎨 With Vitest

Combine with Vitest for the ultimate testing experience:

```typescript
import { defineConfig } from 'vite';
import adaptiveTests from 'vite-plugin-adaptive';

export default defineConfig({
  plugins: [
    adaptiveTests({
      optimizeDiscovery: true,
      hmr: true,
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
  },
});
```

## 🐛 Debugging

Enable debug mode to see what's happening:

```typescript
adaptiveTests({
  debug: true,
});
```

Debug output:
```
[vite-plugin-adaptive] Found 3 discovery signatures in tests/user.test.ts
[vite-plugin-adaptive] Using cached discovery for UserService
[vite-plugin-adaptive] Invalidated discovery cache due to change in src/UserService.ts
[vite-plugin-adaptive] Generated manifest: dist/.adaptive/discovery-manifest.json
```

## 🚦 Performance Tips

1. **Use specific include patterns** to avoid processing unnecessary files
2. **Enable caching** for faster rebuilds
3. **Pre-discover common signatures** to optimize cold starts
4. **Use lazy discovery** in tests for better performance:

```typescript
// Lazy discovery - only resolves when needed
const getUserService = lazy(() => discover({ name: 'UserService' }));
```

## 📚 API Reference

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cache` | `boolean` | `true` | Enable discovery caching |
| `hmr` | `boolean` | `true` | Enable HMR for adaptive tests |
| `include` | `string[]` | `['**/*.adaptive.{test,spec}.*']` | File patterns to include |
| `exclude` | `string[]` | `['node_modules/**']` | File patterns to exclude |
| `optimizeDiscovery` | `boolean` | `true` | Optimize discovery at build time |
| `debug` | `boolean` | `false` | Enable debug logging |
| `preDiscovery` | `DiscoverySignature[]` | `[]` | Pre-discover signatures |
| `analyzeBundleSize` | `boolean` | `false` | Analyze bundle size impact |

## 🤝 Compatibility

- **Vite**: 3.x, 4.x, 5.x
- **Node.js**: 16.x, 18.x, 20.x
- **Adaptive Tests**: 0.2.x or higher

## 📄 License

MIT © Jason Kempf

## 🔗 Links

- [Adaptive Tests Documentation](https://github.com/anon57396/adaptive-tests)
- [Vite Documentation](https://vitejs.dev/)
- [Report Issues](https://github.com/anon57396/adaptive-tests/issues)