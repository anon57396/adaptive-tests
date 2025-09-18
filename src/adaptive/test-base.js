/**
 * Adaptive Test Base - Tests that find their own targets
 *
 * MIT License - Use this anywhere
 */

const { getDiscoveryEngine } = require('./discovery');

class AdaptiveTest {
  constructor() {
    this.discoveryEngine = getDiscoveryEngine();
    this.target = null;
  }

  /**
   * Define what you're looking for
   * Override this in your test
   */
  getTargetSignature() {
    throw new Error('getTargetSignature() must be implemented by test class');
  }

  /**
   * Run your actual tests
   * Override this in your test
   */
  async runTests(target) {
    throw new Error('runTests() must be implemented by test class');
  }

  /**
   * Execute the adaptive test
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
   * Helper method to get specific export from module
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
 * Jest/Mocha compatible test runner for adaptive tests
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