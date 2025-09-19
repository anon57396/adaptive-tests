/**
 * Async Utilities for Adaptive Tests
 *
 * Provides standardized async patterns, error handling, and utilities
 * to ensure consistency across all modules in the adaptive tests system.
 */

const { ErrorHandler } = require('./error-handler');

/**
 * Standard async operation wrapper with timeout and retry
 */
class AsyncOperationManager {
  constructor(options = {}) {
    this.defaultTimeout = options.timeout || 10000; // 10 seconds
    this.defaultRetries = options.retries || 0;
    this.errorHandler = new ErrorHandler('async-manager');
  }

  /**
   * Execute an async operation with timeout and retry support
   */
  async execute(operation, options = {}) {
    const timeout = options.timeout || this.defaultTimeout;
    const retries = options.retries || this.defaultRetries;
    const context = options.context || {};

    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Add timeout wrapper
        const result = await this.withTimeout(operation, timeout, context);

        if (attempt > 0) {
          this.errorHandler.logDebug(
            `Operation succeeded on attempt ${attempt + 1}`,
            context
          );
        }

        return result;
      } catch (error) {
        lastError = error;

        if (attempt < retries) {
          this.errorHandler.logDebug(
            `Operation failed on attempt ${attempt + 1}, retrying...`,
            { ...context, error: error.message }
          );

          // Exponential backoff delay
          await this.delay(Math.pow(2, attempt) * 100);
        }
      }
    }

    // All attempts failed
    this.errorHandler.logError(lastError, {
      ...context,
      totalAttempts: retries + 1,
      operation: 'async-execute'
    });

    throw lastError;
  }

  /**
   * Wrap operation with timeout
   */
  async withTimeout(operation, timeoutMs, context = {}) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      Promise.resolve(operation())
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Delay utility for retries
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute multiple async operations in parallel with error isolation
   */
  async executeParallel(operations, options = {}) {
    const maxConcurrency = options.maxConcurrency || 5;
    const failFast = options.failFast || false;
    const context = options.context || {};

    // If no concurrency limit, run all in parallel
    if (maxConcurrency >= operations.length) {
      const promises = operations.map((op, index) =>
        this.execute(op, {
          ...options,
          context: { ...context, operationIndex: index }
        })
      );

      if (failFast) {
        return Promise.all(promises);
      } else {
        const results = await Promise.allSettled(promises);
        return this.processSettledResults(results, context);
      }
    }

    // Batch execution with concurrency limit
    const results = [];
    const executing = [];

    for (let i = 0; i < operations.length; i++) {
      const promise = this.execute(operations[i], {
        ...options,
        context: { ...context, operationIndex: i }
      });

      executing.push(promise);

      if (executing.length >= maxConcurrency || i === operations.length - 1) {
        if (failFast) {
          const batchResults = await Promise.all(executing);
          results.push(...batchResults);
        } else {
          const batchResults = await Promise.allSettled(executing);
          results.push(...this.processSettledResults(batchResults, context));
        }
        executing.length = 0;
      }
    }

    return results;
  }

  /**
   * Process Promise.allSettled results
   */
  processSettledResults(results, context = {}) {
    const processed = [];
    let errorCount = 0;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        processed.push(result.value);
      } else {
        errorCount++;
        this.errorHandler.logError(result.reason, {
          ...context,
          resultType: 'settled'
        });
        processed.push(null);
      }
    }

    if (errorCount > 0) {
      this.errorHandler.logWarning(
        `${errorCount} operations failed in parallel execution`,
        { ...context, totalOperations: results.length, errorCount }
      );
    }

    return processed;
  }

  /**
   * Create a debounced async function
   */
  debounce(fn, delayMs = 300) {
    let timeoutId = null;
    let latestArgs = null;
    let latestResolve = null;
    let latestReject = null;

    return (...args) => {
      latestArgs = args;

      return new Promise((resolve, reject) => {
        latestResolve = resolve;
        latestReject = reject;

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(async () => {
          try {
            const result = await fn(...latestArgs);
            latestResolve(result);
          } catch (error) {
            latestReject(error);
          }
        }, delayMs);
      });
    };
  }

  /**
   * Create a throttled async function
   */
  throttle(fn, limitMs = 1000) {
    let lastExecuted = 0;
    let timeoutId = null;
    let pendingPromise = null;

    return (...args) => {
      const now = Date.now();

      return new Promise((resolve, reject) => {
        const execute = async () => {
          try {
            lastExecuted = Date.now();
            const result = await fn(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };

        if (now - lastExecuted >= limitMs) {
          // Execute immediately
          execute();
        } else {
          // Schedule for later
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          timeoutId = setTimeout(execute, limitMs - (now - lastExecuted));
        }
      });
    };
  }
}

/**
 * Standardized async file operations
 */
class AsyncFileOperations {
  constructor(options = {}) {
    this.operationManager = new AsyncOperationManager(options);
    this.errorHandler = new ErrorHandler('async-file-ops');
  }

  /**
   * Safe async file read with standardized error handling
   */
  async readFile(filePath, options = {}) {
    const encoding = options.encoding || 'utf8';
    const context = { filePath, operation: 'readFile' };

    return this.operationManager.execute(
      async () => {
        const fs = require('fs').promises;
        return await fs.readFile(filePath, encoding);
      },
      { ...options, context }
    );
  }

  /**
   * Safe async file write with standardized error handling
   */
  async writeFile(filePath, content, options = {}) {
    const encoding = options.encoding || 'utf8';
    const context = { filePath, operation: 'writeFile' };

    return this.operationManager.execute(
      async () => {
        const fs = require('fs').promises;
        return await fs.writeFile(filePath, content, encoding);
      },
      { ...options, context }
    );
  }

  /**
   * Safe async directory scan
   */
  async readDirectory(dirPath, options = {}) {
    const context = { dirPath, operation: 'readDirectory' };

    return this.operationManager.execute(
      async () => {
        const fs = require('fs').promises;
        return await fs.readdir(dirPath, { withFileTypes: true, ...options });
      },
      { ...options, context }
    );
  }

  /**
   * Safe async file stat
   */
  async stat(filePath, options = {}) {
    const context = { filePath, operation: 'stat' };

    return this.operationManager.execute(
      async () => {
        const fs = require('fs').promises;
        return await fs.stat(filePath);
      },
      { ...options, context }
    );
  }

  /**
   * Check if file exists (async)
   */
  async exists(filePath, options = {}) {
    const context = { filePath, operation: 'exists' };

    try {
      await this.stat(filePath, options);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }
}

/**
 * Language integration async patterns
 */
class LanguageIntegrationAsync {
  constructor(language, options = {}) {
    this.language = language;
    this.operationManager = new AsyncOperationManager(options);
    this.fileOps = new AsyncFileOperations(options);
    this.errorHandler = new ErrorHandler(`${language}-async`);
  }

  /**
   * Standardized candidate evaluation pattern
   */
  async evaluateCandidate(filePath, signature = {}, evaluationFn) {
    const context = {
      filePath,
      language: this.language,
      signatureName: signature.name || 'unknown'
    };

    return this.operationManager.execute(
      async () => {
        // Check if file exists first
        const exists = await this.fileOps.exists(filePath);
        if (!exists) {
          this.errorHandler.logWarning('File does not exist', context);
          return null;
        }

        // Execute the language-specific evaluation
        return await evaluationFn(filePath, signature);
      },
      { context, timeout: 8000 }
    );
  }

  /**
   * Standardized file parsing pattern
   */
  async parseFile(filePath, parseFn, options = {}) {
    const context = {
      filePath,
      language: this.language,
      operation: 'parseFile'
    };

    return this.operationManager.execute(
      async () => {
        const content = await this.fileOps.readFile(filePath, options);
        return await parseFn(content, filePath);
      },
      { context, timeout: options.timeout || 10000 }
    );
  }

  /**
   * Standardized test generation pattern
   */
  async generateTest(target, generateFn, options = {}) {
    const context = {
      targetName: target?.name || 'unknown',
      language: this.language,
      operation: 'generateTest'
    };

    return this.operationManager.execute(
      async () => {
        if (!target) {
          throw new Error('Target is required for test generation');
        }
        return await generateFn(target, options);
      },
      { context, timeout: options.timeout || 5000 }
    );
  }
}

// Global instances for common use
const defaultAsyncManager = new AsyncOperationManager();
const defaultFileOps = new AsyncFileOperations();

module.exports = {
  AsyncOperationManager,
  AsyncFileOperations,
  LanguageIntegrationAsync,

  // Convenience exports
  asyncManager: defaultAsyncManager,
  fileOps: defaultFileOps,

  // Utility functions
  withTimeout: (operation, timeoutMs) => defaultAsyncManager.withTimeout(operation, timeoutMs),
  delay: (ms) => defaultAsyncManager.delay(ms),
  executeParallel: (operations, options) => defaultAsyncManager.executeParallel(operations, options)
};