/**
 * Java Discovery Integration
 *
 * Bridges Java AST metadata into the adaptive-tests discovery engine. Provides
 * scoring utilities and JUnit 5 template generation for the CLI scaffolder.
 */

const path = require('path');
const { BaseLanguageIntegration } = require('../base-language-integration');
const { JavaDiscoveryCollector } = require('./java-discovery-collector');

class JavaDiscoveryIntegration extends BaseLanguageIntegration {
  constructor(discoveryEngine) {
    super(discoveryEngine, 'java');
    this.collector = new JavaDiscoveryCollector();
  }

  /**
   * Get the file extension for Java files
   */
  getFileExtension() {
    return '.java';
  }

  /**
   * Evaluate a Java file as a candidate (legacy method)
   * @deprecated Use evaluateCandidateAsync for consistent async patterns
   */
  async evaluateJavaCandidate(filePath, signature = {}) {
    return this.evaluateCandidateAsync(filePath, signature);
  }

  /**
   * Standardized async candidate evaluation for Java
   */
  async evaluateCandidateAsync(filePath, signature = {}) {
    return this.asyncHelper.evaluateCandidate(filePath, signature, async (path, sig) => {
      const metadata = await this.parseFileAsync(path);
      if (!metadata) {
        this.errorHandler.logWarning('Failed to parse Java file', { filePath: path });
        return null;
      }

      const evaluation = this.calculateJavaScore(metadata, sig);
      if (!evaluation || evaluation.score <= 0) {
        this.logScoreDebug(evaluation?.match, sig, evaluation?.score || 0);
        return null;
      }

      this.logScoreDebug(evaluation.match, sig, evaluation.score);
      return {
        path,
        score: evaluation.score,
        metadata,
        match: evaluation.match,
        language: 'java'
      };
    });
  }

