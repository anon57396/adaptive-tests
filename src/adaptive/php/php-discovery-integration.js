/**
 * PHP Discovery Integration
 *
 * Integrates PHP discovery into the main adaptive-tests discovery engine.
 * This module acts as a bridge between the PHP parser and the existing infrastructure.
 */

const path = require('path');
const { PHPDiscoveryCollector } = require('./php-discovery-collector');

class PHPDiscoveryIntegration {
  constructor(discoveryEngine) {
    this.engine = discoveryEngine;
    this.phpCollector = new PHPDiscoveryCollector();

    // Add PHP extensions to config if not present
    if (this.engine && this.engine.config &&
        !this.engine.config.discovery.extensions.includes('.php')) {
      this.engine.config.discovery.extensions.push('.php');
    }
  }

  /**
   * Evaluate a PHP file as a candidate
   */
  async evaluatePHPCandidate(filePath, signature) {
    // Parse PHP file
    const metadata = await this.phpCollector.parseFile(filePath);
    if (!metadata) {
      return null;
    }

    // Score the candidate
    const score = this.calculatePHPScore(metadata, signature, filePath);
    if (score <= 0) {
      return null;
    }

    // Create candidate object
    const candidate = {
      path: filePath,
      score,
      metadata,
      language: 'php'
    };

    // Add namespace information if available
    if (metadata.namespace) {
      candidate.namespace = metadata.namespace;
    }

    return candidate;
  }

  /**
   * Calculate score for PHP candidate
   */
  calculatePHPScore(metadata, signature, filePath) {
    let score = 0;
    const fileName = path.basename(filePath, '.php');

    // Name matching
    const targetName = signature.name;

    // Check classes
    const matchingClass = metadata.classes.find(c =>
      c.name.toLowerCase() === targetName.toLowerCase()
    );
    if (matchingClass) {
      score += 50; // Strong match for class name

      // Type matching
      if (signature.type === 'class') {
        score += 20;
      }

      // Method matching
      if (signature.methods && Array.isArray(signature.methods)) {
        const classMethods = matchingClass.methods.map(m => m.name);
        const matchedMethods = signature.methods.filter(m =>
          classMethods.includes(m)
        );
        score += matchedMethods.length * 10;
      }

      // Property matching
      if (signature.properties && Array.isArray(signature.properties)) {
        const classProperties = matchingClass.properties.map(p => p.name);
        const matchedProperties = signature.properties.filter(p =>
          classProperties.includes(p)
        );
        score += matchedProperties.length * 5;
      }

      // Inheritance matching
      if (signature.extends && matchingClass.extends === signature.extends) {
        score += 15;
      }

      // Interface matching
      if (signature.implements && matchingClass.implements) {
        const matchedInterfaces = signature.implements.filter(i =>
          matchingClass.implements.includes(i)
        );
        score += matchedInterfaces.length * 10;
      }
    }

    // Check interfaces
    const matchingInterface = metadata.interfaces.find(i =>
      i.name.toLowerCase() === targetName.toLowerCase()
    );
    if (matchingInterface) {
      score += 50;
      if (signature.type === 'interface') {
        score += 20;
      }
    }

    // Check traits
    const matchingTrait = metadata.traits.find(t =>
      t.name.toLowerCase() === targetName.toLowerCase()
    );
    if (matchingTrait) {
      score += 50;
      if (signature.type === 'trait') {
        score += 20;
      }
    }

    // Check functions
    const matchingFunction = metadata.functions.find(f =>
      f.name.toLowerCase() === targetName.toLowerCase()
    );
    if (matchingFunction) {
      score += 50;
      if (signature.type === 'function') {
        score += 20;
      }
    }

    // File name matching
    if (fileName.toLowerCase() === targetName.toLowerCase()) {
      score += 25;
    } else if (fileName.toLowerCase().includes(targetName.toLowerCase())) {
      score += 10;
    }

    // Path scoring
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Prefer src/ directory
    if (normalizedPath.includes('/src/')) {
      score += 15;
    }

    // Prefer app/ directory (common in Laravel)
    if (normalizedPath.includes('/app/')) {
      score += 15;
    }

    // Penalize vendor directory (cross-platform)
    const pathSegments = normalizedPath.split(path.sep);
    if (pathSegments.includes('vendor')) {
      score -= 50;
    }

    // Penalize test files (case-insensitive for cross-platform)
    const hasTestDir = pathSegments.some(seg =>
      seg.toLowerCase() === 'tests' || seg.toLowerCase() === 'test'
    );
    if (hasTestDir || fileName.endsWith('Test')) {
      score -= 30;
    }

    return score;
  }

  /**
   * Resolve a PHP target from a candidate
   */
  async resolvePHPTarget(candidate, signature) {
    // For PHP, we don't actually load the module (since we're in Node.js)
    // Instead, we return metadata that can be used for test generation

    const metadata = candidate.metadata;
    let targetInfo = null;

    // Find the target in the metadata
    if (signature.type === 'class' || !signature.type) {
      targetInfo = metadata.classes.find(c =>
        c.name.toLowerCase() === signature.name.toLowerCase()
      );
    }

    if (!targetInfo && (signature.type === 'interface' || !signature.type)) {
      targetInfo = metadata.interfaces.find(i =>
        i.name.toLowerCase() === signature.name.toLowerCase()
      );
    }

    if (!targetInfo && (signature.type === 'trait' || !signature.type)) {
      targetInfo = metadata.traits.find(t =>
        t.name.toLowerCase() === signature.name.toLowerCase()
      );
    }

    if (!targetInfo && (signature.type === 'function' || !signature.type)) {
      targetInfo = metadata.functions.find(f =>
        f.name.toLowerCase() === signature.name.toLowerCase()
      );
    }

    if (!targetInfo) {
      return null;
    }

    // Return a PHP target descriptor
    return {
      language: 'php',
      path: candidate.path,
      namespace: metadata.namespace,
      name: targetInfo.name,
      type: targetInfo.type,
      metadata: targetInfo,
      fullName: this.getFullyQualifiedName(metadata.namespace, targetInfo.name)
    };
  }

  /**
   * Get fully qualified name
   */
  getFullyQualifiedName(namespace, name) {
    if (!namespace) return name;
    return `${namespace}\\${name}`;
  }

  /**
   * Generate PHPUnit test from discovered target
   */
  generatePHPTest(target, options = {}) {
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

    // Add test methods for each public method
    if (target.metadata && target.metadata.methods) {
      target.metadata.methods
        .filter(m => m.visibility === 'public' && m.name !== '__construct')
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

  /**
   * Capitalize first letter
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = { PHPDiscoveryIntegration };