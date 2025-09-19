/**
 * Rust Discovery Integration
 *
 * Bridges Rust AST metadata into the adaptive-tests discovery engine. Provides
 * scoring utilities and Rust test template generation for the CLI scaffolder.
 *
 * Cross-platform implementation using Lezer parser - no binary dependencies.
 */

const path = require('path');
const { BaseLanguageIntegration } = require('../base-language-integration');
const { RustDiscoveryCollector } = require('./rust-discovery-collector');

class RustDiscoveryIntegration extends BaseLanguageIntegration {
  constructor(discoveryEngine) {
    super(discoveryEngine, 'rust');
    this.collector = new RustDiscoveryCollector();
  }

  /**
   * Get the file extension for Rust files
   */
  getFileExtension() {
    return '.rs';
  }

  /**
   * Parse a Rust file and extract metadata
   */
  async parseFile(filePath) {
    return await this.collector.parseFile(filePath);
  }

  /**
   * Extract candidates from Rust metadata
   */
  extractCandidates(metadata) {
    return [
      ...metadata.structs,
      ...metadata.enums,
      ...metadata.traits,
      ...metadata.functions,
      ...metadata.types
    ];
  }

  /**
   * Get candidate methods for Rust scoring
   * Includes methods from impl blocks for structs
   */
  getCandidateMethods(candidate, metadata) {
    const methods = new Set();

    // Add methods directly on candidate
    if (candidate.methods) {
      candidate.methods.forEach(method => {
        methods.add(method.name.toLowerCase());
      });
    }

    // For structs, also check methods from metadata.impls
    if (candidate.type === 'struct') {
      metadata.impls
        .filter(impl => {
          const implType = impl.type?.replace(/^&/, '').replace(/^mut\\s+/, '');
          return implType === candidate.name;
        })
        .forEach(impl => {
          impl.methods.forEach(method => methods.add(method.name.toLowerCase()));
        });
    }

    return methods;
  }

  /**
   * Rust-specific package matching (crate names)
   */
  scorePackageMatching(candidate, signature, metadata) {
    let score = 0;

    if (signature.crate && metadata && metadata.crateName) {
      if (metadata.crateName === signature.crate) {
        score += 15;
      } else {
        score -= 5;
      }
    }

    return score;
  }

  /**
   * Rust-specific scoring extensions
   */
  scoreLanguageSpecific(candidate, signature, metadata) {
    let score = 0;

    // Trait bounds matching (Rust's trait system)
    if (signature.traits && signature.traits.length > 0) {
      const candidateTraits = new Set();

      // Handle trait bounds and supertraits
      if (candidate.supertraits) {
        candidate.supertraits.forEach(trait => candidateTraits.add(trait.toLowerCase()));
      }

      // Check impl blocks for trait implementations
      metadata.impls
        .filter(impl => impl.type === candidate.name && impl.trait)
        .forEach(impl => {
          candidateTraits.add(impl.trait.toLowerCase());
        });

      let hits = 0;
      signature.traits.forEach(trait => {
        if (candidateTraits.has(trait.toLowerCase())) {
          hits += 1;
        }
      });
      score += hits * 8;
      if (hits === 0) {
        score -= 6;
      }
    }

    // Generic type matching
    if (signature.generics && signature.generics.length > 0) {
      const hasGenerics = candidate.generics && candidate.generics.length > 0;
      if (hasGenerics) {
        score += 10;

        // Match specific generic parameter names/constraints
        let genericHits = 0;
        signature.generics.forEach(sigGeneric => {
          const match = candidate.generics.find(candGeneric =>
            candGeneric.name.toLowerCase() === sigGeneric.toLowerCase() ||
            (candGeneric.bounds && candGeneric.bounds.some(bound =>
              bound.toLowerCase() === sigGeneric.toLowerCase()
            ))
          );
          if (match) genericHits += 1;
        });
        score += genericHits * 3;
      } else {
        score -= 5;
      }
    }

    // Derive attributes matching (useful for #[derive(Debug, Clone, etc.)])
    if (signature.derives && signature.derives.length > 0 && candidate.derives) {
      let deriveHits = 0;
      signature.derives.forEach(derive => {
        if (candidate.derives.includes(derive)) {
          deriveHits += 1;
        }
      });
      score += deriveHits * 4;
    }

    // Field matching for structs
    if (signature.fields && signature.fields.length > 0 && candidate.fields) {
      const candidateFields = new Set(candidate.fields.map(f => f.name.toLowerCase()));
      let hits = 0;
      signature.fields.forEach(field => {
        if (candidateFields.has(field.toLowerCase())) {
          hits += 1;
        }
      });
      score += hits * 6;
      if (hits === 0) {
        score -= 8;
      }
    }

    // Enum variant matching
    if (signature.variants && signature.variants.length > 0 && candidate.variants) {
      const candidateVariants = new Set(candidate.variants.map(v => v.name.toLowerCase()));
      let hits = 0;
      signature.variants.forEach(variant => {
        if (candidateVariants.has(variant.toLowerCase())) {
          hits += 1;
        }
      });
      score += hits * 7;
      if (hits === 0) {
        score -= 10;
      }
    }

    // Return type matching for functions
    if (signature.returns && candidate.returnType) {
      if (candidate.returnType.toLowerCase().includes(signature.returns.toLowerCase())) {
        score += 10;
      } else {
        score -= 5;
      }
    }

    // Parameter matching for functions
    if (signature.parameters && signature.parameters.length > 0 && candidate.parameters) {
      const expectedParamCount = signature.parameters.length;
      const actualParamCount = candidate.parameters.length;

      if (expectedParamCount === actualParamCount) {
        score += 8;
      } else {
        score -= Math.abs(expectedParamCount - actualParamCount) * 3;
      }
    }

    return score;
  }

