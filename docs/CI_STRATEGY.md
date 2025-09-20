# CI/CD Strategy for Adaptive Tests

## Table of Contents

- [Philosophy](#philosophy-leverage-resilience-not-dependencies)
- [The Two-Track Approach](#the-two-track-approach)
- [Why This Works](#why-this-works)
- [CI Workflow Jobs](#ci-workflow-jobs)
- [The Key Insight](#the-key-insight)
- [Real-World Example](#real-world-example)
- [Performance Considerations](#performance-considerations)
- [Summary](#summary)

## Philosophy: Leverage Resilience, Not Dependencies

Unlike traditional test selection strategies that rely on dependency graphs, adaptive tests have a unique superpower: **they don't break when you refactor code**. This fundamentally changes how we approach CI/CD.

## The Two-Track Approach

### 🎯 Track 1: Traditional Tests (Fast Feedback)

- **What**: Run only traditional tests affected by your changes
- **When**: On every push/PR
- **Why**: Quick feedback on direct changes
- **How**: `jest --onlyChanged`

### 🛡️ Track 2: Adaptive Tests (Comprehensive Safety Net)

- **What**: Run ALL adaptive tests
- **When**: On every push/PR
- **Why**: They won't fail from refactoring, only from real bugs
- **How**: `npm run test:adaptive`

## Why This Works

Traditional test selection asks: *"Which tests depend on these changed files?"*

But adaptive tests don't have fixed dependencies! They ask: *"Where is the Calculator class?"* and find it wherever it moves.

```javascript
// This test doesn't depend on a specific file:
const Calculator = await discover({
  name: 'Calculator',
  type: 'class'
});

// It will find Calculator whether it's in:
// - src/Calculator.js
// - lib/math/Calculator.js
// - features/calc/implementation/Calculator.js
// Anywhere!
```

## CI Workflow Jobs

Our CI runs four parallel jobs:

1. **traditional-tests**: Quick feedback on changed files only
2. **adaptive-tests**: Full adaptive suite (resilient to refactoring)
3. **typescript-tests**: TypeScript-specific adaptive tests
4. **resilience-check**: Verifies tests survive refactoring AND catch bugs

## The Key Insight

**You don't need intelligent test selection for adaptive tests because:**

- They don't break from file moves/renames
- They're fast enough to run all of them
- They provide comprehensive coverage without false positives

## Real-World Example

```yaml
# Developer moves Calculator.js to a new location
- Traditional tests: ❌ "Cannot find module '../src/Calculator'"
- Adaptive tests: ✅ "Found Calculator in new location, all tests pass"

# Developer introduces a bug in Calculator.add()
- Traditional tests: ❌ "Expected 5 but got 3"
- Adaptive tests: ❌ "Expected 5 but got 3"
```

Both catch real bugs, but only adaptive tests survive refactoring!

## Performance Considerations

Running all adaptive tests is practical because:

- Discovery results are cached (only file paths, not content)
- Tests load fresh modules every time (no stale cache issues)
- Parallel execution across multiple Node versions

## Summary

The beauty of adaptive tests in CI/CD is their simplicity:

- No complex dependency tracking needed
- No test selection algorithms required
- Just run them all and trust their resilience

This is **simpler, faster, and more reliable** than traditional test selection strategies!
