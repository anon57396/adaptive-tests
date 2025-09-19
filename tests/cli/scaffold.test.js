const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const CLI_PATH = path.resolve(__dirname, '../../src/cli/init.js');
const FIXTURE_ROOT = path.resolve(__dirname, '../fixtures/scaffold');

function runCli(args, options = {}) {
  const result = spawnSync('node', [CLI_PATH, ...args], {
    cwd: options.cwd || FIXTURE_ROOT,
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

describe('CLI scaffold command', () => {
  const tempDirs = [];

  afterAll(() => {
    tempDirs.forEach((dir) => {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (error) {
        // ignore
      }
    });
  });

  const createTempWorkspace = () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adaptive-tests-scaffold-'));
    tempDirs.push(tempDir);
    fs.cpSync(FIXTURE_ROOT, tempDir, { recursive: true });
    return tempDir;
  };

  it('generates a JavaScript adaptive test skeleton from a source path', () => {
    const workspace = createTempWorkspace();

    const result = runCli(['scaffold', 'src/services/UserService.js'], { cwd: workspace });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Created tests/adaptive/UserService.test.js');

    const generatedTestPath = path.join(workspace, 'tests', 'adaptive', 'UserService.test.js');
    expect(fs.existsSync(generatedTestPath)).toBe(true);

    const content = fs.readFileSync(generatedTestPath, 'utf8');
    expect(content).toContain("name: 'UserService'");
    expect(content).toContain("type: 'class'");
    expect(content).toContain("methods: ['login', 'logout', 'resetPassword']");
  });

  it('supports TypeScript output', () => {
    const workspace = createTempWorkspace();

    const result = runCli(['scaffold', 'src/services/UserService.js', '--typescript'], { cwd: workspace });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Created tests/adaptive/UserService.test.ts');

    const generatedTestPath = path.join(workspace, 'tests', 'adaptive', 'UserService.test.ts');
    expect(fs.existsSync(generatedTestPath)).toBe(true);

    const content = fs.readFileSync(generatedTestPath, 'utf8');
    expect(content).toContain("import { getDiscoveryEngine } from 'adaptive-tests'");
  });

  it('refuses to overwrite existing tests without --force', () => {
    const workspace = createTempWorkspace();
    const generatedTestPath = path.join(workspace, 'tests', 'adaptive', 'UserService.test.js');
    fs.mkdirSync(path.dirname(generatedTestPath), { recursive: true });
    fs.writeFileSync(generatedTestPath, '// existing test', 'utf8');

    const result = runCli(['scaffold', 'src/services/UserService.js'], { cwd: workspace });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Test file already exists');
  });
});
