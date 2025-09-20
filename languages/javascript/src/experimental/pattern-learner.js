/**
 * Experimental Pattern Learning System
 *
 * Ultra-lightweight pattern recognition for improving discovery accuracy.
 * Uses learned hashes instead of neural networks for minimal overhead.
 *
 * @experimental This is an experimental feature - API may change
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class TinyPatternMatcher {
  constructor() {
    // Ultra-compact learned patterns (total ~200KB when persisted)
    this.patternHashes = new Map();     // Hash -> weight mappings
    this.bloomFilter = new Uint8Array(65536);   // 64KB bloom filter
    this.weights = new Float32Array(256);        // 1KB weight array
    this.confidence = new Float32Array(256);     // Confidence scores

    // Initialize with neutral weights
    this.weights.fill(1.0);
    this.confidence.fill(0.5);

    this.learnedPatterns = 0;
    this.enabled = false;
  }

  /**
   * Compute a hash for a candidate path and signature
   */
  computeHash(candidatePath, signatureName) {
    const combined = `${candidatePath}::${signatureName}`;
    const hash = crypto.createHash('md5').update(combined).digest();
    return {
      primary: hash.readUInt32BE(0),
      secondary: hash.readUInt32BE(4)
    };
  }

  /**
   * Score adjustment based on learned patterns
   */
  getPatternScore(candidate, signature) {
    if (!this.enabled || this.learnedPatterns < 10) {
      return 0; // Not enough data yet
    }

    const { primary, secondary } = this.computeHash(candidate.path, signature.name);
    const bloomIndex = primary % 65536;
    const weightIndex = secondary % 256;

    // Check bloom filter first (fast rejection)
    if (this.bloomFilter[bloomIndex] === 0) {
      return 0; // Pattern never seen
    }

    // Apply learned weight with confidence
    const weight = this.weights[weightIndex];
    const confidence = this.confidence[weightIndex];

    // Return weighted adjustment (-20 to +20 points)
    return (weight - 1.0) * confidence * 20;
  }

  /**
   * Learn from a successful discovery
   */
  recordSuccess(signature, chosenPath, rejectedPaths = []) {
    // Positive reinforcement for chosen path
    this.adjustPattern(chosenPath, signature.name, 0.1);

    // Slight negative reinforcement for rejected paths
    rejectedPaths.forEach(path => {
      this.adjustPattern(path, signature.name, -0.02);
    });

    this.learnedPatterns++;

    // Enable after sufficient learning
    if (this.learnedPatterns >= 10 && !this.enabled) {
      this.enabled = true;
      console.debug('[Pattern Learner] Activated after 10 learned patterns');
    }
  }

  /**
   * Adjust pattern weights
   */
  adjustPattern(candidatePath, signatureName, adjustment) {
    const { primary, secondary } = this.computeHash(candidatePath, signatureName);
    const bloomIndex = primary % 65536;
    const weightIndex = secondary % 256;

    // Mark in bloom filter
    this.bloomFilter[bloomIndex] = 1;

    // Update weight with decay
    const currentWeight = this.weights[weightIndex];
    this.weights[weightIndex] = Math.max(0.5, Math.min(1.5,
      currentWeight * 0.95 + adjustment
    ));

    // Increase confidence up to 1.0
    this.confidence[weightIndex] = Math.min(1.0,
      this.confidence[weightIndex] + 0.05
    );
  }

  /**
   * Save learned patterns to disk
   */
  async save(filePath) {
    const data = {
      version: 1,
      learnedPatterns: this.learnedPatterns,
      bloomFilter: Array.from(this.bloomFilter),
      weights: Array.from(this.weights),
      confidence: Array.from(this.confidence),
      enabled: this.enabled
    };

    await fs.promises.writeFile(
      filePath,
      JSON.stringify(data),
      'utf8'
    );
  }

  /**
   * Load learned patterns from disk
   */
  async load(filePath) {
    try {
      const data = JSON.parse(
        await fs.promises.readFile(filePath, 'utf8')
      );

      if (data.version !== 1) {
        console.warn('[Pattern Learner] Incompatible version, starting fresh');
        return false;
      }

      this.learnedPatterns = data.learnedPatterns;
      this.bloomFilter = new Uint8Array(data.bloomFilter);
      this.weights = new Float32Array(data.weights);
      this.confidence = new Float32Array(data.confidence);
      this.enabled = data.enabled;

      console.debug(`[Pattern Learner] Loaded ${this.learnedPatterns} patterns`);
      return true;
    } catch (error) {
      // No saved patterns yet, that's fine
      return false;
    }
  }

  /**
   * Get statistics about learned patterns
   */
  getStats() {
    const activePatterns = Array.from(this.bloomFilter).filter(v => v > 0).length;
    const avgConfidence = Array.from(this.confidence).reduce((a, b) => a + b) / this.confidence.length;
    const strongPatterns = Array.from(this.confidence).filter(c => c > 0.8).length;

    return {
      enabled: this.enabled,
      learnedPatterns: this.learnedPatterns,
      activePatterns,
      avgConfidence: avgConfidence.toFixed(3),
      strongPatterns,
      memoryUsage: (this.bloomFilter.byteLength + this.weights.byteLength + this.confidence.byteLength) / 1024 + 'KB'
    };
  }
}

