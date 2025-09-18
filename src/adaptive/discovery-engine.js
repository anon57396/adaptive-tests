/**
 * Discovery Engine 2.0 - Config-First Architecture
 *
 * A completely redesigned discovery engine that showcases:
 * - Full configuration support
 * - Custom scoring plugins
 * - Inheritance detection
 * - Property validation
 * - Async-ready architecture (but sync for simplicity)
 */

const fs = require('fs');
const path = require('path');
const { ConfigLoader } = require('./config-loader');
const { ScoringEngine } = require('./scoring-engine');

// Cache for module requirements
const moduleCache = new Map();

class DiscoveryEngine {
  constructor(rootPath = process.cwd(), config = {}) {
    this.rootPath = path.resolve(rootPath);

    // Load configuration with cascading priority
    const configLoader = new ConfigLoader(this.rootPath);
    this.config = configLoader.load(config);

    // Initialize scoring engine with config
    this.scoringEngine = new ScoringEngine(this.config);

    // Runtime caches
    this.discoveryCache = new Map();
    this.persistentCache = {};
    this.cacheLoaded = false;

    // Load persistent cache if enabled
    if (this.config.discovery.cache.enabled) {
      this.loadCache();
    }
  }

  /**
   * Discover a target module/class/function
   */
  async discoverTarget(signature) {
    // Normalize and validate signature
    const normalizedSig = this.normalizeSignature(signature);
    const cacheKey = this.getCacheKey(normalizedSig);

    // Check runtime cache first
    if (this.discoveryCache.has(cacheKey)) {
      const cached = this.discoveryCache.get(cacheKey);
      try {
        return this.loadModule(cached, normalizedSig);
      } catch (error) {
        this.discoveryCache.delete(cacheKey);
      }
    }

    // Check persistent cache
    if (this.persistentCache[cacheKey]) {
      try {
        const module = this.loadModule(this.persistentCache[cacheKey], normalizedSig);
        this.discoveryCache.set(cacheKey, this.persistentCache[cacheKey]);
        return module;
      } catch (error) {
        delete this.persistentCache[cacheKey];
      }
    }

    // Perform discovery
    const candidates = this.collectCandidates(this.rootPath, normalizedSig);

    if (candidates.length === 0) {
      throw this.createDiscoveryError(normalizedSig);
    }

    // Sort by score
    candidates.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

    // Try to resolve candidates in order
    for (const candidate of candidates) {
      const resolved = this.tryResolveCandidate(candidate, normalizedSig);
      if (resolved) {
        // Cache the result
        const cacheEntry = {
          path: candidate.path,
          access: resolved.access,
          score: candidate.score,
          timestamp: Date.now()
        };

        this.discoveryCache.set(cacheKey, cacheEntry);
        this.persistentCache[cacheKey] = cacheEntry;
        this.saveCache();

        return resolved.target;
      }
    }

    throw this.createDiscoveryError(normalizedSig, candidates);
  }

  /**
   * Collect all candidates matching the signature
   */
  collectCandidates(dir, signature, depth = 0, candidates = []) {
    if (depth > this.config.discovery.maxDepth) {
      return candidates;
    }

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      return candidates;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip configured directories
        if (this.shouldSkipDirectory(entry.name)) {
          continue;
        }
        this.collectCandidates(fullPath, signature, depth + 1, candidates);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      // Check extension
      const ext = path.extname(entry.name);
      if (!this.config.discovery.extensions.includes(ext)) {
        continue;
      }

      // Skip test files
      if (entry.name.includes('.test.') || entry.name.includes('.spec.')) {
        continue;
      }

      // Skip TypeScript declaration files
      if (entry.name.endsWith('.d.ts')) {
        continue;
      }

      // Evaluate candidate
      const candidate = this.evaluateCandidate(fullPath, signature);
      if (candidate && candidate.score > 0) {
        candidates.push(candidate);
      }
    }

