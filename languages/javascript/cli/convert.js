#!/usr/bin/env node

/**
 * Test Converter with Rollback
 *
 * Converts existing tests to adaptive with full rollback capability
 * Creates backup, logs changes, provides undo functionality
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

/**
 * Convert traditional tests to adaptive with rollback
 */
async function convertTests(testDir, options = {}) {
  const {
    dryRun = false,
    backup = true,
    strategy = 'invisible' // 'invisible' | 'explicit' | 'hybrid'
  } = options;

  log(`🔍 Scanning test directory: ${testDir}`, 'blue');

  const testFiles = glob.sync('**/*.{test,spec}.{js,ts}', {
    cwd: testDir,
    absolute: true
  });

  if (testFiles.length === 0) {
    log('❌ No test files found', 'red');
    return { success: false, message: 'No test files found' };
  }

  log(`📁 Found ${testFiles.length} test files`, 'green');

  const conversions = [];
  const backupDir = path.join(testDir, '.adaptive-backup-' + Date.now());

  if (backup && !dryRun) {
    fs.mkdirSync(backupDir, { recursive: true });
    log(`💾 Backup directory created: ${backupDir}`, 'yellow');
  }

  for (const testFile of testFiles) {
    try {
      const result = await convertSingleTest(testFile, {
        dryRun,
        backup,
        backupDir,
        strategy
      });

      if (result.changed) {
        conversions.push(result);
      }
    } catch (error) {
      log(`❌ Failed to convert ${testFile}: ${error.message}`, 'red');
    }
  }

  // Generate rollback script
  if (!dryRun && conversions.length > 0) {
    await generateRollbackScript(backupDir, conversions);
  }

  return {
    success: true,
    conversions: conversions.length,
    backupDir: backup ? backupDir : null,
    files: conversions
  };
}

/**
 * Convert a single test file
 */
async function convertSingleTest(filePath, options) {
  const content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  let convertedContent = content;
  const changes = [];

  // Strategy 1: Invisible mode (just add setup)
  if (options.strategy === 'invisible') {
    convertedContent = addInvisibleModeSetup(convertedContent, changes);
  }

  // Strategy 2: Explicit conversion (convert requires to discover)
  else if (options.strategy === 'explicit') {
    convertedContent = convertRequiresToDiscover(convertedContent, changes);
  }

  // Strategy 3: Hybrid (invisible + selective explicit)
  else if (options.strategy === 'hybrid') {
    convertedContent = addInvisibleModeSetup(convertedContent, changes);
    convertedContent = convertComplexRequires(convertedContent, changes);
  }

  const changed = convertedContent !== originalContent;

  if (changed && !options.dryRun) {
    // Backup original
    if (options.backup) {
      const backupPath = path.join(options.backupDir, path.relative(process.cwd(), filePath));
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.writeFileSync(backupPath, originalContent);
    }

    // Write converted version
    fs.writeFileSync(filePath, convertedContent);
  }

  return {
    filePath,
    changed,
    changes,
    strategy: options.strategy,
    backupPath: options.backup ? path.join(options.backupDir, path.relative(process.cwd(), filePath)) : null
  };
}

/**
 * Add invisible mode setup to test file
 */
function addInvisibleModeSetup(content, changes) {
  // Check if already has adaptive setup
  if (content.includes('adaptive-tests') || content.includes('setupForJest')) {
    return content;
  }

  // Add setup at the top
  const setup = `// Adaptive Tests: Invisible mode for refactoring resilience
const { setupForJest, enableInvisibleMode } = require('adaptive-tests/invisible');
setupForJest({ invisible: true });

`;

  changes.push({
    type: 'invisible-setup',
    description: 'Added invisible mode setup'
  });

  return setup + content;
}

/**
 * Convert require statements to discover calls
 */
function convertRequiresToDiscover(content, changes) {
  // Match relative require statements
  const requireRegex = /const\s+(\w+)\s*=\s*require\(['"`](\.\/.+?)['"`]\);?/g;

  return content.replace(requireRegex, (match, varName, modulePath) => {
    const moduleName = path.basename(modulePath, path.extname(modulePath));

    changes.push({
      type: 'require-to-discover',
      description: `Converted require('${modulePath}') to discover('${moduleName}')`
    });

    return `const ${varName} = await discover('${moduleName}');`;
  });
}

/**
 * Convert only complex requires that benefit from adaptive
 */
function convertComplexRequires(content, changes) {
  // Only convert requires that look like they're importing business logic
  const patterns = [
    /require\(['"`]\.\/.*(service|controller|component|model).*['"`]\)/gi,
    /require\(['"`]\.\/.*(Service|Controller|Component|Model).*['"`]\)/g
  ];

  let result = content;

  patterns.forEach(pattern => {
    result = result.replace(pattern, (match) => {
      changes.push({
        type: 'selective-conversion',
        description: `Converted complex require: ${match}`
      });
      return match.replace('require(', 'await discover(');
    });
  });

  return result;
}

/**
 * Generate rollback script
 */
async function generateRollbackScript(backupDir, conversions) {
  const script = `#!/usr/bin/env node

/**
 * Rollback script for adaptive test conversion
 * Generated on: ${new Date().toISOString()}
 */

const fs = require('fs');
const path = require('path');

const conversions = ${JSON.stringify(conversions, null, 2)};

console.log('🔄 Rolling back adaptive test conversion...');

let restored = 0;
for (const conversion of conversions) {
  if (conversion.backupPath && fs.existsSync(conversion.backupPath)) {
    const originalContent = fs.readFileSync(conversion.backupPath, 'utf8');
    fs.writeFileSync(conversion.filePath, originalContent);
    console.log(\`✅ Restored: \${conversion.filePath}\`);
    restored++;
  }
}

console.log(\`🎉 Rollback complete: \${restored} files restored\`);

// Optionally remove backup directory
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Remove backup directory? (y/N): ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    fs.rmSync('${backupDir}', { recursive: true, force: true });
    console.log('🗑️  Backup directory removed');
  }
  rl.close();
});
`;

  const rollbackPath = path.join(backupDir, 'rollback.js');
  fs.writeFileSync(rollbackPath, script);
  fs.chmodSync(rollbackPath, '755');

  log(`📜 Rollback script created: ${rollbackPath}`, 'green');
}

module.exports = {
  convertTests,
  convertSingleTest
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const testDir = args[0] || 'tests';

  const options = {
    dryRun: args.includes('--dry-run'),
    backup: !args.includes('--no-backup'),
    strategy: args.includes('--explicit') ? 'explicit' :
              args.includes('--hybrid') ? 'hybrid' : 'invisible'
  };

  if (options.dryRun) {
    log('🧪 DRY RUN: No files will be modified', 'yellow');
  }

  convertTests(testDir, options)
    .then(result => {
      if (result.success) {
        log(`✅ Conversion complete: ${result.conversions} files converted`, 'green');
        if (result.backupDir) {
          log(`💾 Backups saved to: ${result.backupDir}`, 'blue');
          log(`🔄 To rollback: node ${result.backupDir}/rollback.js`, 'blue');
        }
      }
    })
    .catch(error => {
      log(`❌ Conversion failed: ${error.message}`, 'red');
      process.exit(1);
    });
}