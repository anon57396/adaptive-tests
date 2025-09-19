/**
 * Discovery Engine 2.0 - Config-First Architecture
 *
 * A completely redesigned discovery engine that showcases:
 * - Full configuration support
 * - Custom scoring plugins
 * - Inheritance detection
 * - Property validation
 * - Async-first architecture with promise-based discovery
 */

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const Module = require('module');
const { ConfigLoader } = require('./config-loader');
const { analyzeModuleExports: parseModuleExports } = require('./parser');
const { ScoringEngine } = require('./scoring-engine');
const { createTsconfigResolver } = require('./tsconfig-resolver');
const { getLogger } = require('./logger');

// Cache for module requirements with size limit
const MAX_MODULE_CACHE_SIZE = 100;

class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;

    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    // Remove if exists and re-add to end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }

  keys() {
    return this.cache.keys();
  }

  values() {
    return this.cache.values();
  }

  entries() {
    return this.cache.entries();
  }

  forEach(callback, thisArg) {
    this.cache.forEach(callback, thisArg);
  }
}

const moduleCache = new LRUCache(MAX_MODULE_CACHE_SIZE);

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  return [value];
}

class DiscoveryEngine {
  constructor(rootPath = process.cwd(), config = {}) {
    this.rootPath = path.resolve(rootPath);

    // Load configuration with cascading priority
    const configLoader = new ConfigLoader(this.rootPath);
    this.config = configLoader.load(config);

    // Initialize scoring engine with config
    this.scoringEngine = new ScoringEngine(this.config);

    // Optional TypeScript path resolver
    this.tsconfigResolver = createTsconfigResolver(this.rootPath);

    const cacheConfig = this.config.discovery.cache || {};
    this.cacheLogWarnings = Boolean(cacheConfig.logWarnings);
    const ttlSeconds = Number(cacheConfig.ttl ?? 0);
    this.cacheTTLMs = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds * 1000 : 0;

    // Runtime caches with size limits
    this.discoveryCache = new LRUCache(200); // Limit discovery cache
    this.persistentCache = {};
    this.cacheLoaded = false;
    this.cacheLoadPromise = null;
    this.cachedModules = new Set();
    this.moduleVersions = new LRUCache(50); // Limit version cache
    this.MAX_CACHED_MODULES = 100; // Limit cached module paths

    // Periodically clean up cachedModules to prevent unbounded growth
    this.cleanupCachedModules();
  }

  detectCallerExtension() {
    try {
      const stack = new Error().stack;
      const lines = stack.split('\n');

      // Find the first file that's not this discovery engine
      for (const line of lines) {
        if (line.includes('.js') && !line.includes('discovery-engine.js') && !line.includes('adaptive-tests')) {
          return '.js';
        }
        if (line.includes('.ts') && !line.includes('discovery-engine.js')) {
          return '.ts';
        }
      }
    } catch (e) {
      // Default to JS
    }
    return '.js';
  }

  async ensureCacheLoaded() {
    if (!this.config.discovery.cache.enabled) {
      this.cacheLoaded = true;
      return;
    }

    if (this.cacheLoaded) {
      return;
    }

    if (!this.cacheLoadPromise) {
      this.cacheLoadPromise = this.loadCache();
    }

    await this.cacheLoadPromise;
  }

