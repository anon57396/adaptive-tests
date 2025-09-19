const path = require('path');

const { DiscoveryEngine } = require('../../src/adaptive/discovery-engine');
const { getTypeScriptDiscoveryEngine } = require('../../src/adaptive/typescript/discovery');

const JS_FIXTURE_ROOT = path.resolve(__dirname, '../fixtures/async-await/javascript');
const TS_FIXTURE_ROOT = path.resolve(__dirname, '../fixtures/async-await/typescript');

describe('Async discovery (JavaScript)', () => {
  let engine;

  beforeEach(async () => {
    engine = new DiscoveryEngine(JS_FIXTURE_ROOT);
    await engine.clearCache();
  });

  test('discovers async class with generator and dynamic import', async () => {
    const AsyncService = await engine.discoverTarget({
      name: 'AsyncService',
      type: 'class',
      exports: 'AsyncService',
      methods: ['fetchData', 'stream'],
      properties: ['runTask']
    });

    expect(typeof AsyncService).toBe('function');

    const instance = await AsyncService.initWithData('alpha');
    expect(instance).toBeInstanceOf(AsyncService);

    const record = await instance.fetchData('beta');
    expect(record).toEqual({ key: 'beta', value: 'value:beta' });

    const dynamicResult = await instance.runTask('demo');
    expect(dynamicResult).toBe('processed:demo');

    const iterator = instance.stream(2);
    const first = await iterator.next();
    expect(first.value).toEqual({ index: 0 });
  });

  test('discovers async factory function', async () => {
    const loadAsyncService = await engine.discoverTarget({
      name: 'loadAsyncService',
      type: 'function',
      exports: 'loadAsyncService'
    });

    const Service = await loadAsyncService();
    expect(typeof Service).toBe('function');
    expect(Service.name).toBe('AsyncService');
  });
});

describe('Async discovery (TypeScript)', () => {
  const engine = getTypeScriptDiscoveryEngine(TS_FIXTURE_ROOT);

  beforeEach(async () => {
    await engine.clearCache();
  });

  test('discovers async worker with async generator and arrow property', async () => {
    const AsyncWorker = await engine.discoverTarget({
      name: 'AsyncWorker',
      type: 'class',
      exports: 'AsyncWorker',
      methods: ['compute', 'entries'],
      properties: ['queueTask']
    });

    const worker = await AsyncWorker.ready();
    const value = await worker.compute(5);
    expect(value).toBe(10);

    const queued = await worker.queueTask('alpha');
    expect(queued).toBe('queued:alpha');

    const iterator = worker.entries(2);
    const first = await iterator.next();
    expect(first.value).toBe('compute:5');

    const second = await iterator.next();
    expect(second.value).toBe('task:alpha');
  });
});
