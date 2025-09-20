#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Fix imports in JavaScript test files
const testFiles = glob.sync('languages/javascript/tests/**/*.js');

console.log(`Found ${testFiles.length} test files to check...`);

let fixedCount = 0;

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Fix various broken import patterns

  // Fix: require('../../languages/javascript/src/...') -> require('../../src/...')
  content = content.replace(/require\(['"]\.\.\/\.\.\/languages\/javascript\/src\//g, "require('../../src/");

  // Fix: require('../../../languages/javascript/src/...') -> require('../../../src/...')
  content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/languages\/javascript\/src\//g, "require('../../../src/");

  // Fix: require('../../../../languages/javascript/src/...') -> require('../../../../src/...')
  content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/\.\.\/languages\/javascript\/src\//g, "require('../../../../src/");

  // Fix: require('adaptive-tests') -> require('../../src/index') or appropriate path
  // This needs to be calculated based on file location
  const depth = file.split('/').length - 3; // Subtract 'languages/javascript/tests' base
  const pathToSrc = '../'.repeat(depth) + 'src/index';
  content = content.replace(/require\(['"]adaptive-tests['"]\)/g, `require('${pathToSrc}')`);

  // Fix: from 'adaptive-tests' -> from appropriate path
  content = content.replace(/from ['"]adaptive-tests['"]/g, `from '${pathToSrc}'`);

  // Fix any remaining absolute imports to local packages
  content = content.replace(/require\(['"]packages\/jest-adaptive/g, "require('../plugins/jest-adaptive");

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${file}`);
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} files with broken imports`);

// Also fix example test files
const exampleTestFiles = glob.sync('languages/javascript/examples/**/tests/**/*.js');

console.log(`\nFound ${exampleTestFiles.length} example test files to check...`);

let exampleFixedCount = 0;

exampleTestFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Fix imports that point to the old structure
  content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/\.\.\/src\//g, "require('../../../../src/");
  content = content.replace(/require\(['"]adaptive-tests['"]\)/g, "require('@adaptive-tests/javascript')");
  content = content.replace(/from ['"]adaptive-tests['"]/g, "from '@adaptive-tests/javascript'");

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${file}`);
    exampleFixedCount++;
  }
});

console.log(`\n✅ Fixed ${exampleFixedCount} example test files`);

// Fix plugin test files
const pluginTestFiles = glob.sync('languages/javascript/plugins/**/tests/**/*.js');

console.log(`\nFound ${pluginTestFiles.length} plugin test files to check...`);

let pluginFixedCount = 0;

pluginTestFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Fix imports for plugin tests
  content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/src\//g, "require('../../../src/");
  content = content.replace(/require\(['"]adaptive-tests['"]\)/g, "require('@adaptive-tests/javascript')");

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${file}`);
    pluginFixedCount++;
  }
});

console.log(`\n✅ Fixed ${pluginFixedCount} plugin test files`);
console.log(`\n🎯 Total: ${fixedCount + exampleFixedCount + pluginFixedCount} files fixed`);