  /**
   * Discover a target module/class/function
   */
  async discoverTarget(signature) {
    // Normalize and validate signature
    const normalizedSig = this.normalizeSignature(signature);
    const cacheKey = this.getCacheKey(normalizedSig);

    // Detect caller's file extension from stack
    const callerExtension = this.detectCallerExtension();

    await this.ensureCacheLoaded();

    // Check runtime cache first
    if (this.discoveryCache.has(cacheKey)) {
      const cached = this.discoveryCache.get(cacheKey);
      if (this.isCacheEntryExpired(cached)) {
        this.discoveryCache.delete(cacheKey);
      } else {
        try {
          return this.loadModule(cached, normalizedSig);
        } catch (error) {
          this.discoveryCache.delete(cacheKey);
        }
      }
    }

    // Check persistent cache
    if (this.persistentCache[cacheKey]) {
      const persistentEntry = this.persistentCache[cacheKey];
      if (this.isCacheEntryExpired(persistentEntry)) {
        delete this.persistentCache[cacheKey];
      } else {
        try {
          // Convert relative path back to absolute
          const cacheEntry = { ...persistentEntry };
          if (cacheEntry.relativePath) {
            cacheEntry.path = path.join(this.rootPath, cacheEntry.relativePath);
          }

          // Validate that the file still exists
          if (!fs.existsSync(cacheEntry.path)) {
            delete this.persistentCache[cacheKey];
          } else {
            const module = this.loadModule(cacheEntry, normalizedSig);
            this.discoveryCache.set(cacheKey, cacheEntry);
            return module;
          }
        } catch (error) {
          delete this.persistentCache[cacheKey];
        }
      }
    }

    // Perform discovery
    const candidates = await this.collectCandidates(this.rootPath, normalizedSig);

    if (candidates.length === 0) {
      throw this.createDiscoveryError(normalizedSig);
    }

    // Sort by score, but prioritize matching extensions
    candidates.sort((a, b) => {
      const aExt = path.extname(a.path);
      const bExt = path.extname(b.path);

      // If caller is JS and one candidate is JS, prefer it
      if (callerExtension === '.js') {
        if (aExt === '.js' && bExt !== '.js') return -1;
        if (aExt !== '.js' && bExt === '.js') return 1;
      }

      // If caller is TS and one candidate is TS, prefer it
      if (callerExtension === '.ts') {
        if (aExt === '.ts' && bExt !== '.ts') return -1;
        if (aExt !== '.ts' && bExt === '.ts') return 1;
      }

      // Otherwise sort by score
      return b.score - a.score || a.path.localeCompare(b.path);
    });

    // Try to resolve candidates in order
    for (const candidate of candidates) {
      const resolved = await this.tryResolveCandidate(candidate, normalizedSig);
      if (resolved) {
        // Cache the metadata only (not the actual module/target)
        const cacheEntry = {
          path: candidate.path,
          access: resolved.access,
          score: candidate.score,
          timestamp: Date.now(),
          mtimeMs: candidate.mtimeMs ?? null
        };

        this.discoveryCache.set(cacheKey, cacheEntry);

        this.persistentCache[cacheKey] = {
          relativePath: path.relative(this.rootPath, candidate.path),
          access: resolved.access,
          score: candidate.score,
          timestamp: cacheEntry.timestamp,
          mtimeMs: cacheEntry.mtimeMs
        };
        await this.saveCache();

        return resolved.target;
      }
    }

    throw this.createDiscoveryError(normalizedSig, candidates);
  }

  /**
   * Collect all candidates matching the signature
   */
  async collectCandidates(dir, signature, depth = 0, candidates = []) {
    if (depth > this.config.discovery.maxDepth) {
      return candidates;
    }

    let entries;
    try {
      entries = await fsPromises.readdir(dir, { withFileTypes: true });
    } catch (error) {
      return candidates;
    }

    const directoryTasks = [];
    const fileTasks = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (this.shouldSkipDirectory(entry.name)) {
          continue;
        }
        directoryTasks.push(this.collectCandidates(fullPath, signature, depth + 1, candidates));
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const ext = path.extname(entry.name);
      if (!this.config.discovery.extensions.includes(ext)) {
        continue;
      }

      const lowerName = entry.name.toLowerCase();
      if (lowerName.includes('.test.') || lowerName.includes('.spec.')) {
        continue;
      }

      if (entry.name.endsWith('.d.ts')) {
        continue;
      }

      if (entry.name.endsWith('.backup')) {
        continue;
      }

      if (/(?:\s(?:copy|copy\s\d+)|\s\d+)(?=\.[^.]+$)/i.test(entry.name)) {
        continue;
      }

      fileTasks.push((async () => {
        const candidate = await this.evaluateCandidate(fullPath, signature);
        const minScore = this.config.discovery.scoring.minCandidateScore ?? 0;
        if (candidate && candidate.score > minScore) {
          candidates.push(candidate);
        }
      })());
    }

    if (directoryTasks.length > 0) {
      await Promise.allSettled(directoryTasks);
    }

    if (fileTasks.length > 0) {
      await Promise.allSettled(fileTasks);
    }

