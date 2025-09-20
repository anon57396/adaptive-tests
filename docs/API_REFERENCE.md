# API Reference

Complete API documentation for adaptive-tests across all supported languages.

## Table of Contents

- [Core API](#core-api)
- [Discovery Engine](#discovery-engine)
- [CLI Commands](#cli-commands)
- [Configuration](#configuration)
- [Language Bindings](#language-bindings)
- [VS Code Extension API](#vs-code-extension-api)
- [Advanced Options](#advanced-options)

---

## Core API

### `discover(signature, options?)`

Discovers and returns modules matching the given signature.

#### Parameters

- `signature` (Object): Module signature to match
  - `name` (string): Name of the module/export
  - `type` (string?): Type of export ('class', 'function', 'const', 'interface', etc.)
  - `methods` (string[]?): Expected methods (for classes)
  - `properties` (string[]?): Expected properties
  - `exports` (string | string[]?): Export type ('default', 'named', or specific names)
  - `path` (string?): Path hint for disambiguation
  - `internal` (boolean?): Include private/internal methods

- `options` (Object?): Discovery options
  - `searchPaths` (string[]?): Directories to search (default: project root)
  - `extensions` (string[]?): File extensions to check (default: auto-detect)
  - `ignore` (string[]?): Glob patterns to ignore
  - `maxDepth` (number?): Maximum directory depth (default: 10)
  - `cache` (boolean?): Use cache (default: true)
  - `timeout` (number?): Discovery timeout in ms (default: 5000)
  - `verbose` (boolean?): Enable verbose logging

#### Returns

Promise resolving to the discovered module or rejection if not found.

#### Examples

```javascript
// Basic usage
const UserService = await discover({
  name: 'UserService',
  type: 'class'
});

// With methods requirement
const AuthService = await discover({
  name: 'AuthService',
  type: 'class',
  methods: ['login', 'logout', 'validateToken']
});

// Multiple exports
const { isEmail, isPhone } = await discover({
  exports: ['isEmail', 'isPhone']
});

// With options
const Component = await discover({
  name: 'Button'
}, {
  searchPaths: ['./src/components'],
  extensions: ['.tsx', '.jsx'],
  timeout: 10000
});
```

---

## Discovery Engine

### `getDiscoveryEngine(rootPath, config?)`

Creates a reusable discovery engine instance.

#### Engine Parameters

- `rootPath` (string): Root directory for discovery
- `config` (Object?): Engine configuration
  - `cache` (boolean?): Enable caching (default: true)
  - `cacheDir` (string?): Cache directory (default: '.adaptive-cache')
  - `maxCacheSize` (number?): Maximum cache entries (default: 100)
  - `ignore` (string[]?): Patterns to ignore
  - `parallel` (boolean?): Use parallel processing (default: true)

#### Engine Returns

DiscoveryEngine instance with methods:

- `collectCandidates(signature)`: Find all matching candidates
- `scoreCandidate(candidate, signature)`: Score a specific candidate
- `clearCache()`: Clear the cache
- `getCacheStats()`: Get cache statistics

#### Example

```javascript
const { getDiscoveryEngine } = require('adaptive-tests');

const engine = getDiscoveryEngine(process.cwd(), {
  cache: true,
  cacheDir: '.my-cache',
  ignore: ['**/node_modules/**', '**/dist/**']
});

const candidates = await engine.collectCandidates({
  name: 'UserService',
  type: 'class'
});

console.log(`Found ${candidates.length} candidates`);
candidates.forEach(c => {
  console.log(`${c.path}: score ${c.score}`);
});
```

---

## CLI Commands

### `init`

Initialize adaptive tests in your project.

```bash
npx adaptive-tests init [options]

Options:
  --typescript     Setup for TypeScript project
  --framework      Specify framework (react|vue|angular|express)
  --force         Overwrite existing configuration
```

### `scaffold`

Generate adaptive test files.

```bash
npx adaptive-tests scaffold <file> [options]

Options:
  --output-dir <dir>      Output directory (default: tests/adaptive)
  --typescript           Generate TypeScript tests
  --force               Overwrite existing files
  --apply-assertions    Generate assertions instead of TODOs
  --all-exports         Test all exports from file
  --export <name>       Test specific export
  --batch <dir>         Scaffold entire directory
  --json               Output JSON for tooling
```

### `why` (Discovery Lens)

Explain discovery results.

```bash
npx adaptive-tests why '<signature>' [options]

Options:
  --json              Output as JSON
  --limit <n>         Limit results (default: 10)
  --verbose          Show detailed scoring
  --show-ast         Display AST analysis
```

#### CLI Example

```bash
npx adaptive-tests why '{"name":"UserService","type":"class"}'

# Output:
# 🔍 Discovery Results for UserService
#
# 1. src/services/UserService.js (Score: 95)
#    ✓ Name match: UserService (exact)
#    ✓ Type match: class
#    ✓ Standard path: services/
#
# 2. src/old/UserService.backup.js (Score: 45)
#    ✓ Name match: UserService (exact)
#    ✓ Type match: class
#    ✗ Non-standard path: -20 points
```

### `warm`

Pre-warm the cache for faster test runs.

```bash
npx adaptive-tests warm [options]

Options:
  --all              Warm all discoverable modules
  --signatures       Warm from signatures.json file
  --parallel         Use parallel processing
```

### `clear-cache`

Clear the discovery cache.

```bash
npx adaptive-tests clear-cache [options]

Options:
  --all              Clear all cache types
  --discovery        Clear discovery cache only
  --ast             Clear AST cache only
```

### `analyze`

Analyze a file's exports and structure.

```bash
npx adaptive-tests analyze <file> [options]

Options:
  --json            Output as JSON
  --show-ast        Show full AST
  --show-methods    List all methods
  --show-deps      Show dependencies
```

### `validate`

Validate signature JSON.

```bash
npx adaptive-tests validate '<signature>'

# Example
npx adaptive-tests validate '{"name":"Test","type":"class"}'
# ✓ Valid signature
```

---

## Configuration

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'adaptive-tests/jest-preset',

  // Adaptive-specific options
  globals: {
    'adaptive-tests': {
      cache: true,
      cacheDirectory: '.jest-adaptive-cache',
      searchPaths: ['./src'],
      ignore: ['**/*.test.js'],
      timeout: 10000
    }
  }
};
```

### Package.json Configuration

```json
{
  "adaptive-tests": {
    "searchPaths": ["src", "lib"],
    "cache": true,
    "cacheDir": ".adaptive-cache",
    "ignore": ["**/node_modules/**", "**/dist/**"],
    "discovery": {
      "timeout": 5000,
      "maxDepth": 10
    },
    "scaffold": {
      "outputDir": "tests/adaptive",
      "typescript": true,
      "applyAssertions": false
    }
  }
}
```

### Environment Variables

```bash
# Enable debug logging
DEBUG=adaptive-tests:*

# Set cache directory
ADAPTIVE_CACHE_DIR=/tmp/adaptive-cache

# Disable cache
ADAPTIVE_NO_CACHE=1

# Set discovery timeout
ADAPTIVE_TIMEOUT=10000
```

---

## Language Bindings

### Python API

```python
from adaptive_tests import discover, get_engine

# Discover a class
Calculator = await discover({
    "name": "Calculator",
    "type": "class",
    "module": "src.utils.calculator"
})

# Use discovery engine
engine = get_engine(".")
candidates = engine.collect_candidates({
    "name": "Calculator"
})
```

### Java API

```java
import io.adaptivetests.Discovery;
import io.adaptivetests.DiscoveryEngine;
import io.adaptivetests.Signature;

// Discover a class
Class<?> serviceClass = Discovery.discover(
    new Signature()
        .withName("UserService")
        .withType("class")
        .withMethods("findUser", "saveUser")
);

// Use engine
DiscoveryEngine engine = new DiscoveryEngine("src/main/java");
List<Candidate> candidates = engine.collectCandidates(signature);
```

### PHP API

```php
use AdaptiveTests\Discovery;
use AdaptiveTests\Signature;

// Discover a class
$calculator = Discovery::discover(new Signature([
    'name' => 'Calculator',
    'type' => 'class',
    'methods' => ['add', 'subtract']
]));

// Use engine
$engine = new DiscoveryEngine(__DIR__);
$candidates = $engine->collectCandidates($signature);
```

---

## VS Code Extension API

### IDiscoveryLensAPI

Interface for cross-extension communication.

```typescript
interface IDiscoveryLensAPI {
  // Run discovery with signature
  runDiscovery(signature: DiscoverySignature): Promise<DiscoveryResult[]>;

  // Set signature in UI
  setSignature(signature: DiscoverySignature): void;

  // Get current state
  getState(): DiscoveryState;

  // UI control
  show(): void;
  hide(): void;
  clear(): void;

  // Events
  onStateChange(callback: (state: DiscoveryState) => void): Disposable;
  onResults(callback: (results: DiscoveryResult[]) => void): Disposable;
}
```

### Using from Another Extension

```typescript
// Get API from adaptive-tests extension
const adaptiveExt = vscode.extensions.getExtension('adaptive-tests');
if (adaptiveExt) {
  const api = await adaptiveExt.activate();
  const discoveryAPI = api.getDiscoveryLensAPI();

  // Use the API
  const results = await discoveryAPI.runDiscovery({
    name: 'MyComponent',
    type: 'class'
  });
}
```

---

## Advanced Options

### Custom Scoring

```javascript
const { discover } = require('adaptive-tests');

const Component = await discover({
  name: 'Component'
}, {
  scorer: (candidate, signature) => {
    let score = 0;

    // Custom scoring logic
    if (candidate.path.includes('src/')) score += 10;
    if (candidate.name === signature.name) score += 50;

    return score;
  }
});
```

### AST Transformation

```javascript
const engine = getDiscoveryEngine(process.cwd(), {
  transformAST: (ast, filePath) => {
    // Modify AST before analysis
    // Useful for handling custom syntax
    return ast;
  }
});
```

### Custom File Parsers

```javascript
const engine = getDiscoveryEngine(process.cwd(), {
  parsers: {
    '.vue': (content, filePath) => {
      // Custom Vue file parsing
      const script = extractScriptFromVue(content);
      return parseJavaScript(script);
    }
  }
});
```

### Parallel Discovery

```javascript
const { discoverAll } = require('adaptive-tests');

// Discover multiple signatures in parallel
const results = await discoverAll([
  { name: 'UserService', type: 'class' },
  { name: 'AuthService', type: 'class' },
  { name: 'DataService', type: 'class' }
]);

console.log(results); // Array of discovered modules
```

### Discovery Middleware

```javascript
const engine = getDiscoveryEngine(process.cwd(), {
  middleware: [
    // Log all discoveries
    (signature, candidates, next) => {
      console.log(`Discovering: ${signature.name}`);
      const result = next(signature, candidates);
      console.log(`Found: ${result ? result.path : 'nothing'}`);
      return result;
    },

    // Filter by custom criteria
    (signature, candidates, next) => {
      const filtered = candidates.filter(c =>
        !c.path.includes('deprecated')
      );
      return next(signature, filtered);
    }
  ]
});
```

### Cache Strategies

```javascript
// Memory-only cache (no disk)
const engine = getDiscoveryEngine(process.cwd(), {
  cache: 'memory',
  maxMemoryCacheSize: 50
});

// Redis cache (for distributed testing)
const engine = getDiscoveryEngine(process.cwd(), {
  cache: 'redis',
  redis: {
    host: 'localhost',
    port: 6379,
    prefix: 'adaptive:'
  }
});

// Custom cache implementation
const engine = getDiscoveryEngine(process.cwd(), {
  cache: {
    get: async (key) => { /* custom get */ },
    set: async (key, value) => { /* custom set */ },
    clear: async () => { /* custom clear */ }
  }
});
```

---

## TypeScript Types

```typescript
import {
  discover,
  DiscoverySignature,
  DiscoveryOptions,
  DiscoveryEngine,
  Candidate,
  ScoreBreakdown
} from 'adaptive-tests';

// Typed discovery
const Service = await discover<typeof UserService>({
  name: 'UserService',
  type: 'class'
} as DiscoverySignature);

// Type guards
function isClassSignature(sig: DiscoverySignature): sig is ClassSignature {
  return sig.type === 'class';
}

// Custom types
interface MySignature extends DiscoverySignature {
  customField?: string;
}
```

---

## Error Handling

```javascript
const { discover, DiscoveryError } = require('adaptive-tests');

try {
  const Module = await discover({ name: 'Module' });
} catch (error) {
  if (error instanceof DiscoveryError) {
    console.log('Discovery failed:', error.message);
    console.log('Signature:', error.signature);
    console.log('Candidates found:', error.candidates.length);
  } else {
    // Other error
    throw error;
  }
}
```

---

## Performance Tips

1. **Use specific signatures** - More criteria = faster matching
2. **Limit search paths** - Don't search unnecessary directories
3. **Enable caching** - Especially for repeated discoveries
4. **Use batch discovery** - `discoverAll()` for multiple signatures
5. **Pre-warm cache** - Before test runs
6. **Ignore patterns** - Exclude build/dist directories
7. **Set reasonable timeouts** - Prevent hanging on large codebases

---

## Migration from v1.x

```javascript
// v1.x (old)
const Module = require('./find-module')('ModuleName');

// v2.x (new)
const { discover } = require('adaptive-tests');
const Module = await discover({ name: 'ModuleName' });
```

Key changes:

- Async by default (use `await`)
- Signature objects instead of strings
- Built-in caching
- Multi-language support
- VS Code integration

---

## Support

- [GitHub Issues](https://github.com/anon57396/adaptive-tests/issues)
- [GitHub Discussions](https://github.com/anon57396/adaptive-tests/discussions)
- [Stack Overflow Search](https://stackoverflow.com/search?q=adaptive+tests)
