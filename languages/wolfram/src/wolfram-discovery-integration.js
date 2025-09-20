/**
 * Wolfram Language Discovery Integration
 *
 * Integrates Wolfram Language discovery into the adaptive-tests discovery engine.
 * Handles .wl, .m, .wls, and .nb files with context-aware symbol resolution
 * and pattern-based discovery unique to symbolic computation.
 */

const path = require('path');
const { BaseLanguageIntegration } = require('../base-language-integration');
const { WolframDiscoveryCollector } = require('./wolfram-discovery-collector');

class WolframDiscoveryIntegration extends BaseLanguageIntegration {
  constructor(discoveryEngine) {
    super(discoveryEngine, 'wolfram');
    this.collector = new WolframDiscoveryCollector();
    this.contextCache = new Map();
  }

  getFileExtension() {
    return '.wl';
  }

  getSupportedExtensions() {
    return ['.wl', '.m', '.wls', '.nb'];
  }

  async parseFile(filePath) {
    if (!this.collector.shouldScanFile(filePath)) {
      return null;
    }

    const metadata = await this.collector.parseFile(filePath);
    if (!metadata) {
      return null;
    }

    // Enhance metadata with Wolfram-specific information
    metadata.language = 'wolfram';
    metadata.exports = await this.collector.extractExports(metadata);

    // Cache context information for cross-file resolution
    this.updateContextCache(metadata);

    return metadata;
  }

  extractCandidates(metadata) {
    return this.errorHandler.safeSync(
      () => this.extractCandidatesImpl(metadata),
      { language: 'wolfram', operation: 'extractCandidates' }
    ).data || [];
  }

  extractCandidatesImpl(metadata) {
    const candidates = [];

    // Extract package candidates
    (metadata.packages || []).forEach(pkg => {
      candidates.push({
        name: pkg.name,
        type: 'package',
        context: pkg.name,
        fullName: pkg.name,
        exports: pkg.exports || [],
        dependencies: pkg.dependencies || [],
        metadata: pkg,
        visibility: 'public',
        exported: true,
        score: 0
      });
    });

    // Extract function candidates
    (metadata.functions || []).forEach(func => {
      candidates.push({
        name: func.name,
        type: 'function',
        context: func.context,
        fullName: func.fullName,
        parameters: func.parameters || [],
        hasPattern: func.hasPattern,
        hasMemoization: func.hasMemoization,
        metadata: func,
        visibility: func.isPublic ? 'public' : 'private',
        exported: func.isPublic,
        score: 0
      });
    });

    // Extract symbol candidates
    (metadata.symbols || []).forEach(symbol => {
      candidates.push({
        name: symbol.name,
        type: 'symbol',
        context: symbol.context,
        fullName: symbol.fullName,
        isConstant: symbol.isConstant,
        metadata: symbol,
        visibility: 'public',
        exported: true,
        score: 0
      });
    });

    // Extract pattern candidates
    (metadata.patterns || []).forEach(pattern => {
      candidates.push({
        name: pattern.name,
        type: 'pattern',
        context: pattern.context,
        condition: pattern.condition,
        metadata: pattern,
        visibility: 'public',
        exported: true,
        score: 0
      });
    });

    return candidates;
  }

  scoreCandidate(candidate, signature) {
    let score = super.scoreCandidate(candidate, signature);

    // Add Wolfram-specific scoring
    score += this.scorePackageMatching(candidate, signature);
    score += this.scoreLanguageSpecific(candidate, signature);
    score += this.scorePatternMatching(candidate, signature);

    return score;
  }

  scorePackageMatching(candidate, signature) {
    if (!signature.context && !signature.package) {
      return 0;
    }

    const targetContext = signature.context || signature.package;
    const candidateContext = candidate.context || '';

    // Exact context match
    if (candidateContext === targetContext) {
      return 20;
    }

    // Partial context match (subcontext)
    if (candidateContext.startsWith(targetContext + '`')) {
      return 10;
    }

    // Parent context match
    if (targetContext.startsWith(candidateContext + '`')) {
      return 5;
    }

    // No context match
    return -5;
  }

