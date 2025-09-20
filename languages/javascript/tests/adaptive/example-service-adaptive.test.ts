import { AdaptiveTest, adaptiveTest } from 'adaptive-tests';

class ExampleServiceAdaptiveTest extends AdaptiveTest {
  getTargetSignature() {
    return {
      name: 'Calculator',
      type: 'class',
      methods: ['add', 'multiply']
    };
  }

  async runTests(Target: any) {
    const instance = new Target();
    if (typeof instance.add !== 'function') {
      throw new Error('Expected Calculator.add to be a function');
    }
    const value = instance.add(2, 3);
    expect(value).toBe(5);
  }
}

adaptiveTest(ExampleServiceAdaptiveTest);
