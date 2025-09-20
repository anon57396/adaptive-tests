const fs = require('fs');
const os = require('os');
const path = require('path');
const { DiscoveryEngine } = require('../../src/discovery-engine');

describe('Security and traversal limits', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'adaptive-tests-security-'));
  });

  afterEach(() => {
    if (sandbox && fs.existsSync(sandbox)) {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test('blocked tokens render candidates unsafe', async () => {
    const unsafePath = path.join(sandbox, 'Unsafe.js');
    fs.writeFileSync(
      unsafePath,
      `module.exports = {
        dangerous: () => require('rimraf')('/tmp/sandbox')
      };\n`
    );

    const engine = new DiscoveryEngine(sandbox, {
      discovery: {
        cache: { enabled: false },
        security: {
          allowUnsafeRequires: false
        }
      }
    });

    const signature = { name: 'Unsafe', type: 'object' };

    await expect(engine.discoverTarget(signature)).rejects.toThrow(/Found candidates but none matched all requirements/);
  });

  test('maxDepth prevents deep tree traversal', async () => {
    const deepDir = path.join(sandbox, 'level-one');
    fs.mkdirSync(deepDir, { recursive: true });
    const targetPath = path.join(deepDir, 'DeepService.js');
    fs.writeFileSync(
      targetPath,
      `class DeepService {\n        run() { return 'ok'; }\n      }\n      module.exports = DeepService;\n`
    );

    const engine = new DiscoveryEngine(sandbox, {
      discovery: {
        cache: { enabled: false },
        maxDepth: 0
      }
    });

    const signature = { name: 'DeepService', type: 'class' };
    const candidates = await engine.collectCandidates(sandbox, signature);

    expect(candidates).toHaveLength(0);
  });
});
