# AGENTS.md

This file provides guidance to AI Agents when working with
code in this repository.

## Commands

### Testing

- `npm test` - Run all tests (traditional and adaptive)
- `npm run test:traditional` - Run traditional tests for JavaScript calculator
- `npm run test:adaptive` - Run adaptive tests for JavaScript calculator
- `npm run test:traditional:ts` - Run traditional tests for TypeScript calculator
- `npm run test:adaptive:ts` - Run adaptive tests for TypeScript calculator
- `npm run test:both` - Run both traditional and adaptive JavaScript tests
- `npm run test:typescript` - Run both traditional and adaptive TypeScript tests
- `jest examples/calculator/tests/traditional/Calculator.test.js` - Run a single test file
- `jest --watch` - Run tests in watch mode

### Validation and Demonstrations

- `npm run validate` - Full validation suite proving adaptive tests catch real bugs
- `npm run demo` - Quick demonstration of refactoring resilience
- `npm run demo:full` - Same as validate
- `npm run compare` - Compare traditional vs adaptive test behavior

### Refactoring Simulations

- `npm run refactor` - Move Calculator.js to nested folder (JavaScript)
- `npm run restore` - Restore Calculator.js to original location
- `npm run refactor:ts` - Move Calculator.ts to nested folder (TypeScript)
- `npm run restore:ts` - Restore Calculator.ts to original location

### Breaking Code Simulations

- `npm run demo:broken` - Introduce bugs in JavaScript Calculator
- `npm run restore:broken` - Fix bugs in JavaScript Calculator
- `npm run demo:broken:ts` - Introduce bugs in TypeScript Calculator
- `npm run restore:broken:ts` - Fix bugs in TypeScript Calculator

## Architecture

### Core Discovery System

The adaptive testing system centers around a discovery engine that dynamically
locates test targets without hardcoded paths. The discovery process uses a
sophisticated scoring algorithm to rank candidates:

1. **File scanning**: Recursively searches directories (excluding node_modules,
   .git, etc.) for matching files
2. **Signature matching**: Evaluates candidates based on name patterns,
   exports, methods, and type requirements
3. **Path scoring**: Prefers production directories (/src, /lib) over test/mock directories
4. **Safe requiring**: Only loads the highest-scored candidate, preventing
   accidental execution of test files or broken code

The discovery cache (`.test-discovery-cache.json`) persists findings per root
directory for performance.

### TypeScript Support

TypeScript discovery (`src/adaptive/typescript/discovery.js`) uses the
TypeScript compiler API to analyze `.ts` files without requiring compilation.
It applies the same scoring heuristics as JavaScript discovery. Optional peer
dependency on `ts-node` enables direct TypeScript execution.

### Test Framework Integration

- `AdaptiveTest` base class provides structure for adaptive test suites
- `adaptiveTest` helper function offers functional API
- Framework-agnostic design works with Jest, Mocha, Vitest, etc.
- Tests define target signatures instead of import paths

### Key Design Decisions

1. **Score-based selection**: Multiple heuristics ensure the right module is
   found even with similar names
2. **Graceful degradation**: Falls back to broader searches if exact matches
   aren't found
3. **Per-root caching**: Each project root maintains its own discovery cache
4. **Export validation**: Verifies that discovered modules actually export the
   expected names/methods
5. **Type checking**: Ensures discovered items are the expected type (class,
   function, etc.)

## Project Structure

- `src/adaptive/` - Core adaptive testing library
  - `discovery.js` - Main discovery engine for JavaScript
  - `typescript/discovery.js` - TypeScript-specific discovery engine
  - `test-base.js` - Base classes for adaptive tests
  - `index.js` - Main exports

- `examples/` - Working examples demonstrating adaptive testing
  - `calculator/` - Simple calculator with side-by-side test comparison
  - `typescript/` - TypeScript version of calculator example
  - `todo-app/` - Todo application example (placeholder)
  - `api-service/` - API service example (placeholder)

- Root scripts - Demonstration and validation utilities
  - `validate.js` - Comprehensive validation proving tests catch real bugs
  - `compare.js` - Side-by-side comparison tool
  - `refactor*.js` - File movement simulations
  - `demo-broken*.js` - Bug introduction simulations

## Testing Strategy

When adding new features or fixing bugs:

1. Ensure both traditional and adaptive test suites pass initially
2. Run `npm run validate` to verify the complete testing flow works
3. Test that adaptive discovery still works after any changes to scoring or
   matching logic
4. Verify TypeScript discovery if modifying TypeScript-related code

The validation suite (`validate.js`) is the source of truth - it must show:

- Both test types pass with working code
- Traditional tests break on refactoring while adaptive survive
- Both test types catch actual bugs (proving adaptive tests do real validation)
