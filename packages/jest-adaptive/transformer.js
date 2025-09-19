/**
 * Jest Transformer for Adaptive Tests
 * 
 * This transformer can optionally transform .adaptive.test.js files
 * to automatically inject adaptive-tests imports if not present.
 */

const { parse } = require('@babel/parser');

module.exports = {
  process(sourceText, sourcePath, options) {
    // Only transform .adaptive test files
    if (!sourcePath.includes('.adaptive')) {
      return { code: sourceText };
    }

    // Check if adaptive-tests is already imported
    const hasAdaptiveImport = 
      sourceText.includes('adaptive-tests') ||
      sourceText.includes('discover') ||
      sourceText.includes('adaptiveTest');

    if (hasAdaptiveImport) {
      // Already has imports, don't modify
      return { code: sourceText };
    }

    // Parse the source to understand its structure
    try {
      const ast = parse(sourceText, {
        sourceType: 'unambiguous',
        plugins: ['jsx', 'typescript'],
        allowImportExportEverywhere: true,
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,
      });

      // Check if it's an ES module or CommonJS
      const isESModule = ast.program.body.some(
        node => node.type === 'ImportDeclaration' || 
                 node.type === 'ExportNamedDeclaration' ||
                 node.type === 'ExportDefaultDeclaration'
      );

      let injectedCode = sourceText;

      // Inject appropriate import/require at the top
      if (isESModule) {
        // ES Module - use import
        injectedCode = `import { discover, adaptiveTest, getDiscoveryEngine } from 'adaptive-tests';\n\n${sourceText}`;
      } else {
        // CommonJS - check if discover is used as global
        const usesGlobalDiscover = sourceText.match(/\bdiscover\s*\(/g);
        const usesGlobalAdaptiveTest = sourceText.match(/\badaptiveTest\s*\(/g);
        
        if (usesGlobalDiscover || usesGlobalAdaptiveTest) {
          // File is using globals, just add a comment
          injectedCode = `// Adaptive test globals (discover, adaptiveTest) are provided by jest-adaptive\n${sourceText}`;
        } else {
          // Add require statement
          injectedCode = `const { discover, adaptiveTest, getDiscoveryEngine } = require('adaptive-tests');\n\n${sourceText}`;
        }
      }

      return {
        code: injectedCode,
        map: null, // Source maps could be added here if needed
      };
    } catch (error) {
      // If parsing fails, return original code
      console.warn(`[jest-adaptive] Failed to parse ${sourcePath}:`, error.message);
      return { code: sourceText };
    }
  },

  // Cache key for Jest's transform cache
  getCacheKey(sourceText, sourcePath, options) {
    return require('crypto')
      .createHash('md5')
      .update(sourceText)
      .update(sourcePath)
      .update('jest-adaptive-transformer-v1')
      .digest('hex');
  },
};