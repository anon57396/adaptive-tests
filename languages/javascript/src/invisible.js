/**
 * Invisible Adaptive Imports (JS/TS Only - Experimental)
 *
 * FEATURE-FLAGGED: Only activates when explicitly enabled
 * ISOLATED: Does not interfere with existing discovery APIs
 * ESCAPE HATCH: Can be disabled per-test or globally
 */

const fs = require('fs');
const path = require('path');
const debug = require('debug')('adaptive-tests:invisible');

const PROJECT_ROOT = process.cwd();
const ADAPTIVE_DIR = path.join(PROJECT_ROOT, '.adaptive-tests');
const HISTORY_FILE = path.join(ADAPTIVE_DIR, 'invisible-history.json');
const TELEMETRY_FILE = path.join(ADAPTIVE_DIR, 'invisible-telemetry.log');
const TELEMETRY_ENABLED = Boolean(process.env.ADAPTIVE_TESTS_TELEMETRY);
const RECOVERED_SIGNATURES = new Set();

// Feature flag - must be explicitly enabled
let INVISIBLE_MODE_ENABLED = false;
let ESCAPE_HATCH_PATTERNS = [];

function ensureAdaptiveDir() {
  try {
    if (!fs.existsSync(ADAPTIVE_DIR)) {
      fs.mkdirSync(ADAPTIVE_DIR, { recursive: true });
    }
  } catch (error) {
    debug('⚠️ Unable to ensure adaptive dir: %s', error.message);
  }
}

