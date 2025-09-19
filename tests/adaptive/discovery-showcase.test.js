/**
 * Showcase test for the Discovery Engine
 * Demonstrates the power and flexibility of adaptive test discovery
 */

const path = require('path');
const fs = require('fs');
const { getDiscoveryEngine } = require('../../src/adaptive/discovery-engine');

const engine = getDiscoveryEngine(path.resolve(__dirname, '../..'));
const fixturesRoot = path.resolve(__dirname, '../../fixtures');
const modulesRoot = path.join(fixturesRoot, 'modules');

describe('Discovery Engine Showcase', () => {
  describe('Discovery Strategies', () => {
    test('should discover by class name only', async () => {
      const StringUtils = await engine.discoverTarget({
        name: 'StringUtils'
      });

      expect(StringUtils).toBeDefined();
      expect(StringUtils.name).toBe('StringUtils');
    });

    test('should discover by class name and type', async () => {
      const EventEmitter = await engine.discoverTarget({
        name: 'EventEmitter',
        type: 'class'
      });

      expect(EventEmitter).toBeDefined();
      expect(typeof EventEmitter).toBe('function');
      expect(EventEmitter.prototype.constructor.name).toBe('EventEmitter');
    });

    test('should discover by method signatures', async () => {
      const target = await engine.discoverTarget({
        type: 'class',
        methods: ['capitalize', 'reverse', 'isPalindrome']
      });

      expect(target).toBeDefined();
      expect(target.prototype.capitalize).toBeDefined();
      expect(target.prototype.reverse).toBeDefined();
      expect(target.prototype.isPalindrome).toBeDefined();
    });

    test('should discover modules with multiple exports', async () => {
      // Discover individual functions from the module
      const processArray = await engine.discoverTarget({
        type: 'function',
        name: 'processArray'
      });

      const transformData = await engine.discoverTarget({
        type: 'function',
        name: 'transformData'
      });

      expect(processArray).toBeDefined();
      expect(transformData).toBeDefined();
      expect(typeof processArray).toBe('function');
      expect(typeof transformData).toBe('function');
    });

    test('should discover using regex patterns', async () => {
      const target = await engine.discoverTarget({
        name: /String.*/,
        type: 'class'
      });

      expect(target).toBeDefined();
      expect(target.name).toMatch(/String.*/);
    });
  });

  describe('Resilience to Refactoring', () => {
    let tempFilePath;

    afterEach(() => {
      // Clean up temp files
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    });

    test('should find class even after file rename', async () => {
      // First, verify we can find StringUtils
      const original = await engine.discoverTarget({
        name: 'StringUtils',
        type: 'class'
      });
      expect(original).toBeDefined();

      // Clear the cache to force re-discovery
      await engine.clearCache();

      // Even with cleared cache, it should find it again
      const rediscovered = await engine.discoverTarget({
        name: 'StringUtils',
        type: 'class'
      });
      expect(rediscovered).toBeDefined();
      expect(rediscovered.name).toBe('StringUtils');
    });

    test('should find class in deeply nested directories', async () => {
      // Create a deeply nested test module
      const deepPath = path.join(fixturesRoot, 'deep', 'nested', 'path');
      fs.mkdirSync(deepPath, { recursive: true });

      tempFilePath = path.join(deepPath, 'DeepClass.js');
      fs.writeFileSync(tempFilePath, `
        class DeepClass {
          testMethod() {
            return 'found in deep directory';
          }
        }
        module.exports = DeepClass;
      `);

      // Clear cache and discover
      await engine.clearCache();
      const DeepClass = await engine.discoverTarget({
        name: 'DeepClass',
        type: 'class',
        methods: ['testMethod']
      });

      expect(DeepClass).toBeDefined();
      const instance = new DeepClass();
      expect(instance.testMethod()).toBe('found in deep directory');

      // Clean up
      fs.unlinkSync(tempFilePath);
      // Clean up all nested directories
      fs.rmdirSync(path.join(fixturesRoot, 'deep', 'nested', 'path'));
      fs.rmdirSync(path.join(fixturesRoot, 'deep', 'nested'));
      fs.rmdirSync(path.join(fixturesRoot, 'deep'));
    });
  });

  describe('Performance and Caching', () => {
    test('should cache discoveries for faster subsequent lookups', async () => {
      // Clear cache first
      await engine.clearCache();

      // First discovery (slow - needs to scan)
      const start1 = Date.now();
      const first = await engine.discoverTarget({
        name: 'EventEmitter',
        type: 'class'
      });
      const time1 = Date.now() - start1;

      // Second discovery (fast - uses cache)
      const start2 = Date.now();
      const second = await engine.discoverTarget({
        name: 'EventEmitter',
        type: 'class'
      });
      const time2 = Date.now() - start2;

      expect(first).toBeDefined();
      expect(second).toBeDefined();
    });

    test('should handle cache invalidation gracefully', async () => {
      // Create a temporary module
      const tempPath = modulesRoot;
      tempFilePath = path.join(tempPath, 'TempModule.js');

      fs.writeFileSync(tempFilePath, `
        class TempModule {
          tempMethod() { return 'v1'; }
        }
        module.exports = TempModule;
      `);

      // Discover it
      await engine.clearCache();
      const v1 = await engine.discoverTarget({
        name: 'TempModule',
        type: 'class'
      });
      expect(new v1().tempMethod()).toBe('v1');

      // Modify the module
      await new Promise(resolve => setTimeout(resolve, 25));
      fs.writeFileSync(tempFilePath, `
        class TempModule {
          tempMethod() { return 'v2'; }
        }
        module.exports = TempModule;
      `);
      fs.utimesSync(tempFilePath, new Date(), new Date());

      // Clear cache and rediscover
      await engine.clearCache();
      if (typeof jest !== 'undefined' && jest.resetModules) {
        jest.resetModules();
      }
      // Clear all require cache entries that contain our temp module
      Object.keys(require.cache).forEach(key => {
        if (key.includes('TempModule')) {
          delete require.cache[key];
        }
      });

      const v2 = await engine.discoverTarget({
        name: 'TempModule',
        type: 'class'
      });
      expect(new v2().tempMethod()).toBe('v2');

      // Clean up
      fs.unlinkSync(tempFilePath);
    });
  });

  describe('Error Handling', () => {
    test('should provide helpful error when target not found', async () => {
      await expect(engine.discoverTarget({
        name: 'NonExistentClass',
        type: 'class',
        methods: ['impossibleMethod']
      })).rejects.toThrow(/Could not discover target matching/);
    });

    test('should handle invalid signatures gracefully', async () => {
      await expect(engine.discoverTarget(null))
        .rejects.toThrow(/requires a signature object/);

      await expect(engine.discoverTarget('string'))
        .rejects.toThrow(/requires a signature object/);
    });
  });

  describe('Multiple Discovery Patterns', () => {
    test('should discover all our test fixtures', async () => {
      const fixtures = [
        { name: 'StringUtils', type: 'class' },
        { name: 'EventEmitter', type: 'class' },
        { name: 'processArray', type: 'function' }
      ];

      const discovered = await Promise.all(
        fixtures.map(sig => engine.discoverTarget(sig))
      );

      expect(discovered).toHaveLength(3);
      discovered.forEach(target => {
        expect(target).toBeDefined();
      });
    });
  });
});

/**
 * This showcase demonstrates:
 * 1. Various discovery strategies (by name, type, methods, exports, regex)
 * 2. Resilience to file moves and renames
 * 3. Performance benefits of caching
 * 4. Graceful error handling
 * 5. The engine's ability to find targets anywhere in the codebase
 *
 * Key insight: Tests don't need to know WHERE code lives, only WHAT it does
 */
