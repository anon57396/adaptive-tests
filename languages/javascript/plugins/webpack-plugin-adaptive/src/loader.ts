/**
 * Webpack Loader for Adaptive Tests
 * 
 * Transforms adaptive test files to optimize discovery at build time.
 */

import { getOptions } from 'loader-utils';
import { validate } from 'schema-utils';
import { parse } from '@babel/parser';
import type { LoaderContext } from 'webpack';

interface LoaderOptions {
  cache?: boolean;
  optimizeDiscovery?: boolean;
  injectHelpers?: boolean;
  debug?: boolean;
}

const schema = {
  type: 'object',
  properties: {
    cache: { type: 'boolean' },
    optimizeDiscovery: { type: 'boolean' },
    injectHelpers: { type: 'boolean' },
    debug: { type: 'boolean' },
  },
  additionalProperties: false,
};

/**
 * Adaptive Tests Webpack Loader
 */
export default function adaptiveTestsLoader(
  this: LoaderContext<LoaderOptions>,
  source: string
): string {
  const options = getOptions(this) || {};
  
  // Validate options
  validate(schema as any, options, {
    name: 'Adaptive Tests Loader',
    baseDataPath: 'options',
  });

  const callback = this.async();
  
  if (!callback) {
    return source;
  }

  // Make loader cacheable
  if (options.cache !== false) {
    this.cacheable(true);
  }

  try {
    const transformed = transformAdaptiveTest(source, this.resourcePath, options);
    callback(null, transformed);
  } catch (error: any) {
    callback(error);
  }

  return source;
}

/**
 * Transform adaptive test source code
 */
function transformAdaptiveTest(
  source: string,
  resourcePath: string,
  options: LoaderOptions
): string {
  // Check if already has adaptive imports
  const hasAdaptiveImport = 
    source.includes('adaptive-tests') ||
    source.includes('discover') ||
    source.includes('adaptiveTest');

  let transformed = source;

  // Inject helpers if not already present
  if (!hasAdaptiveImport && options.injectHelpers !== false) {
    const isESModule = detectModuleType(source);
    
    if (isESModule) {
      // ES Module
      transformed = `import { discover, adaptiveTest, getDiscoveryEngine } from 'adaptive-tests';\n\n${source}`;
    } else {
      // CommonJS
      transformed = `const { discover, adaptiveTest, getDiscoveryEngine } = require('adaptive-tests');\n\n${source}`;
    }
  }

  // Optimize discovery calls if enabled
  if (options.optimizeDiscovery) {
    transformed = optimizeDiscoveryCalls(transformed, resourcePath, options);
  }

  // Add source map comment
  if (options.debug) {
    transformed += `\n//# sourceURL=webpack://adaptive-tests-loader/${resourcePath}`;
  }

  return transformed;
}

/**
 * Detect if source is an ES module
 */
function detectModuleType(source: string): boolean {
  try {
    const ast = parse(source, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'typescript'],
      allowImportExportEverywhere: true,
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true,
      allowSuperOutsideMethod: true,
    });

    // Check for ES module indicators
    return ast.program.body.some(
      (node: any) =>
        node.type === 'ImportDeclaration' ||
        node.type === 'ExportNamedDeclaration' ||
        node.type === 'ExportDefaultDeclaration'
    );
  } catch (error) {
    // Default to CommonJS if parsing fails
    return false;
  }
}

/**
 * Optimize discovery calls for build-time resolution
 */
function optimizeDiscoveryCalls(
  source: string,
  resourcePath: string,
  options: LoaderOptions
): string {
  // This is a simplified version - in production, we'd use AST transformation
  let optimized = source;

  // Add comment markers for discovery calls
  optimized = optimized.replace(
    /await\s+discover\s*\(/g,
    '/* @adaptive-discovery */ await discover('
  );

  // Add performance markers in debug mode
  if (options.debug) {
    optimized = optimized.replace(
      /beforeAll\s*\(\s*async/g,
      'beforeAll(async /* @adaptive-test-setup */'
    );
  }

  return optimized;
}

// Export raw loader for use in webpack config
export const raw = false;