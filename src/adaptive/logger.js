/**
 * Minimal logger abstraction that defaults to console output but allows
 * callers to inject custom loggers (e.g. Winston, Pino) when desired.
 */

const LEVELS = ['error', 'warn', 'info', 'debug', 'trace'];

const bindConsoleMethod = (method) => {
  if (typeof console === 'undefined') {
    return () => {};
  }

  const fallback = typeof console.log === 'function' ? console.log.bind(console) : () => {};
  if (typeof console[method] === 'function') {
    return console[method].bind(console);
  }
  return fallback;
};

const createDefaultLogger = () => LEVELS.reduce((logger, level) => {
  logger[level] = bindConsoleMethod(level === 'trace' ? 'debug' : level);
  return logger;
}, {});

let currentLogger = createDefaultLogger();

const normaliseLogger = (candidate) => {
  if (!candidate || typeof candidate !== 'object') {
    return createDefaultLogger();
  }

  const logger = {};
  for (const level of LEVELS) {
    const method = candidate[level];
    if (typeof method === 'function') {
      logger[level] = method.bind(candidate);
    } else {
      logger[level] = bindConsoleMethod(level === 'trace' ? 'debug' : level);
    }
  }
  return logger;
};

function setLogger(logger) {
  currentLogger = normaliseLogger(logger);
}

function getLogger() {
  return currentLogger;
}

module.exports = {
  getLogger,
  setLogger,
};
