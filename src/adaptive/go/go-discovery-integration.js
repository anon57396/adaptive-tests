/**
 * Go Discovery Integration
 *
 * Bridges Go AST metadata into the adaptive-tests discovery engine. Provides
 * scoring utilities and Go test template generation for the CLI scaffolder.
 */

const path = require('path');
const { BaseLanguageIntegration } = require('../base-language-integration');
const { GoDiscoveryCollector } = require('./go-discovery-collector');

class GoDiscoveryIntegration extends BaseLanguageIntegration {
  constructor(discoveryEngine) {
    super(discoveryEngine, 'go');
    this.collector = new GoDiscoveryCollector();
  }

  /**
   * Get the file extension for Go files
   */
  getFileExtension() {
    return '.go';
  }

  /**
   * Evaluate a Go file as a candidate
   */
  async evaluateGoCandidate(filePath, signature = {}) {
    const metadata = await this.collector.parseFile(filePath);
    if (!metadata) {
      return null;
    }

    const evaluation = this.calculateGoScore(metadata, signature);
    if (!evaluation || evaluation.score <= 0) {
      return null;
    }

    return {
      path: filePath,
      score: evaluation.score,
      metadata,
      match: evaluation.match,
      language: 'go'
    };
  }

  /**
   * Calculate score for Go candidate
   */
  calculateGoScore(metadata, signature = {}) {
    const candidates = [
      ...metadata.structs,
      ...metadata.interfaces,
      ...metadata.functions,
      ...metadata.types
    ];

    if (candidates.length === 0) {
      return null;
    }

    const targetName = signature.name || signature.typeName || null;
    const normalizedTarget = targetName ? targetName.toLowerCase() : null;

    let best = { score: 0, match: null };

    candidates.forEach(candidate => {
      const score = this.scoreCandidate(candidate, signature, normalizedTarget, metadata);
      if (score > best.score) {
        best = {
          score,
          match: candidate
        };
      }
    });

    return best;
  }

