/**
 * PHP Discovery Integration
 *
 * Integrates PHP discovery into the adaptive-tests discovery engine using the
 * shared BaseLanguageIntegration contract. Provides scoring utilities and
 * PHPUnit test template generation for the CLI scaffolder.
 */

const path = require('path');
const { BaseLanguageIntegration } = require('../base-language-integration');
const { PHPDiscoveryCollector } = require('./php-discovery-collector');

class PhpDiscoveryIntegration extends BaseLanguageIntegration {
  constructor(discoveryEngine) {
    super(discoveryEngine, 'php');
    this.collector = new PHPDiscoveryCollector();
  }

  getFileExtension() {
    return '.php';
  }

  async parseFile(filePath) {
    if (!this.collector.shouldScanFile(filePath)) {
      return null;
    }

    const metadata = await this.collector.parseFile(filePath);
    if (!metadata) {
      return null;
    }

    metadata.namespace = metadata.namespace || null;
    metadata.exports = this.buildExports(metadata);
    return metadata;
  }

  extractCandidates(metadata) {
    const namespace = metadata.namespace || null;
    const candidates = [];

    metadata.classes.forEach(cls => {
      candidates.push({
        name: cls.name,
        type: 'class',
        namespace,
        fullName: this.getFullyQualifiedName(namespace, cls.name),
        methods: cls.methods.map(method => ({ name: method.name, visibility: method.visibility })),
        properties: cls.properties,
        constants: cls.constants,
        extends: cls.extends,
        implements: cls.implements,
        traits: cls.traits,
        metadata: cls,
        visibility: 'public',
        exported: true
      });
    });

    metadata.interfaces.forEach(intf => {
      candidates.push({
        name: intf.name,
        type: 'interface',
        namespace,
        fullName: this.getFullyQualifiedName(namespace, intf.name),
        methods: intf.methods.map(method => ({ name: method.name })),
        extends: intf.extends,
        metadata: intf,
        visibility: 'public',
        exported: true
      });
    });

    metadata.traits.forEach(trait => {
      candidates.push({
        name: trait.name,
        type: 'trait',
        namespace,
        fullName: this.getFullyQualifiedName(namespace, trait.name),
        methods: trait.methods.map(method => ({ name: method.name, visibility: method.visibility })),
        metadata: trait,
        visibility: 'public',
        exported: true
      });
    });

    metadata.functions.forEach(fn => {
      candidates.push({
        name: fn.name,
        type: 'function',
        namespace,
        fullName: this.getFullyQualifiedName(namespace, fn.name),
        methods: [],
        metadata: fn,
        visibility: fn.name?.startsWith('_') ? 'private' : 'public',
        exported: !fn.name?.startsWith('_')
      });
    });

    return candidates;
  }

  scorePackageMatching(candidate, signature, metadata) {
    if (!signature?.namespace) {
      return 0;
    }

    const candidateNamespace = candidate.namespace || metadata?.namespace || null;
    if (!candidateNamespace) {
      return -3;
    }

    const normalizedCandidate = this.normalizeNamespace(candidateNamespace);
    const normalizedSignature = this.normalizeNamespace(signature.namespace);

    if (normalizedCandidate === normalizedSignature) {
      return 18;
    }

    if (normalizedCandidate.endsWith(`\\${normalizedSignature}`)) {
      return 8;
    }

    if (normalizedSignature.endsWith(`\\${normalizedCandidate}`)) {
      return 5;
    }

    return -6;
  }

  scoreLanguageSpecific(candidate, signature) {
    let score = 0;

    if (candidate.type === 'class') {
      score += this.scoreClassSpecific(candidate, signature);
    } else if (candidate.type === 'interface') {
      score += this.scoreInterfaceSpecific(candidate, signature);
    } else if (candidate.type === 'trait') {
      score += this.scoreTraitSpecific(candidate, signature);
    }

    return score;
  }

  scoreClassSpecific(candidate, signature) {
    let score = 0;

    if (signature.extends) {
      const extendsMatch = candidate.extends === signature.extends;
      score += extendsMatch ? 15 : -6;
    }

    if (Array.isArray(signature.implements) && signature.implements.length > 0) {
      const candidateImplements = new Set(candidate.implements || []);
      let hits = 0;
      signature.implements.forEach(iface => {
        if (candidateImplements.has(iface)) {
          hits += 1;
        }
      });
      score += hits * 10;
      if (hits === 0) {
        score -= 8;
      }
    }

    if (Array.isArray(signature.traits) && signature.traits.length > 0) {
      const candidateTraits = new Set(candidate.traits || []);
      let hits = 0;
      signature.traits.forEach(trait => {
        if (candidateTraits.has(trait)) {
          hits += 1;
        }
      });
      score += hits * 6;
    }

    if (Array.isArray(signature.properties) && signature.properties.length > 0) {
      const propertyNames = new Set((candidate.properties || []).map(prop => prop.name));
      let hits = 0;
      signature.properties.forEach(prop => {
        if (propertyNames.has(prop)) {
          hits += 1;
        }
      });
      if (hits > 0) {
        score += hits * 5;
      } else {
        score -= 5;
      }
    }

    return score;
  }

