const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const CLI_PATH = path.resolve(__dirname, '../../src/cli/init.js');
const FIXTURE_ROOT = path.resolve(__dirname, '../fixtures/scaffold');
const JAVA_FIXTURE_ROOT = path.resolve(__dirname, '../fixtures/java-scaffold');
const JAVA_GRADLE_FIXTURE_ROOT = path.resolve(__dirname, '../fixtures/java-gradle');
const PYTHON_FIXTURE_ROOT = path.resolve(__dirname, '../fixtures/python-scaffold');

function runCli(args, options = {}) {
  const result = spawnSync('node', [CLI_PATH, ...args], {
    cwd: options.cwd || FIXTURE_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      FORCE_COLOR: '0'
    }
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

  const createWorkspaceFrom = (fixtureRoot) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adaptive-tests-scaffold-'));
    tempDirs.push(tempDir);
    fs.cpSync(fixtureRoot, tempDir, { recursive: true });
    return tempDir;
  };

  const createTempWorkspace = () => createWorkspaceFrom(FIXTURE_ROOT);
  const createJavaWorkspace = () => createWorkspaceFrom(JAVA_FIXTURE_ROOT);
  const createGradleWorkspace = () => createWorkspaceFrom(JAVA_GRADLE_FIXTURE_ROOT);
  const createPythonWorkspace = () => createWorkspaceFrom(PYTHON_FIXTURE_ROOT);

  it('generates a JavaScript adaptive test skeleton from a source path', () => {
    const workspace = createTempWorkspace();

    const result = runCli(['scaffold', 'src/services/UserService.js', '--json'], { cwd: workspace });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.created).toContain('tests/adaptive/UserService.test.js');
    expect(payload.skipped).toEqual([]);
    expect(payload.errors).toEqual([]);

    const generatedTestPath = path.join(workspace, 'tests', 'adaptive', 'UserService.test.js');
    expect(fs.existsSync(generatedTestPath)).toBe(true);

    const content = fs.readFileSync(generatedTestPath, 'utf8');
    expect(content).toContain("name: 'UserService'");
    expect(content).toContain("type: 'class'");
    expect(content).toContain("it.todo('TODO: login')");
  });

  it('supports TypeScript output', () => {
    const workspace = createTempWorkspace();

    const result = runCli(['scaffold', 'src/services/UserService.js', '--typescript', '--json'], { cwd: workspace });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.created).toContain('tests/adaptive/UserService.test.ts');

    const generatedTestPath = path.join(workspace, 'tests', 'adaptive', 'UserService.test.ts');
    expect(fs.existsSync(generatedTestPath)).toBe(true);

    const content = fs.readFileSync(generatedTestPath, 'utf8');
    expect(content).toContain("import { getDiscoveryEngine } from 'adaptive-tests'");
  });

  it('does not overwrite existing tests without --force', () => {
    const workspace = createTempWorkspace();
    const generatedTestPath = path.join(workspace, 'tests', 'adaptive', 'UserService.test.js');
    fs.mkdirSync(path.dirname(generatedTestPath), { recursive: true });
    fs.writeFileSync(generatedTestPath, '// existing test', 'utf8');

    const result = runCli(['scaffold', 'src/services/UserService.js', '--json'], { cwd: workspace });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.skipped).toContain('tests/adaptive/UserService.test.js');
    expect(payload.errors).toEqual([]);
  });

  it('can apply intelligent assertions when requested', () => {
    const workspace = createTempWorkspace();

    const result = runCli(['scaffold', 'src/services/UserService.js', '--force', '--apply-assertions'], { cwd: workspace });

    expect(result.status).toBe(0);

    const generatedTestPath = path.join(workspace, 'tests', 'adaptive', 'UserService.test.js');
    const content = fs.readFileSync(generatedTestPath, 'utf8');
    expect(content).toContain("describe('login'");
    expect(content).toContain('expect(result).toBeDefined');
    expect(content).not.toContain("it.todo('TODO: login')");
  });

  it('supports JSON output for tooling', () => {
    const workspace = createTempWorkspace();

    const result = runCli(['scaffold', 'src/services/UserService.js', '--force', '--json'], { cwd: workspace });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(Array.isArray(payload.created)).toBe(true);
    expect(payload.created.length).toBe(1);
  });

  it('generates tests for all exports when requested', () => {
    const workspace = createTempWorkspace();

    const result = runCli(['scaffold', 'src/services/MultiService.js', '--all-exports'], { cwd: workspace });

    expect(result.status).toBe(0);
    const alphaPath = path.join(workspace, 'tests', 'adaptive', 'AlphaService.test.js');
    const betaPath = path.join(workspace, 'tests', 'adaptive', 'BetaService.test.js');
    expect(fs.existsSync(alphaPath)).toBe(true);
    expect(fs.existsSync(betaPath)).toBe(true);
  });

  it('supports batch scaffolding of a directory', () => {
    const workspace = createTempWorkspace();

    const result = runCli(['scaffold', '--batch', 'src/services', '--force'], { cwd: workspace });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Scaffold summary');
    const expectedFiles = [
      path.join(workspace, 'tests', 'adaptive', 'UserService.test.js'),
      path.join(workspace, 'tests', 'adaptive', 'MultiService.test.js')
    ];
    expectedFiles.forEach((file) => expect(fs.existsSync(file)).toBe(true));
  });

  it('generates a JUnit test for Java sources', () => {
    const workspace = createJavaWorkspace();

    const result = runCli(['scaffold', 'src/main/java/com/example/service/CustomerService.java', '--json'], { cwd: workspace });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.created).toContain('src/test/java/com/example/service/CustomerServiceTest.java');

    const generatedPath = path.join(workspace, 'src', 'test', 'java', 'com/example/service/CustomerServiceTest.java');
    expect(fs.existsSync(generatedPath)).toBe(true);

    const content = fs.readFileSync(generatedPath, 'utf8');
    expect(content).toContain('package com.example.service;');
    expect(content).toContain('import org.junit.jupiter.api.BeforeEach;');
    expect(content).toContain('@Test');
  });

  it('places Gradle module tests under src/test/java', () => {
    const workspace = createGradleWorkspace();

    const result = runCli(['scaffold', 'app/src/main/java/com/example/order/OrderService.java', '--json'], { cwd: workspace });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.created).toContain('app/src/test/java/com/example/order/OrderServiceTest.java');

    const generatedPath = path.join(workspace, 'app', 'src', 'test', 'java', 'com/example/order/OrderServiceTest.java');
    expect(fs.existsSync(generatedPath)).toBe(true);
    const content = fs.readFileSync(generatedPath, 'utf8');
    expect(content).toContain('package com.example.order;');
  });

  it('scaffolds pytest stubs for Python modules', () => {
    const workspace = createPythonWorkspace();

    const result = runCli(['scaffold', 'src/services/customer_service.py', '--json'], { cwd: workspace });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.created).toContain('tests/adaptive/test_customer_service.py');

    const generatedPath = path.join(workspace, 'tests', 'adaptive', 'test_customer_service.py');
    expect(fs.existsSync(generatedPath)).toBe(true);

    const content = fs.readFileSync(generatedPath, 'utf8');
    expect(content).toContain('from adaptive_tests_py import DiscoveryEngine, Signature');
    expect(content).toContain('def test_customer_service_is_discoverable');
  });

});
