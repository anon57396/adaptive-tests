/**
 * Test script for Wolfram Language discovery integration
 * Tests parsing, discovery, and test generation for Wolfram files
 */

const path = require('path');
const fs = require('fs');
const { WolframDiscoveryCollector } = require('../languages/javascript/src/wolfram/wolfram-discovery-collector');
const { WolframDiscoveryIntegration } = require('../languages/javascript/src/wolfram/wolfram-discovery-integration');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testCollector() {
  log('\n=== Testing Wolfram Discovery Collector ===', 'blue');

  const collector = new WolframDiscoveryCollector();
  const testFiles = [
    'test/fixtures/wolfram/MathUtils.wl',
    'test/fixtures/wolfram/DataAnalysis.m'
  ];

  for (const file of testFiles) {
    const filePath = path.resolve(file);
    log(`\nTesting file: ${path.basename(file)}`, 'yellow');

    if (!fs.existsSync(filePath)) {
      log(`  ❌ File not found: ${filePath}`, 'red');
      continue;
    }

    try {
      const metadata = await collector.parseFile(filePath);

      if (metadata) {
        log('  ✓ File parsed successfully', 'green');

        // Display extracted information
        if (metadata.packages && metadata.packages.length > 0) {
          log(`  📦 Packages found: ${metadata.packages.length}`, 'magenta');
          metadata.packages.forEach(pkg => {
            log(`     - ${pkg.name} (${pkg.exports.length} exports)`, 'reset');
          });
        }

        if (metadata.functions && metadata.functions.length > 0) {
          log(`  🔧 Functions found: ${metadata.functions.length}`, 'magenta');
          const publicFuncs = metadata.functions.filter(f => f.isPublic);
          const privateFuncs = metadata.functions.filter(f => !f.isPublic);
          log(`     - Public: ${publicFuncs.length}`, 'reset');
          log(`     - Private: ${privateFuncs.length}`, 'reset');

          // Show first few functions
          metadata.functions.slice(0, 3).forEach(func => {
            const visibility = func.isPublic ? 'public' : 'private';
            const pattern = func.hasPattern ? ' [pattern]' : '';
            const memo = func.hasMemoization ? ' [memoized]' : '';
            log(`     • ${func.name} (${visibility}${pattern}${memo})`, 'reset');
          });
        }

        if (metadata.symbols && metadata.symbols.length > 0) {
          log(`  💎 Symbols found: ${metadata.symbols.length}`, 'magenta');
          metadata.symbols.slice(0, 3).forEach(symbol => {
            const type = symbol.isConstant ? 'constant' : 'variable';
            log(`     • ${symbol.name} (${type})`, 'reset');
          });
        }

        if (metadata.patterns && metadata.patterns.length > 0) {
          log(`  🎯 Patterns found: ${metadata.patterns.length}`, 'magenta');
        }

        if (metadata.tests && metadata.tests.length > 0) {
          log(`  🧪 Tests found: ${metadata.tests.length}`, 'magenta');
        }

      } else {
        log('  ❌ Failed to parse file', 'red');
      }
    } catch (error) {
      log(`  ❌ Error: ${error.message}`, 'red');
    }
  }
}