/**
 * Feedback collector for continuous learning
 */
class FeedbackCollector {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.historyFile = path.join(projectRoot, '.adaptive-tests', 'discovery-history.jsonl');
    this.patternFile = path.join(projectRoot, '.adaptive-tests', 'learned-patterns.json');
    this.matcher = new TinyPatternMatcher();

    this.initialized = false;
  }

  /**
   * Initialize the feedback system
   */
  async initialize() {
    if (this.initialized) return;

    // Ensure directory exists
    const dir = path.dirname(this.historyFile);
    await fs.promises.mkdir(dir, { recursive: true });

    // Load existing patterns
    await this.matcher.load(this.patternFile);

    this.initialized = true;
  }

  /**
   * Record a discovery event
   */
  async recordDiscovery(signature, result, allCandidates = []) {
    await this.initialize();

    const event = {
      timestamp: new Date().toISOString(),
      signature: {
        name: signature.name,
        type: signature.type,
        methods: signature.methods
      },
      chosen: result ? {
        path: result.path,
        score: result.score
      } : null,
      candidates: allCandidates.slice(0, 5).map(c => ({
        path: c.path,
        score: c.score
      }))
    };

    // Append to history (jsonl format for streaming)
    await fs.promises.appendFile(
      this.historyFile,
      JSON.stringify(event) + '\n',
      'utf8'
    );

    // Update pattern matcher if we had a successful choice
    if (result) {
      const rejectedPaths = allCandidates
        .filter(c => c.path !== result.path)
        .map(c => c.path);

      this.matcher.recordSuccess(signature, result.path, rejectedPaths);

      // Persist patterns every 5 discoveries
      if (this.matcher.learnedPatterns % 5 === 0) {
        await this.matcher.save(this.patternFile);
      }
    }
  }

  /**
   * Get pattern-based score adjustment
   */
  getPatternScore(candidate, signature) {
    return this.matcher.getPatternScore(candidate, signature);
  }

  /**
   * Check if pattern learning is active
   */
  isEnabled() {
    return this.matcher.enabled;
  }

  /**
   * Get learning statistics
   */
  getStats() {
    return this.matcher.getStats();
  }
}

/**
 * Smart preprocessing for edge cases
 */
class EdgeCaseNormalizer {
  /**
   * Normalize problematic patterns before AST parsing
   */
  static normalize(code, language = 'javascript') {
    let normalized = code;

    if (language === 'javascript' || language === 'typescript') {
      // Handle decorators (convert to comments to preserve structure)
      normalized = normalized.replace(
        /@(\w+)(\([^)]*\))?\s*/g,
        '/* @$1$2 decorator */ '
      );

      // Handle complex generic types
      normalized = normalized.replace(
        /extends\s+(\w+)<[^>]+>/g,
        'extends $1'
      );

      // Handle dynamic imports
      normalized = normalized.replace(
        /import\s*\([^)]+\)/g,
        '/* dynamic import */'
      );
    }

    if (language === 'python') {
      // Handle metaclasses
      normalized = normalized.replace(
        /class\s+(\w+)\s*\(\s*type\s*\)/g,
        'class $1'
      );

      // Handle complex decorators
      normalized = normalized.replace(
        /@[\w.]+\([^)]*\)\s*/g,
        '# decorator\n'
      );
    }

    return normalized;
  }

  /**
   * Check if code needs normalization
   */
  static needsNormalization(code) {
    const problematicPatterns = [
      /@\w+/,                    // Decorators
      /class.*\(\s*type\s*\)/,   // Metaclasses
      /extends\s+\w+<[^>]+>/,    // Complex generics
      /import\s*\(/              // Dynamic imports
    ];

    return problematicPatterns.some(pattern => pattern.test(code));
  }
}

module.exports = {
  TinyPatternMatcher,
  FeedbackCollector,
  EdgeCaseNormalizer
};