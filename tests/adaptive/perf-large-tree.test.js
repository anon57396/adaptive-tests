const fs = require('fs');
const os = require('os');
const path = require('path');

const { DiscoveryEngine } = require('../../src/adaptive/discovery-engine');

jest.setTimeout(30000);

const maybeTest = process.env.RUN_PERF_TESTS ? test : test.skip;

maybeTest('discovers targets in a large synthetic repository quickly', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'adaptive-large-tree-'));
  const directories = 200;
  const filesPerDirectory = 50;

  const fillerContent = "module.exports = function noop() { return 'noop'; };\n";
  const targetContent = "class TargetService { work() { return 'done'; } }\nmodule.exports = { TargetService };\n";

  try {
    for (let dirIndex = 0; dirIndex < directories; dirIndex += 1) {
      const dirPath = path.join(tempRoot, `dir-${dirIndex}`);
      fs.mkdirSync(dirPath, { recursive: true });

      for (let fileIndex = 0; fileIndex < filesPerDirectory; fileIndex += 1) {
        const filePath = path.join(dirPath, `file-${fileIndex}.js`);
        if (dirIndex === directories - 1 && fileIndex === 0) {
          fs.writeFileSync(filePath, targetContent, 'utf8');
        } else {
          fs.writeFileSync(filePath, fillerContent, 'utf8');
        }
      }
    }

    const engine = new DiscoveryEngine(tempRoot);
    await engine.clearCache();

    const start = Date.now();
    const TargetService = await engine.discoverTarget({
      name: 'TargetService',
      type: 'class',
      exports: 'TargetService',
      methods: ['work']
    });
    const duration = Date.now() - start;

    expect(TargetService).toBeTruthy();
    const instance = new TargetService();
    expect(instance.work()).toBe('done');
    expect(duration).toBeLessThanOrEqual(5000);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
