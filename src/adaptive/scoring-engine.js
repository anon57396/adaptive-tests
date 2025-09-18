/**
 * Scoring Engine for Adaptive Tests
 *
 * Calculates scores for discovery candidates based on configurable rules
 */

const path = require('path');

class ScoringEngine {
  constructor(config = {}) {
    this.config = config.discovery?.scoring || {};
    this.compiledScorers = this.compileScorers();
  }

  /**
   * Compile scoring functions for better performance
   */
  compileScorers() {
    const scorers = [];

    // Path scorers
    if (this.config.paths) {
      // Positive path scorers
      if (this.config.paths.positive) {
        for (const [pattern, score] of Object.entries(this.config.paths.positive)) {
          if (typeof score === 'function') {
            scorers.push({ type: 'path', fn: score });
          } else if (typeof score === 'number') {
            scorers.push({
              type: 'path',
              fn: (candidatePath) => candidatePath.includes(pattern) ? score : 0
            });
          }
        }
      }

      // Negative path scorers
      if (this.config.paths.negative) {
        for (const [pattern, score] of Object.entries(this.config.paths.negative)) {
          if (typeof score === 'function') {
            scorers.push({ type: 'path', fn: score });
          } else if (typeof score === 'number') {
            scorers.push({
              type: 'path',
              fn: (candidatePath) => candidatePath.includes(pattern) ? score : 0
            });
          }
        }
      }
    }

    // Custom scorers
    if (this.config.custom && Array.isArray(this.config.custom)) {
      for (const scorer of this.config.custom) {
        if (typeof scorer === 'function') {
          scorers.push({ type: 'custom', fn: scorer });
        } else if (scorer && typeof scorer.score === 'function') {
          scorers.push({
            type: 'custom',
            name: scorer.name || 'unnamed',
            fn: scorer.score
          });
        }
      }
    }

    return scorers;
  }

  /**
   * Calculate total score for a candidate
   */
  calculateScore(candidate, signature, content = null) {
    let totalScore = 0;
    const breakdown = {};

    // Path scoring
    const pathScore = this.scorePath(candidate.path);
    if (pathScore !== 0) {
      totalScore += pathScore;
      breakdown.path = pathScore;
    }

    // Extension scoring
    const extScore = this.scoreExtension(candidate.path);
    if (extScore !== 0) {
      totalScore += extScore;
      breakdown.extension = extScore;
    }

    // File name scoring
    const nameScore = this.scoreFileName(candidate.fileName, signature);
    if (nameScore !== 0) {
      totalScore += nameScore;
      breakdown.fileName = nameScore;
    }

    // Content-based scoring (if content available)
    if (content) {
      // Type hints scoring
      if (signature.type) {
        const typeScore = this.scoreTypeHints(content, signature);
        if (typeScore !== 0) {
          totalScore += typeScore;
          breakdown.typeHints = typeScore;
        }
      }

      // Method mentions scoring
      if (signature.methods && signature.methods.length > 0) {
        const methodScore = this.scoreMethodMentions(content, signature.methods);
        if (methodScore !== 0) {
          totalScore += methodScore;
          breakdown.methods = methodScore;
        }
      }

      // Export hints scoring
      if (signature.exports) {
        const exportScore = this.scoreExportHints(content, signature);
        if (exportScore !== 0) {
          totalScore += exportScore;
          breakdown.exports = exportScore;
        }
      }

      // Name mentions scoring
      if (signature.name && !(signature.name instanceof RegExp)) {
        const mentionScore = this.scoreNameMentions(content, signature);
        if (mentionScore !== 0) {
          totalScore += mentionScore;
          breakdown.nameMentions = mentionScore;
        }
      }
    }

    // Custom scoring
    const customScore = this.scoreCustom(candidate, signature, content);
    if (customScore !== 0) {
      totalScore += customScore;
      breakdown.custom = customScore;
    }

    // Store breakdown for debugging
    candidate.scoreBreakdown = breakdown;

    return totalScore;
  }

  /**
   * Score based on file path
   */
  scorePath(filePath) {
    let score = 0;

    // Apply compiled path scorers
    for (const scorer of this.compiledScorers) {
      if (scorer.type === 'path') {
        score += scorer.fn(filePath);
      }
    }

    return score;
  }

  /**
   * Score based on file extension
   */
  scoreExtension(filePath) {
    if (!this.config.extensions) {
      return 0;
    }

    const ext = path.extname(filePath);
    return this.config.extensions[ext] || 0;
  }

  /**
   * Score based on file name match
   */
  scoreFileName(fileName, signature) {
    if (!signature.name || !this.config.fileName) {
      return 0;
    }

    const nameToMatch = signature.name instanceof RegExp
      ? signature.name
      : String(signature.name);

    // Exact match
    if (!(nameToMatch instanceof RegExp) && fileName === nameToMatch) {
      return this.config.fileName.exactMatch || 45;
    }

    // Case-insensitive match
    if (!(nameToMatch instanceof RegExp) && fileName.toLowerCase() === nameToMatch.toLowerCase()) {
      return this.config.fileName.caseInsensitive || 30;
    }

    // Regex match
    if (nameToMatch instanceof RegExp && nameToMatch.test(fileName)) {
      return this.config.fileName.regexMatch || 12;
    }

    // Partial match
    if (!(nameToMatch instanceof RegExp) && fileName.toLowerCase().includes(nameToMatch.toLowerCase())) {
      return this.config.fileName.partialMatch || 8;
    }

    return 0;
  }

