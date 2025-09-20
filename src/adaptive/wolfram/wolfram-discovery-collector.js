/**
 * Wolfram Language Discovery Collector
 *
 * Parses Wolfram Language files (.wl, .m, .wls, .nb) to extract:
 * - Packages and contexts
 * - Function definitions (including pattern-based)
 * - Symbol definitions
 * - Options and rules
 * - Test definitions
 * - Notebook cells (for .nb files)
 *
 * Uses both native parsing and optional Wolfram kernel bridge for accuracy.
 */

const fs = require('fs');
const path = require('path');
const { ErrorHandler } = require('../error-handler');
const processRunner = require('../process-runner');

class WolframDiscoveryCollector {
  constructor() {
    this.errorHandler = new ErrorHandler('wolfram-collector');
    this.astBridgeScript = path.join(__dirname, 'wolfram-ast-bridge.wl');
    this.fallbackBridgeScript = path.join(__dirname, 'wolfram-bridge.wl');
    this.kernelExecutables = [
      { name: 'wolframscript', priority: 1 },
      { name: 'wolfram', priority: 2 },
      { name: 'MathKernel', priority: 3 },
      { name: 'WolframKernel', priority: 4 }
    ];
    this.kernelInfo = this.detectWolframKernel();
    this.useKernel = this.kernelInfo.available;
    this.supportedExtensions = ['.wl', '.m', '.wls', '.nb', '.wlt'];
    this.parseCache = new Map();
    this.maxCacheSize = 100;
  }

  /**
   * Detect Wolfram kernel availability and version
   */
  detectWolframKernel() {
    for (const { name: exe, priority } of this.kernelExecutables) {
      const result = this.errorHandler.safeSync(
        () => {
          const execution = processRunner.runProcessSync(
            exe,
            ['--version'],
            {
              timeout: 2000,
              allowlist: this.kernelExecutables.map(item => item.name),
              errorHandler: this.errorHandler,
              context: {
                integration: 'wolfram-detect'
              }
            }
          );
          return execution.result;
        },
        { executable: exe, operation: 'detectKernel' }
      );

      if (result.success && result.data?.status === 0) {
        const version = this.extractVersion(result.data.stdout);
        this.errorHandler.logInfo(`Wolfram kernel found: ${exe} ${version}`);
        return {
          available: true,
          executable: exe,
          version,
          priority,
          hasCodeParse: this.checkCodeParseSupport(version)
        };
      }
    }

    this.errorHandler.logWarning('No Wolfram kernel found, using regex parsing fallback');
    return { available: false };
  }

  /**
   * Extract version from Wolfram output
   */
  extractVersion(output) {
    const match = output?.match(/(\d+\.\d+(\.\d+)?)/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Check if CodeParse is supported (Wolfram 11.2+)
   */
  checkCodeParseSupport(version) {
    if (version === 'unknown') return false;
    const [major, minor] = version.split('.').map(Number);
    return major > 11 || (major === 11 && minor >= 2);
  }

  shouldScanFile(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      return false;
    }
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedExtensions.includes(ext);
  }

  async parseFile(filePath) {
    if (!this.shouldScanFile(filePath)) {
      return null;
    }

    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      return this.errorHandler.handleFileError(
        { code: 'ENOENT', message: 'File not found' },
        absolutePath,
        'read'
      );
    }

    // Try kernel-based parsing first if available
    if (this.useKernel && path.extname(absolutePath) !== '.nb') {
      const kernelResult = await this.parseWithKernel(absolutePath);
      if (kernelResult && kernelResult.success) {
        return kernelResult.metadata;
      }
    }

    // Fallback to regex-based parsing
    const ext = path.extname(absolutePath).toLowerCase();

    try {
      const content = await fs.promises.readFile(absolutePath, 'utf8');

      if (ext === '.nb') {
        return await this.parseNotebook(content, absolutePath);
      } else {
        return await this.parseWolframCode(content, absolutePath);
      }
    } catch (error) {
      return this.errorHandler.handleFileError(error, absolutePath, 'parse');
    }
  }

