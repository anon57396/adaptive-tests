/**
 * Base Service Class - For testing inheritance detection
 */

class BaseService {
  constructor() {
    this.initialized = true;
    this.config = {};
    this.logger = console;
  }

  initialize(config) {
    this.config = config;
    return this;
  }

  log(message) {
    this.logger.log(`[${this.constructor.name}] ${message}`);
  }

  async execute(action, params) {
    throw new Error('execute() must be implemented by subclass');
  }

  getStatus() {
    return {
      initialized: this.initialized,
      className: this.constructor.name,
      hasConfig: Object.keys(this.config).length > 0
    };
  }
}

module.exports = BaseService;