/**
 * Discovery Engine - Finds test targets without hardcoded paths
 *
 * MIT License - Use this anywhere
 */

const fs = require('fs');
const path = require('path');

class DiscoveryEngine {
  constructor(rootPath = process.cwd()) {
    this.rootPath = rootPath;
    this.cache = new Map();
    this.discoveryCache = null;
    this.cacheFile = path.join(rootPath, '.test-discovery-cache.json');
  }

  /**
   * Discover a target module by its signature
   * @param {Object} signature - What to look for
   * @param {RegExp|String} signature.name - Name pattern to match
   * @param {String} signature.type - 'class', 'function', or 'module'
   * @param {Array<String>} signature.methods - Required methods (for classes)
   * @param {String} signature.exports - Export name to look for
   * @returns {Object} The discovered module or null
   */
  async discoverTarget(signature) {
    // Check memory cache first
    const cacheKey = JSON.stringify(signature);
    if (this.cache.has(cacheKey)) {
      const cachedPath = this.cache.get(cacheKey);
      try {
        // Clear require cache to get fresh module
        delete require.cache[require.resolve(cachedPath)];
        return require(cachedPath);
      } catch (e) {
        // Cached path is stale, continue with discovery
        this.cache.delete(cacheKey);
      }
    }

    // Load file cache if not loaded
    if (!this.discoveryCache) {
      this.loadCache();
    }

    // Try cached discoveries
    if (this.discoveryCache[cacheKey]) {
      const cachedPath = this.discoveryCache[cacheKey];
      try {
        delete require.cache[require.resolve(cachedPath)];
        const module = require(cachedPath);
        this.cache.set(cacheKey, cachedPath);
        return module;
      } catch (e) {
        // Cached path is stale
        delete this.discoveryCache[cacheKey];
      }
    }

    // Perform fresh discovery
    const discovered = await this.scanDirectory(this.rootPath, signature);

    if (discovered) {
      // Update caches
      this.cache.set(cacheKey, discovered.path);
      this.discoveryCache[cacheKey] = discovered.path;
      this.saveCache();

      // Return the module
      delete require.cache[require.resolve(discovered.path)];
      return require(discovered.path);
    }

    throw new Error(`Could not discover target matching: ${JSON.stringify(signature)}`);
  }

  /**
   * Scan directory recursively for matching modules
   */
  async scanDirectory(dir, signature, depth = 0) {
    // Don't go too deep or into node_modules
    if (depth > 10 || dir.includes('node_modules') || dir.includes('.git')) {
      return null;
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const found = await this.scanDirectory(fullPath, signature, depth + 1);
          if (found) return found;
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          // Check if this file matches our signature
          const matches = await this.checkFile(fullPath, signature);
          if (matches) {
            return { path: fullPath, module: matches };
          }
        }
      }
    } catch (error) {
      // Directory not readable, skip it
    }

    return null;
  }

  /**
   * Check if a file matches the signature
   */
  async checkFile(filePath, signature) {
    try {
      // Read file content for analysis
      const content = fs.readFileSync(filePath, 'utf8');

      // Check name pattern
      const fileName = path.basename(filePath, '.js');
      const nameMatches = signature.name instanceof RegExp
        ? signature.name.test(fileName)
        : fileName.includes(signature.name);

      if (!nameMatches) {
        // Also check for class/function names in content
        const classMatch = content.match(/class\s+(\w+)/g);
        const functionMatch = content.match(/function\s+(\w+)/g);
        const names = [
          ...(classMatch || []).map(m => m.replace('class ', '')),
          ...(functionMatch || []).map(m => m.replace('function ', ''))
        ];

        const contentNameMatch = names.some(name =>
          signature.name instanceof RegExp
            ? signature.name.test(name)
            : name.includes(signature.name)
        );

        if (!contentNameMatch) return false;
      }

      // Check type
      if (signature.type === 'class' && !content.includes('class ')) {
        return false;
      }
      if (signature.type === 'function' && !content.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=]*)=>/)) {
        return false;
      }

      // Check required methods (for classes)
      if (signature.methods && signature.methods.length > 0) {
        const hasAllMethods = signature.methods.every(method =>
          content.includes(method)
        );
        if (!hasAllMethods) return false;
      }

      // Check exports
      if (signature.exports) {
        const hasExport =
          content.includes(`module.exports = ${signature.exports}`) ||
          content.includes(`module.exports.${signature.exports}`) ||
          content.includes(`exports.${signature.exports}`) ||
          content.includes(`export default ${signature.exports}`) ||
          content.includes(`export { ${signature.exports}`) ||
          content.includes(`export class ${signature.exports}`) ||
          content.includes(`export function ${signature.exports}`);

        if (!hasExport) return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Load discovery cache from disk
   */
  loadCache() {
    try {
      const cacheContent = fs.readFileSync(this.cacheFile, 'utf8');
      this.discoveryCache = JSON.parse(cacheContent);
    } catch (e) {
      this.discoveryCache = {};
    }
  }

  /**
   * Save discovery cache to disk
   */
  saveCache() {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.discoveryCache, null, 2));
    } catch (e) {
      // Cache save failed, not critical
    }
  }

  /**
   * Clear all caches (useful for testing)
   */
  clearCache() {
    this.cache.clear();
    this.discoveryCache = {};
    try {
      fs.unlinkSync(this.cacheFile);
    } catch (e) {
      // File might not exist
    }
  }
}

// Singleton instance
let discoveryEngine = null;

function getDiscoveryEngine(rootPath) {
  if (!discoveryEngine) {
    discoveryEngine = new DiscoveryEngine(rootPath);
  }
  return discoveryEngine;
}

module.exports = { DiscoveryEngine, getDiscoveryEngine };