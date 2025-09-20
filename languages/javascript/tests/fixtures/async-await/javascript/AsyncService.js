const path = require('path');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class AsyncService {
  constructor() {
    this.state = new Map();
    this.runTask = async (task) => {
      const helperPath = path.join(__dirname, 'execute-helper.js');
      const helper = await Promise.resolve().then(() => require(helperPath));
      return helper.execute(task);
    };
  }

  async fetchData(key) {
    await sleep(1);
    const value = `value:${key}`;
    this.state.set(key, value);
    return { key, value };
  }

  async *stream(limit = 3) {
    for (let index = 0; index < limit; index += 1) {
      await sleep(1);
      yield { index };
    }
  }

  static async initWithData(...keys) {
    const service = new AsyncService();
    await Promise.all(keys.map((key) => service.fetchData(key)));
    return service;
  }
}

async function loadAsyncService() {
  await sleep(1);
  return AsyncService;
}

module.exports = {
  AsyncService,
  loadAsyncService,
};
