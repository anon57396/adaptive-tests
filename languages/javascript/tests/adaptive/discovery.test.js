const fs = require('fs');
const os = require('os');
const path = require('path');

const { getDiscoveryEngine, DiscoveryEngine } = require('../../src/discovery-engine');
const { getTypeScriptDiscoveryEngine } = require('../../src/typescript/discovery');

const repoRoot = path.resolve(__dirname, '..', '..');

describe('DiscoveryEngine', () => {
  const engine = getDiscoveryEngine(repoRoot);

  beforeEach(async () => {
    await engine.clearCache();
  });

  test('prefers canonical implementation over demo failure cases', async () => {
    const Calculator = await engine.discoverTarget({
      name: 'Calculator',
      type: 'class',
      exports: 'Calculator',
      methods: ['add', 'subtract', 'multiply', 'divide']
    });

    const instance = new Calculator();
    expect(instance.add(2, 3)).toBe(5);
    expect(() => instance.divide(4, 0)).toThrow('Division by zero');
  });

  test('requires exported candidates to expose real methods', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'adaptive-tests-'));

    const goodPath = path.join(tempRoot, 'Widget.js');
    fs.writeFileSync(
      goodPath,
      "class Widget { foo() { return 'foo'; } bar() { return 'bar'; } }\nmodule.exports = { Widget };\n"
    );

    const fakePath = path.join(tempRoot, 'FakeWidget.js');
    fs.writeFileSync(
      fakePath,
      "// Mentions foo and bar but never exports callable implementations\nmodule.exports.Widget = { foo: 'foo', bar: 'bar' };\n"
    );

    const tempEngine = new DiscoveryEngine(tempRoot);
    const Widget = await tempEngine.discoverTarget({
      name: 'Widget',
      type: 'class',
      exports: 'Widget',
      methods: ['foo', 'bar']
    });

    const widget = new Widget();
    expect(widget.foo()).toBe('foo');
    expect(widget.bar()).toBe('bar');

    await tempEngine.clearCache();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test('creates distinct discovery engines per root path', async () => {
    const dirA = fs.mkdtempSync(path.join(os.tmpdir(), 'adaptive-a-'));
    const dirB = fs.mkdtempSync(path.join(os.tmpdir(), 'adaptive-b-'));

    const engineA1 = getDiscoveryEngine(dirA);
    const engineA2 = getDiscoveryEngine(dirA);
    const engineB = getDiscoveryEngine(dirB);

    expect(engineA1).toBe(engineA2);
    expect(engineA1).not.toBe(engineB);

    await engineA1.clearCache();
    await engineB.clearCache();
    fs.rmSync(dirA, { recursive: true, force: true });
    fs.rmSync(dirB, { recursive: true, force: true });
  });
});

const tsExampleRoot = path.join(repoRoot, 'examples', 'typescript');

describe('TypeScriptDiscoveryEngine', () => {
  const engine = getTypeScriptDiscoveryEngine(tsExampleRoot);

  beforeEach(async () => {
    await engine.clearCache();
  });

  test('discovers TypeScript classes without touching broken stubs', async () => {
    const Calculator = await engine.discoverTarget({
      name: 'Calculator',
      type: 'class',
      methods: ['add', 'subtract', 'multiply', 'divide'],
      exports: 'Calculator'
    });

    const instance = new Calculator();
    expect(instance.add(2, 3)).toBe(5);
    expect(instance.multiply(4, 5)).toBe(20);
    expect(() => instance.divide(10, 0)).toThrow('Division by zero');
  });
});