  /**
   * Score based on type hints in content
   */
  scoreTypeHints(content, signature) {
    if (!signature.type || !this.config.typeHints) {
      return 0;
    }

    const typeScore = this.config.typeHints[signature.type] || 0;
    if (typeScore === 0) {
      return 0;
    }

    // Check for type indicators in content
    switch (signature.type) {
      case 'class':
        if (/\bclass\s+\w+/.test(content)) {
          return typeScore;
        }
        break;

      case 'function':
        if (/\bfunction\s+\w+|\bconst\s+\w+\s*=\s*(?:async\s+)?\(.*?\)\s*=>/.test(content)) {
          return typeScore;
        }
        break;

      case 'module':
        if (/\bmodule\.exports\b|\bexport\s+(?:default|{)/.test(content)) {
          return typeScore;
        }
        break;
    }

    return 0;
  }

  /**
   * Score based on method mentions in content
   */
  scoreMethodMentions(content, methods) {
    if (!methods || methods.length === 0 || !this.config.methods) {
      return 0;
    }

    const perMention = this.config.methods.perMention || 3;
    const maxMentions = this.config.methods.maxMentions || 5;

    let mentionCount = 0;
    for (const method of methods) {
      const methodRegex = new RegExp(`\\b${this.escapeRegExp(method)}\\b`, 'g');
      const matches = content.match(methodRegex);
      if (matches) {
        mentionCount += Math.min(matches.length, 1); // Count each method only once
      }
    }

    return Math.min(mentionCount, maxMentions) * perMention;
  }

  /**
   * Score based on export hints
   */
  scoreExportHints(content, signature) {
    if (!signature.exports || !this.config.exports) {
      return 0;
    }

    const exportName = signature.exports;
    const exportScore = this.config.exports.namedExport || 30;

    // Check various export patterns
    const patterns = [
      `module\\.exports\\s*=\\s*${this.escapeRegExp(exportName)}`,
      `module\\.exports\\.${this.escapeRegExp(exportName)}\\s*=`,
      `exports\\.${this.escapeRegExp(exportName)}\\s*=`,
      `export\\s+default\\s+(?:class|function)?\\s*${this.escapeRegExp(exportName)}`,
      `export\\s+(?:class|function|const|let|var)\\s+${this.escapeRegExp(exportName)}`,
      `export\\s*\\{[^}]*\\b${this.escapeRegExp(exportName)}\\b[^}]*\\}`
    ];

    for (const pattern of patterns) {
      if (new RegExp(pattern).test(content)) {
        return exportScore;
      }
    }

    return 0;
  }

  /**
   * Score based on name mentions
   */
  scoreNameMentions(content, signature) {
    if (!signature.name || signature.name instanceof RegExp || !this.config.names) {
      return 0;
    }

    const perMention = this.config.names.perMention || 2;
    const maxMentions = this.config.names.maxMentions || 5;

    const nameRegex = new RegExp(`\\b${this.escapeRegExp(signature.name)}\\b`, 'g');
    const matches = content.match(nameRegex);
    const mentionCount = matches ? matches.length : 0;

    return Math.min(mentionCount, maxMentions) * perMention;
  }

  /**
   * Apply custom scoring functions
   */
  scoreCustom(candidate, signature, content) {
    let score = 0;

    for (const scorer of this.compiledScorers) {
      if (scorer.type === 'custom') {
        try {
          const customScore = scorer.fn(candidate, signature, content);
          if (typeof customScore === 'number') {
            score += customScore;
          }
        } catch (error) {
          console.warn(`Custom scorer ${scorer.name || 'unnamed'} failed:`, error.message);
        }
      }
    }

    return score;
  }

  /**
   * Score target name match (after module is loaded)
   */
  scoreTargetName(targetName, signature) {
    if (!targetName || !signature.name || !this.config.target) {
      return 0;
    }

    const nameToMatch = signature.name instanceof RegExp
      ? signature.name
      : String(signature.name);

    if (nameToMatch instanceof RegExp) {
      return nameToMatch.test(targetName) ? (this.config.target.exactName || 35) : 0;
    }

    return targetName === nameToMatch ? (this.config.target.exactName || 35) : 0;
  }

  /**
   * Score method validation (after module is loaded)
   */
  scoreMethodValidation(target, methods) {
    if (!methods || methods.length === 0 || !this.config.methods) {
      return 0;
    }

    const methodHost = target.prototype || target;
    let foundCount = 0;

    for (const method of methods) {
      if (typeof methodHost[method] === 'function') {
        foundCount++;
      } else {
        return null; // Missing required method - invalid candidate
      }
    }

    const perMethod = 5; // Bonus per validated method
    const allMethodsBonus = this.config.methods.allMethodsBonus || 10;

    return (foundCount * perMethod) + (foundCount === methods.length ? allMethodsBonus : 0);
  }

  /**
   * Escape special regex characters
   */
  escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Update configuration
   */
  updateConfig(config) {
    this.config = config.discovery?.scoring || {};
    this.compiledScorers = this.compileScorers();
  }
}

module.exports = { ScoringEngine };