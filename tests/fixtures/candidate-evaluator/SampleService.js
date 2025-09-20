class SampleService {
  constructor() {
    this.cache = new Map();
  }

  execute(value) {
    return value * 2;
  }
}

module.exports = { SampleService };
