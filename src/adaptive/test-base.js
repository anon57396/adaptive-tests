/**
 * Adaptive Test Base - Tests that find their own targets
 *
 * MIT License - Use this anywhere
 */

const assert = require('assert');
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


function createJestRuntime(globals, framework) {
  const describeFn = globals.describe;
  const testFn = globals.test;
  const beforeAllFn = globals.beforeAll;
  if (typeof describeFn !== 'function' || typeof testFn !== 'function' || typeof beforeAllFn !== 'function') {
    throw new Error(`Unable to bind ${framework} runtime: missing global hooks.`);
  }
  return {
    framework,
    describe: describeFn,
    test: testFn,
    beforeAll: beforeAllFn
  };
}

function createMochaRuntime(globals) {
  const describeFn = globals.describe;
  const testFn = globals.it || globals.test;
  const beforeAllFn = globals.beforeAll || globals.before;
  if (typeof describeFn !== 'function' || typeof testFn !== 'function' || typeof beforeAllFn !== 'function') {
    throw new Error('Unable to bind Mocha runtime: missing global hooks.');
  }
  return {
    framework: 'mocha',
    describe: describeFn,
    test: testFn,
    beforeAll: beforeAllFn
  };
}

function resolveTestRuntime(forcedFramework) {
  const globals = globalThis;
  const desired = forcedFramework ? String(forcedFramework).toLowerCase() : null;

  if (desired === 'mocha') {
    return createMochaRuntime(globals);
  }
  if (desired === 'jest') {
    return createJestRuntime(globals, 'jest');
  }
  if (desired === 'vitest') {
    return createJestRuntime(globals, 'vitest');
  }

  if (typeof globals.describe === 'function' && typeof globals.test === 'function') {
    const framework = typeof globals.vitest !== 'undefined' ? 'vitest' : 'jest';
    return createJestRuntime(globals, framework);
  }

  if (typeof globals.describe === 'function' && typeof (globals.it || globals.test) === 'function') {
    return createMochaRuntime(globals);
  }

  throw new Error('Adaptive tests require Jest, Vitest, or Mocha globals to be available.');
}

function createAssertions() {
  return {
    ensureDefined(value, message) {
      assert.ok(value !== undefined && value !== null, message);
    },
    ensureFunction(value, message) {
      assert.strictEqual(typeof value, 'function', message);
    },
    ensureTruthy(value, message) {
      assert.ok(Boolean(value), message);
    }
  };
}


/**
 * A Jest/Mocha/Vitest compatible test runner for adaptive tests.
 * @template {new () => AdaptiveTest} T
 * @param {T} TestClass - The AdaptiveTest class to run.
 * @param {{framework?: 'jest' | 'mocha' | 'vitest'}} [options] - Optional runtime override.
 * @returns {void}
 */
function adaptiveTest(TestClass, options = {}) {
  const testInstance = new TestClass();
  const signature = testInstance.getTargetSignature();
  const testName = TestClass.name || 'AdaptiveTest';
  const runtime = resolveTestRuntime(options.framework);
  const assertions = createAssertions();
  const requestedExport = signature.exports || signature.name;

  runtime.describe(`${testName} - Adaptive Discovery`, () => {
    let target;

    runtime.beforeAll(async () => {
      const engine = getDiscoveryEngine();
      target = await engine.discoverTarget(signature);
    });

    runtime.test('should discover target module', () => {
      assertions.ensureDefined(target, 'Discovery engine did not resolve a target for the provided signature.');
    });

    runtime.test('should validate target has expected structure', () => {
      if (!target) {
        assertions.ensureDefined(target, 'Discovery engine did not resolve a target for the provided signature.');
        return;
      }

      if (signature.type === 'class') {
        const TargetClass = testInstance.getExport(target, requestedExport);
        assertions.ensureFunction(TargetClass, 'Expected discovered export to be a constructor or function.');
        assertions.ensureDefined(
          TargetClass && TargetClass.prototype,
          'Expected discovered export to expose a prototype.'
        );
      }

      if (Array.isArray(signature.methods) && signature.methods.length > 0) {
        const TargetClass = testInstance.getExport(target, requestedExport);
        assertions.ensureDefined(
          TargetClass && TargetClass.prototype,
          'Expected discovered export to expose methods on its prototype.'
        );
        signature.methods.forEach(method => {
          assertions.ensureDefined(
            TargetClass.prototype[method],
            `Expected method '${method}' to exist on the discovered target.`
          );
          assertions.ensureFunction(
            TargetClass.prototype[method],
            `Expected method '${method}' to be callable.`
          );
        });
      }
    });

    runtime.describe('Functional Tests', () => {
      runtime.beforeAll(async () => {
        await testInstance.runTests(target);
      });

      runtime.test('adaptive test placeholder', () => {
        assertions.ensureTruthy(true, 'Placeholder assertion executed.');
      });
    });
  });
}

module.exports = { AdaptiveTest, adaptiveTest };