    return candidates;
  }

  /**
   * Evaluate a file as a potential candidate
   */
  evaluateCandidate(filePath, signature) {
    const fileName = path.basename(filePath, path.extname(filePath));

    // Quick name check for early rejection
    if (!this.quickNameCheck(fileName, signature)) {
      return null;
    }

    // Read file content for detailed scoring
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      return null;
    }

    // Create candidate object
    const candidate = {
      path: filePath,
      fileName: fileName,
      content: content
    };

    // Calculate score using scoring engine
    const score = this.scoringEngine.calculateScore(candidate, signature, content);

    if (score <= 0) {
      return null;
    }

    candidate.score = score;
    return candidate;
  }

  /**
   * Quick check if file name could match signature
   */
  quickNameCheck(fileName, signature) {
    // If no name requirement, accept all
    if (!signature.name && !signature.exports) {
      return true;
    }

    const fileNameLower = fileName.toLowerCase();
    const content = fileNameLower;

    // Check name match
    if (signature.name) {
      if (signature.name instanceof RegExp) {
        if (signature.name.test(fileName)) {
          return true;
        }
      } else {
        const nameLower = signature.name.toLowerCase();
        if (content.includes(nameLower)) {
          return true;
        }
      }
    }

    // Check export match
    if (signature.exports) {
      const exportLower = signature.exports.toLowerCase();
      if (content.includes(exportLower)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Try to resolve a candidate by loading and validating it
   */
  tryResolveCandidate(candidate, signature) {
    try {
      // Clear require cache for fresh load
      const resolvedPath = require.resolve(candidate.path);
      delete require.cache[resolvedPath];

      // Handle TypeScript files
      const ext = path.extname(candidate.path);
      if (ext === '.ts' || ext === '.tsx') {
        this.ensureTypeScriptSupport();
      }

      // Require the module
      const moduleExports = require(candidate.path);

      // Find the target in the module
      return this.resolveTargetFromModule(moduleExports, signature, candidate);
    } catch (error) {
      // Silently skip candidates that can't be loaded
      return null;
    }
  }

  /**
   * Resolve target from module exports
   */
  resolveTargetFromModule(moduleExports, signature, candidate) {
    const results = [];

    // Check default export
    if (moduleExports && moduleExports.default) {
      const validated = this.validateTarget(moduleExports.default, signature);
      if (validated) {
        results.push({
          target: moduleExports.default,
          access: { type: 'default' },
          score: validated.score
        });
      }
    }

    // Check named exports
    if (moduleExports && typeof moduleExports === 'object') {
      for (const [key, value] of Object.entries(moduleExports)) {
        if (key === 'default') continue;

        const validated = this.validateTarget(value, signature);
        if (validated) {
          results.push({
            target: value,
            access: { type: 'named', name: key },
            score: validated.score + (key === signature.exports ? 10 : 0)
          });
        }
      }
    }

    // Check direct export (function/class)
    if (typeof moduleExports === 'function') {
      const validated = this.validateTarget(moduleExports, signature);
      if (validated) {
        results.push({
          target: moduleExports,
          access: { type: 'direct' },
          score: validated.score + 5
        });
      }
    }

    // Return best match
    if (results.length > 0) {
      results.sort((a, b) => b.score - a.score);
      return results[0];
    }

    return null;
  }

  /**
   * Validate that a target matches the signature requirements
   */
  validateTarget(target, signature) {
    if (!target) {
      return null;
    }

    let score = 0;

    // Type validation
    if (signature.type) {
      if (!this.validateType(target, signature.type)) {
        return null;
      }
      score += 10;
    }

    // Name validation
    if (signature.name) {
      const targetName = this.getTargetName(target);
      if (!this.validateName(targetName, signature.name)) {
        return null;
      }
      score += this.scoringEngine.scoreTargetName(targetName, signature);
    }

    // Method validation
    if (signature.methods && signature.methods.length > 0) {
      const methodScore = this.validateMethods(target, signature.methods);
      if (methodScore === null) {
        return null;
      }
      score += methodScore;
    }

    // Property validation (NEW!)
    if (signature.properties && signature.properties.length > 0) {
      const propScore = this.validateProperties(target, signature.properties);
      if (propScore === null) {
        return null;
      }
      score += propScore;
    }

    // Inheritance validation (NEW!)
    if (signature.extends) {
      if (!this.validateInheritance(target, signature.extends)) {
        return null;
      }
      score += 20;
    }

    // Instance validation (NEW!)
    if (signature.instanceof) {
      if (!this.validateInstanceOf(target, signature.instanceof)) {
        return null;
      }
      score += 15;
    }

    return { score };
  }

  /**
   * Validate type
   */
  validateType(target, expectedType) {
    switch (expectedType) {
      case 'class':
        return typeof target === 'function' && target.prototype;
      case 'function':
        return typeof target === 'function';
      case 'object':
        return typeof target === 'object' && target !== null;
      case 'module':
        return typeof target === 'object' && target !== null;
      default:
        return true;
    }
  }

  /**
   * Validate name
   */
  validateName(targetName, expectedName) {
    if (!targetName) return false;

    if (expectedName instanceof RegExp) {
      return expectedName.test(targetName);
    }

    return targetName === expectedName;
  }

  /**
   * Validate methods exist
   */
  validateMethods(target, methods) {
    const methodHost = target.prototype || target;

    for (const method of methods) {
      if (typeof methodHost[method] !== 'function') {
        return null;
      }
    }

    return methods.length * 5;
  }

  /**
   * Validate properties exist (NEW!)
   */
  validateProperties(target, properties) {
    const propHost = target.prototype || target;

    for (const prop of properties) {
      if (!(prop in propHost)) {
        return null;
      }
    }

    return properties.length * 3;
  }

  /**
   * Validate inheritance chain (NEW!)
   */
  validateInheritance(target, baseClass) {
    if (typeof target !== 'function') {
      return false;
    }

    // Check prototype chain
    let proto = target.prototype;
    while (proto) {
      if (proto.constructor === baseClass) {
        return true;
      }
      proto = Object.getPrototypeOf(proto);
    }

    // Check static inheritance (ES6 classes)
    if (baseClass && typeof baseClass === 'function') {
      return target.prototype instanceof baseClass;
    }

    // String-based check for when we don't have the actual class
    if (typeof baseClass === 'string') {
      let proto = target.prototype;
      while (proto) {
        if (proto.constructor && proto.constructor.name === baseClass) {
          return true;
        }
        proto = Object.getPrototypeOf(proto);
      }
    }

    return false;
  }

  /**
   * Validate instanceof (NEW!)
   */
  validateInstanceOf(target, expectedClass) {
    if (typeof expectedClass === 'function') {
      return target instanceof expectedClass;
    }

    // String-based check
    if (typeof expectedClass === 'string') {
      let proto = Object.getPrototypeOf(target);
      while (proto) {
        if (proto.constructor && proto.constructor.name === expectedClass) {
          return true;
        }
        proto = Object.getPrototypeOf(proto);
      }
    }

    return false;
  }

  /**
   * Get target name
   */
  getTargetName(target) {
    if (!target) return null;

    // Function/class name
    if (target.name) return target.name;

    // Constructor name
    if (target.constructor && target.constructor.name) {
      return target.constructor.name;
    }

    return null;
  }

  /**
   * Should skip directory
   */
  shouldSkipDirectory(dirName) {
    // Check if starts with dot
    if (dirName.startsWith('.')) {
      return true;
    }

    // Check configured skip list
    return this.config.discovery.skipDirectories.includes(dirName);
  }

  /**
   * Normalize signature
   */
  normalizeSignature(signature) {
    if (!signature || typeof signature !== 'object') {
      throw new Error(
        'discoverTarget requires a signature object.\n' +
        'Example: { name: "Calculator", type: "class" }\n' +
        'See docs/QUICK_START.md for examples.'
      );
    }

    const normalized = { ...signature };

    // Normalize methods array
    if (normalized.methods) {
      normalized.methods = Array.from(new Set(normalized.methods)).sort();
    }

    // Normalize properties array
    if (normalized.properties) {
      normalized.properties = Array.from(new Set(normalized.properties)).sort();
    }

    // Store original for error messages
    normalized.original = { ...signature };

    return normalized;
  }

  /**
   * Get cache key for signature
   */
  getCacheKey(signature) {
    const parts = [];

    if (signature.name) {
      parts.push(`name:${signature.name}`);
    }
    if (signature.type) {
      parts.push(`type:${signature.type}`);
    }
    if (signature.methods) {
      parts.push(`methods:${signature.methods.join(',')}`);
    }
    if (signature.properties) {
      parts.push(`props:${signature.properties.join(',')}`);
    }
    if (signature.extends) {
      parts.push(`extends:${signature.extends}`);
    }
    if (signature.exports) {
      parts.push(`exports:${signature.exports}`);
    }

    return parts.join('|');
  }

  /**
   * Load module from cache entry
   */
  loadModule(cacheEntry, signature) {
    const resolvedPath = require.resolve(cacheEntry.path);

    // Clear require cache if needed
    if (!moduleCache.has(resolvedPath)) {
      delete require.cache[resolvedPath];
    }

    const moduleExports = require(cacheEntry.path);

    // Apply access pattern
    let target = moduleExports;

    switch (cacheEntry.access.type) {
      case 'default':
        target = moduleExports.default;
        break;
      case 'named':
        target = moduleExports[cacheEntry.access.name];
        break;
      case 'direct':
        target = moduleExports;
        break;
    }

    // Validate it still matches
    const validated = this.validateTarget(target, signature);
    if (!validated) {
      throw new Error('Cached target no longer matches signature');
    }

    return target;
  }

  /**
   * Create discovery error with helpful message
   */
  createDiscoveryError(signature, candidates = []) {
    const sig = {
      name: signature.name instanceof RegExp ? signature.name.toString() : signature.name,
      type: signature.type,
      methods: signature.methods,
      properties: signature.properties,
      extends: signature.extends,
      exports: signature.exports
    };

    const errorLines = [
      `Could not discover target matching: ${JSON.stringify(sig, null, 2)}`,
      ''
    ];

    if (candidates.length > 0) {
      errorLines.push('Found candidates but none matched all requirements:');
      candidates.slice(0, 3).forEach(c => {
        errorLines.push(`  - ${c.fileName} (score: ${c.score})`);
        if (c.scoreBreakdown) {
          errorLines.push(`    Breakdown: ${JSON.stringify(c.scoreBreakdown)}`);
        }
      });
      errorLines.push('');
    }

    errorLines.push(
      'Troubleshooting tips:',
      '1. Check that the target file exists and exports the expected name',
      '2. Ensure the file is in a discoverable location',
      '3. Try a simpler signature first: { name: "YourClass" }',
      '4. Clear cache if you just created the file: engine.clearCache()',
      '5. Check your adaptive-tests.config.js for custom path scoring',
      '',
      'See docs/COMMON_ISSUES.md for more help.'
    );

    return new Error(errorLines.join('\n'));
  }

  /**
   * Load cache from disk
   */
  loadCache() {
    if (!this.config.discovery.cache.enabled) {
      return;
    }

    const cacheFile = path.join(this.rootPath, this.config.discovery.cache.file);

    try {
      if (fs.existsSync(cacheFile)) {
        const data = fs.readFileSync(cacheFile, 'utf8');
        this.persistentCache = JSON.parse(data);
      }
    } catch (error) {
      this.persistentCache = {};
    }

    this.cacheLoaded = true;
  }

  /**
   * Save cache to disk
   */
  saveCache() {
    if (!this.config.discovery.cache.enabled) {
      return;
    }

    const cacheFile = path.join(this.rootPath, this.config.discovery.cache.file);

    try {
      fs.writeFileSync(cacheFile, JSON.stringify(this.persistentCache, null, 2));
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.discoveryCache.clear();
    this.persistentCache = {};
    moduleCache.clear();
    this.saveCache();
  }

  /**
   * Ensure TypeScript support
   */
  ensureTypeScriptSupport() {
    if (this._tsNodeRegistered) {
      return;
    }

    try {
      require('ts-node').register({
        transpileOnly: true,
        compilerOptions: {
          module: 'commonjs',
          target: 'es2020'
        }
      });
      this._tsNodeRegistered = true;
    } catch (error) {
      throw new Error(
        'TypeScript support requires ts-node.\n' +
        'Install it with: npm install --save-dev ts-node'
      );
    }
  }
}

/**
 * Factory function with singleton caching
 */
const engineCache = new Map();

function getDiscoveryEngine(rootPath = process.cwd(), config = {}) {
  const key = rootPath;

  if (!engineCache.has(key)) {
    engineCache.set(key, new DiscoveryEngine(rootPath, config));
  }

  return engineCache.get(key);
}

module.exports = { DiscoveryEngine, getDiscoveryEngine };