  calculateJavaScore(metadata, signature = {}) {
    const candidates = [
      ...metadata.classes,
      ...metadata.interfaces,
      ...metadata.enums,
      ...metadata.records
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
    const candidateName = candidate.fullName || candidate.name;
    const candidateSimple = candidate.name.toLowerCase();

    if (normalizedTargetName) {
      if (candidateSimple === normalizedTargetName) {
        score += 50;
      } else if ((candidate.fullName || '').toLowerCase() === normalizedTargetName) {
        score += 45;
      } else if (candidateSimple.includes(normalizedTargetName)) {
        score += 25;
      } else {
        score -= 15;
      }
    } else {
      score += 5;
    }

    const signatureType = signature.type?.toLowerCase();
    if (signatureType) {
      if (this.matchesType(candidate.type, signatureType)) {
        score += 20;
      } else if (signatureType === 'class' && candidate.type === 'record') {
        score += 10;
      } else {
        score -= 25;
      }
    }

    if (signature.package && metadata && metadata.packageName) {
      if (candidate.packageName === signature.package) {
        score += 15;
      } else {
        score -= 5;
      }
    }

    if (signature.annotations && signature.annotations.length > 0) {
      const candidateAnnotations = new Set((candidate.annotations || []).map(a => a.name.toLowerCase()));
      let annotationHits = 0;
      signature.annotations.forEach(annotation => {
        if (candidateAnnotations.has(annotation.toLowerCase())) {
          annotationHits += 1;
        }
      });
      score += annotationHits * 8;
      if (annotationHits === 0) {
        score -= 8;
      }
    }

    if (signature.extends) {
      const candidateExtends = (candidate.extends || '').split(',').map(v => v.trim().toLowerCase());
      const normalizedExtends = signature.extends.toLowerCase();
      if (candidateExtends.includes(normalizedExtends)) {
        score += 12;
      } else {
        score -= 6;
      }
    }

    if (signature.implements && signature.implements.length > 0) {
      const implemented = new Set((candidate.implements || []).map(v => this.normalizeTypeName(v)));
      let hits = 0;
      signature.implements.forEach(value => {
        if (implemented.has(this.normalizeTypeName(value))) {
          hits += 1;
        }
      });
      score += hits * 6;
      if (hits === 0) {
        score -= 6;
      }
    }

    if (signature.methods && signature.methods.length > 0) {
      const methodNames = new Set((candidate.methods || []).map(method => method.name.toLowerCase()));
      let hits = 0;
      signature.methods.forEach(method => {
        if (methodNames.has(method.toLowerCase())) {
          hits += 1;
        }
      });
      score += hits * 10;
      if (hits === 0) {
        score -= 12;
      }
    } else if (candidate.methods && candidate.methods.length > 0) {
      score += Math.min(candidate.methods.length * 2, 10);
    }

    if (candidate.modifiers?.abstract) {
      score -= 5;
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
    if (candidateType === signatureType) {
      return true;
    }
    if (signatureType === 'class' && candidateType === 'record') {
      return true;
    }
    return false;
  }

  normalizeTypeName(value) {
    if (!value) {
      return '';
    }
    const cleaned = value.toString().replace(/<.*?>/g, '');
    return cleaned.split('.').pop().toLowerCase();
  }

  generateJUnitTest({ target, signature = {}, options = {} }) {
    if (!target) {
      throw new Error('generateJUnitTest requires a target type');
    }
    const packageName = options.packageName || target.packageName || null;
    const testClassName = options.testClassName || `${target.name}Test`;
    const subjectReference = this.buildSubjectReference(target, options);
    const imports = new Set([
      'org.junit.jupiter.api.Test',
      'org.junit.jupiter.api.BeforeEach',
      'org.junit.jupiter.api.DisplayName',
      'static org.junit.jupiter.api.Assertions.*'
    ]);

    const methodBlocks = this.buildMethodBlocks(target, signature, subjectReference, imports);

    const lines = [];
    if (packageName) {
      lines.push(`package ${packageName};`, '');
    }
    Array.from(imports).sort().forEach(importLine => {
      lines.push(`import ${importLine};`);
    });
    lines.push('');
    lines.push(`class ${testClassName} {`);

    if (subjectReference.setup) {
      lines.push('    private ' + subjectReference.typeName + ' subject;');
      lines.push('');
      lines.push('    @BeforeEach');
      lines.push('    void setUp() {');
      lines.push(`        ${subjectReference.setup}`);
      lines.push('    }');
      lines.push('');
    }

    if (methodBlocks.length === 0) {
      lines.push('    @Test');
      lines.push('    void canInstantiate() {');
      lines.push(`        ${subjectReference.invocation};`);
      lines.push('        // TODO: add assertions');
      lines.push('    }');
    } else {
      methodBlocks.forEach(block => {
        lines.push(...block);
        lines.push('');
      });
      lines.pop(); // remove extra blank line
    }

    lines.push('}');
    lines.push('');

    return lines.join('\n');
  }

  buildSubjectReference(target, options) {
    const fullyQualified = target.fullName || target.name;
    const typeName = fullyQualified.includes('.') ? fullyQualified.split('.').pop() : fullyQualified;
    if (target.type === 'class' || target.type === 'record') {
      const constructor = (target.methods || []).find(method => method.isConstructor);
      const args = constructor ? constructor.parameters.map(param => this.placeholderForType(param.type)).join(', ') : '';
      return {
        typeName,
        setup: `subject = new ${typeName}(${args});`,
        invocation: `new ${typeName}(${args})`
      };
    }
    if (target.type === 'enum') {
      const enumConstant = (target.constants || [])[0] || 'VALUES';
      return {
        typeName,
        setup: null,
        invocation: `${typeName}.valueOf("${enumConstant}")`
      };
    }
    if (target.type === 'interface') {
      const adapterName = `${typeName}Stub`;
      return {
        typeName,
        setup: `subject = new ${adapterName}(); // TODO: supply test double implementation`,
        invocation: `new ${adapterName}()`
      };
    }
    return {
      typeName,
      setup: null,
      invocation: `new ${typeName}()`
    };
  }

  buildMethodBlocks(target, signature, subjectReference, imports) {
    const methods = target.methods || [];
    if (methods.length === 0) {
      return [];
    }
    return methods
      .filter(method => !method.isConstructor)
      .map(method => {
        const displayName = method.name.replace(/([A-Z])/g, ' $1').trim();
        const parameterPlaceholders = method.parameters.map(param => this.placeholderForType(param.type));
        const invocation = this.buildMethodInvocation(target, method, subjectReference, parameterPlaceholders);
        const assertions = this.inferAssertions(method, imports);
        return [
          '    @Test',
          `    @DisplayName("${displayName}")`,
          '    void ' + method.name + '() {',
          ...invocation.map(line => '        ' + line),
          ...assertions.map(line => '        ' + line),
          '    }'
        ];
      });
  }

  buildMethodInvocation(target, method, subjectReference, args) {
    if (target.type === 'interface' || method.modifiers?.static) {
      const invocation = `${target.name}.${method.name}(${args.join(', ')});`;
      return ['// Arrange', '// TODO: provide inputs', `var result = ${invocation}`, '// Assert'];
    }
    const subjectVar = subjectReference.setup ? 'subject' : `new ${subjectReference.typeName}()`;
    if (!subjectReference.setup && target.type === 'class') {
      const ctorArgs = (method.isConstructor && method.parameters) ? method.parameters.map(param => this.placeholderForType(param.type)).join(', ') : '';
      return [
        '// Arrange',
        `var target = new ${subjectReference.typeName}(${ctorArgs});`,
        '// Act',
        `var result = target.${method.name}(${args.join(', ')});`,
        '// Assert'
      ];
    }
    return [
      '// Arrange',
      '// TODO: customize inputs',
      `var result = ${subjectVar}.${method.name}(${args.join(', ')});`,
      '// Assert'
    ];
  }

  inferAssertions(method, imports) {
    const assertions = [];
    const returnType = (method.returnType || 'void').toLowerCase();
    if (returnType === 'void') {
      assertions.push('// TODO: verify side effects');
      return assertions;
    }
    if (returnType.includes('boolean')) {
      assertions.push('assertTrue(result);');
    } else if (returnType.includes('int') || returnType.includes('long') || returnType.includes('double') || returnType.includes('float')) {
      assertions.push('assertNotNull(result);');
      assertions.push('// assertEquals(expected, result);');
    } else if (returnType.includes('list') || returnType.includes('set') || returnType.includes('collection')) {
      assertions.push('assertNotNull(result);');
      assertions.push('// assertFalse(result.isEmpty());');
    } else {
      assertions.push('assertNotNull(result);');
    }
    return assertions;
  }

  placeholderForType(type) {
    if (!type) {
      return 'null';
    }
    const normalized = type.toLowerCase();
    if (normalized.includes('string')) {
      return '"TODO"';
    }
    if (normalized.includes('int') || normalized.includes('long') || normalized.includes('short')) {
      return '0';
    }
    if (normalized.includes('double') || normalized.includes('float')) {
      return '0.0';
    }
    if (normalized.includes('boolean')) {
      return 'false';
    }
    return 'null';
  }
}

module.exports = {
  JavaDiscoveryIntegration
};
