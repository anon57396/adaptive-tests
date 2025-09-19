# webpack-plugin-adaptive

[![npm version](https://img.shields.io/npm/v/webpack-plugin-adaptive.svg)](https://www.npmjs.com/package/webpack-plugin-adaptive)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Webpack plugin for adaptive-tests with build-time discovery optimization, loader support, and bundle analysis.

## ✨ Features

- **📦 Build Optimization** - Pre-discover and optimize test targets
- **🎯 Custom Loader** - Transform adaptive test files automatically
- **📊 Bundle Analysis** - Track discovery impact on bundle size
- **📝 Manifest Generation** - Export discovery data for CI/CD
- **♾️ Smart Caching** - Cache discoveries across builds
- **🔍 Watch Mode Support** - Auto-invalidate on file changes

## 📦 Installation

```bash
npm install --save-dev webpack-plugin-adaptive adaptive-tests
```

or

```bash
yarn add --dev webpack-plugin-adaptive adaptive-tests
```

## 🚀 Quick Start

Add to your `webpack.config.js`:

```javascript
const AdaptiveTestsPlugin = require('webpack-plugin-adaptive');

module.exports = {
  plugins: [
    new AdaptiveTestsPlugin({
      // Options
    }),
  ],
};
```

## 🔧 Configuration

```javascript
new AdaptiveTestsPlugin({
  // Enable discovery caching
  cache: true, // default: true

  // File patterns to include
  include: [/\.adaptive\.(test|spec)\.[jt]sx?$/], // default

  // File patterns to exclude  
  exclude: [/node_modules/], // default

  // Enable build-time discovery optimization
  optimizeDiscovery: true, // default: true

  // Enable debug logging
  debug: false, // default: false

  // Enable bundle size analysis
  analyzeBundleSize: false, // default: false

  // Output directory for discovery manifest
  manifestDir: '.adaptive', // default

  // Generate discovery manifest file
  generateManifest: true, // default: true
});
```

## 🎯 How It Works

### Automatic Loader Integration

The plugin automatically adds a loader for adaptive test files:

```javascript
// Automatically configured by the plugin
{
  test: /\.adaptive\.(test|spec)\.[jt]sx?$/,
  use: 'webpack-plugin-adaptive/loader',
}
```

### Build-Time Discovery

1. **Parse test files** during compilation
2. **Extract discovery signatures** from code
3. **Cache results** for faster rebuilds
4. **Optimize chunks** containing adaptive tests
5. **Generate manifest** with discovery data

## 📊 Bundle Size Analysis

Enable analysis to see the impact of discovered modules:

```javascript
new AdaptiveTestsPlugin({
  analyzeBundleSize: true,
});
```

Output:
```
[webpack-plugin-adaptive] Bundle Size Analysis:
══════════════════════════════════════════════════
  • {"name":"UserService","type":"class"}
    Size: 12.5 KB
    File: src/services/UserService.js
  • {"name":"AuthService","type":"class"}
    Size: 8.3 KB
    File: src/services/AuthService.js
══════════════════════════════════════════════════
Total: 20.8 KB
```

## 🗂️ Discovery Manifest

The plugin generates a manifest file at `dist/.adaptive/discovery-manifest.json`:

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
      "file": "/path/to/UserService.test.js",
      "resolvedPath": "dist/UserService.js",
      "bundleSize": 12500
    }
  ]
}
```

## 🎨 Loader Options

The loader can be configured separately if needed:

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.adaptive\.test\.js$/,
        use: [
          {
            loader: 'webpack-plugin-adaptive/loader',
            options: {
              cache: true,
              optimizeDiscovery: true,
              injectHelpers: true, // Auto-inject discover() if missing
              debug: false,
            },
          },
        ],
      },
    ],
  },
};
```

## 🔄 Watch Mode

The plugin automatically handles watch mode:

```javascript
// webpack.config.js
module.exports = {
  watch: true,
  plugins: [
    new AdaptiveTestsPlugin({
      cache: true, // Cache is invalidated on file changes
    }),
  ],
};
```

## 🎯 Usage Example

```javascript
// UserService.adaptive.test.js
describe('UserService', () => {
  let UserService;

  beforeAll(async () => {
    // This discovery is optimized by the plugin
    UserService = await discover({
      name: 'UserService',
      type: 'class',
      methods: ['create', 'update', 'delete'],
    });
  });

  test('should create users', () => {
    const service = new UserService();
    expect(service.create).toBeDefined();
  });
});
```

With the plugin enabled:
1. The loader automatically injects adaptive-tests imports
2. Discovery signatures are extracted at build time
3. Dependencies are tracked for smart rebuilds
4. Bundle size impact is analyzed
5. A manifest is generated for CI/CD

## 🚦 Performance Optimization

### Chunk Optimization

The plugin marks chunks containing adaptive tests for special handling:

```javascript
new AdaptiveTestsPlugin({
  optimizeDiscovery: true, // Enable chunk optimization
});
```

### Caching Strategy

```javascript
new AdaptiveTestsPlugin({
  cache: true, // Enable caching
  // Cache is automatically invalidated when:
  // - Source files change
  // - Discovery signatures change
  // - Dependencies are modified
});
```

## 🐛 Debugging

Enable debug mode for detailed logs:

```javascript
new AdaptiveTestsPlugin({
  debug: true,
});
```

Debug output:
```
[webpack-plugin-adaptive] Watch run triggered
[webpack-plugin-adaptive] Found 3 signatures in src/test.adaptive.js
[webpack-plugin-adaptive] Optimizing chunk: test-chunk
[webpack-plugin-adaptive] Generated manifest: dist/.adaptive/discovery-manifest.json
```

## 📚 API Reference

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cache` | `boolean` | `true` | Enable discovery caching |
| `include` | `RegExp[]` | `[/\.adaptive\.(test\|spec)\.[jt]sx?$/]` | Files to process |
| `exclude` | `RegExp[]` | `[/node_modules/]` | Files to exclude |
| `optimizeDiscovery` | `boolean` | `true` | Enable build optimization |
| `debug` | `boolean` | `false` | Enable debug logging |
| `analyzeBundleSize` | `boolean` | `false` | Analyze bundle impact |
| `manifestDir` | `string` | `'.adaptive'` | Manifest output directory |
| `generateManifest` | `boolean` | `true` | Generate discovery manifest |

### Loader Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cache` | `boolean` | `true` | Enable loader caching |
| `optimizeDiscovery` | `boolean` | `true` | Optimize discoveries |
| `injectHelpers` | `boolean` | `true` | Auto-inject helpers |
| `debug` | `boolean` | `false` | Enable debug mode |

## 🤝 Compatibility

- **Webpack**: 4.x, 5.x
- **Node.js**: 16.x, 18.x, 20.x
- **Adaptive Tests**: 0.2.x or higher

## 📄 License

MIT © Jason Kempf

## 🔗 Links

- [Adaptive Tests Documentation](https://github.com/anon57396/adaptive-tests)
- [Webpack Documentation](https://webpack.js.org/)
- [Report Issues](https://github.com/anon57396/adaptive-tests/issues)