  /**
   * Check if candidate type matches signature type
   */
  matchesType(candidateType, signatureType) {
    if (!candidateType) {
      return false;
    }
    if (signatureType === 'any') {
      return true;
    }
    return candidateType === signatureType;
  }

  /**
   * Evaluate a Rust file as a candidate
   */
  async evaluateRustCandidate(filePath, signature = {}) {
    return await this.evaluateCandidate(filePath, signature);
  }

  /**
   * Calculate score for Rust candidate
   */
  calculateRustScore(metadata, signature = {}) {
    return this.calculateScore(metadata, signature);
  }

  /**
   * Resolve a Rust target from a candidate
   */
  async resolveRustTarget(candidate, signature) {
    const metadata = candidate.metadata;
    let targetInfo = null;

    // Find the target in the metadata
    if (signature.type === 'struct' || !signature.type) {
      targetInfo = metadata.structs.find(s =>
        s.name.toLowerCase() === signature.name.toLowerCase()
      );
    }

    if (!targetInfo && (signature.type === 'enum' || !signature.type)) {
      targetInfo = metadata.enums.find(e =>
        e.name.toLowerCase() === signature.name.toLowerCase()
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

    if (!targetInfo && (signature.type === 'type' || !signature.type)) {
      targetInfo = metadata.types.find(t =>
        t.name.toLowerCase() === signature.name.toLowerCase()
      );
    }

    if (!targetInfo) {
      return null;
    }

    // Add impl methods for structs and enums
    if (targetInfo.type === 'struct' || targetInfo.type === 'enum') {
      const implMethods = metadata.impls
        .filter(impl => impl.type === targetInfo.name)
        .flatMap(impl => impl.methods || []);

      targetInfo.methods = [...(targetInfo.methods || []), ...implMethods];
    }

    // Return a Rust target descriptor
    return {
      language: 'rust',
      path: candidate.path,
      crateName: metadata.crateName,
      name: targetInfo.name,
      type: targetInfo.type,
      metadata: targetInfo,
      fullName: this.getFullyQualifiedName(metadata.crateName, targetInfo.name)
    };
  }

  /**
   * Get fully qualified name
   */
  getFullyQualifiedName(crateName, name) {
    if (!crateName) return name;
    return `${crateName}::${name}`;
  }

  /**
   * Generate Rust test from discovered target
   */
  generateRustTest(target, options = {}) {
    const testFileName = `${target.name.toLowerCase()}_test.rs`;
    const crateName = target.crateName || 'my_crate';

    let template = `use ${crateName}::${target.name};

#[cfg(test)]
mod tests {
    use super::*;

    // Adaptive test for ${target.name}
    //
    // This test was automatically generated and will survive refactoring.
    // The discovery engine will find ${target.name} even if it moves to a different location.
    //
    // Generated by adaptive-tests

`;

    // Generate tests based on target type
    if (target.type === 'struct') {
      template += this.generateStructTests(target, options);
    } else if (target.type === 'enum') {
      template += this.generateEnumTests(target, options);
    } else if (target.type === 'trait') {
      template += this.generateTraitTests(target, options);
    } else if (target.type === 'function') {
      template += this.generateFunctionTests(target, options);
    } else {
      template += this.generateGenericTests(target, options);
    }

    template += `}\n`;

    return template;
  }

  generateStructTests(target, options) {
    let tests = '';

    // Basic instantiation test
    tests += `    #[test]
    fn test_${target.name.toLowerCase()}_creation() {
        // Test that ${target.name} can be created
        // TODO: Initialize ${target.name} with appropriate parameters
        let _instance = ${target.name} {
            // TODO: Fill in fields
        };

        // TODO: Add assertions for proper initialization
    }

`;

    // Method tests
    if (target.metadata.methods && target.metadata.methods.length > 0) {
      target.metadata.methods
        .filter(method => method.visibility === 'public' || method.exported)
        .forEach(method => {
          const methodName = method.name;
          tests += `    #[test]
    fn test_${target.name.toLowerCase()}_${methodName.toLowerCase()}() {
        // Test ${target.name}::${methodName} method
        // TODO: Create instance of ${target.name}
        // let instance = ${target.name} { /* TODO: fields */ };

        // TODO: Call ${methodName} and verify behavior
        // let result = instance.${methodName}(${this.generateMethodParams(method)});

        // TODO: Add assertions
        panic!("Test not implemented yet");
    }

`;
        });
    }

    // Field tests for exported fields
    if (target.metadata.fields && target.metadata.fields.length > 0) {
      const exportedFields = target.metadata.fields.filter(field => field.visibility === 'public' || field.exported);
      if (exportedFields.length > 0) {
        tests += `    #[test]
    fn test_${target.name.toLowerCase()}_fields() {
        // Test ${target.name} field access
        let mut instance = ${target.name} {
            // TODO: Initialize fields
        };

`;
        exportedFields.forEach(field => {
          tests += `        // Test ${field.name} field
        // instance.${field.name} = ${this.getDefaultValue(field.type)};

`;
        });
        tests += `        // TODO: Add field validation assertions
        panic!("Field tests not implemented yet");
    }

`;
      }
    }

    return tests;
  }

  generateEnumTests(target, options) {
    let tests = '';

    tests += `    #[test]
    fn test_${target.name.toLowerCase()}_variants() {
        // Test ${target.name} enum variants
        // TODO: Test each variant

`;

    if (target.metadata.variants && target.metadata.variants.length > 0) {
      target.metadata.variants.forEach(variant => {
        tests += `        // TODO: Test ${variant.name} variant
        // let _variant = ${target.name}::${variant.name};

`;
      });
    }

    tests += `        panic!("Enum tests not implemented yet");
    }

`;

    return tests;
  }

  generateTraitTests(target, options) {
    let tests = '';

    tests += `    #[test]
    fn test_${target.name.toLowerCase()}_trait() {
        // Test ${target.name} trait implementation
        // TODO: Create a type that implements ${target.name}
        // struct Mock${target.name};

`;

    if (target.metadata.methods && target.metadata.methods.length > 0) {
      target.metadata.methods.forEach(method => {
        tests += `        // TODO: Implement ${method.name}(${this.generateMethodParams(method)}) -> ${method.returnType || '()'}
`;
      });
    }

    tests += `
        // TODO: Verify trait implementation
        // impl ${target.name} for Mock${target.name} { /* ... */ }
        panic!("Trait tests not implemented yet");
    }

`;

    return tests;
  }

  generateFunctionTests(target, options) {
    const functionName = target.name;

    return `    #[test]
    fn test_${functionName.toLowerCase()}() {
        // Test ${functionName} function
        // TODO: Call function with test parameters
        // let result = ${functionName}(${this.generateMethodParams(target.metadata)});

        // TODO: Verify function behavior
        // let expected = ${this.getDefaultValue(target.metadata.returnType)};
        // assert_eq!(result, expected);

        panic!("Function test not implemented yet");
    }

`;
  }

  generateGenericTests(target, options) {
    return `    #[test]
    fn test_${target.name.toLowerCase()}() {
        // Test ${target.name}
        // TODO: Implement test for ${target.type} ${target.name}
        panic!("Test not implemented yet");
    }

`;
  }

  generateMethodParams(method) {
    if (!method.parameters || method.parameters.length === 0) {
      return '';
    }

    return method.parameters
      .filter(param => param.name !== 'self' && !param.name.startsWith('&'))
      .map(param => this.getDefaultValue(param.type))
      .join(', ');
  }

  getDefaultValue(type) {
    if (!type) return '/* TODO */';

    const normalized = type.toLowerCase();

    if (normalized.includes('string') || normalized.includes('&str')) return '"test"';
    if (normalized.includes('i32') || normalized.includes('i64') || normalized.includes('usize')) return '0';
    if (normalized.includes('u32') || normalized.includes('u64')) return '0';
    if (normalized.includes('f32') || normalized.includes('f64')) return '0.0';
    if (normalized.includes('bool')) return 'true';
    if (normalized.includes('vec') || normalized.startsWith('[')) return 'Vec::new()';
    if (normalized.includes('hashmap') || normalized.includes('btreemap')) return 'HashMap::new()';
    if (normalized.includes('option')) return 'None';
    if (normalized.includes('result')) return 'Ok(())';
    if (normalized.startsWith('&')) return '/* TODO: reference */';

    return '/* TODO */';
  }

  /**
   * Generate test content for a target (required by base class)
   */
  generateTestContent(target, options = {}) {
    return this.generateRustTest(target, options);
  }
}

module.exports = {
  RustDiscoveryIntegration
};