  scoreCandidate(candidate, signature, normalizedTargetName, metadata) {
    let score = 0;
    const candidateName = candidate.name.toLowerCase();

    // Name matching
    if (normalizedTargetName) {
      if (candidateName === normalizedTargetName) {
        score += 50;
      } else if (candidateName.includes(normalizedTargetName)) {
        score += 25;
      } else {
        score -= 15;
      }
    } else {
      score += 5;
    }

    // Type matching
    const signatureType = signature.type?.toLowerCase();
    if (signatureType) {
      if (this.matchesType(candidate.type, signatureType)) {
        score += 20;
      } else {
        score -= 25;
      }
    }

    // Package matching
    if (signature.package && metadata && metadata.packageName) {
      if (metadata.packageName === signature.package) {
        score += 15;
      } else {
        score -= 5;
      }
    }

    // Method matching for structs and interfaces
    if (signature.methods && signature.methods.length > 0) {
      const candidateMethods = new Set();

      if (candidate.methods) {
        candidate.methods.forEach(method => candidateMethods.add(method.name.toLowerCase()));
      }

      // For structs, also check methods from metadata.methods
      if (candidate.type === 'struct') {
        metadata.methods
          .filter(method => {
            const receiverType = method.receiver?.type?.replace('*', '');
            return receiverType === candidate.name;
          })
          .forEach(method => candidateMethods.add(method.name.toLowerCase()));
      }

      let hits = 0;
      signature.methods.forEach(method => {
        if (candidateMethods.has(method.toLowerCase())) {
          hits += 1;
        }
      });

      score += hits * 10;
      if (hits === 0 && signature.methods.length > 0) {
        score -= 12;
      }
    } else if (candidate.methods && candidate.methods.length > 0) {
      score += Math.min(candidate.methods.length * 2, 10);
    }

    // Embedding matching (Go's composition)
    if (signature.embeds && signature.embeds.length > 0) {
      const candidateEmbeds = new Set();

      // Handle both simple strings and embedded objects
      (candidate.embeds || []).forEach(embed => {
        if (typeof embed === 'string') {
          candidateEmbeds.add(embed.toLowerCase());
        } else if (embed.type) {
          candidateEmbeds.add(embed.type.toLowerCase());
          // Also add without pointer prefix
          candidateEmbeds.add(embed.type.replace('*', '').toLowerCase());
        }
      });

      let hits = 0;
      signature.embeds.forEach(embed => {
        if (candidateEmbeds.has(embed.toLowerCase())) {
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
      const hasGenerics = candidate.typeParameters && candidate.typeParameters.length > 0;
      if (hasGenerics) {
        score += 10;
      } else {
        score -= 5;
      }
    }

    // Tag matching for struct fields (useful for JSON, DB tags, etc.)
    if (signature.tags && signature.tags.length > 0 && candidate.fields) {
      let tagHits = 0;
      candidate.fields.forEach(field => {
        if (field.tag) {
          signature.tags.forEach(tag => {
            if (field.tag.includes(tag)) {
              tagHits += 1;
            }
          });
        }
      });
      score += tagHits * 3;
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

    // Exported vs unexported preference
    if (candidate.exported !== undefined) {
      if (candidate.exported) {
        score += 5; // Prefer exported symbols
      } else {
        score -= 2; // Slight penalty for unexported
      }
    }

    return score;
  }

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
   * Resolve a Go target from a candidate
   */
  async resolveGoTarget(candidate, signature) {
    // For Go, we don't actually load the module (since we're in Node.js)
    // Instead, we return metadata that can be used for test generation

    const metadata = candidate.metadata;
    let targetInfo = null;

    // Find the target in the metadata
    if (signature.type === 'struct' || !signature.type) {
      targetInfo = metadata.structs.find(s =>
        s.name.toLowerCase() === signature.name.toLowerCase()
      );
    }

    if (!targetInfo && (signature.type === 'interface' || !signature.type)) {
      targetInfo = metadata.interfaces.find(i =>
        i.name.toLowerCase() === signature.name.toLowerCase()
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

    // Add methods from metadata.methods for structs
    if (targetInfo.type === 'struct') {
      const structMethods = metadata.methods.filter(method => {
        const receiverType = method.receiver?.type?.replace('*', '');
        return receiverType === targetInfo.name;
      });
      targetInfo.methods = [...(targetInfo.methods || []), ...structMethods];
    }

    // Return a Go target descriptor
    return {
      language: 'go',
      path: candidate.path,
      packageName: metadata.packageName,
      name: targetInfo.name,
      type: targetInfo.type,
      metadata: targetInfo,
      fullName: this.getFullyQualifiedName(metadata.packageName, targetInfo.name)
    };
  }

  /**
   * Get fully qualified name
   */
  getFullyQualifiedName(packageName, name) {
    if (!packageName) return name;
    return `${packageName}.${name}`;
  }

  /**
   * Generate Go test from discovered target
   */
  generateGoTest(target, options = {}) {
    const testFileName = `${target.name.toLowerCase()}_test.go`;
    const packageName = target.packageName || 'main';

    let template = `package ${packageName}

import (
\t"testing"
)

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
    } else if (target.type === 'interface') {
      template += this.generateInterfaceTests(target, options);
    } else if (target.type === 'function') {
      template += this.generateFunctionTests(target, options);
    } else {
      template += this.generateGenericTests(target, options);
    }

    return template;
  }

  generateStructTests(target, options) {
    let tests = '';

    // Basic instantiation test
    tests += `func Test${target.name}Creation(t *testing.T) {
\t// Test that ${target.name} can be created
\t// TODO: Initialize ${target.name} with appropriate parameters
\t_ = ${target.name}{}
\t
\t// TODO: Add assertions for proper initialization
}

`;

    // Method tests
    if (target.metadata.methods && target.metadata.methods.length > 0) {
      target.metadata.methods
        .filter(method => method.exported)
        .forEach(method => {
          const methodName = method.name;
          tests += `func Test${target.name}_${methodName}(t *testing.T) {
\t// Test ${target.name}.${methodName} method
\t// TODO: Create instance of ${target.name}
\t// instance := ${target.name}{}
\t
\t// TODO: Call ${methodName} and verify behavior
\t// result := instance.${methodName}(${this.generateMethodParams(method)})
\t
\t// TODO: Add assertions
\tt.Skip("Test not implemented yet")
}

`;
        });
    }

    // Field tests for exported fields
    if (target.metadata.fields && target.metadata.fields.length > 0) {
      const exportedFields = target.metadata.fields.filter(field => field.exported);
      if (exportedFields.length > 0) {
        tests += `func Test${target.name}_Fields(t *testing.T) {
\t// Test ${target.name} field access
\tinstance := ${target.name}{}
\t
`;
        exportedFields.forEach(field => {
          tests += `\t// Test ${field.name} field
\t// instance.${field.name} = ${this.getDefaultValue(field.type)}
\t
`;
        });
        tests += `\t// TODO: Add field validation assertions
\tt.Skip("Field tests not implemented yet")
}

`;
      }
    }

    return tests;
  }

  generateInterfaceTests(target, options) {
    let tests = '';

    tests += `func Test${target.name}Interface(t *testing.T) {
\t// Test ${target.name} interface compliance
\t// TODO: Create a type that implements ${target.name}
\t// type Mock${target.name} struct {}
\t
`;

    if (target.metadata.methods && target.metadata.methods.length > 0) {
      target.metadata.methods.forEach(method => {
        tests += `\t// TODO: Implement ${method.name}(${this.generateMethodParams(method)}) ${method.returnType || ''}
`;
      });
    }

    tests += `\t
\t// TODO: Verify interface implementation
\t// var _ ${target.name} = (*Mock${target.name})(nil)
\tt.Skip("Interface tests not implemented yet")
}

`;

    return tests;
  }

  generateFunctionTests(target, options) {
    const functionName = target.name;

    return `func Test${functionName}(t *testing.T) {
\t// Test ${functionName} function
\t// TODO: Call function with test parameters
\t// result := ${functionName}(${this.generateMethodParams(target.metadata)})
\t
\t// TODO: Verify function behavior
\t// expected := ${this.getDefaultValue(target.metadata.returnType)}
\t// if result != expected {
\t//     t.Errorf("Expected %v, got %v", expected, result)
\t// }
\t
\tt.Skip("Function test not implemented yet")
}

`;
  }

  generateGenericTests(target, options) {
    return `func Test${target.name}(t *testing.T) {
\t// Test ${target.name}
\t// TODO: Implement test for ${target.type} ${target.name}
\tt.Skip("Test not implemented yet")
}

`;
  }

  generateMethodParams(method) {
    if (!method.parameters || method.parameters.length === 0) {
      return '';
    }

    return method.parameters
      .map(param => this.getDefaultValue(param.type))
      .join(', ');
  }

  getDefaultValue(type) {
    if (!type) return 'nil';

    const normalized = type.toLowerCase();

    if (normalized.includes('string')) return '"test"';
    if (normalized.includes('int') && !normalized.includes('interface')) return '0';
    if (normalized.includes('float')) return '0.0';
    if (normalized.includes('bool')) return 'false';
    if (normalized.includes('[]')) return 'nil';
    if (normalized.includes('map')) return 'nil';
    if (normalized.includes('chan')) return 'nil';
    if (normalized.startsWith('*')) return 'nil';

    return 'nil';
  }
}

module.exports = {
  GoDiscoveryIntegration
};