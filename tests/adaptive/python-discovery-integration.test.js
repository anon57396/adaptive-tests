const path = require('path');
const childProcess = require('child_process');
const { PythonDiscoveryIntegration } = require('../../src/adaptive/python/python-discovery-integration');

describe('PythonDiscoveryIntegration', () => {
  test('parses Python metadata when python3 is available', async () => {
    const pythonCheck = childProcess.spawnSync('python3', ['--version'], { encoding: 'utf8' });
    if (pythonCheck.error || pythonCheck.status !== 0) {
      console.warn('python3 not available – skipping Python discovery integration test');
      return;
    }

    const integration = new PythonDiscoveryIntegration(null);
    const filePath = path.resolve(__dirname, '../fixtures/python-sample/service.py');

    const metadata = await integration.parseFile(filePath);
    expect(metadata).not.toBeNull();
    expect(metadata.moduleName).toContain('tests');
    expect(metadata.classes.some(entry => entry.name === 'OrderService')).toBe(true);
    expect(metadata.functions.some(entry => entry.name === 'calculate_total')).toBe(true);

    const candidates = integration.extractCandidates(metadata);
    const classCandidate = candidates.find(entry => entry.name === 'OrderService');
    expect(classCandidate).toBeDefined();
    expect(classCandidate.module).toEqual(metadata.moduleName);

    const exports = metadata.exports || [];
    expect(exports.some(entry => entry.exportedName === 'OrderService')).toBe(true);
  });

  test('falls back to python when python3 is unavailable', async () => {
    const integration = new PythonDiscoveryIntegration(null);
    const filePath = path.resolve(__dirname, '../fixtures/python-sample/service.py');

    const metadataPayload = JSON.stringify({
      classes: [{ name: 'OrderService', methods: [] }],
      functions: [{ name: 'calculate_total' }]
    });

    const spawnMock = jest
      .spyOn(childProcess, 'spawnSync')
      .mockImplementation((cmd, args, options) => {
        if (cmd === 'python3') {
          const error = new Error('not found');
          error.code = 'ENOENT';
          return { status: null, error };
        }
        if (cmd === 'python') {
          return { status: 0, stdout: metadataPayload, stderr: '' };
        }
        return { status: 1, stderr: 'unexpected command' };
      });

    const metadata = await integration.parseFile(filePath);

    expect(metadata).not.toBeNull();
    expect(spawnMock).toHaveBeenCalledWith('python3', expect.any(Array), expect.objectContaining({ encoding: 'utf8' }));
    expect(spawnMock).toHaveBeenCalledWith('python', expect.any(Array), expect.objectContaining({ encoding: 'utf8' }));

    spawnMock.mockRestore();
  });
});
