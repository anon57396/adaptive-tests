#!/usr/bin/env node

/**
 * Adaptive Tests Migration Tool
 * Automatically converts traditional tests to adaptive tests
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const readline = require('readline');
const { execSync } = require('child_process');

// Use built-in glob from fs if available (Node 18+), otherwise use a simple implementation
let glob;
try {
  glob = require('glob');
} catch (e) {
  // Fallback to a simple glob implementation
  glob = {
    sync: (pattern, options = {}) => {
      const fs = require('fs');
      const path = require('path');

      // Simple glob implementation for *.test.js pattern
      const results = [];
      const baseDir = pattern.split('/**')[0] || '.';
      const extension = pattern.includes('.test.js') ? '.test.js' :
                        pattern.includes('.test.ts') ? '.test.ts' :
                        pattern.includes('.spec.js') ? '.spec.js' :
                        pattern.includes('.spec.ts') ? '.spec.ts' : '.js';

      function walkDir(dir) {
        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
              // Skip ignored directories
              if (!options.ignore || !options.ignore.some(ig => filePath.includes(ig.replace('**/', '')))) {
                walkDir(filePath);
              }
            } else if (file.endsWith(extension) && !file.includes('.adaptive.')) {
              results.push(filePath);
            }
          }
        } catch (err) {
          // Ignore permission errors
        }
      }

      walkDir(baseDir);
      return results;
    }
  };
}

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = '') {
  console.log(color + message + COLORS.reset);
}

function header() {
  console.log('\n' + COLORS.cyan + '═'.repeat(60) + COLORS.reset);
  log('   🔄 Adaptive Tests Migration Tool', COLORS.bright + COLORS.cyan);
  log('   Convert traditional tests to adaptive tests automatically', COLORS.dim);
  console.log(COLORS.cyan + '═'.repeat(60) + COLORS.reset + '\n');
}

/**
 * Analyze a test file to extract import information and test structure
 */
function analyzeTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
  
  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: isTypeScript ? ['typescript', 'jsx'] : ['jsx'],
      allowImportExportEverywhere: true,
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
    });

    const analysis = {
      imports: [],
      requires: [],
      describes: [],
      tests: [],
      className: null,
      methods: new Set(),
      isESModule: false,
      framework: 'jest', // default
    };

    // Walk the AST to extract information
    walkAST(ast, analysis);

    // Determine the main class/module being tested
    if (analysis.imports.length > 0 || analysis.requires.length > 0) {
      const mainImport = analysis.imports[0] || analysis.requires[0];
      if (mainImport.name) {
        analysis.className = mainImport.name;
      }
    }

    // Extract methods from test names
    analysis.tests.forEach(test => {
      const methodMatch = test.match(/should\s+(\w+)|test\s+(\w+)|(\w+)\s+should/);
      if (methodMatch) {
        const method = methodMatch[1] || methodMatch[2] || methodMatch[3];
        if (method && method !== 'be' && method !== 'have') {
          analysis.methods.add(method);
        }
      }
    });

    return analysis;
  } catch (error) {
    log(`⚠️  Error parsing ${filePath}: ${error.message}`, COLORS.yellow);
    return null;
  }
}

function walkAST(node, analysis, depth = 0) {
  if (!node || depth > 100) return;

  // Handle imports
  if (node.type === 'ImportDeclaration') {
    const source = node.source.value;
    if (!source.startsWith('@') && !source.includes('node_modules')) {
      const importInfo = {
        source,
        name: null,
        isDefault: false,
      };

      if (node.specifiers.length > 0) {
        const spec = node.specifiers[0];
        if (spec.type === 'ImportDefaultSpecifier') {
          importInfo.name = spec.local.name;
          importInfo.isDefault = true;
        } else if (spec.type === 'ImportSpecifier') {
          importInfo.name = spec.imported.name;
        }
      }

      analysis.imports.push(importInfo);
      analysis.isESModule = true;
    }
  }

  // Handle requires
  if (node.type === 'CallExpression' && node.callee.name === 'require') {
    if (node.arguments.length > 0 && node.arguments[0].type === 'StringLiteral') {
      const source = node.arguments[0].value;
      if (!source.startsWith('@') && !source.includes('node_modules')) {
        // Check if it's part of a const/let/var declaration
        let varName = null;
        if (node.parent && node.parent.type === 'VariableDeclarator') {
          varName = node.parent.id.name;
        }

        analysis.requires.push({
          source,
          name: varName,
          isDefault: true,
        });
      }
    }
  }

  // Handle describe blocks
  if (node.type === 'CallExpression' && node.callee.name === 'describe') {
    if (node.arguments.length > 0 && node.arguments[0].type === 'StringLiteral') {
      analysis.describes.push(node.arguments[0].value);
    }
  }

  // Handle test/it blocks
  if (node.type === 'CallExpression' && (node.callee.name === 'test' || node.callee.name === 'it')) {
    if (node.arguments.length > 0 && node.arguments[0].type === 'StringLiteral') {
      analysis.tests.push(node.arguments[0].value);
    }
    analysis.framework = node.callee.name === 'it' ? 'mocha' : 'jest';
  }

  // Handle method calls to extract method names
  if (node.type === 'MemberExpression' && node.property.type === 'Identifier') {
    const method = node.property.name;
    // Skip common test assertion methods and properties
    const skipList = ['expect', 'toBe', 'toEqual', 'toThrow', 'toHaveLength', 'toHaveProperty',
                      'toContain', 'toBeDefined', 'toBeUndefined', 'toBeTruthy', 'toBeFalsy',
                      'length', 'prototype', 'constructor', 'name'];
    if (!skipList.includes(method) && node.object.type === 'Identifier') {
      // Only add if it's called on an instance variable (like calc.add)
      const objName = node.object.name;
      if (objName && objName !== 'expect' && objName !== 'console' && objName !== 'process') {
        analysis.methods.add(method);
      }
    }
  }

  // Recursively walk the tree
  for (const key in node) {
    if (key === 'parent') continue; // Skip parent to avoid cycles
    const child = node[key];
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        child.forEach(item => walkAST(item, analysis, depth + 1));
      } else {
        child.parent = node; // Add parent reference for context
        walkAST(child, analysis, depth + 1);
      }
    }
  }
}

