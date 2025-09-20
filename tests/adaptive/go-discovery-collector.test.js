const path = require('path');
const { GoDiscoveryCollector } = require('../../src/adaptive/go/go-discovery-collector');

describe('GoDiscoveryCollector', () => {
  test('parses Go metadata with tree-sitter', async () => {
    const collector = new GoDiscoveryCollector();
    const fixturePath = path.resolve(__dirname, '../fixtures/go-scaffold/src/services/account_service.go');

    const metadata = await collector.parseFile(fixturePath);
    expect(metadata).not.toBeNull();
    expect(metadata.packageName).toBe('services');

    const struct = metadata.structs.find(entry => entry.name === 'AccountService');
    expect(struct).toBeDefined();
    expect(struct.methods.some(method => method.name === 'CreateAccount')).toBe(true);

    const method = metadata.methods.find(entry => entry.name === 'CreateAccount');
    expect(method).toBeDefined();
    expect(method.receiver).toBeTruthy();
    expect(method.receiver.typeName).toBe('AccountService');
  });
});
