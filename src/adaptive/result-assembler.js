/**
 * Result Assembler
 *
 * Handles candidate resolution, module loading, and cache coordination for
 * discovery results.
 */

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const { getLogger } = require('./logger');

class ResultAssembler {
  constructor(options) {
    const {
      rootPath,
      candidateEvaluator,
      moduleVersions,
      cachedModules,
      cleanupCachedModules,
      ensureTypeScriptSupport,
      runtimeCache,
      persistentCache,
      cacheConfig
    } = options;

    if (!rootPath) {
      throw new Error('ResultAssembler requires a rootPath');
    }

    this.rootPath = rootPath;
    this.candidateEvaluator = candidateEvaluator;
    this.moduleVersions = moduleVersions;
    this.cachedModules = cachedModules;
    this.cleanupCachedModules = cleanupCachedModules;
    this.ensureTypeScriptSupport = ensureTypeScriptSupport;

    this.runtimeCache = runtimeCache || null;
    this.persistentCache = persistentCache || {};

    const ttlSeconds = Number(cacheConfig?.ttl ?? cacheConfig?.ttlSeconds ?? 0);
    const ttlMs = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds * 1000 : Number(cacheConfig?.ttlMs) || 0;

    this.cacheConfig = {
      enabled: cacheConfig?.enabled !== false,
      file: cacheConfig?.file || '.adaptive-tests-cache.json',
      logWarnings: Boolean(cacheConfig?.logWarnings),
      ttlMs
    };

    this.cacheLoaded = !this.cacheConfig.enabled;
    this.cacheLoadPromise = null;
  }

