/**
 * Standardized Error Handling for Adaptive Tests
 *
 * Provides consistent error handling, logging, and recovery patterns
 * across all language integrations and collectors.
 */

class AdaptiveError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'AdaptiveError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

class ErrorHandler {
  constructor(component = 'adaptive-tests') {
    this.component = component;
    this.isDebugMode = process.env.DEBUG_DISCOVERY === 'true' ||
                      process.env.ADAPTIVE_DEBUG === 'true' ||
                      process.env.NODE_ENV === 'development';
  }

  /**
   * Log error with consistent formatting
   */
  logError(error, context = {}) {
    if (!this.isDebugMode) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${this.component}]`;
    const contextStr = Object.keys(context).length > 0 ?
      ` ${JSON.stringify(context)}` : '';

    if (error instanceof AdaptiveError) {
      console.error(`${prefix} ${error.code}: ${error.message}${contextStr}`);
      if (this.isDebugMode) {
        console.error(`${prefix} Error details:`, error.toJSON());
      }
    } else if (error instanceof Error) {
      console.error(`${prefix} Error: ${error.message}${contextStr}`);
      if (this.isDebugMode) {
        console.error(`${prefix} Stack trace:`, error.stack);
      }
    } else {
      console.error(`${prefix} Error: ${String(error)}${contextStr}`);
    }
  }

  /**
   * Log warning with consistent formatting
   */
  logWarning(message, context = {}) {
    if (!this.isDebugMode) return;

    const prefix = `[${this.component}]`;
    const contextStr = Object.keys(context).length > 0 ?
      ` ${JSON.stringify(context)}` : '';
    console.warn(`${prefix} Warning: ${message}${contextStr}`);
  }

  /**
   * Log debug information
   */
  logDebug(message, context = {}) {
    if (!this.isDebugMode) return;

    const prefix = `[${this.component}]`;
    const contextStr = Object.keys(context).length > 0 ?
      ` ${JSON.stringify(context)}` : '';
    console.log(`${prefix} Debug: ${message}${contextStr}`);
  }

  /**
   * Handle file operation errors
   */
  handleFileError(error, filePath, operation = 'read') {
    const context = { filePath, operation };

    if (error.code === 'ENOENT') {
      this.logWarning(`File not found: ${filePath}`, context);
      return { success: false, error: 'FILE_NOT_FOUND', message: 'File not found' };
    }

    if (error.code === 'EACCES') {
      this.logError(error, context);
      return { success: false, error: 'ACCESS_DENIED', message: 'Access denied' };
    }

    if (error.code === 'EISDIR') {
      this.logWarning(`Expected file but found directory: ${filePath}`, context);
      return { success: false, error: 'IS_DIRECTORY', message: 'Path is a directory' };
    }

    this.logError(error, context);
    return { success: false, error: 'FILE_ERROR', message: error.message };
  }

  /**
   * Handle parsing errors
   */
  handleParseError(error, filePath, language) {
    const context = { filePath, language };

    if (error.name === 'SyntaxError') {
      this.logWarning(`Syntax error in ${language} file: ${filePath}`, context);
      return { success: false, error: 'SYNTAX_ERROR', message: 'Syntax error in source code' };
    }

    this.logError(error, context);
    return { success: false, error: 'PARSE_ERROR', message: error.message };
  }

  /**
   * Handle process execution errors (for Python, etc.)
   */
  handleProcessError(error, command, filePath) {
    const context = { command, filePath };

    if (error.code === 'ENOENT') {
      this.logError(new AdaptiveError(
        `Command not found: ${command}`,
        'COMMAND_NOT_FOUND',
        context
      ));
      return { success: false, error: 'COMMAND_NOT_FOUND', message: `Command not found: ${command}` };
    }

    if (error.code === 'TIMEOUT') {
      this.logError(new AdaptiveError(
        `Command timeout: ${command}`,
        'COMMAND_TIMEOUT',
        context
      ));
      return { success: false, error: 'COMMAND_TIMEOUT', message: 'Command execution timeout' };
    }

    this.logError(error, context);
    return { success: false, error: 'PROCESS_ERROR', message: error.message };
  }

  /**
   * Safe async wrapper for operations
   */
  async safeAsync(operation, context = {}) {
    try {
      const result = await operation();
      return { success: true, data: result };
    } catch (error) {
      this.logError(error, context);
      return { success: false, error: error.code || 'UNKNOWN_ERROR', message: error.message };
    }
  }

  /**
   * Safe sync wrapper for operations
   */
  safeSync(operation, context = {}) {
    try {
      const result = operation();
      return { success: true, data: result };
    } catch (error) {
      this.logError(error, context);
      return { success: false, error: error.code || 'UNKNOWN_ERROR', message: error.message };
    }
  }

  /**
   * Create a child error handler for a specific component
   */
  createChild(component) {
    return new ErrorHandler(`${this.component}:${component}`);
  }
}

// Error codes for consistent error identification
const ErrorCodes = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  ACCESS_DENIED: 'ACCESS_DENIED',
  IS_DIRECTORY: 'IS_DIRECTORY',
  SYNTAX_ERROR: 'SYNTAX_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  COMMAND_NOT_FOUND: 'COMMAND_NOT_FOUND',
  COMMAND_TIMEOUT: 'COMMAND_TIMEOUT',
  PROCESS_ERROR: 'PROCESS_ERROR',
  PLUGIN_NOT_FOUND: 'PLUGIN_NOT_FOUND',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  METADATA_INVALID: 'METADATA_INVALID'
};

module.exports = {
  ErrorHandler,
  AdaptiveError,
  ErrorCodes
};