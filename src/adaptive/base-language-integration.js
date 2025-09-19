/**
 * Base Language Integration
 *
 * Provides shared scoring logic and common patterns for all language integrations.
 * Each language-specific integration should extend this class and implement
 * language-specific methods while leveraging shared scoring algorithms.
 */

class BaseLanguageIntegration {
  constructor(discoveryEngine, language) {
    this.engine = discoveryEngine;
    this.language = language;
    this.addExtensionToConfig();
  }

  /**
   * Add language extension to discovery engine config if not present
   */
  addExtensionToConfig() {
    if (this.engine && this.engine.config && this.engine.config.discovery) {
      const { extensions } = this.engine.config.discovery;
      const ext = this.getFileExtension();
      if (Array.isArray(extensions) && !extensions.includes(ext)) {
        extensions.push(ext);
      }
    }
  }

  /**
   * Get the file extension for this language
   * Must be implemented by subclasses
   */
  getFileExtension() {
    throw new Error(`getFileExtension() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Shared candidate scoring algorithm
   * Uses common patterns found across all language integrations
   */
  scoreCandidate(candidate, signature, normalizedTargetName, metadata) {
    let score = 0;

    // Base name matching (common across all languages)
    score += this.scoreNameMatching(candidate, normalizedTargetName);

    // Type matching (common across all languages)
    score += this.scoreTypeMatching(candidate, signature);

    // Package/namespace matching (language-specific)
    score += this.scorePackageMatching(candidate, signature, metadata);

    // Method matching (common across most languages)
    score += this.scoreMethodMatching(candidate, signature, metadata);

    // Language-specific scoring extensions
    score += this.scoreLanguageSpecific(candidate, signature, metadata);

    // Visibility preference (common across all languages)
    score += this.scoreVisibility(candidate);

    return score;
  }

  /**
   * Score based on name matching patterns
   * Common algorithm used across all language integrations
   */
  scoreNameMatching(candidate, normalizedTargetName) {
    let score = 0;
    const candidateName = (candidate.name || '').toLowerCase();
    const candidateFullName = (candidate.fullName || candidate.name || '').toLowerCase();

    if (normalizedTargetName) {
      if (candidateName === normalizedTargetName) {
        score += 50; // Exact match
      } else if (candidateFullName === normalizedTargetName) {
        score += 45; // Full name exact match
      } else if (candidateName.includes(normalizedTargetName)) {
        score += 25; // Partial match
      } else if (candidateFullName.includes(normalizedTargetName)) {
        score += 20; // Full name partial match
      } else {
        score -= 15; // No match penalty
      }
    } else {
      score += 5; // Base score for any candidate
    }

    return score;
  }

  /**
   * Score based on type matching
   * Common algorithm with language-specific type mappings
   */
  scoreTypeMatching(candidate, signature) {
    let score = 0;
    const signatureType = signature.type?.toLowerCase();

    if (signatureType) {
      if (this.matchesType(candidate.type, signatureType)) {
        score += 20; // Type match
      } else if (this.isCompatibleType(candidate.type, signatureType)) {
        score += 10; // Compatible type (e.g., record vs class in Java)
      } else {
        score -= 25; // Type mismatch penalty
      }
    }

    return score;
  }

  /**
   * Score based on package/namespace matching
   * Default implementation - can be overridden by language-specific integrations
   */
  scorePackageMatching(candidate, signature, metadata) {
    let score = 0;

    // Generic package matching
    if (signature.package && metadata && metadata.packageName) {
      if (candidate.packageName === signature.package ||
          metadata.packageName === signature.package) {
        score += 15; // Package match
      } else {
        score -= 5; // Package mismatch penalty
      }
    }

    return score;
  }

  /**
   * Score based on method matching
   * Common algorithm across most languages
   */
  scoreMethodMatching(candidate, signature, metadata) {
    let score = 0;

    if (signature.methods && signature.methods.length > 0) {
      const candidateMethods = this.getCandidateMethods(candidate, metadata);
      let hits = 0;

      signature.methods.forEach(method => {
        if (candidateMethods.has(method.toLowerCase())) {
          hits += 1;
        }
      });

      score += hits * 10; // Method match bonus
      if (hits === 0 && signature.methods.length > 0) {
        score -= 12; // No method matches penalty
      }
    } else if (candidate.methods && candidate.methods.length > 0) {
      // Bonus for having methods even if none specified
      score += Math.min(candidate.methods.length * 2, 10);
    }

    return score;
  }

  /**
   * Get candidate methods for scoring
   * Default implementation - can be overridden by language-specific integrations
   */
  getCandidateMethods(candidate, metadata) {
    const methods = new Set();

    // Add methods directly on candidate
    if (candidate.methods) {
      candidate.methods.forEach(method => {
        methods.add(method.name.toLowerCase());
      });
    }

    return methods;
  }

  /**
   * Score based on visibility preferences
   * Common algorithm preferring public/exported items
   */
  scoreVisibility(candidate) {
    let score = 0;

    if (candidate.visibility) {
      if (candidate.visibility === 'public') {
        score += 5;
      } else if (candidate.visibility === 'protected' || candidate.visibility === 'crate') {
        score += 2;
      } else {
        score -= 2; // Private items get slight penalty
      }
    }

    if (candidate.exported !== undefined) {
      if (candidate.exported) {
        score += 3;
      } else {
        score -= 1;
      }
    }

    return score;
  }

  /**
   * Language-specific scoring extensions
   * Override in subclasses to add language-specific scoring logic
   */
  scoreLanguageSpecific(candidate, signature, metadata) {
    return 0; // Default: no language-specific scoring
  }

  /**
   * Check if candidate type matches signature type
   * Default implementation - should be overridden by language-specific integrations
   */
  matchesType(candidateType, signatureType) {
    if (!candidateType) {
      return false;
    }
    if (signatureType === 'any') {
      return true;
    }
    return candidateType.toLowerCase() === signatureType.toLowerCase();
  }

  /**
   * Check if candidate type is compatible with signature type
   * Override in subclasses for language-specific type compatibility rules
   */
  isCompatibleType(candidateType, signatureType) {
    return false; // Default: no compatibility beyond exact match
  }

  /**
   * Evaluate a candidate file
   * Common structure across all language integrations
   */
  async evaluateCandidate(filePath, signature = {}) {
    const metadata = await this.parseFile(filePath);
    if (!metadata) {
      return null;
    }

    const evaluation = this.calculateScore(metadata, signature);
    if (!evaluation || evaluation.score <= 0) {
      return null;
    }

    return {
      path: filePath,
      score: evaluation.score,
      metadata,
      match: evaluation.match,
      language: this.language
    };
  }

  /**
   * Calculate score for metadata
   * Common structure across all language integrations
   */
  calculateScore(metadata, signature = {}) {
    const candidates = this.extractCandidates(metadata);

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

  /**
   * Extract candidates from metadata
   * Must be implemented by subclasses to return language-specific candidates
   */
  extractCandidates(metadata) {
    throw new Error(`extractCandidates() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Parse a file and extract metadata
   * Must be implemented by subclasses
   */
  async parseFile(filePath) {
    throw new Error(`parseFile() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Generate test content for a target
   * Must be implemented by subclasses
   */
  generateTestContent(target, options = {}) {
    throw new Error(`generateTestContent() must be implemented by ${this.constructor.name}`);
  }
}

module.exports = {
  BaseLanguageIntegration
};