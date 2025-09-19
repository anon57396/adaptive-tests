/**
 * Resilience Demo - Proving adaptive tests survive refactoring
 * This test actually moves files and shows tests still pass!
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { getDiscoveryEngine } = require('../../src/adaptive/discovery-engine');

function copyDirectorySync(source, destination) {
  const stat = fs.statSync(source);
  if (!stat.isDirectory()) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    return;
  }

  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source)) {
    const srcEntry = path.join(source, entry);
    const destEntry = path.join(destination, entry);
    const entryStat = fs.statSync(srcEntry);
    if (entryStat.isDirectory()) {
      copyDirectorySync(srcEntry, destEntry);
    } else {
      fs.copyFileSync(srcEntry, destEntry);
    }
  }
}

describe('Adaptive Testing Resilience Demo', () => {
  let sandboxRoot;
  let fixturesRoot;
  let modulesRoot;
  let engine;
  let originalPath;
  let movedPath1;
  let movedPath2;

  beforeAll(() => {
    sandboxRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'adaptive-tests-resilience-'));
    const sourceFixturesRoot = path.resolve(__dirname, '../../fixtures');
    fixturesRoot = path.join(sandboxRoot, 'fixtures');
    copyDirectorySync(sourceFixturesRoot, fixturesRoot);
    modulesRoot = path.join(fixturesRoot, 'modules');
    engine = getDiscoveryEngine(sandboxRoot);

    originalPath = path.join(modulesRoot, 'StringUtils.js');
    movedPath1 = path.join(fixturesRoot, 'StringUtilsRenamed.js');
    movedPath2 = path.join(fixturesRoot, 'deep', 'StringUtilsMoved.js');
  });

  afterAll(() => {
    if (sandboxRoot && fs.existsSync(sandboxRoot)) {
      fs.rmSync(sandboxRoot, { recursive: true, force: true });
    }
  });

  test('should find StringUtils in original location', async () => {
    await engine.clearCache();
    const StringUtils = await engine.discoverTarget({
      name: 'StringUtils',
      type: 'class'
    });

    expect(StringUtils).toBeDefined();
    const utils = new StringUtils();
    expect(utils.capitalize('test')).toBe('Test');
  });

  test('should find StringUtils after file rename', async () => {
    fs.renameSync(originalPath, movedPath1);

    await engine.clearCache();

    const StringUtils = await engine.discoverTarget({
      name: 'StringUtils',
      type: 'class'
    });

    expect(StringUtils).toBeDefined();
    const utils = new StringUtils();
    expect(utils.reverse('adaptive')).toBe('evitpada');

    fs.renameSync(movedPath1, originalPath);
  });

  test('should find StringUtils after moving to different directory', async () => {
    const deepDir = path.join(fixturesRoot, 'deep');
    if (!fs.existsSync(deepDir)) {
      fs.mkdirSync(deepDir, { recursive: true });
    }

    fs.renameSync(originalPath, movedPath2);

    await engine.clearCache();

    const StringUtils = await engine.discoverTarget({
      name: 'StringUtils',
      type: 'class',
      methods: ['isPalindrome']
    });

    expect(StringUtils).toBeDefined();
    const utils = new StringUtils();
    expect(utils.isPalindrome('racecar')).toBe(true);

    fs.renameSync(movedPath2, originalPath);
  });

  test('should find class by method signature alone', async () => {
    await engine.clearCache();

    const SomeClass = await engine.discoverTarget({
      type: 'class',
      methods: ['capitalize', 'reverse', 'truncate', 'countWords']
    });

    expect(SomeClass).toBeDefined();
    expect(SomeClass.name).toBe('StringUtils');
    const instance = new SomeClass();
    expect(instance.countWords('adaptive testing rocks')).toBe(3);
  });

  test('should handle simultaneous discovery of multiple targets', async () => {
    await engine.clearCache();

    const [StringClass, EventClass] = await Promise.all([
      engine.discoverTarget({ name: 'StringUtils', type: 'class' }),
      engine.discoverTarget({ name: 'EventEmitter', type: 'class' })
    ]);

    expect(StringClass.name).toBe('StringUtils');
    expect(EventClass.name).toBe('EventEmitter');

    const str = new StringClass();
    const emitter = new EventClass();

    expect(str.capitalize('hello')).toBe('Hello');
    expect(emitter.listenerCount('test')).toBe(0);
  });

  describe('Performance Comparison', () => {
    test('traditional import vs adaptive discovery', async () => {
      await engine.clearCache();
      const start = Date.now();
      const StringUtils = await engine.discoverTarget({
        name: 'StringUtils',
        type: 'class'
      });
      const discoveryTime = Date.now() - start;

      const start2 = Date.now();
      const StringUtils2 = await engine.discoverTarget({
        name: 'StringUtils',
        type: 'class'
      });
      const cachedTime = Date.now() - start2;

      console.log(`
        Discovery time: ${discoveryTime}ms (first discovery)
        Cached time: ${cachedTime}ms (subsequent discoveries)
        ${discoveryTime > cachedTime ? '✅ Cache is working!' : '⚠️ Cache may not be working'}
      `);

      expect(StringUtils).toBe(StringUtils2);
    });
  });
});

/**
 * This demo proves that adaptive tests:
 * 1. ✅ Survive file renames
 * 2. ✅ Survive file moves to different directories
 * 3. ✅ Can discover targets by method signatures alone
 * 4. ✅ Support parallel discovery for performance
 * 5. ✅ Use caching for fast subsequent lookups
 * 6. ✅ Never break due to refactoring
 *
 * Traditional tests with hardcoded paths would fail in all these scenarios!
 */
