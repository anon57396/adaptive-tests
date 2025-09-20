#!/usr/bin/env node

/**
 * Comprehensive validation script for the massive refactor
 * Validates that all language implementations are properly organized
 * and functional in their new locations.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Starting comprehensive refactor validation...\n');

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPath(filePath, description) {
  const exists = fs.existsSync(filePath);
  log(exists ? 'green' : 'red', `${exists ? '✅' : '❌'} ${description}: ${filePath}`);
  return exists;
}

function checkDirectory(dirPath, description) {
  const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  log(exists ? 'green' : 'red', `${exists ? '✅' : '❌'} ${description}: ${dirPath}`);
  return exists;
}

function runCommand(command, workingDir = '.', description = '') {
  try {
    log('blue', `🔧 ${description || `Running: ${command}`}`);
    const output = execSync(command, {
      cwd: workingDir,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    log('green', `✅ Success: ${description || command}`);
    return { success: true, output };
  } catch (error) {
    log('red', `❌ Failed: ${description || command}`);
    log('yellow', `   Error: ${error.message.split('\\n')[0]}`);
    return { success: false, error: error.message };
  }
}

let validationResults = {
  structure: 0,
  javascript: 0,
  typescript: 0,
  python: 0,
  java: 0,
  experimental: 0,
  tools: 0,
  total: 0
};

// =============================================================================
// 1. DIRECTORY STRUCTURE VALIDATION
// =============================================================================

log('bold', '\\n📁 1. DIRECTORY STRUCTURE VALIDATION');
log('blue', '=' .repeat(50));

const structureChecks = [
  ['languages', 'Languages directory'],
  ['languages/javascript', 'JavaScript language directory'],
  ['languages/typescript', 'TypeScript language directory'],
  ['languages/python', 'Python language directory'],
  ['languages/java', 'Java language directory'],
  ['languages/php', 'PHP language directory'],
  ['languages/go', 'Go language directory'],
  ['languages/rust', 'Rust language directory'],
  ['languages/ruby', 'Ruby language directory'],
  ['languages/wolfram', 'Wolfram language directory'],
  ['tools', 'Tools directory'],
  ['tools/vscode-adaptive-tests', 'VS Code extension directory']
];

let structurePassed = 0;
structureChecks.forEach(([path, desc]) => {
  if (checkDirectory(path, desc)) structurePassed++;
});

validationResults.structure = structurePassed;
log('blue', `\\nStructure validation: ${structurePassed}/${structureChecks.length} passed\\n`);

// =============================================================================
// 2. JAVASCRIPT VALIDATION
// =============================================================================

log('bold', '\\n📦 2. JAVASCRIPT VALIDATION');
log('blue', '=' .repeat(50));

const jsChecks = [
  ['languages/javascript/package.json', 'JavaScript package.json'],
  ['languages/javascript/src/index.js', 'JavaScript main entry'],
  ['languages/javascript/README.md', 'JavaScript README'],
  ['languages/javascript/examples', 'JavaScript examples directory']
];

let jsPassed = 0;
jsChecks.forEach(([path, desc]) => {
  if (checkPath(path, desc)) jsPassed++;
});

// Test JavaScript functionality
if (fs.existsSync('languages/javascript/package.json')) {
  const jsInstall = runCommand('npm install', 'languages/javascript', 'Installing JavaScript dependencies');
  if (jsInstall.success) {
    const jsTest = runCommand('npm test', 'languages/javascript', 'Running JavaScript tests');
    if (jsTest.success) jsPassed++;
  }
}

validationResults.javascript = jsPassed;
log('blue', `\\nJavaScript validation: ${jsPassed}/${jsChecks.length + 1} passed\\n`);

// =============================================================================
// 3. TYPESCRIPT VALIDATION
// =============================================================================

log('bold', '\\n📘 3. TYPESCRIPT VALIDATION');
log('blue', '=' .repeat(50));

const tsChecks = [
  ['languages/typescript/package.json', 'TypeScript package.json'],
  ['languages/typescript/src/discovery.js', 'TypeScript discovery module'],
  ['languages/typescript/README.md', 'TypeScript README'],
  ['languages/typescript/examples', 'TypeScript examples directory']
];

let tsPassed = 0;
tsChecks.forEach(([path, desc]) => {
  if (checkPath(path, desc)) tsPassed++;
});

// Test TypeScript functionality
if (fs.existsSync('languages/typescript/package.json')) {
  const tsInstall = runCommand('npm install', 'languages/typescript', 'Installing TypeScript dependencies');
  if (tsInstall.success) {
    const tsTest = runCommand('npm test', 'languages/typescript', 'Running TypeScript tests');
    if (tsTest.success) tsPassed++;
  }
}

validationResults.typescript = tsPassed;
log('blue', `\\nTypeScript validation: ${tsPassed}/${tsChecks.length + 1} passed\\n`);

// =============================================================================
// 4. PYTHON VALIDATION
// =============================================================================

log('bold', '\\n🐍 4. PYTHON VALIDATION');
log('blue', '=' .repeat(50));

const pythonChecks = [
  ['languages/python/pyproject.toml', 'Python pyproject.toml'],
  ['languages/python/src', 'Python source directory'],
  ['languages/python/README.md', 'Python README'],
  ['languages/python/examples', 'Python examples directory']
];

let pythonPassed = 0;
pythonChecks.forEach(([path, desc]) => {
  if (checkPath(path, desc)) pythonPassed++;
});

// Test Python functionality
if (fs.existsSync('languages/python/pyproject.toml')) {
  const pythonTest = runCommand('python3 -m pytest tests/ -v', 'languages/python', 'Running Python tests');
  if (pythonTest.success) pythonPassed++;
}

validationResults.python = pythonPassed;
log('blue', `\\nPython validation: ${pythonPassed}/${pythonChecks.length + 1} passed\\n`);

// =============================================================================
// 5. JAVA VALIDATION
// =============================================================================

log('bold', '\\n☕ 5. JAVA VALIDATION');
log('blue', '=' .repeat(50));

const javaChecks = [
  ['languages/java/pom.xml', 'Java pom.xml'],
  ['languages/java/core/src/main/java', 'Java source directory'],
  ['languages/java/README.md', 'Java README'],
  ['languages/java/examples', 'Java examples directory']
];

let javaPassed = 0;
javaChecks.forEach(([path, desc]) => {
  if (checkPath(path, desc)) javaPassed++;
});

// Test Java functionality
if (fs.existsSync('languages/java/pom.xml')) {
  const javaTest = runCommand('mvn test -B', 'languages/java', 'Running Java tests');
  if (javaTest.success) javaPassed++;
}

validationResults.java = javaPassed;
log('blue', `\\nJava validation: ${javaPassed}/${javaChecks.length + 1} passed\\n`);

// =============================================================================
// 6. EXPERIMENTAL LANGUAGES VALIDATION
// =============================================================================

log('bold', '\\n🧪 6. EXPERIMENTAL LANGUAGES VALIDATION');
log('blue', '=' .repeat(50));

const experimentalChecks = [
  ['languages/php/README.md', 'PHP README'],
  ['languages/go/README.md', 'Go README'],
  ['languages/rust/README.md', 'Rust README'],
  ['languages/ruby/README.md', 'Ruby README'],
  ['languages/wolfram/README.md', 'Wolfram README']
];

let experimentalPassed = 0;
experimentalChecks.forEach(([path, desc]) => {
  if (checkPath(path, desc)) experimentalPassed++;
});

validationResults.experimental = experimentalPassed;
log('blue', `\\nExperimental validation: ${experimentalPassed}/${experimentalChecks.length} passed\\n`);

// =============================================================================
// 7. TOOLS VALIDATION
// =============================================================================

log('bold', '\\n🔧 7. TOOLS VALIDATION');
log('blue', '=' .repeat(50));

const toolsChecks = [
  ['tools/vscode-adaptive-tests/package.json', 'VS Code extension package.json'],
  ['tools/vscode-adaptive-tests/src/extension.ts', 'VS Code extension source'],
  ['tools/vscode-adaptive-tests/README.md', 'VS Code extension README']
];

let toolsPassed = 0;
toolsChecks.forEach(([path, desc]) => {
  if (checkPath(path, desc)) toolsPassed++;
});

// Test VS Code extension functionality
if (fs.existsSync('tools/vscode-adaptive-tests/package.json')) {
  const vscodeInstall = runCommand('npm install', 'tools/vscode-adaptive-tests', 'Installing VS Code extension dependencies');
  if (vscodeInstall.success) {
    const vscodeTest = runCommand('npm test', 'tools/vscode-adaptive-tests', 'Running VS Code extension tests');
    if (vscodeTest.success) toolsPassed++;
  }
}

validationResults.tools = toolsPassed;
log('blue', `\\nTools validation: ${toolsPassed}/${toolsChecks.length + 1} passed\\n`);

// =============================================================================
// 8. CI/CD VALIDATION
// =============================================================================

log('bold', '\\n🚀 8. CI/CD VALIDATION');
log('blue', '=' .repeat(50));

const ciChecks = [
  ['.github/workflows/ci-javascript.yml', 'JavaScript CI workflow'],
  ['.github/workflows/ci-typescript.yml', 'TypeScript CI workflow'],
  ['.github/workflows/ci-python.yml', 'Python CI workflow'],
  ['.github/workflows/ci-java.yml', 'Java CI workflow'],
  ['.github/workflows/ci-experimental.yml', 'Experimental CI workflow'],
  ['.github/workflows/ci-tools.yml', 'Tools CI workflow']
];

let ciPassed = 0;
ciChecks.forEach(([path, desc]) => {
  if (checkPath(path, desc)) ciPassed++;
});

log('blue', `\\nCI/CD validation: ${ciPassed}/${ciChecks.length} passed\\n`);

// =============================================================================
// 9. FINAL SUMMARY
// =============================================================================

log('bold', '\\n📊 VALIDATION SUMMARY');
log('blue', '=' .repeat(50));

const totalPassed = Object.values(validationResults).reduce((sum, val) => sum + val, 0);
const totalChecks = structureChecks.length +
                   (jsChecks.length + 1) +
                   (tsChecks.length + 1) +
                   (pythonChecks.length + 1) +
                   (javaChecks.length + 1) +
                   experimentalChecks.length +
                   (toolsChecks.length + 1) +
                   ciChecks.length;

log('blue', `📁 Structure: ${validationResults.structure}/${structureChecks.length}`);
log('blue', `📦 JavaScript: ${validationResults.javascript}/${jsChecks.length + 1}`);
log('blue', `📘 TypeScript: ${validationResults.typescript}/${tsChecks.length + 1}`);
log('blue', `🐍 Python: ${validationResults.python}/${pythonChecks.length + 1}`);
log('blue', `☕ Java: ${validationResults.java}/${javaChecks.length + 1}`);
log('blue', `🧪 Experimental: ${validationResults.experimental}/${experimentalChecks.length}`);
log('blue', `🔧 Tools: ${validationResults.tools}/${toolsChecks.length + 1}`);
log('blue', `🚀 CI/CD: ${ciPassed}/${ciChecks.length}`);

log('blue', '\\n' + '='.repeat(50));
log('bold', `🎯 TOTAL: ${totalPassed}/${totalChecks} checks passed`);

const successRate = (totalPassed / totalChecks * 100).toFixed(1);
log('blue', `📈 Success Rate: ${successRate}%`);

if (successRate >= 90) {
  log('green', '\\n🎉 EXCELLENT! Refactor validation passed with flying colors!');
} else if (successRate >= 75) {
  log('yellow', '\\n✅ GOOD! Refactor validation mostly successful. Some minor issues to address.');
} else {
  log('red', '\\n⚠️ NEEDS WORK! Refactor validation found significant issues that need attention.');
}

log('blue', '\\n🏁 Validation complete!\\n');

// Write results to file for CI
fs.writeFileSync('validation-results.json', JSON.stringify({
  timestamp: new Date().toISOString(),
  totalPassed,
  totalChecks,
  successRate: parseFloat(successRate),
  details: validationResults
}, null, 2));

// Exit with appropriate code
process.exit(successRate >= 75 ? 0 : 1);