const path = require('path');
const { DiscoveryEngine } = require('../../src/discovery-engine');

const FIXTURE_ROOT = path.resolve(__dirname, '../fixtures/tsconfig-alias');

describe('TypeScript path alias resolution', () => {
  it('captures baseUrl and alias metadata for candidates', async () => {
    const engine = new DiscoveryEngine(FIXTURE_ROOT);
    const signature = engine.normalizeSignature({ name: 'AliasService', type: 'class' });
    const candidates = await engine.collectCandidates(FIXTURE_ROOT, signature);

    const match = candidates.find((candidate) => candidate.fileName === 'AliasService');
    expect(match).toBeDefined();
    expect(match.relativePath).toBe('src/services/AliasService.ts');
    expect(match.tsBaseImport).toBe('services/AliasService');
    expect(match.tsAliases).toContain('@services/AliasService');
  });
});