  scoreLanguageSpecific(candidate, signature) {
    let score = 0;

    // Score pattern-based functions
    if (signature.hasPattern !== undefined) {
      if (candidate.hasPattern === signature.hasPattern) {
        score += 8;
      } else {
        score -= 3;
      }
    }

    // Score memoization
    if (signature.hasMemoization !== undefined) {
      if (candidate.hasMemoization === signature.hasMemoization) {
        score += 5;
      }
    }

    // Score parameter patterns
    if (signature.parameters && candidate.parameters) {
      score += this.scoreParameterPatterns(candidate.parameters, signature.parameters);
    }

    // Score symbol type
    if (candidate.type === 'symbol' && signature.isConstant !== undefined) {
      if (candidate.isConstant === signature.isConstant) {
        score += 4;
      }
    }

    return score;
  }

  scorePatternMatching(candidate, signature) {
    if (!signature.patterns || candidate.type !== 'pattern') {
      return 0;
    }

    let score = 0;

    // Check if candidate pattern matches any signature patterns
    for (const sigPattern of signature.patterns) {
      if (this.patternsMatch(candidate.condition, sigPattern)) {
        score += 15;
        break;
      }
    }

    return score;
  }

  scoreParameterPatterns(candidateParams, signatureParams) {
    if (!Array.isArray(candidateParams) || !Array.isArray(signatureParams)) {
      return 0;
    }

    let score = 0;
    const minLength = Math.min(candidateParams.length, signatureParams.length);

    for (let i = 0; i < minLength; i++) {
      const candParam = candidateParams[i];
      const sigParam = signatureParams[i];

      // Check pattern type match
      if (sigParam.pattern && candParam.pattern) {
        if (candParam.pattern === sigParam.pattern) {
          score += 3;
        } else if (this.areCompatiblePatterns(candParam.pattern, sigParam.pattern)) {
          score += 1;
        }
      }

      // Check optionality
      if (sigParam.optional !== undefined && candParam.optional === sigParam.optional) {
        score += 2;
      }

      // Check sequence patterns
      if (sigParam.sequence !== undefined && candParam.sequence === sigParam.sequence) {
        score += 2;
      }
    }

    // Penalize length mismatch
    const lengthDiff = Math.abs(candidateParams.length - signatureParams.length);
    score -= lengthDiff * 2;

    return score;
  }

  areCompatiblePatterns(pattern1, pattern2) {
    // Define pattern compatibility rules
    const compatibilityMap = {
      'Any': ['Integer', 'Real', 'Complex', 'List', 'String', 'Symbol'],
      'Numeric': ['Integer', 'Real', 'Complex'],
      'Number': ['Integer', 'Real', 'Complex'],
      'Expression': ['Any', 'List', 'Symbol']
    };

    if (compatibilityMap[pattern1]?.includes(pattern2)) {
      return true;
    }

    if (compatibilityMap[pattern2]?.includes(pattern1)) {
      return true;
    }

    return false;
  }

