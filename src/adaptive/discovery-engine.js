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
const parser = require('@babel/parser');
const { ScoringEngine } = require('./scoring-engine');
const { createTsconfigResolver } = require('./tsconfig-resolver');

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

    // Optional TypeScript path resolver
    this.tsconfigResolver = createTsconfigResolver(this.rootPath);

    // Runtime caches
    this.discoveryCache = new Map();
    this.persistentCache = {};
    this.cacheLoaded = false;
    this.cacheLoadPromise = null;
    this.cachedModules = new Set();
    this.moduleVersions = new Map();
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

    await this.ensureCacheLoaded();

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
    const candidates = await this.collectCandidates(this.rootPath, normalizedSig);

    if (candidates.length === 0) {
      throw this.createDiscoveryError(normalizedSig);
    }

    // Sort by score
    candidates.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

    // Try to resolve candidates in order
    for (const candidate of candidates) {
      const resolved = await this.tryResolveCandidate(candidate, normalizedSig);
      if (resolved) {
        // Cache the result
        const cacheEntry = {
          path: candidate.path,
          access: resolved.access,
          score: candidate.score,
          timestamp: Date.now(),
          mtimeMs: candidate.mtimeMs ?? null,
          target: resolved.target
        };

        this.discoveryCache.set(cacheKey, cacheEntry);

        this.persistentCache[cacheKey] = {
          path: candidate.path,
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

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (this.shouldSkipDirectory(entry.name)) {
          continue;
        }
        await this.collectCandidates(fullPath, signature, depth + 1, candidates);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const ext = path.extname(entry.name);
      if (!this.config.discovery.extensions.includes(ext)) {
        continue;
      }

      if (entry.name.includes('.test.') || entry.name.includes('.spec.')) {
        continue;
      }

      if (entry.name.endsWith('.d.ts')) {
        continue;
      }

      const candidate = await this.evaluateCandidate(fullPath, signature);
      const minScore = this.config.discovery.scoring.minCandidateScore ?? 0;
      if (candidate && candidate.score > minScore) {
        candidates.push(candidate);
      }
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
      if (candidate.content && candidate.content.includes(token)) {
        return false;
      }
    }

    return true;
  }

  analyzeModuleExports(content, fileName) {
    let ast;
    try {
      ast = parser.parse(content, {
        sourceType: 'unambiguous',
        plugins: [
          'jsx',
          'classProperties',
          'classPrivateProperties',
          'classPrivateMethods',
          'decorators-legacy',
          'dynamicImport',
          'optionalChaining',
          'nullishCoalescingOperator',
          'objectRestSpread',
          'topLevelAwait',
          'typescript'
        ]
      });
    } catch (error) {
      return null;
    }

    const locals = new Map();
    const register = (name, info) => {
      if (!name || !info) return;
      locals.set(name, info);
    };

    const body = ast.program.body || [];

    for (const node of body) {
      switch (node.type) {
        case 'ClassDeclaration':
          register(node.id && node.id.name, this.extractClassInfo(node, node.id && node.id.name));
          break;
        case 'FunctionDeclaration':
          register(node.id && node.id.name, this.extractFunctionInfo(node, node.id && node.id.name));
          break;
        case 'VariableDeclaration':
          for (const declarator of node.declarations || []) {
            if (declarator.id && declarator.id.type === 'Identifier') {
              const info = this.extractValueInfo(declarator.init, declarator.id.name);
              if (info) {
                register(declarator.id.name, info);
              }
            }
          }
          break;
        default:
          break;
      }
    }

    const exports = [];
    const addExport = (exportedName, accessType, info, fallbackName) => {
      let exportInfo = info;
      if (!exportInfo && exportedName && locals.has(exportedName)) {
        exportInfo = locals.get(exportedName);
      }
      if (!exportInfo && fallbackName && locals.has(fallbackName)) {
        exportInfo = locals.get(fallbackName);
      }
      if (!exportInfo) {
        exportInfo = this.makeUnknownInfo(exportedName || fallbackName || fileName);
      }
      exports.push({
        exportedName: exportedName || null,
        access: { type: accessType, name: exportedName || fallbackName || null },
        info: this.normalizeExportInfo(exportInfo)
      });
    };

    const handleModuleExports = (right) => {
      if (!right) return;
      if (right.type === 'Identifier') {
        addExport('default', 'direct', locals.get(right.name), right.name);
        return;
      }

      if (right.type === 'ClassExpression') {
        addExport('default', 'direct', this.extractClassInfo(right, fileName));
        return;
      }

      if (right.type === 'FunctionExpression' || right.type === 'ArrowFunctionExpression') {
        addExport('default', 'direct', this.extractFunctionInfo(right, fileName));
        return;
      }

      if (right.type === 'ObjectExpression') {
        for (const prop of right.properties || []) {
          if (prop.type !== 'ObjectProperty' && prop.type !== 'ObjectMethod') continue;
          const keyName = this.getMemberName(prop.key);
          if (!keyName) continue;
          const valueNode = prop.type === 'ObjectMethod'
            ? { type: 'FunctionExpression', id: null, params: prop.params, body: prop.body }
            : prop.value;
          const info = this.extractValueInfo(valueNode, keyName);
          addExport(keyName, 'named', info, keyName);
        }
        return;
      }

      addExport('default', 'direct', this.extractValueInfo(right, fileName), fileName);
    };

    const handleExportsMember = (name, value) => {
      const info = this.extractValueInfo(value, name);
      addExport(name, 'named', info, name);
    };

    for (const node of body) {
      switch (node.type) {
        case 'ExportDefaultDeclaration': {
          const info = this.extractValueInfo(node.declaration, 'default');
          exports.push({
            exportedName: 'default',
            access: { type: 'default', name: null },
            info: this.normalizeExportInfo(info || this.makeUnknownInfo('default'))
          });
          break;
        }
        case 'ExportNamedDeclaration': {
          if (node.declaration) {
            const info = this.extractValueInfo(node.declaration, node.declaration.id && node.declaration.id.name);
            const exportedName = (node.declaration.id && node.declaration.id.name) || (info && info.name) || null;
            addExport(exportedName, 'named', info, exportedName);
          }
          if (node.specifiers && node.specifiers.length > 0 && !node.source) {
            for (const spec of node.specifiers) {
              const exportedName = this.getSpecifierName(spec.exported);
              const localName = this.getSpecifierName(spec.local);
              addExport(exportedName, 'named', locals.get(localName), localName);
            }
          }
          break;
        }
        case 'ExpressionStatement': {
          const expr = node.expression;
          if (expr.type === 'AssignmentExpression') {
            const left = expr.left;
            if (this.isModuleExports(left)) {
              handleModuleExports(expr.right);
            } else if (this.isExportsMember(left)) {
              const name = this.getMemberName(left.property);
              if (name) {
                handleExportsMember(name, expr.right);
              }
            } else if (left.type === 'MemberExpression' && left.object && this.isModuleExports(left.object)) {
              const name = this.getMemberName(left.property);
              if (name) {
                handleExportsMember(name, expr.right);
              }
            }
          }
          break;
        }
        default:
          break;
      }
    }

    return { exports };
  }

  normalizeExportInfo(info) {
    if (!info) {
      return this.makeUnknownInfo(null);
    }
    const methods = Array.from(info.methods || []);
    const properties = Array.from(info.properties || []);
    return {
      kind: info.kind || 'unknown',
      name: info.name || null,
      methods,
      properties,
      extends: info.extends || null
    };
  }

  makeUnknownInfo(name) {
    return {
      kind: 'unknown',
      name: name || null,
      methods: [],
      properties: [],
      extends: null
    };
  }

  extractClassInfo(node, fallbackName) {
    const name = (node.id && node.id.name) || fallbackName || null;
    const methods = new Set();
    const properties = new Set();
    let extendsName = null;

    if (node.superClass) {
      extendsName = this.resolveExpressionName(node.superClass);
    }

    const bodyElements = node.body && node.body.body ? node.body.body : [];
    for (const element of bodyElements) {
      if (element.type === 'ClassMethod') {
        if (element.kind === 'method' && !element.static) {
          const methodName = this.getMemberName(element.key);
          if (methodName) {
            methods.add(methodName);
          }
        }
        if (element.kind === 'constructor' && element.body && element.body.body) {
          for (const stmt of element.body.body) {
            if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'AssignmentExpression') {
              const assignment = stmt.expression;
              if (assignment.left.type === 'MemberExpression' && assignment.left.object.type === 'ThisExpression') {
                const propName = this.getMemberName(assignment.left.property);
                if (propName) {
                  properties.add(propName);
                }
              }
            }
          }
        }
      } else if (element.type === 'ClassProperty' && !element.static) {
        const propName = this.getMemberName(element.key);
        if (propName) {
          properties.add(propName);
        }
      }
    }

    return {
      kind: 'class',
      name,
      methods,
      properties,
      extends: extendsName
    };
  }

  extractFunctionInfo(node, fallbackName) {
    const name = (node.id && node.id.name) || fallbackName || null;
    return {
      kind: 'function',
      name,
      methods: new Set(),
      properties: new Set(),
      extends: null
    };
  }

  extractValueInfo(node, fallbackName) {
    if (!node) {
      return null;
    }
    switch (node.type) {
      case 'ClassDeclaration':
      case 'ClassExpression':
        return this.extractClassInfo(node, fallbackName);
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        return this.extractFunctionInfo(node, fallbackName);
      case 'Identifier':
        return null;
      case 'ObjectExpression':
        return {
          kind: 'object',
          name: fallbackName || null,
          methods: new Set(),
          properties: new Set(),
          extends: null
        };
      default:
        return this.makeUnknownInfo(fallbackName);
    }
  }

  isModuleExports(node) {
    return node && node.type === 'MemberExpression' &&
      !node.computed &&
      node.object && node.object.type === 'Identifier' &&
      node.object.name === 'module' &&
      node.property && node.property.type === 'Identifier' &&
      node.property.name === 'exports';
  }

  isExportsMember(node) {
    return node && node.type === 'MemberExpression' &&
      node.object && node.object.type === 'Identifier' &&
      node.object.name === 'exports';
  }

  getMemberName(node) {
    if (!node) return null;
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'StringLiteral') {
      return node.value;
    }
    return null;
  }

  getSpecifierName(node) {
    if (!node) return null;
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'StringLiteral') {
      return node.value;
    }
    return null;
  }

  resolveExpressionName(node) {
    if (!node) return null;
    if (node.type === 'Identifier') {
      return node.name;
    }
    if (node.type === 'StringLiteral') {
      return node.value;
    }
    if (node.type === 'MemberExpression' && node.property) {
      return this.getMemberName(node.property);
    }
    return null;
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
        if (tokens.some(token => content.includes(token))) {
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
        if (hasChanged) {
          delete require.cache[resolvedPath];
        }
        const moduleExports = require(candidate.path);
        if (mtimeMs !== null) {
          this.moduleVersions.set(resolvedPath, mtimeMs);
        } else {
          this.moduleVersions.delete(resolvedPath);
        }
        this.cachedModules.add(resolvedPath);

        if (metadataMatch) {
          const target = this.extractExportByAccess(moduleExports, metadataMatch.access);
          if (target && this.validateTarget(target, signature)) {
            return { target, access: metadataMatch.access };
          }
        }

        return this.resolveTargetFromModule(moduleExports, signature, candidate);
      }

      let moduleExports;

      if (hasChanged && !initialLoad) {
        moduleExports = this.compileFreshModule(candidate.path);
        const cached = require.cache[resolvedPath];
        if (cached) {
          cached.exports = moduleExports;
        } else {
          const synthetic = new Module(resolvedPath, module.parent);
          synthetic.filename = resolvedPath;
          synthetic.exports = moduleExports;
          synthetic.paths = Module._nodeModulePaths(path.dirname(resolvedPath));
          require.cache[resolvedPath] = synthetic;
        }
      } else {
        moduleExports = require(candidate.path);
      }

      if (mtimeMs !== null) {
        this.moduleVersions.set(resolvedPath, mtimeMs);
      } else {
        this.moduleVersions.delete(resolvedPath);
      }

      this.cachedModules.add(resolvedPath);

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

    if (cacheEntry.target) {
      return cacheEntry.target;
    }

    if (cacheEntry.mtimeMs) {
      try {
        const stats = fs.statSync(cacheEntry.path);
        if (stats.mtimeMs !== cacheEntry.mtimeMs) {
          throw new Error('Cached entry out of date');
        }
      } catch (error) {
        throw new Error('Cached entry out of date');
      }
    }

    if (!moduleCache.has(resolvedPath)) {
      delete require.cache[resolvedPath];
    }

    const moduleExports = require(cacheEntry.path);
    this.cachedModules.add(resolvedPath);
    if (cacheEntry.mtimeMs !== null && cacheEntry.mtimeMs !== undefined) {
      this.moduleVersions.set(resolvedPath, cacheEntry.mtimeMs);
    }

    if (cacheEntry.target) {
      return cacheEntry.target;
    }

    moduleCache.set(resolvedPath, cacheEntry.mtimeMs);

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
      });
      errorLines.push('');
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
      this.persistentCache = JSON.parse(data);
    } catch (error) {
      if (error && error.code !== 'ENOENT') {
        this.persistentCache = {};
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
      // Silently fail
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
