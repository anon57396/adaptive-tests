const fs = require('fs');
const os = require('os');
const path = require('path');

const { DiscoveryEngine } = require('../../src/adaptive/discovery-engine');

jest.setTimeout(30000);

const runStressPerf = Boolean(process.env.RUN_PERF_TESTS);
const directories = Number(process.env.PERF_TREE_DIRECTORIES || (runStressPerf ? 200 : 60));
const filesPerDirectory = Number(process.env.PERF_TREE_FILES || (runStressPerf ? 50 : 20));
const expectedThreshold = Number(process.env.PERF_TREE_MAX_MS || (runStressPerf ? 5000 : 2000));

function ensurePositiveInt(name, value) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

const dirCount = ensurePositiveInt('PERF_TREE_DIRECTORIES', directories);
const filesCount = ensurePositiveInt('PERF_TREE_FILES', filesPerDirectory);
const maxDuration = Math.max(expectedThreshold, 100);

test('discovers targets in a synthetic repository within time budget', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'adaptive-large-tree-'));

  const fillerContent = "module.exports = function noop() { return 'noop'; };\n";
  const targetContent = "class TargetService { work() { return 'done'; } }\nmodule.exports = { TargetService };\n";

  try {
    for (let dirIndex = 0; dirIndex < dirCount; dirIndex += 1) {
      const dirPath = path.join(tempRoot, `dir-${dirIndex}`);
      fs.mkdirSync(dirPath, { recursive: true });

      for (let fileIndex = 0; fileIndex < filesCount; fileIndex += 1) {
        const filePath = path.join(dirPath, `file-${fileIndex}.js`);
        if (dirIndex === dirCount - 1 && fileIndex === 0) {
          fs.writeFileSync(filePath, targetContent, 'utf8');
        } else {
          fs.writeFileSync(filePath, fillerContent, 'utf8');
        }
      }
    }

    const engine = new DiscoveryEngine(tempRoot, {
      discovery: {
        languages: {
          javascript: {
            enabled: true,
            extensions: ['.js']
          }
        }
      }
    });
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
    expect(duration).toBeLessThanOrEqual(maxDuration);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }

  if (!runStressPerf) {
    // Provide guidance for running the heavier profile in CI or stress runs
    // eslint-disable-next-line no-console
    console.info(`Perf tree size: ${dirCount} directories x ${filesCount} files (max ${maxDuration}ms). Set RUN_PERF_TESTS=1 for expanded coverage.`);
  }
});