  /**
   * Attempt to resolve a candidate module that matched scoring requirements.
   */
  async resolveCandidate(candidate, signature) {
    if (!candidate) {
      return null;
    }

    try {
      if (!this.candidateEvaluator.isCandidateSafe(candidate)) {
        return null;
      }

      const metadataMatch = this.candidateEvaluator.selectExportFromMetadata(candidate, signature);
      if (candidate.metadata && !metadataMatch) {
        return null;
      }

      const resolvedPath = require.resolve(candidate.path);
      const ext = path.extname(candidate.path);
      const mtimeMs = this.getFileMtime(candidate.path);
      const lastVersion = this.moduleVersions.get(resolvedPath);
      const hasChanged = mtimeMs === null || lastVersion === undefined || lastVersion !== mtimeMs;

      // TypeScript support is opt-in but needs ts-node registration once
      if (ext === '.ts' || ext === '.tsx') {
        this.ensureTypeScriptSupport();
      }

      if (hasChanged) {
        delete require.cache[resolvedPath];
      }

      if (process.env.DEBUG_DISCOVERY) {
        console.log('Loading module from candidate:', candidate.path);
      }

      const moduleExports = require(candidate.path);

      if (mtimeMs !== null) {
        this.moduleVersions.set(resolvedPath, mtimeMs);
      } else {
        this.moduleVersions.delete(resolvedPath);
      }

      this.cachedModules.add(resolvedPath);
      this.cleanupCachedModules();

      if (metadataMatch) {
        const target = this.candidateEvaluator.extractExportByAccess(moduleExports, metadataMatch.access);
        if (target && this.candidateEvaluator.validateTarget(target, signature)) {
          return { target, access: metadataMatch.access };
        }
      }

      const result = this.candidateEvaluator.resolveTargetFromModule(moduleExports, signature, candidate);
      if (result) {
        return result;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Attempt to satisfy a discovery request from caches.
   */
  async tryGetCachedTarget(cacheKey, signature) {
    await this.ensureCacheLoaded();

    const runtimeResult = this.tryLoadFromRuntimeCache(cacheKey, signature);
    if (runtimeResult) {
      return runtimeResult;
    }

    return this.tryLoadFromPersistentCache(cacheKey, signature);
  }

  /**
   * Store a successful resolution into caches.
   */
  async storeResolution(cacheKey, candidate, resolved) {
    if (!this.runtimeCache && !this.cacheConfig.enabled) {
      return;
    }

    const cacheEntry = {
      path: candidate.path,
      access: resolved.access,
      score: candidate.score,
      timestamp: Date.now(),
      mtimeMs: candidate.mtimeMs ?? null
    };

    if (this.runtimeCache) {
      this.runtimeCache.set(cacheKey, cacheEntry);
    }

    if (this.cacheConfig.enabled) {
      this.persistentCache[cacheKey] = {
        relativePath: path.relative(this.rootPath, candidate.path),
        access: resolved.access,
        score: candidate.score,
        timestamp: cacheEntry.timestamp,
        mtimeMs: cacheEntry.mtimeMs
      };

      await this.saveCacheToDisk();
    }
  }

  /**
   * Ensure cache contents are loaded from disk once per process.
   */
  async ensureCacheLoaded() {
    if (!this.cacheConfig.enabled) {
      this.cacheLoaded = true;
      return;
    }

    if (this.cacheLoaded) {
      return;
    }

    if (!this.cacheLoadPromise) {
      this.cacheLoadPromise = this.loadCacheFromDisk();
    }

    await this.cacheLoadPromise;
  }

  /**
   * Create a cache key from a signature object.
   */
  getCacheKey(signature) {
    const keys = Object.keys(signature)
      .filter(key => key !== 'original' && signature[key] !== undefined)
      .sort();

    const payload = {};
    for (const key of keys) {
      payload[key] = this.serializeCacheValue(signature[key]);
    }

    return JSON.stringify(payload);
  }

  /**
   * Determine whether a cache entry is stale.
   */
  isCacheEntryExpired(entry) {
    if (!this.cacheConfig.ttlMs) {
      return false;
    }
    if (!entry || !entry.timestamp) {
      return true;
    }
    return (Date.now() - entry.timestamp) > this.cacheConfig.ttlMs;
  }

  /**
   * Clear runtime + persistent caches and persist the reset state.
   */
  async clearCaches() {
    if (this.runtimeCache && typeof this.runtimeCache.clear === 'function') {
      this.runtimeCache.clear();
    }

    for (const key of Object.keys(this.persistentCache)) {
      delete this.persistentCache[key];
    }

    this.cacheLoaded = !this.cacheConfig.enabled;
    this.cacheLoadPromise = null;

    await this.saveCacheToDisk();
  }

  /**
   * Load module exports according to cached metadata.
   */
  loadModule(cacheEntry, signature) {
    const resolvedPath = require.resolve(cacheEntry.path);

    const mtimeMs = this.getFileMtime(cacheEntry.path);
    const lastVersion = this.moduleVersions.get(resolvedPath);
    const hasChanged = mtimeMs === null || lastVersion === undefined || lastVersion !== mtimeMs;

    if (hasChanged) {
      delete require.cache[resolvedPath];
      if (mtimeMs !== null) {
        this.moduleVersions.set(resolvedPath, mtimeMs);
      }
    }

    const ext = path.extname(cacheEntry.path);
    if (ext === '.ts' || ext === '.tsx') {
      this.ensureTypeScriptSupport();
    }

    const moduleExports = require(cacheEntry.path);
    if (process.env.DEBUG_DISCOVERY) {
      console.log('Loading module from cache entry:', cacheEntry.path);
    }

    let target = moduleExports;
    switch (cacheEntry.access.type) {
      case 'default':
        target = moduleExports.default;
        break;
      case 'named':
        target = moduleExports[cacheEntry.access.name];
        break;
      case 'direct':
      default:
        target = moduleExports;
        break;
    }

    const validated = this.candidateEvaluator.validateTarget(target, signature);
    if (!validated) {
      throw new Error('Cached target no longer matches signature');
    }

    return target;
  }

  /**
   * Load cache from disk.
   */
  async loadCacheFromDisk() {
    if (!this.cacheConfig.enabled) {
      this.cacheLoaded = true;
      return;
    }

    const cacheFile = path.join(this.rootPath, this.cacheConfig.file);

    try {
      const data = await fsPromises.readFile(cacheFile, 'utf8');
      const rawCache = JSON.parse(data);

      for (const key of Object.keys(this.persistentCache)) {
        delete this.persistentCache[key];
      }

      for (const [key, entry] of Object.entries(rawCache)) {
        if (!entry || typeof entry !== 'object') continue;
        if (!entry.relativePath && !entry.path) continue;

        const relativePath = entry.relativePath || entry.path;
        const absolutePath = path.join(this.rootPath, relativePath);
        if (!fs.existsSync(absolutePath)) {
          continue;
        }

        if (this.isCacheEntryExpired(entry)) {
          continue;
        }

        this.persistentCache[key] = {
          relativePath,
          access: entry.access,
          score: entry.score,
          timestamp: entry.timestamp,
          mtimeMs: entry.mtimeMs ?? null
        };
      }
    } catch (error) {
      if (error && error.code !== 'ENOENT') {
        this.logCacheWarning(`Failed to load discovery cache from ${cacheFile}`, error);
      }
    } finally {
      this.cacheLoaded = true;
    }
  }

  /**
   * Persist discovery cache to disk.
   */
  async saveCacheToDisk() {
    if (!this.cacheConfig.enabled) {
      return;
    }

    const cacheFile = path.join(this.rootPath, this.cacheConfig.file);

    try {
      await fsPromises.writeFile(cacheFile, JSON.stringify(this.persistentCache, null, 2), 'utf8');
    } catch (error) {
      this.logCacheWarning(`Failed to persist discovery cache to ${cacheFile}`, error);
    }
  }

  /**
   * Serialize cache values so we can produce deterministic keys.
   */
  serializeCacheValue(value) {
    if (value === null || value === undefined) {
      return value;
    }

    if (value instanceof RegExp) {
      return { __type: 'RegExp', source: value.source, flags: value.flags };
    }

    if (Array.isArray(value)) {
      return value.map(item => this.serializeCacheValue(item));
    }

    if (typeof value === 'function') {
      return { __type: 'Function', name: value.name || 'anonymous' };
    }

    if (typeof value === 'object') {
      const sortedKeys = Object.keys(value).sort();
      const result = {};
      for (const key of sortedKeys) {
        result[key] = this.serializeCacheValue(value[key]);
      }
      return result;
    }

    return value;
  }

  /**
   * Lightweight helper to check runtime cache first.
   */
  tryLoadFromRuntimeCache(cacheKey, signature) {
    if (!this.runtimeCache || !this.runtimeCache.has(cacheKey)) {
      return null;
    }

    const cached = this.runtimeCache.get(cacheKey);
    if (this.isCacheEntryExpired(cached)) {
      this.runtimeCache.delete(cacheKey);
      return null;
    }

    try {
      return this.loadModule(cached, signature);
    } catch (error) {
      this.runtimeCache.delete(cacheKey);
      return null;
    }
  }

  /**
   * Fallback to persistent cache stored on disk.
   */
  tryLoadFromPersistentCache(cacheKey, signature) {
    if (!this.cacheConfig.enabled) {
      return null;
    }

    const entry = this.persistentCache[cacheKey];
    if (!entry) {
      return null;
    }

    if (this.isCacheEntryExpired(entry)) {
      delete this.persistentCache[cacheKey];
      return null;
    }

    const absolutePath = path.join(this.rootPath, entry.relativePath || '');
    if (!fs.existsSync(absolutePath)) {
      delete this.persistentCache[cacheKey];
      return null;
    }

    const cacheEntry = {
      path: absolutePath,
      access: entry.access,
      score: entry.score,
      timestamp: entry.timestamp,
      mtimeMs: entry.mtimeMs ?? null
    };

    try {
      const target = this.loadModule(cacheEntry, signature);
      if (this.runtimeCache) {
        this.runtimeCache.set(cacheKey, cacheEntry);
      }
      return target;
    } catch (error) {
      delete this.persistentCache[cacheKey];
      return null;
    }
  }

  logCacheWarning(message, error) {
    if (!this.cacheConfig.logWarnings) {
      return;
    }
    const details = error && error.message ? `: ${error.message}` : '';
    getLogger().warn(`[adaptive-tests] ${message}${details}`);
  }

  getFileMtime(targetPath) {
    try {
      const stats = fs.statSync(targetPath);
      return stats.mtimeMs;
    } catch (error) {
      return null;
    }
  }
}

module.exports = {
  ResultAssembler
};
