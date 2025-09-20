import { AdaptiveTest, discover } from 'adaptive-tests';

class ExampleServiceAdaptiveTest extends AdaptiveTest {
  getTargetSignature() {
    return {
      name: 'ExampleService',
      type: 'class',
      methods: ['methodName'] // // Add the methods your target exposes
    };
  }

  async runTests(Target: any) {
    describe('ExampleService', () => {
      test('should be discoverable', () => {
        const instance = new Target();
        expect(instance).toBeDefined();
      });
    });
  }
}

// Initialize the adaptive test runner
new ExampleServiceAdaptiveTest();
