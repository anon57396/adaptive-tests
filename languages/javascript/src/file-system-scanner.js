/**
 * File System Scanner
 *
 * Encapsulates recursive directory traversal and candidate collection for the
 * discovery engine. Responsible solely for identifying viable file paths and
 * delegating evaluation to the supplied callback.
 */

const fs = require('fs');
const path = require('path');
const { executeParallel } = require('./async-utils');

const fsPromises = fs.promises;

class FileSystemScanner {
  constructor(options) {
    const {
      rootPath,
      extensions,
      maxDepth,
      maxConcurrency,
      minCandidateScore = 0,
      evaluateCandidate,
      shouldSkipDirectory,
      logger = null
    } = options;

    this.rootPath = rootPath;
    this.extensions = Array.isArray(extensions) ? extensions : [];
    this.maxDepth = Number.isFinite(maxDepth) ? maxDepth : Infinity;
    this.maxConcurrency = maxConcurrency;
    this.minCandidateScore = minCandidateScore;
    this.evaluateCandidate = evaluateCandidate;
    this.shouldSkipDirectory = shouldSkipDirectory;
    this.logger = logger;
  }

  async collect({ dir, signature, depth = 0, candidates = [] }) {
    await this.scanDirectory(dir, signature, depth, candidates);
    return candidates;
  }

  async scanDirectory(dir, signature, depth, candidates) {
    if (depth > this.maxDepth) {
      return candidates;
    }

    let entries;
    try {
      entries = await fsPromises.readdir(dir, { withFileTypes: true });
    } catch (error) {
      this.logDebug('Failed to read directory', { dir, error: error.message });
      return candidates;
    }

    const directoryOps = [];
    const fileOps = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (this.shouldSkipDirectory && this.shouldSkipDirectory(entry.name)) {
          continue;
        }
        directoryOps.push(() => this.scanDirectory(fullPath, signature, depth + 1, candidates));
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!this.shouldProcessFile(entry.name)) {
        continue;
      }

      fileOps.push(async () => {
        const candidate = await this.evaluateCandidate(fullPath, signature);
        if (candidate && candidate.score > this.minCandidateScore) {
          candidates.push(candidate);
        }
      });
    }

    const concurrencyOptions = {
      maxConcurrency: this.maxConcurrency,
      context: {
        root: this.rootPath,
        depth,
        directory: dir
      }
    };

    if (directoryOps.length > 0) {
      await executeParallel(directoryOps, concurrencyOptions);
    }

    if (fileOps.length > 0) {
      await executeParallel(fileOps, concurrencyOptions);
    }

    return candidates;
  }

  shouldProcessFile(fileName) {
    const ext = path.extname(fileName);
    if (!this.extensions.includes(ext)) {
      return false;
    }

    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('.test.') || lowerName.includes('.spec.')) {
      return false;
    }

    if (fileName.endsWith('.d.ts')) {
      return false;
    }

    if (fileName.endsWith('.backup')) {
      return false;
    }

    // Skip duplicate copies such as "Service copy.js" or "Service 1.js"
    if (/(?:\s(?:copy|copy\s\d+)|\s\d+)(?=\.[^.]+$)/i.test(fileName)) {
      return false;
    }

    return true;
  }

  logDebug(message, meta) {
    if (this.logger && typeof this.logger.debug === 'function') {
      this.logger.debug(message, meta);
    }
  }
}

module.exports = {
  FileSystemScanner
};