    return candidates;
  }

  /**
   * Evaluate a file as a potential candidate
   */
  async evaluateCandidate(filePath, signature) {
    const fileName = path.basename(filePath, path.extname(filePath));

    if (!this.quickNameCheck(fileName, signature)) {
      return null;
    }

    let content;
    try {
      content = await fsPromises.readFile(filePath, 'utf8');
    } catch (error) {
      return null;
    }

    let stats = null;
    try {
      stats = await fsPromises.stat(filePath);
    } catch (error) {
      stats = null;
    }

    const candidate = {
      path: filePath,
      fileName,
      content,
      mtimeMs: stats ? stats.mtimeMs : null
    };

    const relativePath = path.relative(this.rootPath, filePath).split(path.sep).join('/') || path.basename(filePath);
    candidate.relativePath = relativePath;

    if (this.tsconfigResolver) {
      try {
        const aliases = this.tsconfigResolver.getAliasesForFile
          ? this.tsconfigResolver.getAliasesForFile(filePath)
          : [];
        const baseImport = this.tsconfigResolver.getBaseUrlRelativeImport
          ? this.tsconfigResolver.getBaseUrlRelativeImport(filePath)
          : null;

        if (aliases && aliases.length > 0) {
          candidate.tsAliases = aliases;
        }
        if (baseImport) {
          candidate.tsBaseImport = baseImport;
        }
      } catch (error) {
        // ignore resolver errors; aliases remain undefined
      }
    }

    try {
      candidate.metadata = this.analyzeModuleExports(content, fileName);
    } catch (error) {
      candidate.metadata = null;
    }

    let score = this.scoringEngine.calculateScore(candidate, signature, content);
    const recencyBonus = stats ? this.calculateRecencyBonus(stats.mtimeMs) : 0;
    if (recencyBonus !== 0) {
      candidate.scoreBreakdown = candidate.scoreBreakdown || {};
      candidate.scoreBreakdown.recency = Math.round(recencyBonus);
      score += recencyBonus;
    }

    const minScore = this.config.discovery.scoring.minCandidateScore ?? 0;

    if (score <= minScore) {
      return null;
    }

    candidate.score = score;
    return candidate;
  }

  isCandidateSafe(candidate) {
    const security = this.config.discovery.security || {};
    if (security.allowUnsafeRequires) {
      return true;
    }

    const blockedTokens = security.blockedTokens || [
      'process.exit(',
      'child_process.exec',
      'child_process.spawn',
      'child_process.fork',
      'fs.rmSync',
      'fs.rmdirSync',
      'fs.unlinkSync',
      'rimraf'
    ];

    for (const token of blockedTokens) {
      if (candidate.content && candidate.content.toLowerCase().includes(token.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  selectExportFromMetadata(candidate, signature) {
    const metadata = candidate.metadata;
    if (!metadata || !Array.isArray(metadata.exports)) {
      return null;
    }

    const matches = [];

    for (const entry of metadata.exports) {
      if (this.matchesSignatureMetadata(entry, signature)) {
        matches.push(entry);
      }
    }

    if (matches.length === 0) {
      return null;
    }

    return matches[0];
  }

  matchesSignatureMetadata(entry, signature) {
    if (!entry || !entry.info) {
      return false;
    }

    const info = entry.info;
    const methods = new Set(info.methods || []);
    const properties = new Set(info.properties || []);

    if (signature.type) {
      const expected = signature.type;
      if (expected === 'class' && info.kind !== 'class') {
        return false;
      }
      if (expected === 'function' && info.kind !== 'function') {
        return false;
      }
      if (expected === 'object' && info.kind !== 'object') {
        return false;
      }
    }

    if (signature.exports && entry.access && entry.access.type === 'named') {
      if (signature.exports !== entry.access.name) {
        return false;
      }
    }

    if (signature.name) {
      const namesToCheck = [];
      if (entry.access && entry.access.name) {
        namesToCheck.push(entry.access.name);
      }
      if (info.name) {
        namesToCheck.push(info.name);
      }

      if (signature.name instanceof RegExp) {
        const regex = signature.name;
        if (!namesToCheck.some(name => regex.test(name))) {
          return false;
        }
      } else {
        const expectedName = String(signature.name);
        const normalized = namesToCheck.map(name => (name || '').toLowerCase());
        if (!normalized.includes(expectedName.toLowerCase())) {
          return false;
        }
      }
    }

    if (signature.methods && signature.methods.length > 0) {
      for (const method of signature.methods) {
        if (!methods.has(method)) {
          return false;
        }
      }
    }

    if (signature.properties && signature.properties.length > 0) {
      for (const prop of signature.properties) {
        if (!properties.has(prop)) {
          return false;
        }
      }
    }

    if (signature.extends) {
      if (typeof signature.extends === 'string') {
        if (info.extends !== signature.extends) {
          return false;
        }
      } else if (typeof signature.extends === 'function' && signature.extends.name) {
        if (info.extends && info.extends !== signature.extends.name) {
          return false;
        }
      }
    }

    return true;
  }

  extractExportByAccess(moduleExports, access) {
    if (!access || !moduleExports) {
      return null;
    }

    switch (access.type) {
      case 'default':
        return moduleExports.default;
      case 'named':
        return access.name ? moduleExports[access.name] : undefined;
      case 'direct':
      default:
        return moduleExports;
    }
  }

  tokenizeName(name) {
    if (!name) {
      return [];
    }

    return name
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(token => token.trim())
      .filter(Boolean);
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

    if (signature.name) {
      if (signature.name instanceof RegExp) {
        if (signature.name.test(fileName)) {
          return true;
        }
      } else {
        const tokens = this.tokenizeName(signature.name);
        if (tokens.length === 0) {
          return true;
        }
        if (tokens.some(token => content.toLowerCase().includes(token.toLowerCase()))) {
          return true;
        }
      }
    }

    // Check export match (case-insensitive)
    if (signature.exports) {
      const exportLower = signature.exports.toLowerCase();
      if (content.toLowerCase().includes(exportLower)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Try to resolve a candidate by loading and validating it
   */
  async tryResolveCandidate(candidate, signature) {
    try {
      if (!this.isCandidateSafe(candidate)) {
        return null;
      }

      const metadataMatch = this.selectExportFromMetadata(candidate, signature);
      if (candidate.metadata && !metadataMatch) {
        return null;
      }

      const resolvedPath = require.resolve(candidate.path);
      const ext = path.extname(candidate.path);
      let mtimeMs = null;

      try {
        const stats = fs.statSync(candidate.path);
        mtimeMs = stats.mtimeMs;
      } catch (error) {
        // Ignore - treat as dynamic module
      }

      const lastVersion = this.moduleVersions.get(resolvedPath);
      const initialLoad = lastVersion === undefined;
      const hasChanged = mtimeMs === null || lastVersion === undefined || lastVersion !== mtimeMs;

      if (ext === '.ts' || ext === '.tsx') {
        this.ensureTypeScriptSupport();
        // Always delete from cache to get fresh module
        delete require.cache[resolvedPath];
        const moduleExports = require(candidate.path);
        if (mtimeMs !== null) {
          this.moduleVersions.set(resolvedPath, mtimeMs);
        } else {
          this.moduleVersions.delete(resolvedPath);
        }
        this.cachedModules.add(resolvedPath);
        this.cleanupCachedModules(); // Prevent unbounded growth

        if (metadataMatch) {
          const target = this.extractExportByAccess(moduleExports, metadataMatch.access);
          if (target && this.validateTarget(target, signature)) {
            return { target, access: metadataMatch.access };
          }
        }

        return this.resolveTargetFromModule(moduleExports, signature, candidate);
      }

      // Always delete from cache to get fresh module
      delete require.cache[resolvedPath];

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
      this.cleanupCachedModules(); // Prevent unbounded growth

      if (metadataMatch) {
        const target = this.extractExportByAccess(moduleExports, metadataMatch.access);
        if (target && this.validateTarget(target, signature)) {
          return { target, access: metadataMatch.access };
        }
      }

      return this.resolveTargetFromModule(moduleExports, signature, candidate);
    } catch (error) {
      return null;
    }
  }

  compileFreshModule(modulePath) {
    const code = fs.readFileSync(modulePath, 'utf8');
    const freshModule = new Module(modulePath, module.parent);
    freshModule.filename = modulePath;
    freshModule.paths = Module._nodeModulePaths(path.dirname(modulePath));
    freshModule._compile(code, modulePath);
    return freshModule.exports;
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

    const hasPrototypeProps = properties.every(prop => prop in propHost);
    if (hasPrototypeProps) {
      return properties.length * 3;
    }

    if (typeof target === 'function' && target.length === 0) {
      try {
        const instance = new target();
        const hasInstanceProps = properties.every(prop => prop in instance);
        if (hasInstanceProps) {
          return properties.length * 3;
        }
      } catch (error) {
        // Ignore instantiation errors and fall back to failure
      }
    }

    return null;
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
      if (typeof target === 'function') {
        return target === expectedClass || target.prototype instanceof expectedClass;
      }
      return target instanceof expectedClass;
    }

    if (typeof expectedClass === 'string') {
      if (typeof target === 'function') {
        let proto = target.prototype;
        while (proto) {
          if (proto.constructor && proto.constructor.name === expectedClass) {
            return true;
          }
          proto = Object.getPrototypeOf(proto);
        }
        return false;
      }

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
    const keys = Object.keys(signature)
      .filter(key => key !== 'original' && signature[key] !== undefined)
      .sort();

    const payload = {};
    for (const key of keys) {
      payload[key] = this.serializeCacheValue(signature[key]);
    }

    return JSON.stringify(payload);
  }

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

  calculateRecencyBonus(mtimeMs) {
    const recency = this.config.discovery.scoring.recency;
    if (!recency) {
      return 0;
    }

    const maxBonus = recency.maxBonus ?? 0;
    const halfLifeHours = recency.halfLifeHours ?? 24;

    if (maxBonus <= 0 || halfLifeHours <= 0) {
      return 0;
    }

    const ageMs = Date.now() - mtimeMs;
    if (!Number.isFinite(ageMs)) {
      return 0;
    }

    if (ageMs <= 0) {
      return maxBonus;
    }

    const ageHours = ageMs / (1000 * 60 * 60);
    const decayFactor = Math.pow(0.5, ageHours / halfLifeHours);
    return maxBonus * decayFactor;
  }

  /**
   * Load module from cache entry
   */
  loadModule(cacheEntry, signature) {
    const resolvedPath = require.resolve(cacheEntry.path);

    // Never cache the actual module object - always load fresh
    // Always clear require.cache to ensure fresh module load
    delete require.cache[resolvedPath];

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
        target = moduleExports;
        break;
    }

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
        if (c.relativePath) {
          errorLines.push(`    Path: ${c.relativePath}`);
        }
        if (c.tsAliases && c.tsAliases.length > 0) {
          errorLines.push(`    Aliases: ${c.tsAliases.join(', ')}`);
        }
      });
      errorLines.push('');
    }

    const signatureHint = signature.original || signature;
    const signatureJson = JSON.stringify(signatureHint);
    if (signatureJson) {
      errorLines.push('Tip: inspect candidate scoring via Discovery Lens:');
      errorLines.push(`  npx adaptive-tests why '${signatureJson}'`);
      errorLines.push('  npx adaptive-tests why \'' + signatureJson + '\' --json  # machine-readable');
      errorLines.push('');
    }

    if (candidates.length > 0) {
      const suggestion = this.buildSignatureSuggestion(candidates[0]);
      if (suggestion) {
        errorLines.push('Suggested signature derived from top candidate:');
        errorLines.push(JSON.stringify(suggestion, null, 2));
        errorLines.push('');
      }
    }

    errorLines.push(
      'Troubleshooting tips:',
      '1. Check that the target file exists and exports the expected name',
      '2. Ensure the file is in a discoverable location',
      '3. Try a simpler signature first: { name: "YourClass" }',
      '4. Clear cache if you just created the file: await engine.clearCache()',
      '5. Check your adaptive-tests.config.js for custom path scoring',
      '',
      'See docs/COMMON_ISSUES.md for more help.'
    );

    return new Error(errorLines.join('\n'));
  }

  buildSignatureSuggestion(candidate) {
    if (!candidate || !candidate.metadata || !Array.isArray(candidate.metadata.exports) || candidate.metadata.exports.length === 0) {
      return null;
    }

    const pick = candidate.metadata.exports[0];
    if (!pick || !pick.info) {
      return null;
    }

    const info = pick.info;
    const suggestion = {};

    if (info.name) {
      suggestion.name = info.name;
    }

    if (info.kind && info.kind !== 'unknown') {
      suggestion.type = info.kind;
    }

    if (pick.access && pick.access.type === 'named' && pick.access.name) {
      suggestion.exports = pick.access.name;
    }

    const methods = toArray(info.methods).filter(Boolean);
    if (methods.length > 0) {
      suggestion.methods = methods;
    }

    const properties = toArray(info.properties).filter(Boolean);
    if (properties.length > 0) {
      suggestion.properties = properties;
    }

    if (info.extends) {
      suggestion.extends = info.extends;
    }

    if (Object.keys(suggestion).length === 0) {
      return null;
    }

    return suggestion;
  }

  logCacheWarning(message, error) {
    if (!this.cacheLogWarnings) {
      return;
    }
    const details = error && error.message ? `: ${error.message}` : '';
    getLogger().warn(`[adaptive-tests] ${message}${details}`);
  }

  isCacheEntryExpired(entry) {
    if (!this.cacheTTLMs) {
      return false;
    }
    if (!entry || !entry.timestamp) {
      return true;
    }
    return (Date.now() - entry.timestamp) > this.cacheTTLMs;
  }

  analyzeModuleExports(content, fileName) {
    return parseModuleExports(content, fileName);
  }

  /**
   * Load cache from disk
   */
  async loadCache() {
    if (!this.config.discovery.cache.enabled) {
      this.cacheLoaded = true;
      return;
    }

    const cacheFile = path.join(this.rootPath, this.config.discovery.cache.file);

    try {
      const data = await fsPromises.readFile(cacheFile, 'utf8');
      const rawCache = JSON.parse(data);

      // Validate and clean cache entries
      this.persistentCache = {};
      for (const [key, entry] of Object.entries(rawCache)) {
        // Skip invalid entries
        if (!entry || typeof entry !== 'object') continue;

        // Check if entry has required fields
        if (!entry.relativePath && !entry.path) continue;

        // Convert old absolute path entries to relative
        if (entry.path && !entry.relativePath) {
          // Check if it's an absolute path
          if (path.isAbsolute(entry.path)) {
            // Skip entries from different machines
            if (!entry.path.startsWith(this.rootPath)) continue;
            entry.relativePath = path.relative(this.rootPath, entry.path);
            delete entry.path;
          } else {
            // Already relative, just rename the field
            entry.relativePath = entry.path;
            delete entry.path;
          }
        }

        // Validate that the file exists and cache entry is fresh
        const absolutePath = path.join(this.rootPath, entry.relativePath);
        if (!fs.existsSync(absolutePath)) {
          continue;
        }
        if (this.isCacheEntryExpired(entry)) {
          continue;
        }
        this.persistentCache[key] = entry;
      }
    } catch (error) {
      if (error && error.code !== 'ENOENT') {
        this.persistentCache = {};
        this.logCacheWarning(`Failed to load discovery cache from ${cacheFile}`, error);
      }
    } finally {
      this.cacheLoaded = true;
    }
  }

  /**
   * Save cache to disk
   */
  async saveCache() {
    if (!this.config.discovery.cache.enabled) {
      return;
    }

    const cacheFile = path.join(this.rootPath, this.config.discovery.cache.file);

    try {
      await fsPromises.writeFile(cacheFile, JSON.stringify(this.persistentCache, null, 2), 'utf8');
    } catch (error) {
      this.logCacheWarning(`Failed to persist discovery cache to ${cacheFile}`, error);
    }
  }

  /**
   * Clear all caches
   */
  async clearCache() {
    this.discoveryCache.clear();
    this.persistentCache = {};
    moduleCache.clear();
    this.cachedModules.forEach(modulePath => {
      delete require.cache[modulePath];
    });
    this.cachedModules.clear();
    this.cacheLoaded = true;
    this.cacheLoadPromise = null;
    await this.saveCache();
  }

  /**
   * Clean up cached modules to prevent unbounded growth
   */
  cleanupCachedModules() {
    if (this.cachedModules.size > this.MAX_CACHED_MODULES) {
      // Convert to array, keep most recent half
      const moduleArray = Array.from(this.cachedModules);
      const keepCount = Math.floor(this.MAX_CACHED_MODULES / 2);
      const toRemove = moduleArray.slice(0, moduleArray.length - keepCount);

      toRemove.forEach(modulePath => {
        delete require.cache[modulePath];
        this.cachedModules.delete(modulePath);
      });
    }
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