  scoreInterfaceSpecific(candidate, signature) {
    let score = 0;

    if (Array.isArray(signature.extends) && signature.extends.length > 0) {
      const candidateExtends = new Set(candidate.extends || []);
      let hits = 0;
      signature.extends.forEach(name => {
        if (candidateExtends.has(name)) {
          hits += 1;
        }
      });
      score += hits * 6;
      if (hits === 0) {
        score -= 4;
      }
    }

    return score;
  }

  scoreTraitSpecific(candidate, signature) {
    if (!Array.isArray(signature.methods) || signature.methods.length === 0) {
      return 0;
    }

    const methodNames = new Set(candidate.methods.map(method => method.name));
    let hits = 0;
    signature.methods.forEach(method => {
      if (methodNames.has(method)) {
        hits += 1;
      }
    });

    if (hits === 0) {
      return -5;
    }

    return hits * 4;
  }

  generateTestContent(target, options = {}) {
    return this.generatePHPTest(target, options);
  }

  generatePHPTest(target) {
    const testClassName = `${target.name}Test`;
    const namespace = target.namespace ?
      `Tests\\${target.namespace}` :
      'Tests';

    let template = `<?php

namespace ${namespace};

use PHPUnit\\Framework\\TestCase;${target.namespace ? `
use ${target.namespace}\\${target.name};` : ''}

/**
 * Adaptive test for ${target.name}
 *
 * This test was automatically generated and will survive refactoring.
 * The discovery engine will find ${target.name} even if it moves to a different location.
 *
 * @generated by adaptive-tests
 */
class ${testClassName} extends TestCase
{
    /**
     * @var ${target.name}
     */
    private $target;

    protected function setUp(): void
    {
        parent::setUp();
        // Initialize your target here
        // $this->target = new ${target.name}();
    }

`;

    if (target.metadata && target.metadata.methods) {
      target.metadata.methods
        .filter(method => method.visibility === 'public' && method.name !== '__construct')
        .forEach(method => {
          template += `    /**
     * Test ${method.name} method
     */
    public function test${this.capitalize(method.name)}()
    {
        // TODO: Implement test for ${method.name}
        $this->markTestIncomplete(
            'This test has not been implemented yet.'
        );
    }

`;
        });
    }

    template += `    /**
     * Test that ${target.name} can be discovered
     */
    public function testDiscovery()
    {
        // This test verifies the class can be instantiated
        // and is discoverable by the adaptive test engine
        $this->assertInstanceOf(
            ${target.name}::class,
            new ${target.name}()
        );
    }
}
`;

    return template;
  }

  getFullyQualifiedName(namespace, name) {
    if (!namespace) return name;
    return `${namespace}\\${name}`;
  }

  normalizeNamespace(namespace) {
    return (namespace || '').replace(/\\+/g, '\\');
  }

  capitalize(value) {
    if (!value || value.length === 0) {
      return '';
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  buildExports(metadata) {
    const exports = [];
    const namespace = metadata.namespace || null;

    metadata.classes.forEach(cls => {
      const publicMethods = cls.methods.filter(method => method.visibility === 'public').map(method => method.name);
      exports.push({
        exportedName: cls.name,
        access: { type: 'default' },
        info: {
          name: cls.name,
          kind: 'class',
          methods: publicMethods,
          properties: cls.properties.filter(prop => prop.visibility === 'public').map(prop => prop.name),
          extends: cls.extends,
          implements: cls.implements,
          namespace,
          php: {
            type: 'class',
            name: cls.name,
            namespace,
            methods: cls.methods,
            properties: cls.properties,
            traits: cls.traits
          }
        }
      });
    });

    metadata.interfaces.forEach(intf => {
      exports.push({
        exportedName: intf.name,
        access: { type: 'default' },
        info: {
          name: intf.name,
          kind: 'interface',
          methods: intf.methods.map(method => method.name),
          namespace,
          php: {
            type: 'interface',
            name: intf.name,
            namespace,
            methods: intf.methods
          }
        }
      });
    });

    metadata.traits.forEach(trait => {
      exports.push({
        exportedName: trait.name,
        access: { type: 'default' },
        info: {
          name: trait.name,
          kind: 'trait',
          methods: trait.methods.map(method => method.name),
          namespace,
          php: {
            type: 'trait',
            name: trait.name,
            namespace,
            methods: trait.methods
          }
        }
      });
    });

    metadata.functions.forEach(fn => {
      exports.push({
        exportedName: fn.name,
        access: { type: 'default' },
        info: {
          name: fn.name,
          kind: 'function',
          methods: [],
          namespace,
          php: {
            type: 'function',
            name: fn.name,
            namespace,
            parameters: fn.parameters,
            returnType: fn.returnType
          }
        }
      });
    });

    return exports;
  }
}

module.exports = { PhpDiscoveryIntegration };
