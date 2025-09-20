const fs = require('fs');
const os = require('os');
const path = require('path');
const { ResultAssembler } = require('../../src/result-assembler');

function makeModuleFile(dir, name = 'example-module.js') {
  const filePath = path.join(dir, name);
  fs.writeFileSync(
    filePath,
    "module.exports = function ExampleModule() { return 'ok'; };\n",
    'utf8'
  );
  return filePath;
}

describe('ResultAssembler', () => {
  let tempDir;
  let moduleFile;
  const cacheFileName = 'discovery-cache.json';

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'result-assembler-'));
    moduleFile = makeModuleFile(tempDir);
  });

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createCandidateEvaluator(overrides = {}) {
    return {
      isCandidateSafe: overrides.isCandidateSafe || jest.fn(() => true),
      selectExportFromMetadata: overrides.selectExportFromMetadata || jest.fn(() => null),
      extractExportByAccess: overrides.extractExportByAccess || jest.fn(),
      validateTarget: overrides.validateTarget || jest.fn(() => ({ score: 10 })),
      resolveTargetFromModule: overrides.resolveTargetFromModule || jest.fn(moduleExports => ({
        target: moduleExports,
        access: { type: 'direct' }
      }))
    };
  }

  function createAssembler(options = {}) {
    const candidateEvaluator = options.candidateEvaluator || createCandidateEvaluator();
    const runtimeCache = options.runtimeCache || new Map();
    const persistentCache = options.persistentCache || {};
    const moduleVersions = options.moduleVersions || new Map();
    const cachedModules = options.cachedModules || new Set();

    const assembler = new ResultAssembler({
      rootPath: tempDir,
      candidateEvaluator,
      moduleVersions,
      cachedModules,
      cleanupCachedModules: options.cleanupCachedModules || jest.fn(),
      ensureTypeScriptSupport: options.ensureTypeScriptSupport || jest.fn(),
      runtimeCache,
      persistentCache,
      cacheConfig: options.cacheConfig || {
        enabled: true,
        file: cacheFileName,
        logWarnings: true,
        ttlMs: options.ttlMs ?? 0
      }
    });

    return { assembler, candidateEvaluator, runtimeCache, persistentCache, moduleVersions, cachedModules };
  }

  test('resolveCandidate stores results in caches and reloads from persistent cache', async () => {
    const { assembler, candidateEvaluator, runtimeCache, persistentCache } = createAssembler();
    const signature = { name: 'ExampleModule', type: 'function' };
    const candidate = {
      path: moduleFile,
      score: 80,
      metadata: null,
      mtimeMs: fs.statSync(moduleFile).mtimeMs
    };

    const resolved = await assembler.resolveCandidate(candidate, signature);
    expect(resolved).not.toBeNull();
    expect(candidateEvaluator.resolveTargetFromModule).toHaveBeenCalled();

    const cacheKey = assembler.getCacheKey(signature);
    await assembler.storeResolution(cacheKey, candidate, resolved);

    expect(runtimeCache.has(cacheKey)).toBe(true);
    expect(persistentCache[cacheKey]).toBeDefined();
    expect(fs.existsSync(path.join(tempDir, cacheFileName))).toBe(true);

    const { assembler: rehydrated } = createAssembler({
      candidateEvaluator: createCandidateEvaluator(),
      cacheConfig: { enabled: true, file: cacheFileName, logWarnings: true, ttlMs: 0 }
    });

    const cached = await rehydrated.tryGetCachedTarget(cacheKey, signature);
    expect(typeof cached).toBe('function');
  });

  test('tryGetCachedTarget removes expired runtime entries', async () => {
    const { assembler, runtimeCache } = createAssembler({
      cacheConfig: { enabled: false, file: cacheFileName, logWarnings: false, ttlMs: 5 }
    });

    const signature = { name: 'ExpiredModule' };
    const cacheKey = assembler.getCacheKey(signature);

    runtimeCache.set(cacheKey, {
      path: moduleFile,
      access: { type: 'direct' },
      score: 10,
      timestamp: Date.now() - 50,
      mtimeMs: fs.statSync(moduleFile).mtimeMs
    });

    const target = await assembler.tryGetCachedTarget(cacheKey, signature);
    expect(target).toBeNull();
    expect(runtimeCache.has(cacheKey)).toBe(false);
  });
});
