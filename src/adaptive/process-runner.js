/**
 * Process Runner Utility
 *
 * Provides a hardened wrapper around child_process.spawnSync with validation,
 * sensible defaults, and structured metadata for logging. Centralises guardrails
 * for language bridge executions (Python, PHP, Ruby, Wolfram).
 */

const { spawnSync } = require('child_process');
const path = require('path');

const CONTROL_CHARS_REGEX = /[\u0000-\u001F\u007F]/;

function ensureStringArray(args = []) {
  if (!Array.isArray(args)) {
    throw new TypeError('ProcessRunner expects args to be an array');
  }

  return args.map((arg, index) => {
    if (typeof arg !== 'string') {
      throw new TypeError(`ProcessRunner arg at index ${index} must be a string`);
    }

    if (CONTROL_CHARS_REGEX.test(arg)) {
      throw new Error(`ProcessRunner arg at index ${index} contains control characters`);
    }

    return arg;
  });
}

function ensureExecutable(executable, allowlist) {
  if (typeof executable !== 'string' || executable.trim().length === 0) {
    throw new TypeError('Executable must be a non-empty string');
  }

  if (CONTROL_CHARS_REGEX.test(executable)) {
    throw new Error('Executable contains control characters');
  }

  if (allowlist && allowlist.length > 0 && !allowlist.includes(executable)) {
    throw new Error(`Executable ${executable} is not included in the allowlist`);
  }

  return executable;
}

function ensureOptions(options = {}) {
  const {
    timeout = 5000,
    maxBuffer = 1024 * 1024,
    encoding = 'utf8',
    cwd,
    env,
    allowlist = [],
    errorHandler = null,
    context = {}
  } = options;

  if (typeof timeout !== 'number' || timeout <= 0) {
    throw new TypeError('timeout must be a positive number');
  }

  if (typeof maxBuffer !== 'number' || maxBuffer <= 0) {
    throw new TypeError('maxBuffer must be a positive number');
  }

  return {
    spawnOptions: {
      timeout,
      maxBuffer,
      encoding,
      cwd,
      env: env ? { ...env } : process.env
    },
    allowlist,
    errorHandler,
    context
  };
}

function logError(errorHandler, message, meta) {
  if (errorHandler && typeof errorHandler.logError === 'function') {
    errorHandler.logError(message, meta);
  }
}

function runProcessSync(executable, args = [], options = {}) {
  const safeArgs = ensureStringArray(args);
  const { spawnOptions, allowlist, errorHandler, context } = ensureOptions(options);
  const safeExecutable = ensureExecutable(executable, allowlist);

  try {
    const result = spawnSync(safeExecutable, safeArgs, spawnOptions);
    return {
      result,
      executable: safeExecutable,
      args: safeArgs,
      timedOut: result.status === null && result.signal === 'SIGTERM',
      context
    };
  } catch (error) {
    logError(errorHandler, 'Process runner threw', {
      ...(context || {}),
      executable: safeExecutable,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  runProcessSync
};
