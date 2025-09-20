const path = require('path');
const { runProcessSync } = require('../process-runner');

function buildPythonEnv() {
  const current = process.env.PYTHONPATH || '';
  const pySrc = path.resolve(__dirname, '../../../packages/adaptive-tests-py/src');
  const parts = current ? [current, pySrc] : [pySrc];
  return {
    ...process.env,
    PYTHONPATH: parts.join(path.delimiter)
  };
}

function explainPythonSignature(signatureInput, { root, limit = 5 }) {
  const env = buildPythonEnv();
  const args = [
    '-m',
    'adaptive_tests_py.cli',
    'why',
    signatureInput,
    '--root',
    root,
    '--limit',
    String(limit),
    '--json'
  ];

  const execution = runProcessSync(
    'python3',
    args,
    {
      env,
      allowlist: ['python3', 'python'],
      context: {
        integration: 'python-why'
      }
    }
  );
  const result = execution.result;

  if (result.status !== 0 || result.error) {
    if (process.env.DEBUG_DISCOVERY) {
      const reason = result.error ? result.error.message : result.stderr || result.stdout;
      console.error('[adaptive-tests] python why failed:', reason);
    }
    return [];
  }

  let explanations;
  try {
    explanations = JSON.parse(result.stdout || '[]');
  } catch (error) {
    if (process.env.DEBUG_DISCOVERY) {
      console.error('[adaptive-tests] failed to parse python why output:', error.message);
    }
    return [];
  }

  if (!Array.isArray(explanations)) {
    return [];
  }

  return explanations.map((entry) => {
    const filePath = entry.file_path || entry.filePath || '';
    const score = typeof entry.score === 'number' ? entry.score : 0;

    return {
      language: 'python',
      path: filePath,
      relativePath: path.relative(root, filePath) || filePath,
      score,
      rawScore: score,
      recency: null,
      breakdown: entry.score_breakdown || {},
      details: entry.score_details || [],
      exports: [
        {
          exportedName: entry.name,
          accessType: 'direct',
          accessName: null,
          kind: entry.type,
          name: entry.name,
          methods: entry.methods || [],
          module: entry.module || null
        }
      ],
      metadata: entry
    };
  });
}

module.exports = {
  explainPythonSignature
};