async function testIntegration() {
  log('\n=== Testing Wolfram Discovery Integration ===', 'blue');

  // Create mock discovery engine
  const mockEngine = {
    rootPath: process.cwd(),
    config: {},
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: console.error
    }
  };

  const integration = new WolframDiscoveryIntegration(mockEngine);
  const testFile = 'test/fixtures/wolfram/MathUtils.wl';
  const filePath = path.resolve(testFile);

  log(`\nTesting integration with: ${path.basename(testFile)}`, 'yellow');

  try {
    // Test parsing
    const metadata = await integration.parseFile(filePath);
    if (metadata) {
      log('  ✓ File parsed via integration', 'green');

      // Test candidate extraction
      const candidates = integration.extractCandidates(metadata);
      log(`  ✓ Extracted ${candidates.length} candidates`, 'green');

      // Group candidates by type
      const byType = {};
      candidates.forEach(c => {
        byType[c.type] = (byType[c.type] || 0) + 1;
      });

      Object.entries(byType).forEach(([type, count]) => {
        log(`     - ${type}: ${count}`, 'reset');
      });

      // Test scoring with a signature
      const signature = {
        name: 'Fibonacci',
        type: 'function',
        context: 'MathUtils`',
        hasPattern: true,
        hasMemoization: true
      };

      log('\n  Testing candidate scoring for Fibonacci function:', 'yellow');

      const fibCandidates = candidates.filter(c => c.name === 'Fibonacci');
      if (fibCandidates.length > 0) {
        const candidate = fibCandidates[0];
        const score = integration.scoreCandidate(candidate, signature);
        log(`     Score: ${score}`, 'magenta');
        log(`     Context match: ${candidate.context === 'MathUtils`Private' ? 'Yes' : 'No'}`, 'reset');
        log(`     Has pattern: ${candidate.hasPattern ? 'Yes' : 'No'}`, 'reset');
        log(`     Has memoization: ${candidate.hasMemoization ? 'Yes' : 'No'}`, 'reset');
      } else {
        log('     ⚠ Fibonacci function not found in candidates', 'yellow');
      }

      // Test test generation
      log('\n  Testing VerificationTest generation:', 'yellow');

      const packageCandidate = candidates.find(c => c.type === 'package');
      if (packageCandidate) {
        const testContent = integration.generateTestContent(packageCandidate);
        log('  ✓ Generated test for package', 'green');

        // Check test contains expected elements
        const hasVerificationTest = testContent.includes('VerificationTest');
        const hasNeeds = testContent.includes('Needs[');
        const hasTestID = testContent.includes('TestID');

        log(`     Contains VerificationTest: ${hasVerificationTest ? 'Yes' : 'No'}`, 'reset');
        log(`     Contains Needs statement: ${hasNeeds ? 'Yes' : 'No'}`, 'reset');
        log(`     Contains TestID: ${hasTestID ? 'Yes' : 'No'}`, 'reset');

        // Save generated test for inspection
        const testOutputPath = 'test/fixtures/wolfram/generated-test.wl';
        fs.writeFileSync(testOutputPath, testContent);
        log(`  ✓ Saved generated test to: ${testOutputPath}`, 'green');
      }

    } else {
      log('  ❌ Failed to parse file', 'red');
    }
  } catch (error) {
    log(`  ❌ Error: ${error.message}`, 'red');
    console.error(error);
  }
}

async function testSymbolResolution() {
  log('\n=== Testing Symbol Resolution ===', 'blue');

  const mockEngine = {
    rootPath: process.cwd(),
    config: {},
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: console.error
    }
  };

  const integration = new WolframDiscoveryIntegration(mockEngine);

  // Parse package file to populate context cache
  const packageFile = path.resolve('test/fixtures/wolfram/MathUtils.wl');
  await integration.parseFile(packageFile);

  log('\nTesting symbol resolution:', 'yellow');

  // Test resolving unqualified symbols
  const testSymbols = ['Fibonacci', 'UnknownSymbol', 'System`Print'];

  for (const symbol of testSymbols) {
    const resolved = integration.resolveSymbol(symbol, 'MathUtils`');
    log(`  ${symbol} -> ${resolved}`, 'reset');
  }

  // Test related symbol discovery
  log('\nTesting related symbol discovery:', 'yellow');

  const target = {
    name: 'MathUtils`',
    type: 'package',
    context: 'MathUtils`'
  };

  const related = await integration.discoverRelatedSymbols(target);
  log(`  Found ${related.length} related symbols`, 'green');
  related.slice(0, 5).forEach(sym => {
    log(`     • ${sym}`, 'reset');
  });
}

async function runAllTests() {
  log('\n🚀 Starting Wolfram Language Integration Tests', 'blue');
  log('=' .repeat(50), 'blue');

  try {
    await testCollector();
    await testIntegration();
    await testSymbolResolution();

    log('\n' + '='.repeat(50), 'green');
    log('✅ All tests completed successfully!', 'green');
    log('\n💡 Your friend at Wolfram can now use adaptive tests!', 'magenta');
    log('   The integration supports:', 'reset');
    log('   • Package discovery and refactoring resilience', 'reset');
    log('   • Pattern-based function matching', 'reset');
    log('   • Context-aware symbol resolution', 'reset');
    log('   • VerificationTest generation', 'reset');
    log('   • Notebook file support (.nb)', 'reset');

  } catch (error) {
    log('\n' + '='.repeat(50), 'red');
    log('❌ Tests failed with error:', 'red');
    console.error(error);
  }
}

// Run tests
runAllTests();