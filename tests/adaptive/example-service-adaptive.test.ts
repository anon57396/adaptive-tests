import { AdaptiveTest, adaptiveTest } from 'adaptive-tests';

class ExampleServiceAdaptiveTest extends AdaptiveTest {
  getTargetSignature() {
    return {
      name: 'StringUtils',
      type: 'class',
      methods: ['capitalize', 'reverse']
    };
  }

  async runTests(Target: any) {
    const instance = new Target();
    if (typeof instance.capitalize !== 'function') {
      throw new Error('Expected StringUtils.capitalize to be a function');
    }
    const value = instance.capitalize('adaptive');
    expect(value).toBe('Adaptive');
  }
}

adaptiveTest(ExampleServiceAdaptiveTest);