function recordTelemetry(event, payload = {}) {
  if (!TELEMETRY_ENABLED) {
    return;
  }

  try {
    ensureAdaptiveDir();
    const entry = {
      event,
      timestamp: new Date().toISOString(),
      ...payload
    };
    fs.appendFileSync(TELEMETRY_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (error) {
    debug('⚠️ Failed to write telemetry: %s', error.message);
  }
}

function updateHistory(entry) {
  try {
    ensureAdaptiveDir();
    const history = fs.existsSync(HISTORY_FILE)
      ? JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'))
      : [];

    if (Array.isArray(history)) {
      history.unshift(entry);
      if (history.length > 50) {
        history.length = 50;
      }
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    }
  } catch (error) {
    debug('⚠️ Failed to update invisible history: %s', error.message);
  }
}

function logInvisibleSuccess(originalPath, suggestion, mode) {
  const key = `${mode}:${suggestion}`;
  if (!RECOVERED_SIGNATURES.has(key)) {
    RECOVERED_SIGNATURES.add(key);
    console.info(
      `⚡ Adaptive Tests invisible mode recovered "${suggestion}" from ${originalPath}. Try "npx adaptive-tests why '{"name":"${suggestion}"}'" to inspect.`
    );
  }

  updateHistory({
    modulePath: originalPath,
    suggestion,
    mode,
    timestamp: new Date().toISOString()
  });
  recordTelemetry('fallback_success', { modulePath: originalPath, suggestion, mode });
}

function writeFallbackScaffold(modulePath, suggestion) {
  try {
    ensureAdaptiveDir();
    const scaffoldDir = path.join(ADAPTIVE_DIR, 'scaffolds');
    if (!fs.existsSync(scaffoldDir)) {
      fs.mkdirSync(scaffoldDir, { recursive: true });
    }

    const scaffoldPath = path.join(scaffoldDir, `${suggestion}.js`);
    if (!fs.existsSync(scaffoldPath)) {
      const contents = `// Adaptive Tests fallback scaffold
// Invisible mode could not resolve "${modulePath}" automatically.
// Replace your import with the require statement below or run:
//    npx adaptive-tests convert ${modulePath}

const { discoverSync } = require('adaptive-tests/invisible');

module.exports = () => discoverSync({
  name: '${suggestion}',
  type: '${inferType(modulePath)}'
});
`;
      fs.writeFileSync(scaffoldPath, contents, 'utf8');
    }

    return scaffoldPath;
  } catch (error) {
    debug('⚠️ Failed to write fallback scaffold: %s', error.message);
    return null;
  }
}

function handleDiscoveryFailure(originalPath, suggestion, error) {
  recordTelemetry('fallback_failure', {
    modulePath: originalPath,
    suggestion,
    message: error.message
  });

  const scaffoldPath = writeFallbackScaffold(originalPath, suggestion);
  if (scaffoldPath) {
    const relative = path.relative(PROJECT_ROOT, scaffoldPath);
    const normalized = relative.split(path.sep).join('/');
    console.warn(
      `⚠️ Adaptive Tests invisible mode could not resolve "${originalPath}". A helper scaffold was created at ${normalized}. ` +
        `You can import it with "require('./${normalized}')()" or run "npx adaptive-tests convert" for a full migration. See docs/getting-started-invisible.md.`
    );
  } else {
    console.warn(
      `⚠️ Adaptive Tests invisible mode could not resolve "${originalPath}" using inferred signature "${suggestion}". ` +
        'Run "npx adaptive-tests convert" or see docs/getting-started-invisible.md for guidance.'
    );
  }
}

/**
 * Smart require with transparent adaptive fallback
 * Only works for relative imports to avoid npm module conflicts
 */
async function adaptiveRequire(modulePath, options = {}) {
  if (!INVISIBLE_MODE_ENABLED) {
    return require(modulePath);
  }

  // Escape hatch: Skip adaptive for certain patterns
  if (ESCAPE_HATCH_PATTERNS.some(pattern => modulePath.includes(pattern))) {
    debug(`🚪 Escape hatch: ${modulePath}`);
    return require(modulePath);
  }

  try {
    // First, try normal require
    return require(modulePath);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && isRelativeImport(modulePath)) {
      const suggestion = extractModuleName(modulePath);

      debug(`📍 Module moved: ${modulePath} → trying ${suggestion}`);

      console.warn(
        `⚡ Adaptive Tests invisible mode: ${modulePath} not found, attempting discovery for "${suggestion}"`
      );

      const { discover } = require('./index');
      try {
        const result = await discover({
          name: suggestion,
          type: options.type || inferType(modulePath),
          ...options
        });

        logInvisibleSuccess(modulePath, suggestion, 'async');
        return result;
      } catch (discoveryError) {
        handleDiscoveryFailure(modulePath, suggestion, discoveryError);
        throw error;
      }
    }
    throw error;
  }
}

/**
 * Only adapt relative imports to avoid npm conflicts
 */
function isRelativeImport(modulePath) {
  return modulePath.startsWith('./') || modulePath.startsWith('../');
}

/**
 * Extract likely class/module name from require path
 */
function extractModuleName(modulePath) {
  // './src/services/UserService' -> 'UserService'
  // '../UserService.js' -> 'UserService'
  // './UserService' -> 'UserService'

  const filename = path.basename(modulePath, path.extname(modulePath));

  // Handle index files
  if (filename === 'index') {
    return path.basename(path.dirname(modulePath));
  }

  return filename;
}

/**
 * Type inference from file path
 */
function inferType(modulePath) {
  const filename = path.basename(modulePath).toLowerCase();

  // Simple heuristics
  if (filename.includes('service')) return 'class';
  if (filename.includes('component')) return 'class';
  if (filename.includes('controller')) return 'class';
  if (filename.includes('util')) return 'function';

  return 'auto'; // Let discovery engine decide
}

/**
 * Feature flags and configuration
 */
function enableInvisibleMode(options = {}) {
  INVISIBLE_MODE_ENABLED = true;
  ESCAPE_HATCH_PATTERNS = options.escapePatterns || ['node_modules', '.mock', 'test-utils'];

  debug('🎭 Invisible mode enabled', { escapePatterns: ESCAPE_HATCH_PATTERNS });
}

function disableInvisibleMode() {
  INVISIBLE_MODE_ENABLED = false;
  debug('🎭 Invisible mode disabled');
}

function addEscapePattern(pattern) {
  ESCAPE_HATCH_PATTERNS.push(pattern);
  debug(`🚪 Added escape pattern: ${pattern}`);
}

/**
 * Opt-in Jest setup (does not auto-enable)
 */
function setupForJest(config = {}) {
  // Only enable if explicitly requested
  if (config.invisible === true) {
    enableInvisibleMode(config);
    console.log('⚡ Adaptive Tests: Invisible mode enabled for Jest');
  }
}

/**
 * Safe Module.require patching with isolation
 */
function patchRequireWithIsolation() {
  if (!INVISIBLE_MODE_ENABLED) {
    debug('🛡️ Require patching skipped - invisible mode disabled');
    return;
  }

  const Module = require('module');
  const originalRequire = Module.prototype.require;

  // Store original for cleanup
  Module.prototype._originalRequire = originalRequire;

  Module.prototype.require = function(id) {
    try {
      return originalRequire.call(this, id);
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND' && isRelativeImport(id)) {
        const suggestion = extractModuleName(id);

        debug(`🔄 Intercepted broken import: ${id} → ${suggestion}`);

        // Use sync wrapper for require compatibility
        try {
          const { discoverSync } = require('./sync-wrapper');
          const result = discoverSync({
            name: suggestion,
            type: inferType(id)
          });

          logInvisibleSuccess(id, suggestion, 'sync');
          return result;
        } catch (discoveryError) {
          debug(`❌ Discovery failed for ${suggestion}:`, discoveryError.message);
          handleDiscoveryFailure(id, suggestion, discoveryError);
          throw error; // Re-throw original error
        }
      }

      throw error;
    }
  };

  debug('🔧 Module.require patched with isolation');
}

/**
 * Cleanup function to restore original require
 */
function restoreOriginalRequire() {
  const Module = require('module');
  if (Module.prototype._originalRequire) {
    Module.prototype.require = Module.prototype._originalRequire;
    delete Module.prototype._originalRequire;
    debug('🧹 Original require restored');
  }
}

module.exports = {
  // Core functionality
  adaptiveRequire,
  extractModuleName,

  // Feature flags
  enableInvisibleMode,
  disableInvisibleMode,
  addEscapePattern,

  // Framework integration
  setupForJest,
  patchRequireWithIsolation,
  restoreOriginalRequire,

  // Inspection
  isInvisibleModeEnabled: () => INVISIBLE_MODE_ENABLED,
  getEscapePatterns: () => [...ESCAPE_HATCH_PATTERNS]
};
