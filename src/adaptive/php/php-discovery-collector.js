/**
 * PHP Discovery Collector
 *
 * Extends adaptive-tests discovery to support PHP files.
 * Uses native PHP AST parsing when available, falls back to php-parser.js.
 * Handles PHP namespaces, classes, interfaces, traits, and functions.
 */

const fs = require('fs');
const path = require('path');
const { ErrorHandler } = require('../error-handler');
const processRunner = require('../process-runner');

// Try to load php-parser.js as fallback
let PhpParser = null;
let jsParser = null;

try {
  PhpParser = require('php-parser');
  jsParser = new PhpParser({
    parser: {
      php8: true,
      extractDoc: true,
      suppressErrors: false
    },
    ast: {
      withPositions: true
    }
  });
} catch (e) {
  // php-parser not available, will use native PHP bridge
}

class PHPDiscoveryCollector {
  constructor(config = {}) {
    this.errorHandler = new ErrorHandler('php-collector');
    this.astBridgeScript = path.join(__dirname, 'php-ast-bridge.php');
    this.phpExecutables = ['php', 'php8', 'php7', 'php8.2', 'php8.1', 'php8.0', 'php7.4'];
    this.phpInfo = this.detectPhpExecutable();
    this.useNativePHP = this.phpInfo.available;
    this.parseCache = new Map();
    this.maxCacheSize = 100;

    this.config = {
      extensions: ['.php'],
      skipPatterns: [
        'vendor/',
        'tests/',
        'Tests/',
        'test/',
        'Test/',
        '_test.php',
        'Test.php',
        '.phpunit',
        'phpunit.xml'
      ],
      ...config
    };
  }

  /**
   * Detect PHP executable
   */
  detectPhpExecutable() {
    for (const exe of this.phpExecutables) {
      try {
        const execution = processRunner.runProcessSync(
          exe,
          ['--version'],
          {
            timeout: 2000,
            allowlist: this.phpExecutables,
            errorHandler: this.errorHandler,
            context: {
              integration: 'php-detect'
            }
          }
        );

        const { result } = execution;
        if (result.status === 0) {
          const version = this.extractVersion(result.stdout);
          this.errorHandler.logInfo(`PHP executable found: ${exe} ${version}`);
          return {
            available: true,
            executable: exe,
            version,
            hasTokenizer: true // PHP always has tokenizer
          };
        }
      } catch (error) {
        // Continue checking
      }
    }

    this.errorHandler.logWarning('No PHP executable found, using JavaScript parser fallback');
    return { available: false };
  }

