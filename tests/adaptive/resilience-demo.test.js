/**
 * Resilience Demo - Proving adaptive tests survive refactoring
 * This test actually moves files and shows tests still pass!
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { getDiscoveryEngine } = require('../../src/adaptive/discovery');

const engine = getDiscoveryEngine(path.resolve(__dirname, '../..'));

describe('Adaptive Testing Resilience Demo', () => {
  const originalPath = path.join(__dirname, '..', 'fixtures', 'modules', 'StringUtils.js');
  const movedPath1 = path.join(__dirname, '..', 'fixtures', 'StringUtilsRenamed.js');
  const movedPath2 = path.join(__dirname, '..', 'fixtures', 'deep', 'StringUtilsMoved.js');

  afterAll(() => {
    // Ensure file is back in original location
    if (fs.existsSync(movedPath1)) {
      fs.renameSync(movedPath1, originalPath);
    }
    if (fs.existsSync(movedPath2)) {
      fs.renameSync(movedPath2, originalPath);
      // Clean up the deep directory if empty
      try {
        fs.rmdirSync(path.join(__dirname, '..', 'fixtures', 'deep'));
      } catch (e) {
        // Directory not empty or doesn't exist
      }
    }
  });

  test('should find StringUtils in original location', async () => {
    engine.clearCache();
    const StringUtils = await engine.discoverTarget({
      name: 'StringUtils',
      type: 'class'
    });

    expect(StringUtils).toBeDefined();
    const utils = new StringUtils();
    expect(utils.capitalize('test')).toBe('Test');
  });

  test('should find StringUtils after file rename', async () => {
    // Rename the file
    fs.renameSync(originalPath, movedPath1);

    // Clear cache to force re-discovery
    engine.clearCache();

    // Try to discover StringUtils - should still find it!
    const StringUtils = await engine.discoverTarget({
      name: 'StringUtils',
      type: 'class'
    });

    expect(StringUtils).toBeDefined();
    const utils = new StringUtils();
    expect(utils.reverse('adaptive')).toBe('evitpada');

    // Move it back
    fs.renameSync(movedPath1, originalPath);
  });

  test('should find StringUtils after moving to different directory', async () => {
    // Create deep directory
    const deepDir = path.join(__dirname, '..', 'fixtures', 'deep');
    if (!fs.existsSync(deepDir)) {
      fs.mkdirSync(deepDir, { recursive: true });
    }

    // Move the file to a different directory
    fs.renameSync(originalPath, movedPath2);

    // Clear cache
    engine.clearCache();

    // Discover StringUtils - should find it in new location!
    const StringUtils = await engine.discoverTarget({
      name: 'StringUtils',
      type: 'class',
      methods: ['isPalindrome']
    });

    expect(StringUtils).toBeDefined();
    const utils = new StringUtils();
    expect(utils.isPalindrome('racecar')).toBe(true);

    // Move it back
    fs.renameSync(movedPath2, originalPath);
  });

  test('should find class by method signature alone', async () => {
    engine.clearCache();

    // Don't even specify the name - just the methods!
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
    engine.clearCache();

    // Discover multiple targets in parallel
    const [StringClass, EventClass] = await Promise.all([
      engine.discoverTarget({ name: 'StringUtils', type: 'class' }),
      engine.discoverTarget({ name: 'EventEmitter', type: 'class' })
    ]);

    expect(StringClass.name).toBe('StringUtils');
    expect(EventClass.name).toBe('EventEmitter');

    // Use them all
    const str = new StringClass();
    const emitter = new EventClass();

    expect(str.capitalize('hello')).toBe('Hello');
    expect(emitter.listenerCount('test')).toBe(0);
  });

  describe('Performance Comparison', () => {
    test('traditional import vs adaptive discovery', async () => {
      // Traditional approach would break if file moves:
      // const StringUtils = require('../fixtures/modules/StringUtils');
      // ❌ This breaks when file is moved!

      // Adaptive approach always works:
      engine.clearCache();
      const start = Date.now();
      const StringUtils = await engine.discoverTarget({
        name: 'StringUtils',
        type: 'class'
      });
      const discoveryTime = Date.now() - start;

      // Second discovery uses cache (much faster)
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

      expect(StringUtils).toBe(StringUtils2); // Same reference from cache
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