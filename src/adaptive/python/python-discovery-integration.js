const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PYTHON_BRIDGE_SCRIPT = `import ast, json, sys
from pathlib import Path

path = Path(sys.argv[1])
with path.open(encoding='utf-8') as handle:
    source = handle.read()

module = ast.parse(source, filename=str(path))
classes = []
functions = []

for node in module.body:
    if isinstance(node, ast.ClassDef):
        methods = []
        for member in node.body:
            if isinstance(member, ast.FunctionDef):
                name = member.name
                if name.startswith('_'):
                    continue
                methods.append(name)
        classes.append({'name': node.name, 'methods': methods})
    elif isinstance(node, ast.FunctionDef):
        if node.name.startswith('_'):
            continue
        functions.append({'name': node.name})

print(json.dumps({'classes': classes, 'functions': functions}))
`;

function buildPythonEnv() {
  const current = process.env.PYTHONPATH || '';
  const pySrc = path.resolve(__dirname, '../../../packages/adaptive-tests-py/src');
  const paths = current ? [current, pySrc] : [pySrc];
  return {
    ...process.env,
    PYTHONPATH: paths.join(path.delimiter)
  };
}

class PythonDiscoveryIntegration {
  constructor() {
    this.pythonEnv = buildPythonEnv();
  }

  parseFile(filePath) {
    // Validate file path to prevent injection
    if (!filePath || typeof filePath !== 'string') {
      return null;
    }

    // Ensure the path is absolute and normalized
    const absolutePath = path.resolve(filePath);

    // Verify the file exists and is a Python file
    if (!fs.existsSync(absolutePath) || !absolutePath.endsWith('.py')) {
      return null;
    }

    // Use absolute path to prevent directory traversal
    const result = spawnSync('python3', ['-c', PYTHON_BRIDGE_SCRIPT, absolutePath], {
      encoding: 'utf8',
      env: this.pythonEnv,
      timeout: 5000, // Add timeout to prevent hanging
      maxBuffer: 1024 * 1024 // 1MB max buffer
    });

    if (result.error || result.status !== 0) {
      if (process.env.DEBUG_DISCOVERY) {
        const reason = result.error ? result.error.message : result.stderr || result.stdout;
        console.error('[adaptive-tests] Python metadata extraction failed:', reason);
      }
      return null;
    }

    let payload = null;
    try {
      payload = JSON.parse(result.stdout || '{}');
    } catch (error) {
      if (process.env.DEBUG_DISCOVERY) {
        console.error('[adaptive-tests] Failed to parse Python metadata:', error.message);
      }
      return null;
    }

    const classes = Array.isArray(payload.classes) ? payload.classes : [];
    const functions = Array.isArray(payload.functions) ? payload.functions : [];

    const exports = [];

    classes.forEach((cls) => {
      const methods = Array.isArray(cls.methods) ? cls.methods : [];
      exports.push({
        exportedName: cls.name,
        access: { type: 'default' },
        info: {
          name: cls.name,
          kind: 'class',
          methods,
          python: {
            type: 'class',
            name: cls.name,
            methods
          }
        }
      });
    });

    functions.forEach((fn) => {
      exports.push({
        exportedName: fn.name,
        access: { type: 'default' },
        info: {
          name: fn.name,
          kind: 'function',
          methods: [],
          python: {
            type: 'function',
            name: fn.name
          }
        }
      });
    });

    return {
      exports,
      pythonMetadata: {
        classes,
        functions
      }
    };
  }

  generatePytestTest({ signature, moduleName, targetKind, depth }) {
    const slug = slugify(signature.name || 'target');
    const projectRootExpr = depth > 0
      ? `Path(__file__).resolve().parents[${depth}]`
      : 'Path(__file__).resolve().parents[0]';

    const signatureLines = [
      'Signature(',
      `        name='${signature.name}',`,
      `        type='${targetKind}',`
    ];

    if (moduleName) {
      signatureLines.push(`        module='${moduleName}',`);
    }

    const methods = Array.isArray(signature.methods) ? signature.methods.filter(Boolean) : [];
    if (methods.length > 0) {
      const joined = methods.map((method) => `'${method}'`).join(', ');
      signatureLines.push(`        methods=[${joined}],`);
    }

    signatureLines.push('    )');

    const discoveryBlock = [
      'Target = engine.discover(',
      ...signatureLines.map((line) => `        ${line}`),
      '    )'
    ].join('\n');

    const assertionBlock = targetKind === 'class'
      ? [
        'assert Target is not None',
        'instance = Target()',
        '# TODO: add meaningful assertions for instance'
      ]
      : [
        'assert callable(Target)',
        '# TODO: invoke Target with representative arguments and assert the result'
      ];

    return [
      'from __future__ import annotations',
      '',
      'from pathlib import Path',
      '',
      'from adaptive_tests_py import DiscoveryEngine, Signature',
      '',
      `PROJECT_ROOT = ${projectRootExpr}`,
      'engine = DiscoveryEngine(root=str(PROJECT_ROOT))',
      '',
      `def test_${slug}_is_discoverable() -> None:`,
      `    ${discoveryBlock}`,
      ...assertionBlock.map((line) => `    ${line}`),
      ''
    ].join('\n');
  }
}

function slugify(value) {
  return (value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'target';
}

module.exports = {
  PythonDiscoveryIntegration
};
