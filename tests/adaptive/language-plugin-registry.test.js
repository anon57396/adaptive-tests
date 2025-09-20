jest.mock('java-parser', () => ({
  parse: () => ({ children: {} })
}));

const { LanguagePluginRegistry } = require('../../languages/javascript/src/language-plugin-registry');

describe('LanguagePluginRegistry', () => {
  afterEach(() => {
    LanguagePluginRegistry.resetInstance();
  });

  test('discovers PHP and Python integrations', async () => {
    const registry = LanguagePluginRegistry.getInstance();
    await registry.initialize();

    const phpIntegration = await registry.getPlugin('php');
    expect(phpIntegration).toBeTruthy();
    expect(phpIntegration.getFileExtension()).toBe('.php');

    const pythonIntegration = await registry.getPlugin('python');
    expect(pythonIntegration).toBeTruthy();
    expect(pythonIntegration.getFileExtension()).toBe('.py');

    const goIntegration = await registry.getPlugin('go');
    expect(goIntegration).toBeTruthy();
    expect(goIntegration.getFileExtension()).toBe('.go');
  });
});