  /**
   * Extract PHP version
   */
  extractVersion(output) {
    const match = output?.match(/PHP (\d+\.\d+\.\d+)/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Check if a file should be scanned
   */
  shouldScanFile(filePath) {
    const ext = path.extname(filePath);
    if (!this.config.extensions.includes(ext)) {
      return false;
    }

    const normalizedPath = filePath.replace(/\\/g, '/');
    return !this.config.skipPatterns.some(pattern =>
      normalizedPath.includes(pattern)
    );
  }

  /**
   * Parse a PHP file and extract metadata
   */
  async parseFile(filePath) {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      const ast = jsParser.parseCode(content, filePath);

      return this.extractMetadata(ast, filePath);
    } catch (error) {
      // Return null for files we can't parse
      this.errorHandler.logDebug(`Failed to parse PHP file ${filePath}`, { error: error.message });
      return null;
    }
  }

  /**
   * Transform native PHP metadata to our format
   */
  transformNativeMetadata(metadata) {
    // Native PHP bridge already returns in our format
    return {
      namespace: metadata.namespace,
      uses: metadata.uses || [],
      classes: metadata.classes || [],
      interfaces: metadata.interfaces || [],
      traits: metadata.traits || [],
      functions: metadata.functions || [],
      constants: metadata.constants || [],
      parseMethod: metadata.parser || 'native'
    };
  }

  /**
   * Get cached parse result
   */
  getCachedParse(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const cacheKey = `${filePath}:${stats.mtime.getTime()}`;
      return this.parseCache.get(cacheKey);
    } catch (error) {
      return null;
    }
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
   * Basic extraction fallback
   */
  basicExtraction(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const metadata = {
        namespace: null,
        classes: [],
        interfaces: [],
        traits: [],
        functions: [],
        parseMethod: 'regex'
      };

      // Extract namespace
      const namespaceMatch = content.match(/namespace\s+([^;]+);/);
      if (namespaceMatch) {
        metadata.namespace = namespaceMatch[1];
      }

      // Extract classes
      const classMatches = content.matchAll(/class\s+(\w+)/g);
      for (const match of classMatches) {
        metadata.classes.push({
          name: match[1],
          methods: [],
          properties: []
        });
      }

      return metadata;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract metadata from PHP AST
   */
  extractMetadata(ast, filePath) {
    const metadata = {
      path: filePath,
      namespace: null,
      imports: [],
      classes: [],
      interfaces: [],
      traits: [],
      functions: [],
      constants: []
    };

    // Traverse AST
    this.traverse(ast, {
      namespace: (node) => {
        // Extract namespace name
        if (node.name && typeof node.name === 'string') {
          metadata.namespace = node.name;
        } else if (node.name && Array.isArray(node.name)) {
          metadata.namespace = node.name.join('\\');
        }
      },
      useitem: (node) => {
        metadata.imports.push({
          name: node.name,
          alias: node.alias
        });
      },
      class: (node) => {
        metadata.classes.push(this.extractClassInfo(node));
      },
      interface: (node) => {
        metadata.interfaces.push(this.extractInterfaceInfo(node));
      },
      trait: (node) => {
        metadata.traits.push(this.extractTraitInfo(node));
      },
      function: (node) => {
        metadata.functions.push(this.extractFunctionInfo(node));
      }
    });

    return metadata;
  }

  /**
   * Extract class information
   */
  extractClassInfo(node) {
    const classInfo = {
      name: node.name?.name || 'anonymous',
      type: 'class',
      isAbstract: node.isAbstract || false,
      isFinal: node.isFinal || false,
      extends: node.extends?.name || null,
      implements: (node.implements || []).map(i => i.name),
      traits: [],
      methods: [],
      properties: [],
      constants: []
    };

    // Extract class members
    if (node.body) {
      node.body.forEach(member => {
        if (member.kind === 'method') {
          classInfo.methods.push(this.extractMethodInfo(member));
        } else if (member.kind === 'propertystatement') {
          member.properties.forEach(prop => {
            classInfo.properties.push(this.extractPropertyInfo(prop));
          });
        } else if (member.kind === 'classconstant') {
          member.constants.forEach(const_ => {
            classInfo.constants.push({
              name: const_.name,
              visibility: member.visibility || 'public'
            });
          });
        } else if (member.kind === 'traituse') {
          member.traits.forEach(trait => {
            classInfo.traits.push(trait.name);
          });
        }
      });
    }

    return classInfo;
  }

  /**
   * Extract interface information
   */
  extractInterfaceInfo(node) {
    return {
      name: node.name?.name || 'anonymous',
      type: 'interface',
      extends: (node.extends || []).map(e => e.name),
      methods: (node.body || [])
        .filter(m => m.kind === 'method')
        .map(m => this.extractMethodInfo(m))
    };
  }

  /**
   * Extract trait information
   */
  extractTraitInfo(node) {
    return {
      name: node.name?.name || 'anonymous',
      type: 'trait',
      methods: (node.body || [])
        .filter(m => m.kind === 'method')
        .map(m => this.extractMethodInfo(m))
    };
  }

  /**
   * Extract method information
   */
  extractMethodInfo(node) {
    return {
      name: node.name?.name || 'anonymous',
      visibility: node.visibility || 'public',
      isStatic: node.isStatic || false,
      isAbstract: node.isAbstract || false,
      isFinal: node.isFinal || false,
      parameters: (node.arguments || []).map(param => ({
        name: param.name,
        type: param.type?.name || null,
        hasDefault: param.value !== null,
        isVariadic: param.variadic || false,
        byReference: param.byref || false
      })),
      returnType: node.type?.name || null
    };
  }

  /**
   * Extract property information
   */
  extractPropertyInfo(node) {
    return {
      name: node.name,
      visibility: node.visibility || 'public',
      isStatic: node.isStatic || false,
      type: node.type?.name || null,
      hasDefault: node.value !== null
    };
  }

  /**
   * Extract function information
   */
  extractFunctionInfo(node) {
    return {
      name: node.name?.name || 'anonymous',
      parameters: (node.arguments || []).map(param => ({
        name: param.name,
        type: param.type?.name || null,
        hasDefault: param.value !== null
      })),
      returnType: node.type?.name || null
    };
  }

  /**
   * Generic AST traversal helper
   */
  traverse(node, visitors) {
    if (!node || typeof node !== 'object') return;

    // Check if current node matches any visitor (case-insensitive)
    if (node.kind && visitors[node.kind]) {
      visitors[node.kind](node);
    }

    // Handle children array specifically (php-parser uses this structure)
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => this.traverse(child, visitors));
    }

    // Also traverse body for class/interface/trait members
    if (node.body && Array.isArray(node.body)) {
      node.body.forEach(member => this.traverse(member, visitors));
    }

    // Traverse other properties that might contain nodes
    Object.keys(node).forEach(key => {
      if (key !== 'kind' && key !== 'children' && key !== 'body') {
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach(item => this.traverse(item, visitors));
        } else if (child && typeof child === 'object' && child.kind) {
          this.traverse(child, visitors);
        }
      }
    });
  }

  /**
   * Create a discovery signature from PHP metadata
   */
  createSignature(metadata, targetName) {
    // Find the target in classes, interfaces, or traits
    let target = null;
    let signature = null;

    // Check classes
    target = metadata.classes.find(c => c.name === targetName);
    if (target) {
      signature = {
        name: target.name,
        type: 'class',
        methods: target.methods
          .filter(m => m.visibility === 'public')
          .map(m => m.name),
        properties: target.properties
          .filter(p => p.visibility === 'public')
          .map(p => p.name)
      };

      if (target.extends) {
        signature.extends = target.extends;
      }
      if (target.implements?.length > 0) {
        signature.implements = target.implements;
      }
    }

    // Check interfaces
    if (!target) {
      target = metadata.interfaces.find(i => i.name === targetName);
      if (target) {
        signature = {
          name: target.name,
          type: 'interface',
          methods: target.methods.map(m => m.name)
        };
      }
    }

    // Check traits
    if (!target) {
      target = metadata.traits.find(t => t.name === targetName);
      if (target) {
        signature = {
          name: target.name,
          type: 'trait',
          methods: target.methods
            .filter(m => m.visibility === 'public')
            .map(m => m.name)
        };
      }
    }

    // Check functions
    if (!target) {
      target = metadata.functions.find(f => f.name === targetName);
      if (target) {
        signature = {
          name: target.name,
          type: 'function'
        };
      }
    }

    if (signature && metadata.namespace) {
      signature.namespace = metadata.namespace;
    }

    return signature;
  }

  /**
   * Format PHP namespace path
   */
  formatNamespace(namespace, className) {
    if (!namespace) return className;
    return `${namespace}\\${className}`;
  }
}

module.exports = { PHPDiscoveryCollector };