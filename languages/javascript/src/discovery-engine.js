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
const path = require('path');
const Module = require('module');
const { ConfigLoader } = require('./config-loader');
const { analyzeModuleExports: parseModuleExports } = require('./parser');
const { ScoringEngine } = require('./scoring-engine');
const { createTsconfigResolver } = require('./tsconfig-resolver');
const { AsyncOperationManager } = require('./async-utils');
const { FileSystemScanner } = require('./file-system-scanner');
const { CandidateEvaluator } = require('./candidate-evaluator');
const { ResultAssembler } = require('./result-assembler');

/**
 * @typedef {'class' | 'function' | 'object' | 'module'} TargetType
 *
 * @typedef {Object} DiscoverySignature
 * @property {string | RegExp} [name]
 * @property {TargetType} [type]
 * @property {string} [exports]
 * @property {string[]} [methods]
 * @property {string[]} [properties]
 * @property {string | Function} [extends]
 * @property {string | Function} [instanceof]
 * @property {string} [language]
 */

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
    const scoringConfig = this.config.discovery?.scoring || {};
    this.allowLooseNameMatch = scoringConfig.allowLooseNameMatch !== false;
    const defaultPenalty = -25;
    const rawPenalty = typeof scoringConfig.looseNamePenalty === 'number'
      ? scoringConfig.looseNamePenalty
      : defaultPenalty;
    this.looseNamePenalty = rawPenalty > 0 ? -Math.abs(rawPenalty) : rawPenalty;

    // Optional TypeScript path resolver
    this.tsconfigResolver = createTsconfigResolver(this.rootPath);

    const cacheConfig = this.config.discovery.cache || {};

    // Runtime caches with size limits
    this.discoveryCache = new LRUCache(200); // Limit discovery cache
    this.persistentCache = {};
    this.cachedModules = new Set();
    this.moduleVersions = new LRUCache(50); // Limit version cache
    this.MAX_CACHED_MODULES = 100; // Limit cached module paths

    // Async operation manager for consistent patterns

    // EXPERIMENTAL: Pattern learning system (opt-in only)
    this.experimentalFeatures = {};
    if (config.experimental?.patternLearning) {
      try {
        const { FeedbackCollector } = require('./experimental/pattern-learner');
        this.experimentalFeatures.feedbackCollector = new FeedbackCollector(this.rootPath);
        console.debug('[Discovery Engine] Experimental pattern learning enabled');
      } catch (error) {
        console.warn('[Discovery Engine] Failed to load experimental features:', error.message);
      }
    }
    this.asyncManager = new AsyncOperationManager({
      timeout: this.config.discovery?.timeout || 15000,
      retries: this.config.discovery?.retries || 1
    });

    // Normalize concurrency for candidate collection
    const normalizedConcurrency = this.normalizeConcurrency(this.config.discovery?.concurrency);
    this.config.discovery.concurrency = normalizedConcurrency;
    this.maxConcurrency = normalizedConcurrency;

    this.candidateEvaluator = new CandidateEvaluator({
      rootPath: this.rootPath,
      config: this.config,
      scoringEngine: this.scoringEngine,
      tsconfigResolver: this.tsconfigResolver,
      allowLooseNameMatch: this.allowLooseNameMatch,
      looseNamePenalty: this.looseNamePenalty,
      analyzeModuleExports: this.analyzeModuleExports.bind(this),
      calculateRecencyBonus: this.calculateRecencyBonus.bind(this),
      experimentalFeatures: this.experimentalFeatures
    });

    this.resultAssembler = new ResultAssembler({
      rootPath: this.rootPath,
      candidateEvaluator: this.candidateEvaluator,
      moduleVersions: this.moduleVersions,
      cachedModules: this.cachedModules,
      cleanupCachedModules: this.cleanupCachedModules.bind(this),
      ensureTypeScriptSupport: this.ensureTypeScriptSupport.bind(this),
      runtimeCache: this.discoveryCache,
      persistentCache: this.persistentCache,
      cacheConfig: {
        enabled: cacheConfig.enabled !== false,
        file: cacheConfig.file || '.adaptive-tests-cache.json',
        logWarnings: Boolean(cacheConfig.logWarnings),
        ttl: cacheConfig.ttl,
        ttlMs: cacheConfig.ttlMs
      }
    });

    this.fileSystemScanner = new FileSystemScanner({
      rootPath: this.rootPath,
      extensions: this.config.discovery.extensions,
      maxDepth: this.config.discovery.maxDepth,
      maxConcurrency: this.maxConcurrency,
      minCandidateScore: this.config.discovery?.scoring?.minCandidateScore ?? 0,
      evaluateCandidate: this.candidateEvaluator.evaluateCandidate.bind(this.candidateEvaluator),
      shouldSkipDirectory: this.shouldSkipDirectory.bind(this)
    });

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
    if (!this.resultAssembler) {
      return;
    }
    await this.resultAssembler.ensureCacheLoaded();
  }

  /**
   * Discover a target module/class/function
   * @template T
   * @param {DiscoverySignature} signature
   * @returns {Promise<T>}
   */
  async discoverTarget(signature) {
    // Normalize and validate signature
    const normalizedSig = this.normalizeSignature(signature);
    const cacheKey = this.resultAssembler.getCacheKey(normalizedSig);

    // Detect caller's file extension from stack
    const callerExtension = this.detectCallerExtension();

    await this.ensureCacheLoaded();

    const cachedTarget = await this.resultAssembler.tryGetCachedTarget(cacheKey, normalizedSig);
    if (cachedTarget) {
      return cachedTarget;
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

    // Group candidates by score for parallel processing within score groups
    const candidatesByScore = new Map();
    for (const candidate of candidates) {
      if (!candidatesByScore.has(candidate.score)) {
        candidatesByScore.set(candidate.score, []);
      }
      candidatesByScore.get(candidate.score).push(candidate);
    }

    // Sort scores in descending order
    const scores = Array.from(candidatesByScore.keys()).sort((a, b) => b - a);

    // Process each score group in order, but candidates within a group in parallel
    for (const score of scores) {
      const candidatesAtScore = candidatesByScore.get(score);

      // Process candidates at this score level in parallel (max 5 concurrent)
      const batchSize = Math.min(5, candidatesAtScore.length);
      const resolvePromises = candidatesAtScore.slice(0, batchSize).map(candidate =>
        this.tryResolveCandidate(candidate, normalizedSig)
          .then(resolved => resolved ? { candidate, resolved } : null)
          .catch(() => null) // Don't let one failure stop others
      );

      const results = await Promise.all(resolvePromises);

      // Find first successful resolution
      const successfulResult = results.find(result => result !== null);

      if (successfulResult) {
        const { candidate, resolved } = successfulResult;

        await this.resultAssembler.storeResolution(cacheKey, candidate, resolved);

        // EXPERIMENTAL: Record discovery for pattern learning
        if (this.experimentalFeatures?.feedbackCollector) {
          // Fire and forget - don't block discovery
          this.experimentalFeatures.feedbackCollector
            .recordDiscovery(normalizedSig, candidate, candidates)
            .catch(error => {
              console.debug('[Pattern Learning] Failed to record discovery:', error.message);
            });
        }

        return resolved.target;
      }
    }

    throw this.createDiscoveryError(normalizedSig, candidates);
  }

  /**
   * Collect all candidates matching the signature
   * @param {string} dir
   * @param {DiscoverySignature} signature
   * @param {number} [depth]
   * @param {Array} [candidates]
   */
  async collectCandidates(dir, signature, depth = 0, candidates = []) {
    if (!this.fileSystemScanner) {
      throw new Error('FileSystemScanner is not initialized');
    }

    // Keep scanner options in sync with runtime configuration
    this.fileSystemScanner.maxConcurrency = this.maxConcurrency;
    this.fileSystemScanner.minCandidateScore = this.config.discovery?.scoring?.minCandidateScore ?? 0;
    this.fileSystemScanner.extensions = Array.isArray(this.config.discovery.extensions)
      ? this.config.discovery.extensions
      : [];
    this.fileSystemScanner.maxDepth = Number.isFinite(this.config.discovery.maxDepth)
      ? this.config.discovery.maxDepth
      : Infinity;

    return this.fileSystemScanner.collect({
      dir,
      signature,
      depth,
      candidates
    });
  }

  normalizeConcurrency(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return 8;
    }
    return Math.floor(parsed);
  }

  /**
   * Evaluate a file as a potential candidate
   * @param {string} filePath
   * @param {DiscoverySignature} signature
   */
  async evaluateCandidate(filePath, signature) {
    return this.candidateEvaluator.evaluateCandidate(filePath, signature);
  }

  isCandidateSafe(candidate) {
    return this.candidateEvaluator.isCandidateSafe(candidate);
  }

  selectExportFromMetadata(candidate, signature) {
    return this.candidateEvaluator.selectExportFromMetadata(candidate, signature);
  }

  matchesSignatureMetadata(entry, signature) {
    return this.candidateEvaluator.matchesSignatureMetadata(entry, signature);
  }

  extractExportByAccess(moduleExports, access) {
    return this.candidateEvaluator.extractExportByAccess(moduleExports, access);
  }

  tokenizeName(name) {
    return this.candidateEvaluator.tokenizeName(name);
  }

  quickNameCheck(fileName, signature) {
    return this.candidateEvaluator.quickNameCheck(fileName, signature);
  }

  /**
   * Try to resolve a candidate by loading and validating it
   * @param {{ path: string, score: number, metadata?: any }} candidate
   * @param {DiscoverySignature} signature
   */
  async tryResolveCandidate(candidate, signature) {
    return this.resultAssembler.resolveCandidate(candidate, signature);
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
   * @param {any} moduleExports
   * @param {DiscoverySignature} signature
   * @param {{ path: string }} candidate
   */
  resolveTargetFromModule(moduleExports, signature, candidate) {
    return this.candidateEvaluator.resolveTargetFromModule(moduleExports, signature, candidate);
  }

  /**
   * Validate that a target matches the signature requirements
   * @param {any} target
   * @param {DiscoverySignature} signature
   */
  validateTarget(target, signature) {
    return this.candidateEvaluator.validateTarget(target, signature);
  }

  /**
   * Validate type
   */
  validateType(target, expectedType) {
    return this.candidateEvaluator.validateType(target, expectedType);
  }

  /**
   * Validate name
   */
  validateName(targetName, expectedName) {
    return this.candidateEvaluator.validateName(targetName, expectedName);
  }

  /**
   * Validate methods exist
   */
  validateMethods(target, methods) {
    return this.candidateEvaluator.validateMethods(target, methods);
  }

  /**
   * Validate properties exist (NEW!)
   */
  validateProperties(target, properties) {
    return this.candidateEvaluator.validateProperties(target, properties);
  }

  /**
   * Validate inheritance chain (NEW!)
   */
  validateInheritance(target, baseClass) {
    return this.candidateEvaluator.validateInheritance(target, baseClass);
  }

  /**
   * Validate instanceof (NEW!)
   */
  validateInstanceOf(target, expectedClass) {
    return this.candidateEvaluator.validateInstanceOf(target, expectedClass);
  }

  /**
   * Get target name
   */
  getTargetName(target) {
    return this.candidateEvaluator.getTargetName(target);
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
   * @param {DiscoverySignature} signature
   * @returns {DiscoverySignature}
   */
  normalizeSignature(signature) {
    if (!signature || typeof signature !== 'object') {
      throw new Error(
        'discoverTarget requires a signature object.\n' +
        'Example: { name: "Calculator", type: "class" }\n' +
        'See QUICKSTART.md for examples.'
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

  getCacheKey(signature) {
    return this.resultAssembler.getCacheKey(signature);
  }

  serializeCacheValue(value) {
    return this.resultAssembler.serializeCacheValue(value);
  }

  logCacheWarning(message, error) {
    if (!this.resultAssembler) {
      return;
    }
    this.resultAssembler.logCacheWarning(message, error);
  }

  isCacheEntryExpired(entry) {
    if (!this.resultAssembler) {
      return true;
    }
    return this.resultAssembler.isCacheEntryExpired(entry);
  }

  async loadCache() {
    if (!this.resultAssembler) {
      return;
    }
    await this.resultAssembler.ensureCacheLoaded();
  }

  async saveCache() {
    if (!this.resultAssembler) {
      return;
    }
    await this.resultAssembler.saveCacheToDisk();
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
   * @param {{ path: string }} cacheEntry
   * @param {DiscoverySignature} signature
   */
  loadModule(cacheEntry, signature) {
    return this.resultAssembler.loadModule(cacheEntry, signature);
  }

  /**
   * Create discovery error with helpful message
   * @param {DiscoverySignature} signature
   * @param {Array} [candidates]
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

  analyzeModuleExports(content, fileName) {
    return parseModuleExports(content, fileName);
  }

  /**
   * Clear all caches
   */
  async clearCache() {
    if (this.resultAssembler) {
      await this.resultAssembler.clearCaches();
    } else if (this.discoveryCache && typeof this.discoveryCache.clear === 'function') {
      this.discoveryCache.clear();
    }

    moduleCache.clear();
    this.cachedModules.forEach(modulePath => {
      delete require.cache[modulePath];
    });
    this.cachedModules.clear();
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
