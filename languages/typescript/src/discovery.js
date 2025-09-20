/**
 * TypeScript Discovery Engine - Extends DiscoveryEngine for TS support
 *
 * MIT License - Use this anywhere
 */

const path = require('path');
// When using workspaces, this will resolve to the JavaScript package
const { DiscoveryEngine } = require('../../javascript/src/discovery-engine');

/**
 * @typedef {import('../../javascript/src/discovery-engine').DiscoveryOptions} DiscoveryOptions
 */

/**
 * An extension of the DiscoveryEngine that understands TypeScript files.
 */
class TypeScriptDiscoveryEngine extends DiscoveryEngine {
  /**
   * @param {string} [rootPath=process.cwd()] - The root directory to start scanning from.
   * @param {DiscoveryOptions} [options={}] - Configuration options for the engine.
   */
  constructor(rootPath = process.cwd(), options = {}) {
    const tsOptions = { ...options };
    // Ensure TypeScript extensions are included
    const defaultTSExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
    tsOptions.extensions = Array.isArray(options.extensions) && options.extensions.length > 0
      ? [...new Set([...options.extensions, ...defaultTSExtensions])]
      : defaultTSExtensions;

    super(rootPath, tsOptions);
  }
}

const tsEnginesByRoot = new Map();

/**
 * Gets a singleton instance of the TypeScriptDiscoveryEngine for a given root path.
 * @param {string} [rootPath=process.cwd()] - The root directory for the engine instance.
 * @returns {TypeScriptDiscoveryEngine} The singleton TypeScriptDiscoveryEngine instance.
 */
function getTypeScriptDiscoveryEngine(rootPath = process.cwd()) {
  const normalizedRoot = path.resolve(rootPath || process.cwd());
  if (!tsEnginesByRoot.has(normalizedRoot)) {
    tsEnginesByRoot.set(normalizedRoot, new TypeScriptDiscoveryEngine(normalizedRoot));
  }
  return tsEnginesByRoot.get(normalizedRoot);
}

module.exports = { TypeScriptDiscoveryEngine, getTypeScriptDiscoveryEngine };