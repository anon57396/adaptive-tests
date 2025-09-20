/**
 * Synchronous Discovery Wrapper
 *
 * Provides sync interface for require() compatibility
 * Uses caching to avoid async/await in require chains
 */

const { getDiscoveryEngine } = require('./index');

// Sync cache for discovered modules
const syncCache = new Map();
let discoveryEngine = null;

/**
 * Initialize discovery engine (call once)
 */
function initSyncDiscovery() {
  if (!discoveryEngine) {
    discoveryEngine = getDiscoveryEngine(process.cwd(), {
      cache: true,
      parallel: false // Sync mode
    });
  }
}

/**
 * Synchronous discovery (uses cache + fallback)
 */
function discoverSync(signature) {
  initSyncDiscovery();

  const cacheKey = JSON.stringify(signature);

  // Check cache first
  if (syncCache.has(cacheKey)) {
    return syncCache.get(cacheKey);
  }

  try {
    // Try to discover synchronously
    const candidates = discoveryEngine.collectCandidatesSync(signature);

    if (candidates.length === 0) {
      throw new Error(`No candidates found for ${signature.name}`);
    }

    // Take best match
    const bestMatch = candidates[0];
    const discovered = require(bestMatch.absolutePath);

    // Cache for next time
    syncCache.set(cacheKey, discovered);

    return discovered;
  } catch (error) {
    // Cache failures too (don't retry repeatedly)
    syncCache.set(cacheKey, null);
    throw error;
  }
}

/**
 * Clear sync cache (for testing)
 */
function clearSyncCache() {
  syncCache.clear();
}

/**
 * Pre-warm common patterns
 */
function prewarmSyncCache(patterns = []) {
  patterns.forEach(pattern => {
    try {
      discoverSync(pattern);
    } catch (error) {
      // Ignore failures during prewarming
    }
  });
}

module.exports = {
  discoverSync,
  clearSyncCache,
  prewarmSyncCache,
  initSyncDiscovery
};