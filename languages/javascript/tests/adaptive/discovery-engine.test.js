const { getDiscoveryEngine } = require('../../src/index');

const expectedMethodNames = [
  'detectCallerExtension',
  'ensureCacheLoaded',
  'discoverTarget',
  'collectCandidates',
  'normalizeConcurrency',
  'evaluateCandidate',
  'isCandidateSafe',
  'selectExportFromMetadata',
  'matchesSignatureMetadata',
  'extractExportByAccess',
  'tokenizeName',
  'quickNameCheck',
  'tryResolveCandidate',
  'compileFreshModule',
  'resolveTargetFromModule',
  'validateTarget',
  'validateType',
  'validateName',
  'validateMethods',
  'validateProperties',
  'validateInheritance',
  'validateInstanceOf',
  'getTargetName',
  'shouldSkipDirectory',
  'normalizeSignature',
  'getCacheKey',
  'serializeCacheValue',
  'calculateRecencyBonus',
  'loadModule',
  'createDiscoveryError',
  'buildSignatureSuggestion',
  'logCacheWarning',
  'isCacheEntryExpired',
  'analyzeModuleExports',
  'loadCache',
  'saveCache',
  'clearCache',
  'cleanupCachedModules',
  'ensureTypeScriptSupport'
];

describe('DiscoveryEngine – adaptive discovery', () => {
  const engine = getDiscoveryEngine();
  let DiscoveryEngine;

  beforeAll(async () => {
    DiscoveryEngine = await engine.discoverTarget({
      name: 'DiscoveryEngine',
      type: 'class',
      exports: 'DiscoveryEngine',
      methods: expectedMethodNames
    });
  });

  it('discovers the target', () => {
    expect(DiscoveryEngine).toBeDefined();
  });

  describe('methods', () => {
    let prototype;

    beforeAll(() => {
      prototype = DiscoveryEngine.prototype;
    });

    expectedMethodNames.forEach((methodName) => {
      it(`exposes ${methodName}()`, () => {
        expect(typeof prototype[methodName]).toBe('function');
      });
    });

    it('only exposes the expected public instance surface', () => {
      const publicMethods = Object.getOwnPropertyNames(DiscoveryEngine.prototype)
        .filter((name) => name !== 'constructor');
      expect(new Set(publicMethods)).toEqual(new Set(expectedMethodNames));
    });
  });
});