  /**
   * Parse file using Wolfram kernel for enhanced accuracy
   */
  async parseWithKernel(filePath) {
    // Check cache first
    const cached = this.getCachedParse(filePath);
    if (cached) {
      this.errorHandler.logDebug('Using cached parse result', { filePath });
      return { success: true, metadata: cached };
    }

    // Try AST bridge first (with CodeParse if available)
    const astResult = await this.parseWithASTBridge(filePath);
    if (astResult.success) {
      this.setCachedParse(filePath, astResult.metadata);
      return astResult;
    }

    // Fallback to simpler bridge
    const fallbackResult = await this.parseWithFallbackBridge(filePath);
    if (fallbackResult.success) {
      this.setCachedParse(filePath, fallbackResult.metadata);
      return fallbackResult;
    }

    return { success: false };
  }

  /**
   * Parse using advanced AST bridge
   */
  async parseWithASTBridge(filePath) {
    return this.errorHandler.safeAsync(
      async () => {
        const execution = processRunner.runProcessSync(
          this.kernelInfo.executable,
          [this.astBridgeScript, filePath],
          {
            timeout: 15000,
            maxBuffer: 20 * 1024 * 1024,
            allowlist: this.kernelExecutables.map(item => item.name),
            errorHandler: this.errorHandler,
            context: {
              integration: 'wolfram-ast-bridge',
              filePath
            }
          }
        );
        const result = execution.result;

        if (result.error || result.status !== 0) {
          const errorDetail = result.stderr || result.error?.message || 'Unknown error';
          this.errorHandler.logDebug('AST bridge parsing failed', { error: errorDetail });
          return { success: false };
        }

        const metadata = JSON.parse(result.stdout);
        if (metadata.error) {
          this.errorHandler.logDebug('AST bridge returned error', { error: metadata.error });
          return { success: false };
        }

        // Enhance metadata with file info
        metadata.path = filePath;
        metadata.parseMethod = metadata.version || 'AST';

        return { success: true, metadata: this.normalizeMetadata(metadata) };
      },
      { filePath, operation: 'astBridgeParse' }
    );
  }

  /**
   * Parse using fallback bridge
   */
  async parseWithFallbackBridge(filePath) {
    return this.errorHandler.safeAsync(
      async () => {
        const execution = processRunner.runProcessSync(
          this.kernelInfo.executable,
          [this.fallbackBridgeScript, filePath],
          {
            timeout: 10000,
            maxBuffer: 10 * 1024 * 1024,
            allowlist: this.kernelExecutables.map(item => item.name),
            errorHandler: this.errorHandler,
            context: {
              integration: 'wolfram-fallback-bridge',
              filePath
            }
          }
        );
        const result = execution.result;

        if (result.error || result.status !== 0) {
          this.errorHandler.logDebug('Fallback bridge failed', {
            error: result.error?.message || result.stderr
          });
          return { success: false };
        }

        const metadata = JSON.parse(result.stdout);
        metadata.path = filePath;
        metadata.parseMethod = 'Fallback';

        return { success: true, metadata: this.normalizeMetadata(metadata) };
      },
      { filePath, operation: 'fallbackBridgeParse' }
    );
  }

