const path = require('path');
const { spawnSync } = require('child_process');

const CLI_PATH = path.resolve(__dirname, '../../src/cli/init.js');
const FIXTURE_ROOT = path.resolve(__dirname, '../fixtures/discovery-lens');
const PYTHON_FIXTURE_ROOT = path.resolve(__dirname, '../fixtures/python-lens');

function runCli(args, options = {}) {
  const result = spawnSync('node', [CLI_PATH, ...args], {
    cwd: FIXTURE_ROOT,
    encoding: 'utf8',
    ...options
  });
  if (result.error) {
    throw result.error;
  }
  return result;
}

function parseJsonOutput(stdout) {
  const trimmed = (stdout || '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Unable to locate JSON payload in output: ${stdout}`);
  }
  const jsonSegment = trimmed.slice(start, end + 1);
  return JSON.parse(jsonSegment);
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, '');
}

describe('Discovery Lens CLI (why)', () => {
  const signatureArg = JSON.stringify({
    name: 'UserService',
    type: 'class',
    methods: ['login', 'logout']
  });

  it('outputs ranked candidates and suggested signature in JSON mode', () => {
    const result = runCli(['why', signatureArg, '--json']);
    expect(result.status).toBe(0);
    const parsed = parseJsonOutput(result.stdout);

    expect(parsed.candidates).toBeInstanceOf(Array);
    expect(parsed.candidates.length).toBeGreaterThan(0);

    const [topCandidate] = parsed.candidates;
    expect(topCandidate.relativePath).toBe('src/services/UserService.js');

    const mockCandidate = parsed.candidates.find((candidate) => candidate.relativePath.includes('mocks'));
    expect(mockCandidate).toBeDefined();
    expect(topCandidate.score).toBeGreaterThan(mockCandidate.score);
    expect(mockCandidate.breakdown.path).toBeLessThan(topCandidate.breakdown.path);

    expect(parsed.suggestedSignature).toBeDefined();
    expect(parsed.suggestedSignature.type).toBe('class');
    expect(parsed.suggestedSignature.name).toBe('UserService');
    expect(parsed.suggestedSignature.methods).toEqual(expect.arrayContaining(['login', 'logout']));
  });

  it('prints human-readable output when --json is omitted', () => {
    const result = runCli(['why', signatureArg]);
    expect(result.status).toBe(0);
    const output = stripAnsi(result.stdout);
    expect(output).toContain('Discovery Lens');
    expect(output).toContain('src/services/UserService.js');
    expect(output).toContain('UserService');
    expect(output).toContain('Suggested signature');
  });
});

describe('Discovery Lens CLI (why) - Python', () => {
  const signatureArg = JSON.stringify({
    name: 'CustomerService',
    type: 'class',
    module: 'src.services.customer_service',
    methods: ['create', 'cancel']
  });

  it('includes python candidates in JSON mode', () => {
    const result = runCli(['why', signatureArg, '--json'], { cwd: PYTHON_FIXTURE_ROOT });
    expect(result.status).toBe(0);
    const parsed = parseJsonOutput(result.stdout);
    const pythonCandidate = parsed.candidates.find((candidate) => candidate.language === 'python');
    expect(pythonCandidate).toBeDefined();
    expect(pythonCandidate.relativePath).toBe('src/services/customer_service.py');
  });
});
