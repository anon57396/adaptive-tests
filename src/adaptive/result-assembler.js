/**
 * Result Assembler
 *
 * Handles candidate resolution, module loading, and cache-friendly
 * post-processing using the provided CandidateEvaluator.
 */

const fs = require('fs');
const path = require('path');

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
      persistCache
    } = options;

    this.rootPath = rootPath;
    this.candidateEvaluator = candidateEvaluator;
    this.moduleVersions = moduleVersions;
    this.cachedModules = cachedModules;
    this.cleanupCachedModules = cleanupCachedModules;
    this.ensureTypeScriptSupport = ensureTypeScriptSupport;
    this.runtimeCache = runtimeCache;
    this.persistentCache = persistentCache;
    this.persistCache = persistCache;
  }

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

  async storeResolution(cacheKey, candidate, resolved) {
    if (!this.runtimeCache || !this.persistentCache) {
      return;
    }

    const cacheEntry = {
      path: candidate.path,
      access: resolved.access,
      score: candidate.score,
      timestamp: Date.now(),
      mtimeMs: candidate.mtimeMs ?? null
    };

    this.runtimeCache.set(cacheKey, cacheEntry);

    this.persistentCache[cacheKey] = {
      relativePath: path.relative(this.rootPath, candidate.path),
      access: resolved.access,
      score: candidate.score,
      timestamp: cacheEntry.timestamp,
      mtimeMs: cacheEntry.mtimeMs
    };

    if (typeof this.persistCache === 'function') {
      await this.persistCache();
    }
  }

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