  async parseWolframCode(content, filePath) {
    const metadata = {
      path: filePath,
      packages: [],
      contexts: [],
      functions: [],
      patterns: [],
      symbols: [],
      rules: [],
      tests: [],
      options: []
    };

    // Remove comments
    const cleanContent = this.removeComments(content);
    const lines = cleanContent.split('\n');

    let currentPackage = null;
    let currentContext = [];
    let inPackage = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Package detection
      const packageMatch = line.match(/BeginPackage\s*\[\s*"([^"]+)"\s*(?:,\s*(.+))?\]/);
      if (packageMatch) {
        currentPackage = {
          name: packageMatch[1],
          dependencies: this.parseDependencies(packageMatch[2]),
          exports: [],
          privateSymbols: []
        };
        currentContext.push(packageMatch[1]);
        inPackage = true;
        continue;
      }

      if (line.match(/EndPackage\s*\[\s*\]/)) {
        if (currentPackage) {
          metadata.packages.push(currentPackage);
          currentPackage = null;
        }
        if (currentContext.length > 0) {
          currentContext.pop();
        }
        inPackage = false;
        continue;
      }

      // Context management
      const beginContextMatch = line.match(/Begin\s*\[\s*"`([^`]+)`"\s*\]/);
      if (beginContextMatch) {
        currentContext.push(beginContextMatch[1]);
        continue;
      }

      if (line.match(/End\s*\[\s*\]/)) {
        if (currentContext.length > 0) {
          currentContext.pop();
        }
        continue;
      }

      // Function definitions with patterns
      const functionPatterns = [
        // Standard function definition: f[x_] := expr
        /^(\w+)\s*\[\s*([^]]*)\s*\]\s*:=\s*.+/,
        // Delayed definition with pattern: f[x_Integer] := expr
        /^(\w+)\s*\[\s*([^]]*_\w+[^]]*)\s*\]\s*:=\s*.+/,
        // Immediate definition: f[x_] = expr
        /^(\w+)\s*\[\s*([^]]*)\s*\]\s*=\s*[^=].+/,
        // Function with options: f[x_, opts___] := expr
        /^(\w+)\s*\[\s*([^,]+),\s*opts___\s*\]\s*:=\s*.+/,
        // Pure function assignment: f = Function[...]
        /^(\w+)\s*=\s*Function\s*\[.+/,
        // Compile function: f = Compile[...]
        /^(\w+)\s*=\s*Compile\s*\[.+/
      ];

      for (const pattern of functionPatterns) {
        const match = line.match(pattern);
        if (match) {
          const funcName = match[1];
          const params = match[2] || '';
          const contextPath = currentContext.length > 0 ? currentContext.join('`') + '`' : '';

          const func = {
            name: funcName,
            fullName: contextPath + funcName,
            parameters: this.parseParameters(params),
            context: currentContext[currentContext.length - 1] || null,
            isPublic: !currentContext.some(ctx => ctx === 'Private'),
            hasPattern: params.includes('_'),
            hasMemoization: line.includes(':=') && line.includes(`${funcName}[`) && line.includes(']=')
          };

          metadata.functions.push(func);

          if (currentPackage && func.isPublic) {
            currentPackage.exports.push(funcName);
          } else if (currentPackage && !func.isPublic) {
            currentPackage.privateSymbols.push(funcName);
          }
          break;
        }
      }

      // Pattern definitions
      const patternMatch = line.match(/^(\w+)\s*\/:\s*(.+)\s*:=\s*.+/);
      if (patternMatch) {
        metadata.patterns.push({
          name: patternMatch[1],
          condition: patternMatch[2],
          context: currentContext[currentContext.length - 1] || null
        });
      }

      // Symbol definitions
      const symbolMatch = line.match(/^(\w+)\s*=\s*[^=\s].+/);
      if (symbolMatch && !line.match(/Function|Compile/)) {
        const symbolName = symbolMatch[1];
        metadata.symbols.push({
          name: symbolName,
          fullName: (currentContext.length > 0 ? currentContext.join('`') + '`' : '') + symbolName,
          context: currentContext[currentContext.length - 1] || null,
          isConstant: /^[A-Z]/.test(symbolName)
        });
      }

      // Options definitions
      const optionsMatch = line.match(/Options\s*\[\s*(\w+)\s*\]\s*=\s*\{(.+)\}/);
      if (optionsMatch) {
        metadata.options.push({
          function: optionsMatch[1],
          options: this.parseOptions(optionsMatch[2])
        });
      }

      // Rule definitions
      const ruleMatch = line.match(/(\w+)\s*\/;\s*(.+)\s*=\s*.+/);
      if (ruleMatch) {
        metadata.rules.push({
          symbol: ruleMatch[1],
          condition: ruleMatch[2]
        });
      }

      // Test definitions (VerificationTest)
      const testMatch = line.match(/VerificationTest\s*\[/);
      if (testMatch) {
        const testContent = this.extractBalancedExpression(lines, i, 'VerificationTest');
        if (testContent) {
          metadata.tests.push({
            type: 'VerificationTest',
            content: testContent,
            line: i + 1
          });
        }
      }
    }

    // Add discovered contexts
    metadata.contexts = [...new Set(currentContext)];

    return metadata;
  }

  async parseNotebook(content, filePath) {
    const metadata = {
      path: filePath,
      packages: [],
      contexts: [],
      functions: [],
      patterns: [],
      symbols: [],
      rules: [],
      tests: [],
      options: [],
      cells: []
    };

    try {
      // Parse notebook JSON structure
      const notebook = JSON.parse(content);

      if (!Array.isArray(notebook)) {
        // Handle Wolfram notebook format (which is actually an expression, not pure JSON)
        // For now, we'll extract code cells using regex patterns
        const cellMatches = content.matchAll(/Cell\[([^,]+),\s*"(Input|Code|Program)"/g);

        for (const match of cellMatches) {
          const cellContent = this.extractCellContent(match[1]);
          if (cellContent) {
            metadata.cells.push({
              type: match[2],
              content: cellContent
            });

            // Parse the cell content as Wolfram code
            const cellMetadata = await this.parseWolframCode(cellContent, filePath);
            this.mergeMetadata(metadata, cellMetadata);
          }
        }
      }
    } catch (error) {
      // If JSON parsing fails, try to extract code cells using pattern matching
      this.errorHandler.logDebug('Notebook JSON parsing failed, using pattern extraction', { filePath });

      const codePattern = /Cell\[BoxData\[([^\]]+)\],\s*"(Input|Code)"/g;
      let match;

      while ((match = codePattern.exec(content)) !== null) {
        const cellCode = this.unescapeNotebookCode(match[1]);
        metadata.cells.push({
          type: match[2],
          content: cellCode
        });

        const cellMetadata = await this.parseWolframCode(cellCode, filePath);
        this.mergeMetadata(metadata, cellMetadata);
      }
    }

    return metadata;
  }

  parseParameters(paramString) {
    if (!paramString) return [];

    const params = [];
    const parts = paramString.split(',').map(p => p.trim());

    for (const part of parts) {
      const param = {
        name: part.replace(/_.*$/, ''),
        pattern: null,
        optional: false,
        sequence: false
      };

      if (part.includes('_')) {
        const patternMatch = part.match(/_+([A-Za-z]+)?/);
        if (patternMatch) {
          if (part.includes('___')) {
            param.sequence = true;
            param.pattern = patternMatch[1] || 'Any';
          } else if (part.includes('__')) {
            param.sequence = true;
            param.pattern = patternMatch[1] || 'Any';
          } else {
            param.pattern = patternMatch[1] || 'Any';
          }
        }
      }

      if (part.includes(':.')) {
        param.optional = true;
      }

      params.push(param);
    }

    return params;
  }

  parseDependencies(depString) {
    if (!depString) return [];

    // Extract string literals from the dependency list
    const deps = [];
    const matches = depString.matchAll(/"([^"]+)"/g);

    for (const match of matches) {
      deps.push(match[1]);
    }

    return deps;
  }

  parseOptions(optString) {
    if (!optString) return [];

    const options = [];
    // Simple parsing - can be enhanced for more complex option structures
    const parts = optString.split(',').map(p => p.trim());

    for (const part of parts) {
      const match = part.match(/(\w+)\s*->\s*(.+)/);
      if (match) {
        options.push({
          name: match[1],
          defaultValue: match[2]
        });
      }
    }

    return options;
  }

  removeComments(content) {
    // Remove (* ... *) style comments
    let result = content.replace(/\(\*[\s\S]*?\*\)/g, '');

    // Remove single-line comments starting with (*
    result = result.split('\n').map(line => {
      const commentIndex = line.indexOf('(*');
      if (commentIndex >= 0) {
        return line.substring(0, commentIndex);
      }
      return line;
    }).join('\n');

    return result;
  }

  extractBalancedExpression(lines, startLine, functionName) {
    let depth = 0;
    let result = '';
    let foundStart = false;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];

      for (let j = 0; j < line.length; j++) {
        const char = line[j];

        if (!foundStart && line.substring(j).startsWith(functionName + '[')) {
          foundStart = true;
          j += functionName.length;
        }

        if (foundStart) {
          if (char === '[') depth++;
          if (char === ']') depth--;
          result += char;

          if (depth === 0) {
            return result;
          }
        }
      }

      if (foundStart) {
        result += '\n';
      }
    }

    return null;
  }

  extractCellContent(cellExpression) {
    // Extract readable content from Cell expression
    // This is simplified - real implementation would need more sophisticated parsing
    const cleaned = cellExpression
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');

    return cleaned;
  }

  unescapeNotebookCode(code) {
    // Unescape notebook code representation
    return code
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\t/g, '\t');
  }

  mergeMetadata(target, source) {
    // Merge metadata from source into target
    for (const key of ['functions', 'patterns', 'symbols', 'rules', 'tests', 'options']) {
      if (Array.isArray(source[key])) {
        target[key].push(...source[key]);
      }
    }

    // Merge packages with deduplication
    if (source.packages && source.packages.length > 0) {
      const existingPackages = new Set(target.packages.map(p => p.name));
      for (const pkg of source.packages) {
        if (!existingPackages.has(pkg.name)) {
          target.packages.push(pkg);
        }
      }
    }

    // Merge contexts with deduplication
    if (source.contexts && source.contexts.length > 0) {
      const existingContexts = new Set(target.contexts);
      for (const ctx of source.contexts) {
        if (!existingContexts.has(ctx)) {
          target.contexts.push(ctx);
        }
      }
    }
  }

  /**
   * Extract exports from metadata
   */
  extractExports(metadata) {
    const exports = [];

    // Export packages
    for (const pkg of metadata.packages || []) {
      exports.push({
        name: pkg.name,
        type: 'package',
        exports: pkg.exports || [],
        context: pkg.name
      });
    }

    // Export public functions
    for (const func of metadata.functions || []) {
      if (func.isPublic) {
        exports.push({
          name: func.name,
          type: 'function',
          fullName: func.fullName,
          context: func.context,
          hasPattern: func.hasPattern,
          parameters: func.parameters
        });
      }
    }

    // Export symbols
    for (const symbol of metadata.symbols || []) {
      exports.push({
        name: symbol.name,
        type: 'symbol',
        fullName: symbol.fullName,
        context: symbol.context,
        isConstant: symbol.isConstant
      });
    }

    return exports;
  }
  /**
   * Get all supported file extensions
   */
  getSupportedExtensions() {
    return this.supportedExtensions;
  }

  /**
   * Get cached parse result
   */
  getCachedParse(filePath) {
    const stats = fs.statSync(filePath);
    const cacheKey = `${filePath}:${stats.mtime.getTime()}`;
    return this.parseCache.get(cacheKey);
  }

  /**
   * Set cached parse result
   */
  setCachedParse(filePath, metadata) {
    try {
      const stats = fs.statSync(filePath);
      const cacheKey = `${filePath}:${stats.mtime.getTime()}`;

      // Limit cache size
      if (this.parseCache.size >= this.maxCacheSize) {
        const firstKey = this.parseCache.keys().next().value;
        this.parseCache.delete(firstKey);
      }

      this.parseCache.set(cacheKey, metadata);
    } catch (error) {
      // Ignore cache errors
    }
  }

  /**
   * Clear parse cache
   */
  clearCache() {
    this.parseCache.clear();
  }

  /**
   * Validate metadata structure
   */
  validateMetadata(metadata) {
    if (!metadata || typeof metadata !== 'object') {
      return false;
    }

    const requiredFields = ['packages', 'functions', 'symbols'];
    for (const field of requiredFields) {
      if (!Array.isArray(metadata[field])) {
        this.errorHandler.logWarning(`Invalid metadata: missing or invalid ${field}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Clean and normalize metadata
   */
  normalizeMetadata(metadata) {
    // Remove duplicates
    if (metadata.functions) {
      const seen = new Set();
      metadata.functions = metadata.functions.filter(f => {
        const key = `${f.context}:${f.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // Sort by name for consistency
    ['functions', 'symbols', 'packages'].forEach(field => {
      if (metadata[field]) {
        metadata[field].sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        );
      }
    });

    return metadata;
  }
}

module.exports = { WolframDiscoveryCollector };