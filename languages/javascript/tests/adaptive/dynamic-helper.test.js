const path = require('path');
const { getDiscoveryEngine } = require('adaptive-tests');

describe('execute – adaptive discovery', () => {
  const fixtureRoot = path.join(__dirname, '../fixtures/async-await/javascript');
  const engine = getDiscoveryEngine(fixtureRoot);
  let execute;

  beforeAll(async () => {
    execute = await engine.discoverTarget({
      name: 'execute',
      type: 'function',
      exports: 'execute'
    });
  });

  it('discovers the target', () => {
    expect(typeof execute).toBe('function');
    expect(execute('demo')).toBe('processed:demo');
  });
});