  patternsMatch(condition1, condition2) {
    // Simple pattern matching - can be enhanced
    if (!condition1 || !condition2) {
      return false;
    }

    // Normalize and compare
    const norm1 = condition1.replace(/\s+/g, '').toLowerCase();
    const norm2 = condition2.replace(/\s+/g, '').toLowerCase();

    return norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1);
  }

  generateTestContent(target, options = {}) {
    return this.generateVerificationTest(target, options);
  }

  generateVerificationTest(target, options = {}) {
    const { signature = {}, testPath = '', depth = 0 } = options;

    let testContent = '(* Auto-generated adaptive test for Wolfram Language *)\n';
    testContent += '(* This test will survive refactoring and symbol movement *)\n\n';

    // Add package/context setup if needed
    if (target.context) {
      testContent += `(* Testing in context: ${target.context} *)\n`;
      if (target.type === 'package') {
        testContent += `Needs["${target.context}"];\n\n`;
      }
    }

    // Generate appropriate test based on target type
    switch (target.type) {
      case 'package':
        testContent += this.generatePackageTest(target);
        break;
      case 'function':
        testContent += this.generateFunctionTest(target);
        break;
      case 'symbol':
        testContent += this.generateSymbolTest(target);
        break;
      case 'pattern':
        testContent += this.generatePatternTest(target);
        break;
      default:
        testContent += this.generateGenericTest(target);
    }

    // Add discovery verification
    testContent += '\n(* Verify discovery mechanism *)\n';
    testContent += 'VerificationTest[\n';
    testContent += '  Names["' + (target.context ? target.context + '`*' : '*' + target.name + '*') + '"],\n';
    testContent += '  _List,\n';
    testContent += '  TestID -> "Discovery-' + target.name + '"\n';
    testContent += '];\n';

    return testContent;
  }

  generatePackageTest(pkg) {
    let test = '';
    test += '(* Package loading test *)\n';
    test += 'VerificationTest[\n';
    test += `  Needs["${pkg.name}"];\n`;
    test += `  MemberQ[$Packages, "${pkg.name}"],\n`;
    test += '  True,\n';
    test += `  TestID -> "PackageLoad-${pkg.name}"\n`;
    test += '];\n\n';

    // Test exported symbols
    if (pkg.exports && pkg.exports.length > 0) {
      test += '(* Test exported symbols *)\n';
      for (const symbol of pkg.exports.slice(0, 5)) { // Test first 5 exports
        test += 'VerificationTest[\n';
        test += `  NameQ["${pkg.name}\`${symbol}"],\n`;
        test += '  True,\n';
        test += `  TestID -> "Export-${pkg.name}-${symbol}"\n`;
        test += '];\n\n';
      }
    }

    return test;
  }

  generateFunctionTest(func) {
    let test = '';
    const funcRef = func.fullName || func.name;

    test += `(* Function test: ${funcRef} *)\n`;

    // Test function existence
    test += 'VerificationTest[\n';
    test += `  NameQ["${funcRef}"],\n`;
    test += '  True,\n';
    test += `  TestID -> "FunctionExists-${func.name}"\n`;
    test += '];\n\n';

    // Generate pattern-based test if applicable
    if (func.hasPattern && func.parameters) {
      test += '(* Pattern matching test *)\n';
      test += 'VerificationTest[\n';
      test += `  (* Test with appropriate argument patterns *)\n`;
      test += `  ${funcRef}[`;

      // Generate sample arguments based on patterns
      const args = func.parameters.map(param => {
        if (param.pattern === 'Integer') return '42';
        if (param.pattern === 'Real') return '3.14';
        if (param.pattern === 'String') return '"test"';
        if (param.pattern === 'List') return '{1, 2, 3}';
        if (param.pattern === 'Symbol') return 'x';
        return '1'; // Default
      });

      test += args.join(', ');
      test += '],\n';
      test += '  _,\n'; // Match any result
      test += `  TestID -> "FunctionCall-${func.name}"\n`;
      test += '];\n\n';
    }

    // Test memoization if applicable
    if (func.hasMemoization) {
      test += '(* Memoization test *)\n';
      test += 'Module[{timing1, timing2, result1, result2},\n';
      test += `  (* First call - should compute *)\n`;
      test += `  {timing1, result1} = AbsoluteTiming[${funcRef}[100]];\n`;
      test += `  (* Second call - should be memoized *)\n`;
      test += `  {timing2, result2} = AbsoluteTiming[${funcRef}[100]];\n`;
      test += '  VerificationTest[\n';
      test += '    result1 === result2 && timing2 < timing1,\n';
      test += '    True,\n';
      test += `    TestID -> "Memoization-${func.name}"\n`;
      test += '  ];\n';
      test += '];\n\n';
    }

    return test;
  }

  generateSymbolTest(symbol) {
    let test = '';
    const symbolRef = symbol.fullName || symbol.name;

    test += `(* Symbol test: ${symbolRef} *)\n`;

    // Test symbol existence and value
    test += 'VerificationTest[\n';
    test += `  ValueQ[${symbolRef}],\n`;
    test += '  True,\n';
    test += `  TestID -> "SymbolDefined-${symbol.name}"\n`;
    test += '];\n\n';

    if (symbol.isConstant) {
      test += '(* Constant symbol test *)\n';
      test += 'VerificationTest[\n';
      test += `  (* Constants should be protected from modification *)\n`;
      test += `  MemberQ[Attributes[${symbolRef}], Protected] || NumericQ[${symbolRef}],\n`;
      test += '  True,\n';
      test += `  TestID -> "ConstantProtection-${symbol.name}"\n`;
      test += '];\n\n';
    }

    return test;
  }

  generatePatternTest(pattern) {
    let test = '';

    test += `(* Pattern test: ${pattern.name} *)\n`;
    test += '(* Pattern condition: ' + pattern.condition + ' *)\n';

    test += 'VerificationTest[\n';
    test += `  (* Test pattern matching *)\n`;
    test += `  MatchQ[${pattern.name}, _?(${pattern.condition})],\n`;
    test += '  True,\n';
    test += `  TestID -> "Pattern-${pattern.name}"\n`;
    test += '];\n\n';

    return test;
  }

  generateGenericTest(target) {
    let test = '';

    test += `(* Generic test for ${target.name} *)\n`;
    test += 'VerificationTest[\n';
    test += `  (* Verify target exists in current context *)\n`;
    test += `  MemberQ[Names["*${target.name}*"], _String],\n`;
    test += '  True,\n';
    test += `  TestID -> "Generic-${target.name}"\n`;
    test += '];\n';

    return test;
  }

  updateContextCache(metadata) {
    // Cache context information for cross-file symbol resolution
    if (metadata.packages) {
      for (const pkg of metadata.packages) {
        this.contextCache.set(pkg.name, {
          exports: pkg.exports || [],
          dependencies: pkg.dependencies || [],
          path: metadata.path
        });
      }
    }

    if (metadata.contexts) {
      for (const ctx of metadata.contexts) {
        if (!this.contextCache.has(ctx)) {
          this.contextCache.set(ctx, {
            exports: [],
            dependencies: [],
            path: metadata.path
          });
        }
      }
    }
  }

  resolveSymbol(symbolName, currentContext) {
    // Resolve symbol across contexts
    if (symbolName.includes('`')) {
      // Already qualified
      return symbolName;
    }

    // Check current context first
    if (currentContext) {
      const contextInfo = this.contextCache.get(currentContext);
      if (contextInfo && contextInfo.exports.includes(symbolName)) {
        return `${currentContext}\`${symbolName}`;
      }
    }

    // Check all cached contexts
    for (const [context, info] of this.contextCache) {
      if (info.exports.includes(symbolName)) {
        return `${context}\`${symbolName}`;
      }
    }

    // Return unqualified name if not found
    return symbolName;
  }

  async discoverRelatedSymbols(target, maxDepth = 2) {
    // Discover symbols related to the target through dependencies or usage
    const related = new Set();
    const visited = new Set();

    const discover = async (symbol, depth) => {
      if (depth > maxDepth || visited.has(symbol)) {
        return;
      }

      visited.add(symbol);

      // Find symbols in the same context
      if (target.context) {
        const contextInfo = this.contextCache.get(target.context);
        if (contextInfo) {
          contextInfo.exports.forEach(exp => related.add(exp));
        }
      }

      // Find symbols from dependencies
      if (target.type === 'package' && target.dependencies) {
        for (const dep of target.dependencies) {
          const depInfo = this.contextCache.get(dep);
          if (depInfo) {
            depInfo.exports.forEach(exp => related.add(exp));
          }
        }
      }
    };

    await discover(target.fullName || target.name, 0);
    return Array.from(related);
  }
}

module.exports = { WolframDiscoveryIntegration };