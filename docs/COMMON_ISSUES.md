# Common Issues & Solutions

## Table of Contents

- [Discovery Lens for fast feedback](#discovery-lens-for-fast-feedback)
- [Discovery skipped my module](#1-discovery-skipped-my-module)
- [AST parse failures](#2-ast-parse-failures)
- [Moved file returns old implementation](#3-i-moved-a-file-and-still-get-the-old-implementation)
- [Multiple exports in one module](#4-multiple-exports-in-one-module)
- [Tests/fixtures selected as candidates](#5-test-files-or-fixtures-getting-picked-as-candidates)
- [Inheritance/properties matching issues](#6-discovering-by-inheritance-or-properties-still-fails)
- [Debug Checklist](#debug-checklist)

## Discovery Lens for fast feedback

When discovery surprises you (wrong top hit, no candidates, confusing scores), use the Discovery Lens CLI to see exactly why:

```bash
npx adaptive-tests why '{"name":"YourClass"}'
npx adaptive-tests why '{"name":"YourClass"}' --json  # structured output for CI/tools
```

The output shows ranked candidates with per‑factor contributions (path, fileName, typeHints, methods, exports, nameMentions, custom, recency). Adjust `adaptive-tests.config.js` and rerun `why` to confirm improvements.

## 1. Discovery skipped my module

**Symptoms**: `createDiscoveryError` mentions candidates but says “none matched all
requirements”.

### Fix (Signature tuning)

1. Start with the simplest signature – just the `name`.
2. Add `type`, then `methods`/`properties` only if you truly need them.
3. Remember that names are case-insensitive and AST-driven exports require real
   methods on the prototype (class) or object.
4. Check the scoring configuration (see `adaptive-tests.config.js`) if your file
   lives in an unusual directory. You can temporarily boost a path to confirm the
   engine sees it.

```javascript
await engine.discoverTarget({ name: 'UserService' });
// If that fails, you probably have a naming mismatch or the file isn’t exported.
```

## 2. AST parse failures

**Symptoms**: The engine logs “Failed to parse candidate” internally and skips a
file; discovery ultimately fails.

### Fix (Parser failures)

- Make sure the file is valid JavaScript/TypeScript. The parser runs with modern
  plugins (JSX, decorators, TypeScript), but syntax errors will still derail
  discovery.
- Generated files or scripts with shebangs (`#!/usr/bin/env node`) should live in
  folders excluded by default (`scripts`, `dist`, `build`).

## 3. I moved a file and still get the old implementation

We default to mtime-based cache invalidation, but if your editor copies the file
without updating the timestamp, force a clear:

```javascript
await engine.clearCache();           // wipe discovery + runtime cache
```

Need extra diagnostics? Set `discovery.cache.logWarnings` to `true` in your config to surface read/write issues with the persistent cache (mirrored in the Python engine as `log_warnings`).
Default cache entries now expire after 24 hours; adjust `discovery.cache.ttl` (or `ttl_seconds` in Python) if your workflows require longer persistence.

You should rarely need to touch `require.cache` manually now that the engine
tracks modification times and recompiles changed modules.

## 4. Multiple exports in one module

You can discover each export independently; the AST metadata allows the engine to
resolve named exports safely.

```javascript
const { discover } = require('adaptive-tests');

const processArray = await discover({ name: 'processArray', type: 'function' });
const transformData = await discover({ name: 'transformData', type: 'function' });
```

## 5. Test files or fixtures getting picked as candidates

The default scoring and skip lists exclude common test directories. If you have a
fixture that should never be considered, add an explicit negative path score in
`adaptive-tests.config.js`:

```javascript
module.exports = {
  discovery: {
    scoring: {
      paths: {
        negative: {
          '/my-fixtures/': -100
        }
      }
    }
  }
};
```

## 6. Discovering by inheritance or properties still fails

The AST metadata detects `extends` and prototype assignments, but it cannot
instantiate classes that require constructor arguments. If your constructor needs
parameters or performs side effects, prefer method/property signatures rather
than strict inheritance checks.

```javascript
await engine.discoverTarget({
  type: 'class',
  properties: ['sessions'],
  methods: ['login', 'logout']
});
```

## Debug Checklist

- [ ] Is the export actually reachable? (`module.exports = { Foo }` or `export class Foo`)
- [ ] Does the class/function name match the signature (case insensitive)?
- [ ] Are you using the `adaptive-tests` helpers rather than `require()`?
- [ ] Did you run `npm run validate` to confirm the tooling still behaves as expected?
- [ ] For TypeScript, is `ts-node` installed or are you pointing discovery at
      transpiled output?

If you are still stuck, open an issue with:

- The signature you tried.
- The path to the target file.
- A minimal reproduction (link or gist).

We are happy to help!
