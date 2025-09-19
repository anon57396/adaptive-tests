const fs = require('fs');
const path = require('path');
const { loadConfig, createMatchPathSync } = require('tsconfig-paths');

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function findTsconfig(rootPath) {
  const candidates = [
    'tsconfig.json',
    'tsconfig.base.json',
    'tsconfig.app.json'
  ];

  for (const candidate of candidates) {
    const candidatePath = path.join(rootPath, candidate);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}

function normalizePattern(pattern) {
  return pattern.replace(/\\/g, '/');
}

function buildAliasEntries(absoluteBaseUrl, pathsConfig = {}) {
  const entries = [];

  for (const [aliasPattern, targetPatterns] of Object.entries(pathsConfig)) {
    const normalizedAlias = normalizePattern(aliasPattern);
    const aliasHasWildcard = normalizedAlias.includes('*');

    for (const target of targetPatterns || []) {
      const normalizedTarget = normalizePattern(target);
      const targetHasWildcard = normalizedTarget.includes('*');
      const targetPrefix = normalizedTarget.replace(/\*.*$/, '');
      const absoluteTarget = path.resolve(absoluteBaseUrl, targetPrefix);

      entries.push({
        aliasPattern: normalizedAlias,
        aliasPrefix: normalizedAlias.replace(/\*.*$/, ''),
        aliasHasWildcard,
        targetPattern: normalizedTarget,
        targetPrefix: absoluteTarget,
        targetHasWildcard
      });
    }
  }

  return entries;
}

function stripExtension(filePath) {
  const ext = path.extname(filePath);
  if (!ext) return filePath;
  return filePath.slice(0, -ext.length);
}

function createTsconfigResolver(rootPath) {
  const configPath = findTsconfig(rootPath);
  if (!configPath) {
    return null;
  }

  const configResult = loadConfig(configPath);
  if (configResult.resultType === 'failed') {
    return null;
  }

  const { absoluteBaseUrl, paths = {}, mainFields, addMatchAll } = configResult;
  if (!absoluteBaseUrl) {
    return null;
  }

  const matchPath = createMatchPathSync(
    absoluteBaseUrl,
    paths,
    mainFields,
    addMatchAll,
    EXTENSIONS
  );

  const aliasEntries = buildAliasEntries(absoluteBaseUrl, paths);

  const resolveWithMatch = (specifier) => {
    try {
      const result = matchPath(specifier, undefined, undefined, EXTENSIONS);
      return result || null;
    } catch (error) {
      return null;
    }
  };

  const getBaseUrlRelativeImport = (filePath) => {
    const normalized = path.resolve(filePath);
    if (!normalized.startsWith(path.resolve(absoluteBaseUrl))) {
      return null;
    }
    const relative = path.relative(absoluteBaseUrl, normalized);
    if (!relative) return null;
    const withoutExt = stripExtension(relative).replace(/\\/g, '/');
    return withoutExt;
  };

  const getAliasesForFile = (filePath) => {
    const normalized = path.resolve(filePath);
    const aliases = new Set();

    aliasEntries.forEach((entry) => {
      const targetPrefix = path.resolve(entry.targetPrefix);
      if (!normalized.startsWith(targetPrefix)) {
        return;
      }

      let remainder = path.relative(targetPrefix, normalized).replace(/\\/g, '/');
      if (entry.targetHasWildcard) {
        remainder = stripExtension(remainder);
      } else {
        remainder = '';
      }

      if (!entry.aliasHasWildcard) {
        if (!remainder) {
          aliases.add(entry.aliasPattern);
        }
        return;
      }

      const sanitizedRemainder = remainder;
      const replacement = sanitizedRemainder;
      const alias = entry.aliasPattern.replace('*', replacement);
      aliases.add(alias);
    });

    return Array.from(aliases);
  };

  return {
    configPath,
    absoluteBaseUrl,
    paths,
    matchPath,
    aliasEntries,
    resolveWithMatch,
    getAliasesForFile,
    getBaseUrlRelativeImport
  };
}

module.exports = {
  createTsconfigResolver
};
