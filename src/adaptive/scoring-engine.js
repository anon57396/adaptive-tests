/**
 * Scoring Engine for Adaptive Tests
 *
 * Calculates scores for discovery candidates based on configurable rules
 */

const path = require('path');

class ScoringEngine {
  constructor(config = {}) {
    this.config = config.discovery?.scoring || {};
    this.pathScorers = [];
    this.customScorers = [];
    this.compileScorers();
  }

  /**
   * Compile scoring functions for better performance
   */
  compileScorers() {
    this.pathScorers = [];
    this.customScorers = [];

    const addPathScorer = (label, scorerFn) => {
      this.pathScorers.push({
        label,
        apply: scorerFn,
      });
    };

    if (this.config.paths) {
      if (this.config.paths.positive) {
        for (const [pattern, score] of Object.entries(this.config.paths.positive)) {
          if (typeof score === 'function') {
            addPathScorer(pattern || score.name || 'path:custom', (candidatePath) => score(candidatePath));
          } else if (typeof score === 'number') {
            addPathScorer(pattern, (candidatePath) => candidatePath.includes(pattern) ? score : 0);
          }
        }
      }

      if (this.config.paths.negative) {
        for (const [pattern, score] of Object.entries(this.config.paths.negative)) {
          if (typeof score === 'function') {
            addPathScorer(pattern || score.name || 'path:custom', (candidatePath) => score(candidatePath));
          } else if (typeof score === 'number') {
            addPathScorer(pattern, (candidatePath) => candidatePath.includes(pattern) ? score : 0);
          }
        }
      }
    }

    if (this.config.custom && Array.isArray(this.config.custom)) {
      for (const scorer of this.config.custom) {
        if (typeof scorer === 'function') {
          this.customScorers.push({
            name: scorer.name || 'custom',
            fn: scorer,
          });
        } else if (scorer && typeof scorer.score === 'function') {
          this.customScorers.push({
            name: scorer.name || 'custom',
            fn: scorer.score.bind(scorer),
          });
        }
      }
    }
  }

  /**
   * Calculate total score for a candidate
   */
  calculateScore(candidate, signature, content = null) {
    const { totalScore, breakdown } = this.computeScore(candidate, signature, content, false);
    candidate.scoreBreakdown = breakdown;
    return totalScore;
  }

  calculateScoreDetailed(candidate, signature, content = null) {
    const { totalScore, breakdown, details } = this.computeScore(candidate, signature, content, true);
    candidate.scoreBreakdown = breakdown;
    candidate.scoreDetails = details;
    return { totalScore, breakdown, details };
  }

  computeScore(candidate, signature, content, collectDetails = false) {
    let totalScore = 0;
    const breakdown = {};
    const details = collectDetails ? [] : null;

    const addContribution = (category, amount, detail) => {
      if (!amount || amount === 0) {
        return;
      }

      totalScore += amount;
      breakdown[category] = (breakdown[category] || 0) + amount;

      if (details) {
        const entries = Array.isArray(detail) ? detail : detail ? [detail] : [];
        for (const entry of entries) {
          if (entry && typeof entry.score === 'number' && entry.score !== 0) {
            details.push(entry);
          }
        }
      }
    };

    const pathDetails = collectDetails ? [] : null;
    const pathScore = this.scorePath(candidate.path, pathDetails);
    if (pathScore !== 0) {
      addContribution('path', pathScore, pathDetails);
    }

    const extScore = this.scoreExtension(candidate.path);
    if (extScore !== 0) {
      const extDetail = collectDetails
        ? { type: 'extension', source: path.extname(candidate.path) || 'unknown', score: extScore }
        : null;
      addContribution('extension', extScore, extDetail);
    }

    const nameScore = this.scoreFileName(candidate.fileName, signature);
    if (nameScore !== 0) {
      const nameDetail = collectDetails
        ? { type: 'fileName', source: candidate.fileName, score: nameScore }
        : null;
      addContribution('fileName', nameScore, nameDetail);
    }

    if (content) {
      if (signature.type) {
        const typeScore = this.scoreTypeHints(content, signature);
        if (typeScore !== 0) {
          const typeDetail = collectDetails
            ? { type: 'typeHints', source: signature.type, score: typeScore }
            : null;
          addContribution('typeHints', typeScore, typeDetail);
        }
      }

      if (signature.methods && signature.methods.length > 0) {
        const methodScore = this.scoreMethodMentions(content, signature.methods);
        if (methodScore !== 0) {
          const methodDetail = collectDetails
            ? { type: 'methods', source: signature.methods.join(', '), score: methodScore }
            : null;
          addContribution('methods', methodScore, methodDetail);
        }
      }

      if (signature.exports) {
        const exportScore = this.scoreExportHints(content, signature);
        if (exportScore !== 0) {
          const exportDetail = collectDetails
            ? { type: 'exports', source: signature.exports, score: exportScore }
            : null;
          addContribution('exports', exportScore, exportDetail);
        }
      }

      if (signature.name && !(signature.name instanceof RegExp)) {
        const nameMentionScore = this.scoreNameMentions(content, signature);
        if (nameMentionScore !== 0) {
          const nameDetail = collectDetails
            ? { type: 'nameMentions', source: String(signature.name), score: nameMentionScore }
            : null;
          addContribution('nameMentions', nameMentionScore, nameDetail);
        }
      }
    }

    const customDetails = collectDetails ? [] : null;
    const customScore = this.scoreCustom(candidate, signature, content, customDetails);
    if (customScore !== 0) {
      addContribution('custom', customScore, customDetails);
    }

    return { totalScore, breakdown, details };
  }

  /**
   * Score based on file path
   */
  scorePath(filePath, detailCollector = null) {
    let score = 0;

    for (const scorer of this.pathScorers) {
      try {
        const contribution = scorer.apply(filePath) || 0;
        if (typeof contribution === 'number' && contribution !== 0) {
          score += contribution;
          if (detailCollector) {
            detailCollector.push({
              type: 'path',
              source: scorer.label,
              score: contribution
            });
          }
        }
      } catch (error) {
        console.warn(`Path scorer ${scorer.label || 'custom'} failed:`, error.message);
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
  scoreCustom(candidate, signature, content, detailCollector = null) {
    let score = 0;

    for (const scorer of this.customScorers) {
      try {
        const customScore = scorer.fn(candidate, signature, content);
        if (typeof customScore === 'number' && customScore !== 0) {
          score += customScore;
          if (detailCollector) {
            detailCollector.push({
              type: 'custom',
              source: scorer.name || 'custom',
              score: customScore
            });
          }
        }
      } catch (error) {
        console.warn(`Custom scorer ${scorer.name || 'custom'} failed:`, error.message);
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
    this.compileScorers();
  }
}

module.exports = { ScoringEngine };
