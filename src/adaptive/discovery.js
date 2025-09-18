/**
 * Discovery Engine - Finds test targets without hardcoded paths
 *
 * MIT License - Use this anywhere
 */

const fs = require('fs');
const path = require('path');

const MAX_SCAN_DEPTH = 10;
const DEFAULT_EXTENSIONS = ['.js', '.cjs', '.mjs', '.ts', '.tsx'];
const NEGATIVE_PATH_SCORES = [
  { keyword: '/__tests__/', score: -50 },
  { keyword: '/__mocks__/', score: -45 },
  { keyword: '/tests/', score: -40 },
  { keyword: '/mock', score: -30 },
  { keyword: '/mocks/', score: -30 },
  { keyword: '/fake', score: -25 },
  { keyword: '/stub', score: -25 },
  { keyword: '/temp/', score: -15 },
  { keyword: '/tmp/', score: -15 },
  { keyword: '/sandbox/', score: -15 },
  { keyword: '/fixture', score: -15 },
  { keyword: '/deprecated/', score: -20 },
  { keyword: '/broken', score: -60 }
];
const POSITIVE_PATH_SCORES = [
  { keyword: '/src/', score: 12 },
  { keyword: '/app/', score: 6 },
  { keyword: '/lib/', score: 4 },
  { keyword: '/core/', score: 4 }
];
const SKIP_DIRECTORIES = new Set(['node_modules', '.git', '.svn', '.hg', 'coverage', 'dist', 'build', 'scripts']);

