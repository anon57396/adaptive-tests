/**
 * Candidate Evaluator
 *
 * Handles scoring, validation, and resolution of discovery candidates.
 */

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const Module = require('module');

class CandidateEvaluator {
  constructor(options) {
    const {
      rootPath,
      config,
      scoringEngine,
      tsconfigResolver,
      allowLooseNameMatch,
      looseNamePenalty,
      analyzeModuleExports,
      calculateRecencyBonus,
      moduleVersions,
      cachedModules,
      cleanupCachedModules,
      ensureTypeScriptSupport
    } = options;

    this.rootPath = rootPath;
    this.config = config;
    this.scoringEngine = scoringEngine;
    this.tsconfigResolver = tsconfigResolver;
    this.allowLooseNameMatch = allowLooseNameMatch;
    this.looseNamePenalty = looseNamePenalty;
    this.analyzeModuleExports = analyzeModuleExports;
    this.calculateRecencyBonus = calculateRecencyBonus;
    this.moduleVersions = moduleVersions;
    this.cachedModules = cachedModules;
    this.cleanupCachedModules = cleanupCachedModules;
    this.ensureTypeScriptSupport = ensureTypeScriptSupport;
  }

  async evaluateCandidate(filePath, signature) {
    const fileName = path.basename(filePath, path.extname(filePath));

    const nameMatches = this.quickNameCheck(fileName, signature);
    if (!nameMatches && !this.allowLooseNameMatch) {
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
      mtimeMs: stats ? stats.mtimeMs : null,
      quickNameMatched: nameMatches
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
        // Ignore resolver errors; aliases remain undefined
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

    if (!nameMatches && this.allowLooseNameMatch && this.looseNamePenalty) {
      candidate.scoreBreakdown = candidate.scoreBreakdown || {};
      candidate.scoreBreakdown.quickName = (candidate.scoreBreakdown.quickName || 0) + this.looseNamePenalty;
      score += this.looseNamePenalty;
    }

    const minScore = this.config.discovery?.scoring?.minCandidateScore ?? 0;

    if (score <= minScore) {
      return null;
    }

    candidate.score = score;
    return candidate;
  }

  quickNameCheck(fileName, signature) {
    if (!signature.name && !signature.exports) {
      return true;
    }

    const fileNameLower = fileName.toLowerCase();

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
        if (tokens.some(token => fileNameLower.includes(token.toLowerCase()))) {
          return true;
        }
      }
    }

    if (signature.exports) {
      const exportLower = signature.exports.toLowerCase();
      if (fileNameLower.includes(exportLower)) {
        return true;
      }
    }

    return false;
  }

  tokenizeName(name) {
    if (!name) {
      return [];
    }

    return String(name)
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .toLowerCase()
      .split(' ')
      .map(token => token.trim())
      .filter(Boolean);
  }

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
        this.cleanupCachedModules();

        if (metadataMatch) {
          const target = this.extractExportByAccess(moduleExports, metadataMatch.access);
          if (target && this.validateTarget(target, signature)) {
            return { target, access: metadataMatch.access };
          }
        }

        return this.resolveTargetFromModule(moduleExports, signature, candidate);
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
        const target = this.extractExportByAccess(moduleExports, metadataMatch.access);
        if (target && this.validateTarget(target, signature)) {
          return { target, access: metadataMatch.access };
        }
      }

      if (initialLoad && typeof moduleExports === 'function' && moduleExports.prototype && moduleExports.prototype.constructor) {
        return {
          target: moduleExports,
          access: { type: 'direct' }
        };
      }

      return this.resolveTargetFromModule(moduleExports, signature, candidate);
    } catch (error) {
      return null;
    }
  }

  isCandidateSafe(candidate) {
    const security = this.config.discovery?.security || {};
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

  resolveTargetFromModule(moduleExports, signature, candidate) {
    const results = [];

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

    if (results.length > 0) {
      results.sort((a, b) => b.score - a.score);
      return results[0];
    }

    return null;
  }

  validateTarget(target, signature) {
    if (!target) {
      return null;
    }

    let score = 0;

    if (signature.type) {
      if (!this.validateType(target, signature.type)) {
        return null;
      }
      score += 10;
    }

    if (signature.name) {
      const targetName = this.getTargetName(target);
      if (!this.validateName(targetName, signature.name)) {
        return null;
      }
      score += this.scoringEngine.scoreTargetName(targetName, signature);
    }

    if (signature.methods && signature.methods.length > 0) {
      const methodScore = this.validateMethods(target, signature.methods);
      if (methodScore === null) {
        return null;
      }
      score += methodScore;
    }

    if (signature.properties && signature.properties.length > 0) {
      const propScore = this.validateProperties(target, signature.properties);
      if (propScore === null) {
        return null;
      }
      score += propScore;
    }

    if (signature.extends) {
      if (!this.validateInheritance(target, signature.extends)) {
        return null;
      }
      score += 20;
    }

    if (signature.instanceof) {
      if (!this.validateInstanceOf(target, signature.instanceof)) {
        return null;
      }
      score += 15;
    }

    return { score };
  }

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

  getTargetName(target) {
    if (!target) return null;
    if (target.name) return target.name;
    if (target.constructor && target.constructor.name) {
      return target.constructor.name;
    }
    return null;
  }

  validateName(targetName, expectedName) {
    if (!targetName) return false;

    if (expectedName instanceof RegExp) {
      return expectedName.test(targetName);
    }

    return targetName === expectedName;
  }

  validateMethods(target, methods) {
    const methodHost = target.prototype || target;

    for (const method of methods) {
      if (typeof methodHost[method] !== 'function') {
        return null;
      }
    }

    return methods.length * 5;
  }

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
        // Ignore instantiation errors
      }
    }

    return null;
  }

  validateInheritance(target, baseClass) {
    if (typeof target !== 'function') {
      return false;
    }

    let proto = target.prototype;
    while (proto) {
      if (proto.constructor === baseClass) {
        return true;
      }
      proto = Object.getPrototypeOf(proto);
    }

    if (baseClass && typeof baseClass === 'function') {
      return target.prototype instanceof baseClass;
    }

    if (typeof baseClass === 'string') {
      let iter = target.prototype;
      while (iter) {
        if (iter.constructor && iter.constructor.name === baseClass) {
          return true;
        }
        iter = Object.getPrototypeOf(iter);
      }
    }

    return false;
  }

  validateInstanceOf(target, expectedClass) {
    if (typeof expectedClass === 'function') {
      if (typeof target === 'function') {
        return target === expectedClass || target.prototype instanceof expectedClass;
      }
      return target instanceof expectedClass;
    }

    if (typeof expectedClass === 'string') {
      if (typeof target === 'function' && target.name === expectedClass) {
        return true;
      }
      if (typeof target === 'object' && target !== null) {
        return target.constructor && target.constructor.name === expectedClass;
      }
    }

    return false;
  }
}

module.exports = {
  CandidateEvaluator
};
