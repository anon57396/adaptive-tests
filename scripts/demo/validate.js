#!/usr/bin/env node

/**
 * Validation Script - Proves adaptive tests are doing real testing
 * Shows three scenarios:
 * 1. Normal: Both test suites pass
 * 2. Refactored: Traditional breaks (import error), Adaptive passes
 * 3. Broken Code: Both fail with actual test failures (not discovery errors)
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('=' .repeat(60));
console.log('      ADAPTIVE TESTING VALIDATION');
console.log('=' .repeat(60));

function runCommand(cmd, expectFailure = false) {
  try {
    const result = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    return { success: true, output: result };
  } catch (error) {
    const output = (error.stdout || error.stderr || error.message || '').toString();
    if (!expectFailure) {
      throw new Error(`Command failed: ${cmd}
${output}`);
    }
    return { success: false, output };
  }
}

function extractTestResults(output) {
  const passMatch = output.match(/Tests:.*?(\d+) passed/);
  const failMatch = output.match(/Tests:.*?(\d+) failed/);
  const passed = passMatch ? parseInt(passMatch[1]) : 0;
  const failed = failMatch ? parseInt(failMatch[1]) : 0;

  // Look for specific error types
  const hasImportError = output.includes('Cannot find module') ||
                         output.includes('Cannot resolve') ||
                         output.includes('Module not found');
  const hasTestFailure = output.includes('Expected') ||
                         output.includes('Received') ||
                         output.includes('toBe');

  return { passed, failed, hasImportError, hasTestFailure };
}

console.log('\n📋 SCENARIO 1: Normal Code Structure');
console.log('-'.repeat(40));

// Restore to normal state
runCommand('node scripts/demo/restore.js', false);
runCommand('node scripts/demo/restore-broken.js', false);

console.log('Running traditional tests...');
const trad1 = runCommand('npm run test:traditional 2>&1');
const tradResults1 = extractTestResults(trad1.output);

console.log('Running adaptive tests...');
const adapt1 = runCommand('npm run test:adaptive 2>&1');
const adaptResults1 = extractTestResults(adapt1.output);

console.log(`\n  Traditional: ${trad1.success ? '✅' : '❌'} ${tradResults1.passed} passed, ${tradResults1.failed} failed`);
console.log(`  Adaptive:    ${adapt1.success ? '✅' : '❌'} ${adaptResults1.passed} passed, ${adaptResults1.failed} failed`);

if (trad1.success && adapt1.success) {
  console.log('\n  ✓ Both test suites pass with working code');
} else {
  throw new Error('Scenario 1 failed: Expected both traditional and adaptive tests to pass.');
}

console.log('\n📋 SCENARIO 2: Refactored Code Structure');
console.log('-'.repeat(40));

// Refactor the code
runCommand('node scripts/demo/refactor.js', false);

console.log('After moving Calculator.js to deep nested folder...\n');

console.log('Running traditional tests...');
const trad2 = runCommand('npm run test:traditional 2>&1', true);
const tradResults2 = extractTestResults(trad2.output);

console.log('Running adaptive tests...');
const adapt2 = runCommand('npm run test:adaptive 2>&1');
const adaptResults2 = extractTestResults(adapt2.output);

console.log(`\n  Traditional: ${trad2.success ? '✅' : '❌'} ${tradResults2.hasImportError ? '(Import Error!)' : ''}`);
console.log(`  Adaptive:    ${adapt2.success ? '✅' : '❌'} ${adaptResults2.passed} passed, ${adaptResults2.failed} failed`);

if (!trad2.success && tradResults2.hasImportError && adapt2.success) {
  console.log('\n  ✓ Traditional fails with import errors');
  console.log('  ✓ Adaptive still passes - found the moved file!');
} else {
  throw new Error('Scenario 2 failed: expected traditional tests to fail on import error while adaptive tests pass.');
}

// Restore for next test
runCommand('node scripts/demo/restore.js', false);

console.log('\n📋 SCENARIO 3: Broken Implementation');
console.log('-'.repeat(40));

// Break the calculator
runCommand('node scripts/demo/demo-broken.js', false);

console.log('Calculator has bugs in add(), multiply(), divide()...\n');

console.log('Running traditional tests...');
const trad3 = runCommand('npm run test:traditional 2>&1', true);
const tradResults3 = extractTestResults(trad3.output);

console.log('Running adaptive tests...');
// Clear cache first, then run with --no-cache
runCommand('npx jest --clearCache', false);
const adapt3 = runCommand('npx jest examples/calculator/tests/adaptive --no-cache 2>&1', true);
const adaptResults3 = extractTestResults(adapt3.output);

console.log(`\n  Traditional: ${trad3.success ? '✅' : '❌'} ${tradResults3.failed} test failures${tradResults3.hasTestFailure ? ' (Actual bugs!)' : ''}`);
console.log(`  Adaptive:    ${adapt3.success ? '✅' : '❌'} ${adaptResults3.failed} test failures${adaptResults3.hasTestFailure ? ' (Actual bugs!)' : ''}`);

if (!trad3.success && !adapt3.success && tradResults3.hasTestFailure && adaptResults3.hasTestFailure) {
  console.log('\n  ✓ Both fail with actual test assertions');
  console.log('  ✓ Adaptive tests catch real bugs, not just discovery issues!');
} else {
  throw new Error('Scenario 3 failed: expected both suites to fail with real assertion errors.');
}

// Restore everything
runCommand('node scripts/demo/restore-broken.js', false);
runCommand('node scripts/demo/restore.js', false);

console.log('\n📋 SCENARIO 4: TypeScript Mirror Example');
console.log('-'.repeat(40));

runCommand('node scripts/demo/restore-ts.js', false);
runCommand('node scripts/demo/restore-broken-ts.js', false);

console.log('Running TypeScript traditional tests...');
const tsTrad1 = runCommand('npm run test:traditional:ts 2>&1');
const tsTradResults1 = extractTestResults(tsTrad1.output);

console.log('Running TypeScript adaptive tests...');
const tsAdapt1 = runCommand('npm run test:adaptive:ts 2>&1');
const tsAdaptResults1 = extractTestResults(tsAdapt1.output);

console.log(`\n  TS Traditional: ${tsTrad1.success ? '✅' : '❌'} ${tsTradResults1.passed} passed, ${tsTradResults1.failed} failed`);
console.log(`  TS Adaptive:    ${tsAdapt1.success ? '✅' : '❌'} ${tsAdaptResults1.passed} passed, ${tsAdaptResults1.failed} failed`);
if (!tsTrad1.success || !tsAdapt1.success) {
  throw new Error('Scenario 4 failed: expected both TypeScript suites to pass before refactor.');
}

console.log('\nRefactoring TypeScript calculator...');
runCommand('node scripts/demo/refactor-ts.js', false);

const tsTradRefactor = runCommand('npm run test:traditional:ts 2>&1', true);
const tsTradRefactorResults = extractTestResults(tsTradRefactor.output);
const tsAdaptRefactor = runCommand('npm run test:adaptive:ts 2>&1');
const tsAdaptRefactorResults = extractTestResults(tsAdaptRefactor.output);

console.log(`\n  TS Traditional (after move): ${tsTradRefactor.success ? '✅' : '❌'} ${tsTradRefactorResults.hasImportError ? '(Import Error!)' : ''}`);
console.log(`  TS Adaptive (after move):    ${tsAdaptRefactor.success ? '✅' : '❌'} ${tsAdaptRefactorResults.passed} passed, ${tsAdaptRefactorResults.failed} failed`);
if (!( !tsTradRefactor.success && tsTradRefactorResults.hasImportError && tsAdaptRefactor.success )) {
  throw new Error('Scenario 4 failed: expected TS traditional to fail with import error while adaptive passes after refactor.');
}

runCommand('node scripts/demo/restore-ts.js', false);

console.log('\nBreaking TypeScript implementation...');
runCommand('node scripts/demo/demo-broken-ts.js', false);

const tsTradBroken = runCommand('npm run test:traditional:ts 2>&1', true);
const tsTradBrokenResults = extractTestResults(tsTradBroken.output);
const tsAdaptBroken = runCommand('npm run test:adaptive:ts 2>&1', true);
const tsAdaptBrokenResults = extractTestResults(tsAdaptBroken.output);

console.log(`\n  TS Traditional (broken): ${tsTradBroken.success ? '✅' : '❌'} ${tsTradBrokenResults.failed} failures${tsTradBrokenResults.hasTestFailure ? ' (Actual bugs!)' : ''}`);
console.log(`  TS Adaptive (broken):    ${tsAdaptBroken.success ? '✅' : '❌'} ${tsAdaptBrokenResults.failed} failures${tsAdaptBrokenResults.hasTestFailure ? ' (Actual bugs!)' : ''}`);
if (!( !tsTradBroken.success && !tsAdaptBroken.success && tsTradBrokenResults.hasTestFailure && tsAdaptBrokenResults.hasTestFailure )) {
  throw new Error('Scenario 4 failed: expected both TS suites to fail with real assertion errors when implementation is broken.');
}

runCommand('node scripts/demo/restore-broken-ts.js', false);
runCommand('node scripts/demo/restore-ts.js', false);

console.log('\n' + '='.repeat(60));
console.log('                    VALIDATION SUMMARY');
console.log('='.repeat(60));
console.log('\n✅ Adaptive tests pass when code works');
console.log('✅ Adaptive tests survive refactoring (traditional don\'t)');
console.log('✅ Adaptive tests fail on real bugs (same as traditional)');
console.log('✅ TypeScript example mirrors the same behaviour');
console.log('\n🎯 Conclusion: Adaptive tests do REAL validation');
console.log('   They\'re not just always passing - they catch actual bugs!');
console.log('   But they don\'t break when you move files around.');
console.log('\n' + '='.repeat(60) + '\n');