/**
 * Generate adaptive test from analysis
 */
function generateAdaptiveTest(analysis, originalPath) {
  const isTypeScript = originalPath.endsWith('.ts') || originalPath.endsWith('.tsx');
  const importStyle = analysis.isESModule ? 'import' : 'require';
  
  let content = '';
  
  // Add imports
  if (importStyle === 'import') {
    content += `import { discover } from 'adaptive-tests';\n`;
  } else {
    content += `const { discover } = require('adaptive-tests');\n`;
  }
  
  content += `\n/**\n * Adaptive Tests for ${analysis.className || 'Module'}\n`;
  content += ` * Migrated from: ${path.relative(process.cwd(), originalPath)}\n`;
  content += ` * \n`;
  content += ` * These tests will automatically find the target even if it moves.\n`;
  content += ` */\n\n`;

  // Generate the main describe block
  const className = analysis.className || 'Module';
  const methods = Array.from(analysis.methods).filter(m => 
    !['constructor', 'prototype', 'expect', 'describe', 'test', 'it'].includes(m)
  );

  content += `describe('${className}', () => {\n`;
  content += `  let ${className};\n\n`;
  
  content += `  beforeAll(async () => {\n`;
  content += `    // Discover the module using its signature\n`;
  content += `    ${className} = await discover({\n`;
  content += `      name: '${className}',\n`;
  content += `      type: 'class',\n`;
  
  if (methods.length > 0) {
    content += `      methods: [\n`;
    methods.forEach((method, idx) => {
      const comma = idx < methods.length - 1 ? ',' : '';
      content += `        '${method}'${comma}\n`;
    });
    content += `      ]\n`;
  }
  
  content += `    });\n`;
  content += `  });\n\n`;
  
  // Add discovery test
  content += `  test('should discover ${className}', () => {\n`;
  content += `    expect(${className}).toBeDefined();\n`;
  content += `    expect(typeof ${className}).toBe('function');\n`;
  content += `  });\n\n`;
  
  // Add placeholder for migrated tests
  content += `  describe('Methods', () => {\n`;
  content += `    let instance;\n\n`;
  content += `    beforeEach(() => {\n`;
  content += `      instance = new ${className}();\n`;
  content += `    });\n\n`;
  
  // Add a test for each discovered method
  methods.forEach(method => {
    content += `    test('should have ${method} method', () => {\n`;
    content += `      expect(instance.${method}).toBeDefined();\n`;
    content += `      expect(typeof instance.${method}).toBe('function');\n`;
    content += `    });\n\n`;
  });
  
  content += `    // TODO: Migrate your specific test implementations here\n`;
  content += `    // Copy test logic from the original file and update to use 'instance'\n`;
  content += `  });\n`;
  content += `});\n`;
  
  return content;
}

/**
 * Find test files in the project
 */
function findTestFiles(directory, pattern) {
  const patterns = [
    `${directory}/**/*.test.js`,
    `${directory}/**/*.test.ts`,
    `${directory}/**/*.spec.js`, 
    `${directory}/**/*.spec.ts`,
  ];
  
  let files = [];
  patterns.forEach(p => {
    const matches = glob.sync(p, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.adaptive.*'],
    });
    files = files.concat(matches);
  });
  
  return files;
}

/**
 * Interactive prompt helper
 */
