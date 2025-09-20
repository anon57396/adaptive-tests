const fs = require('fs');
const os = require('os');
const path = require('path');
const { DiscoveryEngine } = require('../../languages/javascript/src/discovery-engine');

describe('DiscoveryEngine concurrency', () => {
  const createdPaths = [];

  afterEach(() => {
    while (createdPaths.length > 0) {
      const dir = createdPaths.pop();
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (error) {
        // ignore cleanup errors
      }
    }
  });

  test('collectCandidates respects configured max concurrency', async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'adaptive-concurrency-'));
    createdPaths.push(tempRoot);

    const sourceDir = path.join(tempRoot, 'src');
    fs.mkdirSync(sourceDir, { recursive: true });

    for (let i = 0; i < 20; i += 1) {
      const filePath = path.join(sourceDir, `File${i}.js`);
      fs.writeFileSync(filePath, 'export const value = 1;\n', 'utf8');
    }

    const engine = new DiscoveryEngine(tempRoot, {
      discovery: {
        extensions: ['.js'],
        concurrency: 3,
        scoring: {
          minCandidateScore: -100
        }
      }
    });

    const signature = { name: 'value' };

    let active = 0;
    let maxActive = 0;

    const evaluateSpy = jest
      .spyOn(engine, 'evaluateCandidate')
      .mockImplementation(async (filePath) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return {
          path: filePath,
          fileName: path.basename(filePath),
          content: '',
          mtimeMs: null,
          score: 10
        };
      });

    await engine.collectCandidates(tempRoot, signature);

    expect(maxActive).toBeLessThanOrEqual(3);
    evaluateSpy.mockRestore();
  });
});