function normalizeRoot(rootPath) {
  return path.resolve(rootPath || process.cwd());
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let tsNodeRegistered = false;

function ensureTypeScriptSupport() {
  if (tsNodeRegistered) {
    return;
  }

  try {
    require('ts-node').register({
      transpileOnly: true,
      preferTsExts: true,
      compilerOptions: {
        module: 'commonjs',
        target: 'es2020',
        moduleResolution: 'node',
        esModuleInterop: true,
        resolveJsonModule: true
      }
    });
    tsNodeRegistered = true;
  } catch (error) {
    const help = 'TypeScript support requires the optional peer dependency "ts-node". Install it or precompile your .ts files.';
    error.message = `${help}\n${error.message}`;
    throw error;
  }
}

function freshRequire(modulePath) {
  const ext = path.extname(modulePath);
  if (ext === '.ts' || ext === '.tsx') {
    ensureTypeScriptSupport();
  }
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(resolved);
}

function serializeSignatureForError(signature) {
  return {
    name: signature.name instanceof RegExp ? signature.name.toString() : signature.name || null,
    type: signature.type || null,
    exports: signature.exports || null,
    methods: signature.methods || []
  };
}

class DiscoveryEngine {
  constructor(rootPath = process.cwd(), options = {}) {
    this.rootPath = normalizeRoot(rootPath);
    this.extensions = Array.isArray(options.extensions) && options.extensions.length > 0
      ? [...new Set(options.extensions.map(ext => ext.startsWith('.') ? ext : `.${ext}`))]
      : DEFAULT_EXTENSIONS;
    this.cacheFile = path.join(this.rootPath, '.test-discovery-cache.json');
    this.cache = new Map();
    this.discoveryCache = {};
    this.cacheLoaded = false;
  }

  async discoverTarget(signatureInput) {
    const signature = this.normalizeSignature(signatureInput);
    const cacheKey = signature.cacheKey;

    if (this.cache.has(cacheKey)) {
      try {
        return this.loadModule(this.cache.get(cacheKey), signature);
      } catch (error) {
        this.cache.delete(cacheKey);
      }
    }

    if (!this.cacheLoaded) {
      this.loadCache();
    }

    if (this.discoveryCache[cacheKey]) {
      try {
        const cachedTarget = this.loadModule(this.discoveryCache[cacheKey], signature);
        this.cache.set(cacheKey, this.discoveryCache[cacheKey]);
        return cachedTarget;
      } catch (error) {
        delete this.discoveryCache[cacheKey];
        this.saveCache();
      }
    }

    const candidates = [];
    this.collectCandidates(this.rootPath, signature, candidates, 0);

    if (candidates.length === 0) {
      throw new Error(`Could not discover target matching: ${JSON.stringify(serializeSignatureForError(signature.original))}`);
    }

    candidates.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

    let bestMatch = null;
    for (const candidate of candidates) {
      const resolved = this.tryResolveCandidate(candidate, signature);
      if (resolved) {
        bestMatch = resolved;
        break;
      }
    }

    if (!bestMatch) {
      const sig = serializeSignatureForError(signature.original);
      const errorMsg = [
        `Could not discover target matching: ${JSON.stringify(sig)}`,
        '',
        'Troubleshooting tips:',
        '1. Check that the target file exists and exports the expected name',
        '2. Ensure the file is in a discoverable location (not in node_modules, tests, etc.)',
        '3. Try a simpler signature first: { name: "YourClass" }',
        '4. Clear cache if you just created the file: engine.clearCache()',
        `5. Make sure the file extension is supported: ${this.extensions.join(', ')}`,
        '',
        'See docs/COMMON_ISSUES.md for more help.'
      ].join('\n');
      throw new Error(errorMsg);
    }

    const cacheEntry = this.createCacheEntry(bestMatch);
    this.cache.set(cacheKey, cacheEntry);
    this.discoveryCache[cacheKey] = cacheEntry;
    this.saveCache();

    return bestMatch.target;
  }

  collectCandidates(dir, signature, matches, depth) {
    if (depth > MAX_SCAN_DEPTH) {
      return;
    }

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRECTORIES.has(entry.name) || entry.name.startsWith('.')) {
          continue;
        }
        this.collectCandidates(fullPath, signature, matches, depth + 1);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const ext = path.extname(entry.name);
      if (!this.extensions.includes(ext)) {
        continue;
      }

      if (ext === '.ts' && entry.name.endsWith('.d.ts')) {
        continue;
      }

      // Skip test files to avoid executing test suites during discovery
      if (entry.name.includes('.test.') || entry.name.includes('.spec.')) {
        continue;
      }

      const candidate = this.evaluateCandidate(fullPath, signature);
      if (candidate) {
        matches.push(candidate);
      }
    }
  }

  evaluateCandidate(filePath, signature) {
    const fileName = path.basename(filePath, '.js');
    const fileContent = this.safeReadFile(filePath);
    if (fileContent == null) {
      return null;
    }

    if (!this.quickNameCheck(fileName, fileContent, signature)) {
      return null;
    }

    const score =
      this.scoreFileName(fileName, signature) +
      this.scoreExtension(filePath) +
      this.scorePath(filePath) +
      this.scoreNameMentions(fileContent, signature) +
      this.scoreExportHints(fileContent, signature) +
      this.scoreTypeHints(fileContent, signature) +
      this.scoreMethodMentions(fileContent, signature.methods);

    return {
      path: filePath,
      fileName,
      score
    };
  }

  tryResolveCandidate(candidate, signature) {
    let moduleExports;
    try {
      moduleExports = freshRequire(candidate.path);
    } catch (error) {
      return null;
    }

    const match = this.resolveTargetFromModule(moduleExports, signature, candidate.fileName);
    if (!match) {
      return null;
    }

    if (!this.validateType(match.target, signature.type)) {
      return null;
    }

    const methodScore = this.validateMethods(match.target, signature.methods);
    if (methodScore == null) {
      return null;
    }

    const finalScore =
      candidate.score +
      match.baseScore +
      this.scoreTargetName(match.targetName, signature) +
      methodScore;

    return {
      path: candidate.path,
      access: match.access,
      target: match.target,
      targetName: match.targetName,
      score: finalScore
    };
  }

  quickNameCheck(fileName, content, signature) {
    if (!signature.name && !signature.exports) {
      return true;
    }

    if (signature.name) {
      if (this.nameMatches(signature, fileName)) {
        return true;
      }

      const nameRegex = signature.name instanceof RegExp
        ? signature.name
        : new RegExp(`\\b${escapeRegExp(signature.name)}\\b`);

      if (nameRegex.test(content)) {
        return true;
      }
    }

    if (signature.exports) {
      const exportRegex = new RegExp(`\\b${escapeRegExp(signature.exports)}\\b`);
      if (exportRegex.test(content)) {
        return true;
      }
    }

    return false;
  }

  resolveTargetFromModule(moduleExports, signature, fileName) {
    const candidates = [];

    const addCandidate = (target, access, baseScore = 0) => {
      if (!target) {
        return;
      }

      const exportName = access && access.name ? access.name : null;
      const targetName = this.getTargetName(target);
      const matchesExport = !signature.exports || this.exportMatches(signature.exports, access, targetName);
      if (!matchesExport) {
        return;
      }

      const matchesName = !signature.name || this.matchesAnyName(signature, exportName, targetName, fileName);
      if (!matchesName) {
        return;
      }

      candidates.push({ target, access, baseScore, targetName });
    };

    if (typeof moduleExports === 'function') {
      addCandidate(moduleExports, { type: 'direct' }, 30);
    }

    if (moduleExports && typeof moduleExports === 'object') {
      if ('default' in moduleExports && moduleExports.default) {
        addCandidate(moduleExports.default, { type: 'default' }, 22);
      }

      for (const key of Object.keys(moduleExports)) {
        if (key === 'default') continue;
        addCandidate(moduleExports[key], { type: 'named', name: key }, key === signature.exports ? 28 : 15);
      }

      if (!signature.type || signature.type === 'module') {
        addCandidate(moduleExports, { type: 'module' }, 10);
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => b.baseScore - a.baseScore);
    return candidates[0];
  }

  loadModule(entry, signature) {
    const normalized = this.normalizeCacheEntry(entry);
    if (!normalized) {
      throw new Error('Invalid cache entry');
    }

    let moduleExports;
    try {
      moduleExports = freshRequire(normalized.path);
    } catch (error) {
      throw new Error('Cached discovery target no longer exists');
    }

    const target = this.applyAccess(moduleExports, normalized.access);
    if (!target) {
      throw new Error('Cached discovery target no longer exports the requested symbol');
    }

    if (!this.validateType(target, signature.type)) {
      throw new Error('Cached discovery target no longer matches requested type');
    }

    if (this.validateMethods(target, signature.methods) == null) {
      throw new Error('Cached discovery target no longer exposes required methods');
    }

    if (!this.matchesAnyName(signature, normalized.access.name, this.getTargetName(target), path.basename(normalized.path, '.js'))) {
      throw new Error('Cached discovery target no longer matches requested name');
    }

    return target;
  }

  normalizeCacheEntry(entry) {
    if (!entry) return null;

    if (typeof entry === 'string') {
      return { path: entry, access: { type: 'direct' } };
    }

    if (entry.path) {
      const access = entry.access && entry.access.type ? entry.access : { type: 'direct' };
      return { path: entry.path, access };
    }

    return null;
  }

  applyAccess(moduleExports, access) {
    if (!access || access.type === 'direct') {
      return moduleExports;
    }

    if (access.type === 'default') {
      return moduleExports && moduleExports.default;
    }

    if (access.type === 'named') {
      return moduleExports && moduleExports[access.name];
    }

    if (access.type === 'module') {
      return moduleExports;
    }

    return moduleExports;
  }

  createCacheEntry(candidate) {
    return {
      path: candidate.path,
      access: candidate.access
    };
  }

  loadCache() {
    if (this.cacheLoaded) {
      return;
    }

    try {
      const raw = fs.readFileSync(this.cacheFile, 'utf8');
      const parsed = JSON.parse(raw);
      this.discoveryCache = {};
      for (const [key, value] of Object.entries(parsed || {})) {
        this.discoveryCache[key] = this.normalizeCacheEntry(value);
      }
    } catch (error) {
      this.discoveryCache = {};
    }

    this.cacheLoaded = true;
  }

  saveCache() {
    if (!this.cacheLoaded) {
      return;
    }

    try {
      const serializable = {};
      for (const [key, value] of Object.entries(this.discoveryCache)) {
        serializable[key] = value;
      }
      fs.writeFileSync(this.cacheFile, JSON.stringify(serializable, null, 2));
    } catch (error) {
      // Caching is a convenience - ignore write failures
    }
  }

  clearCache() {
    this.cache.clear();
    this.discoveryCache = {};
    this.cacheLoaded = true;
    try {
      fs.unlinkSync(this.cacheFile);
    } catch (error) {
      // File may not exist - ignore
    }
  }

  safeReadFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      return null;
    }
  }

  normalizeSignature(signature) {
    if (!signature || typeof signature !== 'object') {
      throw new Error(
        'discoverTarget requires a signature object.\n' +
        'Example: { name: "Calculator", type: "class" }\n' +
        'See docs/QUICK_START.md for examples.'
      );
    }

    const normalized = { ...signature };
    normalized.original = { ...signature };
    normalized.methods = Array.isArray(signature.methods)
      ? Array.from(new Set(signature.methods.map(method => String(method)))).sort()
      : [];

    normalized.cacheKey = JSON.stringify({
      name: signature.name instanceof RegExp ? signature.name.toString() : signature.name || null,
      type: signature.type || null,
      exports: signature.exports || null,
      methods: normalized.methods
    });

    normalized.nameMatcher = this.createNameMatcher(signature.name);

    return normalized;
  }

  createNameMatcher(name) {
    if (!name) {
      return () => true;
    }

    if (name instanceof RegExp) {
      return value => typeof value === 'string' && name.test(value);
    }

    const expected = String(name);
    const regex = new RegExp(`^${escapeRegExp(expected)}$`, 'i');
    return value => typeof value === 'string' && regex.test(value);
  }

  nameMatches(signature, value) {
    return signature.nameMatcher(value);
  }

  matchesAnyName(signature, exportName, targetName, fileName) {
    if (!signature.name) {
      return true;
    }

    return (
      this.nameMatches(signature, exportName) ||
      this.nameMatches(signature, targetName) ||
      this.nameMatches(signature, fileName)
    );
  }

  exportMatches(expectedExport, access, targetName) {
    if (!expectedExport) {
      return true;
    }

    if (access && access.type === 'named') {
      return access.name === expectedExport;
    }

    if (targetName) {
      return this.createNameMatcher(expectedExport)(targetName);
    }

    return false;
  }

  getTargetName(target) {
    if (!target) {
      return null;
    }

    if (typeof target === 'function' && target.name) {
      return target.name;
    }

    if (typeof target === 'object' && target.constructor && target.constructor.name) {
      return target.constructor.name;
    }

    return null;
  }

  validateType(target, expectedType) {
    if (!expectedType) {
      return true;
    }

    if (expectedType === 'class') {
      return typeof target === 'function' && target.prototype;
    }

    if (expectedType === 'function') {
      return typeof target === 'function';
    }

    if (expectedType === 'module') {
      return target && typeof target === 'object';
    }

    return true;
  }

  validateMethods(target, methods) {
    if (!methods || methods.length === 0) {
      return 0;
    }

    const host = typeof target === 'function' && target.prototype
      ? target.prototype
      : target;

    if (!host || typeof host !== 'object') {
      return null;
    }

    for (const method of methods) {
      if (typeof host[method] !== 'function') {
        return null;
      }
    }

    return methods.length * 5;
  }

  scoreNameMentions(content, signature) {
    if (!signature.name) {
      return 0;
    }

    const regex = signature.name instanceof RegExp
      ? new RegExp(signature.name.source, signature.name.flags.includes('g') ? signature.name.flags : `${signature.name.flags}g`)
      : new RegExp(`\\b${escapeRegExp(signature.name)}\\b`, 'gi');

    const matches = content.match(regex);
    if (!matches) {
      return 0;
    }

    return Math.min(matches.length, 5) * 4;
  }

  scoreExportHints(content, signature) {
    if (!signature.exports) {
      return 0;
    }

    const exportName = signature.exports;
    const patterns = [
      new RegExp(`module\\.exports\\s*=\\s*${escapeRegExp(exportName)}`),
      new RegExp(`module\\.exports\\.${escapeRegExp(exportName)}\\s*=`),
      new RegExp(`exports\\.${escapeRegExp(exportName)}\\s*=`),
      new RegExp(`export\\s+(?:default\\s+)?class\\s+${escapeRegExp(exportName)}`),
      new RegExp(`export\\s+(?:default\\s+)?function\\s+${escapeRegExp(exportName)}`),
      new RegExp(`export\\s*{[^}]*${escapeRegExp(exportName)}[^}]*}`)
    ];

    return patterns.some(pattern => pattern.test(content)) ? 30 : 0;
  }

  scoreTypeHints(content, signature) {
    if (!signature.type) {
      return 0;
    }

    if (signature.type === 'class') {
      return /class\s+\w+/.test(content) ? 15 : 0;
    }

    if (signature.type === 'function') {
      const fnDeclaration = /\bfunction\s+[\w$]+\s*\(/.test(content);
      const arrow = /\b(?:const|let|var)\s+[\w$]+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/.test(content);
      return fnDeclaration || arrow ? 12 : 0;
    }

    if (signature.type === 'module') {
      return /module\.exports|export\s+/.test(content) ? 10 : 0;
    }

    return 0;
  }

  scoreMethodMentions(content, methods) {
    if (!methods || methods.length === 0) {
      return 0;
    }

    let score = 0;
    for (const method of methods) {
      const regex = new RegExp(`\\b${escapeRegExp(method)}\\s*\\(`);
      if (regex.test(content)) {
        score += 3;
      }
    }

    return score;
  }

  scoreExtension(filePath) {
    const ext = path.extname(filePath);
    if (ext === '.ts' || ext === '.tsx') {
      return 18;
    }
    if (ext === '.mjs') {
      return 6;
    }
    if (ext === '.cjs') {
      return 4;
    }
    return 0;
  }

  scoreFileName(fileName, signature) {
    if (!signature.name) {
      return 0;
    }

    if (signature.name instanceof RegExp) {
      return signature.name.test(fileName) ? 12 : 0;
    }

    const expected = String(signature.name);
    if (fileName === expected) {
      return 45;
    }
    if (fileName.toLowerCase() === expected.toLowerCase()) {
      return 30;
    }
    if (fileName.toLowerCase().includes(expected.toLowerCase())) {
      return 8;
    }

    return 0;
  }

  scoreTargetName(targetName, signature) {
    if (!signature.name || !targetName) {
      return 0;
    }

    return this.nameMatches(signature, targetName) ? 35 : 0;
  }

  scorePath(filePath) {
    const normalized = filePath.split(path.sep).join('/').toLowerCase();
    let score = 0;

    for (const { keyword, score: value } of POSITIVE_PATH_SCORES) {
      if (normalized.includes(keyword)) {
        score += value;
      }
    }

    for (const { keyword, score: value } of NEGATIVE_PATH_SCORES) {
      if (normalized.includes(keyword)) {
        score += value;
      }
    }

    return score;
  }
}

const enginesByRoot = new Map();

function getDiscoveryEngine(rootPath = process.cwd()) {
  const normalizedRoot = normalizeRoot(rootPath);
  if (!enginesByRoot.has(normalizedRoot)) {
    enginesByRoot.set(normalizedRoot, new DiscoveryEngine(normalizedRoot));
  }
  return enginesByRoot.get(normalizedRoot);
}

module.exports = { DiscoveryEngine, getDiscoveryEngine };
