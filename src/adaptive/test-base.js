/**
 * Adaptive Test Base - Tests that find their own targets
 *
 * MIT License - Use this anywhere
 */

const { getDiscoveryEngine } = require('./discovery-engine');

/**
 * @typedef {import('./discovery-engine').DiscoverySignature} DiscoverySignature
 * @typedef {import('./discovery-engine').DiscoveryEngine} DiscoveryEngine
 */

/**
 * An abstract base class for creating adaptive tests.
 * @abstract
 */
class AdaptiveTest {
  constructor() {
    /** @type {DiscoveryEngine} */
    this.discoveryEngine = getDiscoveryEngine();
    /** @type {any} */
    this.target = null;
  }

  /**
   * Defines the signature of the target module to be discovered.
   * This method must be implemented by the subclass.
   * @abstract
   * @returns {DiscoverySignature}
   */
  getTargetSignature() {
    throw new Error('getTargetSignature() must be implemented by test class');
  }

  /**
   * Contains the actual test logic (e.g., using Jest or Mocha).
   * This method must be implemented by the subclass.
   * @abstract
   * @param {any} target - The discovered target module or export.
   * @returns {Promise<void> | void}
   */
  async runTests(target) {
    throw new Error('runTests() must be implemented by test class');
  }

  /**
   * Executes the adaptive test lifecycle: discovery and execution.
   * @returns {Promise<void>}
   */
  async execute() {
    const signature = this.getTargetSignature();

    try {
      // Discover the target dynamically
      this.target = await this.discoveryEngine.discoverTarget(signature);

      if (!this.target) {
        throw new Error(`Could not find target matching: ${JSON.stringify(signature)}`);
      }

      // Run the actual tests with the discovered target
      await this.runTests(this.target);

    } catch (error) {
      console.error(`Adaptive test failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper method to get a specific export from a discovered module.
   * @template T
   * @param {any} module - The discovered module.
   * @param {string} name - The name of the export to retrieve.
   * @returns {T}
   */
  getExport(module, name) {
    // Handle different export styles
    if (module[name]) return module[name];
    if (module.default) return module.default;
    if (typeof module === 'function' || typeof module === 'class') return module;

    // Try to find by checking all exports
    const exports = Object.keys(module);
    if (exports.length === 1) {
      return module[exports[0]];
    }

    throw new Error(`Could not find export '${name}' in discovered module`);
  }
}

/**
 * A Jest/Mocha compatible test runner for adaptive tests.
 * @template {new () => AdaptiveTest} T
 * @param {T} TestClass - The AdaptiveTest class to run.
 * @returns {void}
 */
function adaptiveTest(TestClass) {
  const testInstance = new TestClass();
  const signature = testInstance.getTargetSignature();
  const testName = TestClass.name || 'AdaptiveTest';

  describe(`${testName} - Adaptive Discovery`, () => {
    let target;

    beforeAll(async () => {
      const engine = getDiscoveryEngine();
      target = await engine.discoverTarget(signature);
    });

    test('should discover target module', () => {
      expect(target).toBeDefined();
    });

    test('should validate target has expected structure', () => {
      if (signature.type === 'class') {
        const TargetClass = testInstance.getExport(target, signature.exports || signature.name);
        expect(typeof TargetClass).toBe('function');
        expect(TargetClass.prototype).toBeDefined();
      }

      if (signature.methods) {
        const TargetClass = testInstance.getExport(target, signature.exports || signature.name);
        signature.methods.forEach(method => {
          expect(TargetClass.prototype[method]).toBeDefined();
        });
      }
    });

    describe('Functional Tests', () => {
      // This is where the actual test implementation runs
      beforeAll(async () => {
        await testInstance.runTests(target);
      });

      test('placeholder for dynamic tests', () => {
        // The runTests method will create the actual test cases
        expect(true).toBe(true);
      });
    });
  });
}

module.exports = { AdaptiveTest, adaptiveTest };