function createPrompter() {
  const rl = readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout 
  });

  const ask = (question, defaultValue = '') => new Promise((resolve) => {
    const hint = defaultValue ? ` [${defaultValue}]` : '';
    rl.question(`${COLORS.cyan}?${COLORS.reset} ${question}${hint}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });

  const askYesNo = async (question, defaultValue = false) => {
    const hint = defaultValue ? 'Y/n' : 'y/N';
    const response = await ask(`${question} (${hint})`, '');
    if (!response) return defaultValue;
    return ['y', 'yes'].includes(response.toLowerCase());
  };

  const close = () => rl.close();

  return { ask, askYesNo, close };
}

/**
 * Main migration function
 */
async function runMigrate(args = []) {
  header();
  
  const prompter = createPrompter();
  
  // Determine target directory
  let targetDir = args[0] || await prompter.ask('Which directory contains your tests?', 'tests');
  targetDir = path.resolve(targetDir);
  
  if (!fs.existsSync(targetDir)) {
    log(`❌ Directory not found: ${targetDir}`, COLORS.red);
    prompter.close();
    process.exit(1);
  }
  
  // Find test files
  log(`\n🔍 Scanning for test files in ${path.relative(process.cwd(), targetDir)}...`, COLORS.blue);
  const testFiles = findTestFiles(targetDir, '*.test.js');
  
  if (testFiles.length === 0) {
    log(`❌ No test files found in ${targetDir}`, COLORS.red);
    prompter.close();
    process.exit(1);
  }
  
  log(`\n📋 Found ${testFiles.length} test file(s):`, COLORS.green);
  testFiles.forEach(file => {
    log(`   • ${path.relative(process.cwd(), file)}`, COLORS.dim);
  });
  
  // Ask for confirmation
  const proceed = await prompter.askYesNo(`\nMigrate ${testFiles.length} test file(s) to adaptive tests?`, true);
  
  if (!proceed) {
    log('\n❌ Migration cancelled', COLORS.yellow);
    prompter.close();
    return;
  }
  
  // Strategy selection
  console.log();
  log('Migration strategy:', COLORS.cyan);
  log('  1. Create new adaptive test files (*.adaptive.test.js)', COLORS.dim);
  log('  2. Replace existing files (backup originals)', COLORS.dim);
  const strategy = await prompter.ask('Choose strategy [1-2]', '1');
  
  const createNew = strategy === '1';
  const stats = {
    total: testFiles.length,
    successful: 0,
    failed: 0,
    skipped: 0,
  };
  
  log(`\n🚀 Starting migration...\n`, COLORS.cyan);
  
  for (const testFile of testFiles) {
    const relativePath = path.relative(process.cwd(), testFile);
    log(`Processing ${relativePath}...`, COLORS.blue);
    
    // Check if already adaptive
    const content = fs.readFileSync(testFile, 'utf8');
    if (content.includes('adaptive-tests') || content.includes('discover(')) {
      log(`  ⏭️  Already using adaptive tests, skipping`, COLORS.yellow);
      stats.skipped++;
      continue;
    }
    
    // Analyze the test file
    const analysis = analyzeTestFile(testFile);
    
    if (!analysis) {
      log(`  ❌ Failed to analyze file`, COLORS.red);
      stats.failed++;
      continue;
    }
    
    if (!analysis.className && analysis.imports.length === 0 && analysis.requires.length === 0) {
      log(`  ⏭️  No imports found, skipping`, COLORS.yellow);
      stats.skipped++;
      continue;
    }
    
    // Generate adaptive test
    const adaptiveContent = generateAdaptiveTest(analysis, testFile);
    
    // Determine output path
    let outputPath;
    if (createNew) {
      const dir = path.dirname(testFile);
      const basename = path.basename(testFile, path.extname(testFile));
      const ext = path.extname(testFile);
      outputPath = path.join(dir, `${basename}.adaptive${ext}`);
    } else {
      // Backup original
      const backupPath = testFile + '.backup';
      fs.copyFileSync(testFile, backupPath);
      log(`  📦 Created backup: ${path.relative(process.cwd(), backupPath)}`, COLORS.dim);
      outputPath = testFile;
    }
    
    // Write the adaptive test
    fs.writeFileSync(outputPath, adaptiveContent);
    log(`  ✅ Created: ${path.relative(process.cwd(), outputPath)}`, COLORS.green);
    stats.successful++;
  }
  
  // Summary
  console.log();
  console.log(COLORS.cyan + '═'.repeat(60) + COLORS.reset);
  log('\n📊 Migration Summary:', COLORS.bright + COLORS.cyan);
  log(`   Total files: ${stats.total}`, COLORS.dim);
  log(`   ✅ Migrated: ${stats.successful}`, COLORS.green);
  log(`   ⏭️  Skipped: ${stats.skipped}`, COLORS.yellow);
  log(`   ❌ Failed: ${stats.failed}`, stats.failed > 0 ? COLORS.red : COLORS.dim);
  
  if (stats.successful > 0) {
    console.log();
    log('🎉 Migration complete!', COLORS.bright + COLORS.green);
    console.log();
    log('Next steps:', COLORS.yellow);
    log('  1. Review the generated adaptive tests', COLORS.dim);
    log('  2. Copy specific test logic from original files', COLORS.dim); 
    log('  3. Run tests to ensure they pass', COLORS.dim);
    log('  4. Delete original tests once verified', COLORS.dim);
    console.log();
    log('💡 Tip: Use `npx adaptive-tests why` to debug discovery issues', COLORS.cyan);
  }
  
  prompter.close();
}

// Export for CLI integration
module.exports = { runMigrate, analyzeTestFile, generateAdaptiveTest };

// Run directly if called as script
if (require.main === module) {
  runMigrate(process.argv.slice(2)).catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}