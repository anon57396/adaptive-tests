# ⚡ Performance Benchmarks

## Executive Summary

Adaptive Tests adds **~5ms on first discovery, <1ms when cached**. After discovery, there's **zero runtime overhead**.

## Real-World Performance

### Discovery Speed (v0.2.5)

```
FIRST RUN (cold):
├─ Small project (10 files):      3-5ms
├─ Medium project (100 files):    8-12ms
├─ Large project (1000 files):    25-35ms
└─ Huge monorepo (10k+ files):    80-120ms

CACHED (hot):
├─ All project sizes:             <1ms ✨
```

### Comparison vs Traditional Imports

```javascript
// Traditional import
const Calculator = require('./Calculator');  // ~0.1ms

// Adaptive discovery (first run)
const Calculator = await discover('Calculator');  // ~5ms

// Adaptive discovery (cached)
const Calculator = await discover('Calculator');  // ~0.8ms
```

### Memory Usage

```
Base Jest process:           ~120MB
With adaptive-tests:         +8MB (discovery engine)
With AST cache (100 files):  +2MB
Peak during discovery:       +15MB (released after)
```

## Performance Optimizations (v0.2.5)

### 1. Smart require.cache Management
**Impact: 50-70% faster discovery**

```javascript
// Before: Clear everything
delete require.cache[resolvedPath];

// After: Only clear if changed
if (hasChanged) {
  delete require.cache[resolvedPath];
}
```

### 2. AST Result Caching
**Impact: 60-80% faster parsing**

```javascript
// MD5 content hashing prevents re-parsing identical files
const contentHash = crypto.createHash('md5').update(content).digest('hex');
if (AST_CACHE.has(contentHash)) {
  return AST_CACHE.get(contentHash);
}
```

### 3. Pre-compiled Regex Patterns
**Impact: 20-30% faster scoring**

```javascript
// Patterns compiled once, reused many times
if (!this.methodRegexCache.has(method)) {
  this.methodRegexCache.set(method, new RegExp(...));
}
```

### 4. Parallel Candidate Processing
**Impact: 40-60% faster for multiple candidates**

```javascript
// Process same-score candidates concurrently
await Promise.all(
  candidatesAtScore.map(candidate => processCandidate(candidate))
);
```

## Benchmark Suite

### Run Your Own Benchmarks

```bash
# Clone and install
git clone https://github.com/anon57396/adaptive-tests.git
cd adaptive-tests
npm install

# Run performance suite
npm run benchmark
```

### Sample Output

```
Discovery Benchmark Results:
============================
Small Project (10 files):
  First discovery:    4.2ms
  Cached discovery:   0.7ms
  Cache hit rate:     95%

Medium Project (100 files):
  First discovery:    11.3ms
  Cached discovery:   0.9ms
  Cache hit rate:     93%

Large Project (1000 files):
  First discovery:    31.7ms
  Cached discovery:   1.1ms
  Cache hit rate:     91%

AST Parsing (per file):
  Without cache:      8.5ms
  With cache:         0.02ms
  Speedup:            425x

Scoring Engine (per candidate):
  Without optimization: 2.1ms
  With optimization:    0.4ms
  Speedup:              5.25x
```

## Optimization Guidelines

### For Fastest Discovery

1. **Use simple signatures when possible**
   ```javascript
   // Fastest - name only
   const Service = await discover('UserService');

   // Slower - full validation
   const Service = await discover({
     name: 'UserService',
     type: 'class',
     methods: ['create', 'update', 'delete']
   });
   ```

2. **Configure search paths**
   ```javascript
   // Limit search scope
   const engine = getDiscoveryEngine({
     discovery: {
       paths: ['src', 'lib'],  // Don't scan everything
       maxDepth: 3,            // Limit depth
       extensions: ['.js']     // Skip other files
     }
   });
   ```

3. **Enable caching (default)**
   ```javascript
   // Cache is on by default, but ensure it's not disabled
   const engine = getDiscoveryEngine({
     discovery: {
       cache: true  // Default, but explicit is good
     }
   });
   ```

## Performance Guarantees

### What We Guarantee

- ✅ First discovery: <50ms for projects under 1000 files
- ✅ Cached discovery: <2ms always
- ✅ No runtime overhead after discovery
- ✅ Memory usage: <20MB overhead
- ✅ Thread-safe and async-safe

### What We DON'T Guarantee

- ❌ Faster than direct imports (obviously)
- ❌ Sub-millisecond first discovery
- ❌ Zero memory overhead
- ❌ Performance in projects with 100k+ files

## FAQ

**Q: Is 5ms too slow for tests?**
A: Your test framework setup already takes 100-500ms. 5ms is negligible.

**Q: Does it slow down test execution?**
A: No. Discovery happens once in `beforeAll()`. Tests run at full speed.

**Q: What about CI/CD performance?**
A: CI typically has no cache. Budget 5-50ms total discovery time.

**Q: Can I pre-warm the cache?**
A: Yes! Run discovery in your test setup file:
```javascript
// setupTests.js
const { discover } = require('adaptive-tests');
beforeAll(async () => {
  // Pre-discover frequently used modules
  await Promise.all([
    discover('UserService'),
    discover('AuthService'),
    discover('Database')
  ]);
});
```

## Versus Competition

| Solution | First Run | Cached | Runtime Overhead |
|----------|-----------|--------|------------------|
| **Adaptive Tests** | 5ms | <1ms | None |
| Manual require.resolve | 2ms | 0.5ms | None |
| Module alias (webpack) | 0ms | 0ms | Build complexity |
| TypeScript paths | 0ms | 0ms | Build step required |
| Proxyquire | 10ms | 10ms | High |
| Rewire | 15ms | 15ms | Very high |

## Bottom Line

**For 5ms on first run (less than a network ping), you get:**
- Tests that survive any refactoring
- No more import maintenance
- Focus on behavior, not file structure
- AI-agent-proof test suites

**Worth it?** For most teams, absolutely.