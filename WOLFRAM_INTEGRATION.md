# Wolfram Language Integration for Adaptive Tests

## Overview

Full Wolfram Language support has been added to the adaptive-tests framework, enabling refactoring-resilient testing for Wolfram packages, notebooks, and modules. This integration is specifically designed to address the unique challenges of Wolfram Language development, including context management, pattern-based programming, and notebook-to-package migrations.

## Features

### 🎯 Pattern-Based Discovery

- Recognizes Wolfram's pattern matching syntax (`_`, `__`, `___`)
- Tracks function definitions with conditions (`/;`)
- Identifies memoization patterns (`f[x_]:=f[x]=...`)

### 📦 Package & Context Support

- Full `BeginPackage`/`EndPackage` parsing
- Context-aware symbol resolution
- Private/public symbol distinction
- Package dependency tracking

### 📓 Notebook Integration

- Parses `.nb` notebook files
- Extracts code cells and definitions
- Supports notebook-to-package migration testing

### 🧪 VerificationTest Generation

- Automatically generates Wolfram's native `VerificationTest` format
- Creates context-aware test suites
- Includes discovery verification tests

### 🔍 Smart Symbol Resolution

- Cross-file symbol tracking
- Context path resolution
- Related symbol discovery

## Supported File Types

- `.wl` - Wolfram Language package files
- `.m` - Mathematica package files
- `.wls` - Wolfram Language Script files
- `.nb` - Notebook files (JSON and expression formats)

## Usage

### Basic Discovery

```javascript
const { DiscoveryEngine } = require('adaptive-tests');

const engine = new DiscoveryEngine({
  rootPath: '/path/to/wolfram/project',
  languages: ['wolfram']
});

// Find a specific function
const fibonacci = await engine.discover({
  name: 'Fibonacci',
  type: 'function',
  context: 'MathUtils`'
});

// Find a package
const mathPackage = await engine.discover({
  name: 'MathUtils`',
  type: 'package'
});
```

### Pattern-Based Discovery

```javascript
// Find functions with specific pattern characteristics
const patternFunctions = await engine.discover({
  type: 'function',
  hasPattern: true,
  hasMemoization: true
});

// Find symbols by type
const constants = await engine.discover({
  type: 'symbol',
  isConstant: true
});
```

### Context-Aware Discovery

```javascript
// Find symbols within a specific context
const privateSymbols = await engine.discover({
  context: 'MathUtils`Private`',
  type: 'function'
});

// Discover related symbols
const related = await engine.discoverRelatedSymbols(target, maxDepth);
```

## Test Generation

The integration automatically generates VerificationTest format tests:

```mathematica
(* Auto-generated adaptive test for Wolfram Language *)
(* This test will survive refactoring and symbol movement *)

(* Package loading test *)
VerificationTest[
  Needs["MathUtils`"];
  MemberQ[$Packages, "MathUtils`"],
  True,
  TestID -> "PackageLoad-MathUtils`"
];

(* Function test: Fibonacci *)
VerificationTest[
  NameQ["MathUtils`Private`Fibonacci"],
  True,
  TestID -> "FunctionExists-Fibonacci"
];

(* Pattern matching test *)
VerificationTest[
  Fibonacci[10],
  _Integer,
  TestID -> "FunctionCall-Fibonacci"
];

(* Memoization test *)
Module[{timing1, timing2, result1, result2},
  {timing1, result1} = AbsoluteTiming[Fibonacci[100]];
  {timing2, result2} = AbsoluteTiming[Fibonacci[100]];
  VerificationTest[
    result1 === result2 && timing2 < timing1,
    True,
    TestID -> "Memoization-Fibonacci"
  ];
];
```

## Example Wolfram Package

```mathematica
BeginPackage["MathUtils`", {"System`"}]

Fibonacci::usage = "Fibonacci[n] computes the nth Fibonacci number"

Begin["`Private`"]

(* Memoized Fibonacci implementation *)
Fibonacci[0] = 0
Fibonacci[1] = 1
Fibonacci[n_Integer?Positive] :=
  Fibonacci[n] = Fibonacci[n-1] + Fibonacci[n-2]

End[] (* Private *)

EndPackage[]
```

## Unique Wolfram Features Supported

### 1. Pattern Types

- `_` - Single blank (any expression)
- `__` - Double blank (sequence)
- `___` - Triple blank (null sequence)
- `_head` - Typed patterns (e.g., `_Integer`, `_List`)
- Conditional patterns with `/;`

### 2. Definition Types

- `:=` - Delayed definitions
- `=` - Immediate definitions
- `/:` - Tagged rules
- `/;` - Conditional definitions

### 3. Special Functions

- `Compile[]` - Compiled functions
- `Function[]` - Pure functions
- `Options[]` - Option specifications
- Pattern-based overloading

### 4. Context Management

- Nested contexts
- Private/public symbol separation
- Package dependencies
- Symbol path resolution

## Benefits for Wolfram Developers

### ✅ Refactoring Safety

- Tests survive when packages are reorganized
- Symbol movement doesn't break tests
- Context renaming is handled automatically

### ✅ Notebook Migration

- Test notebooks can be converted to packages
- Package structure changes don't affect tests
- Mixed notebook/package projects supported

### ✅ Pattern Evolution

- Pattern refinements don't break discovery
- Function signature changes are tracked
- Overloaded definitions are recognized

### ✅ Performance Testing

- Memoization verification
- Compile[] function tracking
- Performance regression detection

## Running Tests

```bash
# Run the Wolfram integration test suite
node test/wolfram-integration-test.js

# Test specific Wolfram files
node test/wolfram-integration-test.js path/to/file.wl
```

## Integration with CLI

```bash
# Scaffold tests for a Wolfram package
adaptive-tests scaffold --language wolfram --target "MathUtils`"

# Discover Wolfram symbols
adaptive-tests discover --language wolfram --name Fibonacci

# Generate tests for all packages
adaptive-tests generate --language wolfram --type package
```

## Configuration

Add to your `adaptive-tests.config.js`:

```javascript
module.exports = {
  languages: ['wolfram'],
  wolfram: {
    // Custom Wolfram settings
    includePaths: ['Packages', 'Libraries'],
    excludePatterns: ['*Test.wl', '*Demo.nb'],
    contextResolution: true,
    notebookParsing: true
  }
};
```

## Troubleshooting

### Common Issues

1. **Context not found**: Ensure package files are in the scan path
2. **Symbol resolution fails**: Check context paths are correct
3. **Notebook parsing errors**: Verify notebook format (JSON vs expression)
4. **Pattern matching issues**: Use proper escaping for special characters

### Debug Mode

Enable debug output:

```javascript
const engine = new DiscoveryEngine({
  debug: true,
  wolfram: {
    debugParsing: true,
    logContextCache: true
  }
});
```

## Future Enhancements

- [ ] Cloud function support
- [ ] Entity framework integration
- [ ] Dataset operation tracking
- [ ] Association pattern matching
- [ ] Dynamic symbol loading
- [ ] Parallel kernel testing

## Contributing

The Wolfram Language integration welcomes contributions! Areas of interest:

- Enhanced pattern matching algorithms
- Better notebook cell extraction
- Cloud deployment support
- Performance optimizations
- Additional test generation templates

## Credits

This integration was specifically developed to help Wolfram Language developers adopt adaptive testing patterns, making their test suites more resilient to refactoring and structural changes common in symbolic computation projects.

---

*For the Wolfram team: This integration addresses the specific pain points we discussed around package refactoring and notebook-to-package migration. The pattern-based discovery is unique to Wolfram and handles your complex symbol resolution needs.*
