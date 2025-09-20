const path = require('path');
const { runProcessSync } = require('../../src/adaptive/process-runner');

describe('process-runner', () => {
  test('runs a simple node command when executable is allowlisted', () => {
    const scriptPath = path.join(__dirname, '../fixtures/process-runner-ok.js');
    const execution = runProcessSync(
      process.execPath,
      [scriptPath],
      {
        allowlist: [process.execPath],
        timeout: 2000
      }
    );

    expect(execution.result.status).toBe(0);
    expect(execution.result.stdout.trim()).toBe('ok');
  });

  test('throws when executable not in allowlist', () => {
    expect(() => {
      runProcessSync('/bin/echo', ['hello'], {
        allowlist: []
      });
    }).toThrow('Executable');
  });

  test('throws when args contain control characters', () => {
    expect(() => {
      runProcessSync(process.execPath, ['\n'], {
        allowlist: [process.execPath]
      });
    }).toThrow('control characters');
  });

  test('throws when args are not an array', () => {
    expect(() => {
      runProcessSync(process.execPath, 'not-array', {
        allowlist: [process.execPath]
      });
    }).toThrow('args to be an array');
  });
});
