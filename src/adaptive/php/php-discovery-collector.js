/**
 * PHP Discovery Collector
 *
 * Extends adaptive-tests discovery to support PHP files using php-parser.
 * Handles PHP namespaces, classes, interfaces, traits, and functions.
 */

const fs = require('fs');
const path = require('path');
const PhpParser = require('php-parser');

// Initialize PHP parser with PHP 8.2 support
const parser = new PhpParser({
  parser: {
    php8: true,
    extractDoc: true,
    suppressErrors: false
  },
  ast: {
    withPositions: true
  }
});

class PHPDiscoveryCollector {
  constructor(config = {}) {
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
      const ast = parser.parseCode(content, filePath);

      return this.extractMetadata(ast, filePath);
    } catch (error) {
      // Return null for files we can't parse
      if (process.env.DEBUG_DISCOVERY) {
        console.log(`Failed to parse PHP file ${filePath}:`, error.message);
      }
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
      Namespace: (node) => {
        metadata.namespace = node.name;
      },
      UseItem: (node) => {
        metadata.imports.push({
          name: node.name,
          alias: node.alias
        });
      },
      Class: (node) => {
        metadata.classes.push(this.extractClassInfo(node));
      },
      Interface: (node) => {
        metadata.interfaces.push(this.extractInterfaceInfo(node));
      },
      Trait: (node) => {
        metadata.traits.push(this.extractTraitInfo(node));
      },
      Function: (node) => {
        // Only top-level functions
        if (node.isGlobal) {
          metadata.functions.push(this.extractFunctionInfo(node));
        }
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

    // Check if current node matches any visitor
    if (node.kind && visitors[node.kind]) {
      visitors[node.kind](node);
    }

    // Traverse children
    Object.values(node).forEach(child => {
      if (Array.isArray(child)) {
        child.forEach(item => this.traverse(item, visitors));
      } else if (child && typeof child === 'object') {
        this.traverse(child, visitors);
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