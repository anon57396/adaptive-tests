/**
 * Invisible Adaptive Imports (JS/TS Only - Experimental)
 *
 * FEATURE-FLAGGED: Only activates when explicitly enabled
 * ISOLATED: Does not interfere with existing discovery APIs
 * ESCAPE HATCH: Can be disabled per-test or globally
 */

const path = require('path');
const debug = require('debug')('adaptive-tests:invisible');

// Feature flag - must be explicitly enabled
let INVISIBLE_MODE_ENABLED = false;
let ESCAPE_HATCH_PATTERNS = [];

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

      // Log suggestion transparently
      console.warn(`⚡ Adaptive: ${modulePath} not found, trying signature discovery for "${suggestion}"`);

      // Use existing discovery (no new APIs)
      const { discover } = require('./index');
      return await discover({
        name: suggestion,
        type: options.type || inferType(modulePath),
        ...options
      });
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
          return discoverSync({
            name: suggestion,
            type: inferType(id)
          });
        } catch (discoveryError) {
          debug(`❌ Discovery failed for ${suggestion}:`, discoveryError.message);
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