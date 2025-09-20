const path = require('path');
const { PhpDiscoveryIntegration } = require('../../languages/javascript/src/php/php-discovery-integration');

describe('PhpDiscoveryIntegration', () => {
  test('parses PHP metadata and extracts candidates', async () => {
    const integration = new PhpDiscoveryIntegration(null);
    integration.collector.config.skipPatterns = [];
    const filePath = path.resolve(__dirname, '../fixtures/php-sample/UserService.php');

    const metadata = await integration.parseFile(filePath);
    expect(metadata).not.toBeNull();
    expect(metadata.namespace).toBe('App\\Services');
    expect(Array.isArray(metadata.classes)).toBe(true);

    const candidates = integration.extractCandidates(metadata);
    const candidate = candidates.find(entry => entry.name === 'UserService');
    expect(candidate).toBeDefined();
    expect(candidate.type).toBe('class');
    expect(candidate.methods.some(method => method.name === 'register')).toBe(true);

    const exports = metadata.exports || [];
    expect(exports.some(entry => entry.exportedName === 'UserService')).toBe(true);
  });
});
