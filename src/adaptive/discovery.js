/**
 * Deprecated Discovery Engine shim
 *
 * This module now re-exports the modern DiscoveryEngine implementation
 * while emitting a runtime warning for consumers still using the legacy path.
 */

const { DiscoveryEngine: CoreDiscoveryEngine, getDiscoveryEngine: coreGetDiscoveryEngine } = require('./discovery-engine');

let warned = false;
function emitDeprecationWarning() {
  if (warned) return;
  warned = true;
  const message = '[adaptive-tests] src/adaptive/discovery is deprecated. Switch to src/adaptive/discovery-engine.';
  if (typeof process !== 'undefined' && typeof process.emitWarning === 'function') {
    process.emitWarning(message, {
      code: 'ADAPTIVE_TESTS_DEPRECATED_DISCOVERY',
    });
  } else if (typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(message);
  }
}

class DiscoveryEngine extends CoreDiscoveryEngine {
  constructor(...args) {
    emitDeprecationWarning();
    super(...args);
  }
}

function getDiscoveryEngine(...args) {
  emitDeprecationWarning();
  return coreGetDiscoveryEngine(...args);
}

module.exports = {
  DiscoveryEngine,
  getDiscoveryEngine,
};
