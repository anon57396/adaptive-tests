/**
 * Invisible Adaptive Imports
 *
 * Makes adaptive testing completely transparent.
 * Works exactly like normal require() but with adaptive fallback.
 */

const path = require('path');
const { discover } = require('./index');

/**
 * Smart require that falls back to adaptive discovery
 */
function adaptiveRequire(modulePath, options = {}) {
  try {
    // First, try normal require
    return require(modulePath);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      // Extract the module name from the path
      const moduleName = extractModuleName(modulePath);

      console.log(`📍 Module moved: ${modulePath} → discovering ${moduleName}`);

      // Fall back to adaptive discovery
      return discover({
        name: moduleName,
        type: options.type || 'auto',
        ...options
      });
    }
    throw error;
  }
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
 * Patch require to be adaptive
 */
function enableInvisibleAdaptive() {
  const Module = require('module');
  const originalRequire = Module.prototype.require;

  Module.prototype.require = function(id) {
    try {
      return originalRequire.call(this, id);
    } catch (error) {
      if (error.code === 'MODULE_NOT_FOUND' && !id.startsWith('.')) {
        // Only adapt relative imports
        return originalRequire.call(this, id);
      }

      if (error.code === 'MODULE_NOT_FOUND') {
        const moduleName = extractModuleName(id);
        console.log(`🔄 Adapting broken import: ${id} → ${moduleName}`);

        // Synchronous discovery for require compatibility
        return require('./sync-discover').discoverSync({
          name: moduleName,
          type: 'auto'
        });
      }

      throw error;
    }
  };
}

/**
 * Jest/test framework integration
 */
function setupInvisibleAdaptive() {
  // Auto-enable in test environments
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
    enableInvisibleAdaptive();
  }
}

module.exports = {
  adaptiveRequire,
  enableInvisibleAdaptive,
  setupInvisibleAdaptive,
  extractModuleName
};