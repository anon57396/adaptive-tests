/**
 * Python Discovery Integration
 *
 * Integrates Python discovery into the adaptive-tests discovery engine using
 * the shared BaseLanguageIntegration contract. Uses a lightweight Python
 * bridge script for AST extraction and provides pytest scaffolding helpers.
 */

const path = require('path');
const fs = require('fs');
const { BaseLanguageIntegration } = require('../base-language-integration');
const { ErrorHandler } = require('../error-handler');
const processRunner = require('../process-runner');

const PYTHON_BRIDGE_SCRIPT = `import ast, json, sys
from pathlib import Path


def get_name(node):
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        parts = []
        current = node
        while isinstance(current, ast.Attribute):
            parts.append(current.attr)
            current = current.value
        if isinstance(current, ast.Name):
            parts.append(current.id)
        return '.'.join(reversed(parts))
    if isinstance(node, ast.Call):
        return get_name(node.func)
    if isinstance(node, ast.Subscript):
        return get_name(node.value)
    return None


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
            if isinstance(member, (ast.FunctionDef, ast.AsyncFunctionDef)):
                name = member.name
                if name.startswith('_'):
                    continue
                methods.append(name)
        bases = []
        for base in node.bases:
            base_name = get_name(base)
            if base_name:
                bases.append(base_name)
        decorators = []
        for decorator in getattr(node, 'decorator_list', []):
            deco_name = get_name(decorator)
            if deco_name:
                decorators.append(deco_name)
        classes.append({
            'name': node.name,
            'methods': methods,
            'bases': bases,
            'decorators': decorators
        })
    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        if node.name.startswith('_'):
            continue
        decorators = []
        for decorator in getattr(node, 'decorator_list', []):
            deco_name = get_name(decorator)
            if deco_name:
                decorators.append(deco_name)
        functions.append({
            'name': node.name,
            'decorators': decorators,
            'isAsync': isinstance(node, ast.AsyncFunctionDef)
        })

print(json.dumps({'classes': classes, 'functions': functions}))
`;

function buildPythonEnv() {
  const current = process.env.PYTHONPATH || '';
  const pySrc = path.resolve(__dirname, '../../../packages/adaptive-tests-py/src');
  const parts = current ? [current, pySrc] : [pySrc];
  return {
    ...process.env,
    PYTHONPATH: parts.join(path.delimiter)
  };
}

class PythonDiscoveryCollector {
  constructor() {
    this.pythonEnv = buildPythonEnv();
    this.errorHandler = new ErrorHandler('python-integration');
    this.allowedExecutables = ['python3', 'python'];
  }

  shouldScanFile(filePath) {
    return typeof filePath === 'string' && filePath.endsWith('.py');
  }

  runPythonBridge(filePath) {
    const options = {
      encoding: 'utf8',
      env: this.pythonEnv,
      timeout: 5000,
      maxBuffer: 1024 * 1024
    };

    let lastError = null;

    for (const executable of this.allowedExecutables) {
      const execution = processRunner.runProcessSync(
        executable,
        ['-c', PYTHON_BRIDGE_SCRIPT, filePath],
        {
          ...options,
          allowlist: this.allowedExecutables,
          errorHandler: this.errorHandler,
          context: {
            filePath,
            integration: 'python-bridge'
          }
        }
      );

      const { result } = execution;
      if (result.error && result.error.code === 'ENOENT') {
        lastError = result.error;
        continue;
      }
      return { executable: execution.executable, result };
    }

    const error = lastError || new Error('Python interpreter not found');
    error.code = error.code || 'COMMAND_NOT_FOUND';
    throw error;
  }

  async parseFile(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      this.errorHandler.logWarning('Invalid file path provided', { filePath });
      return null;
    }

    const absolutePath = path.resolve(filePath);
    if (!absolutePath.endsWith('.py')) {
      this.errorHandler.logWarning('File is not a Python file', { filePath: absolutePath });
      return null;
    }

    if (!fs.existsSync(absolutePath)) {
      return this.errorHandler.handleFileError(
        { code: 'ENOENT', message: 'File not found' },
        absolutePath,
        'read'
      );
    }

    let bridgeExecution = null;
    const result = this.errorHandler.safeSync(
      () => {
        bridgeExecution = this.runPythonBridge(absolutePath);
        return bridgeExecution.result;
      },
      { filePath: absolutePath, operation: 'spawnPython' }
    );

    if (!result.success) {
      return this.errorHandler.handleProcessError(
        new Error(result.message),
        bridgeExecution?.executable || 'python3',
        absolutePath
      );
    }

    const spawnResult = result.data;
    if (spawnResult.error || spawnResult.status !== 0) {
      const reason = spawnResult.error ?
        spawnResult.error.message :
        spawnResult.stderr || spawnResult.stdout || 'unknown error';

      return this.errorHandler.handleProcessError(
        spawnResult.error || new Error(reason),
        bridgeExecution?.executable || 'python3',
        absolutePath
      );
    }

    const parseResult = this.errorHandler.safeSync(
      () => JSON.parse(spawnResult.stdout.toString() || '{}'),
      { filePath: absolutePath, operation: 'parseJSON' }
    );

    if (!parseResult.success) {
      return this.errorHandler.handleParseError(
        new Error(parseResult.message),
        absolutePath,
        'python'
      );
    }

    const payload = parseResult.data || {};
    const classes = Array.isArray(payload.classes) ? payload.classes : [];
    const functions = Array.isArray(payload.functions) ? payload.functions : [];

    // Build exports array from classes and functions
    const exports = [];
    classes.forEach(cls => {
      exports.push({
        exportedName: cls.name,
        type: 'class'
      });
    });
    functions.forEach(fn => {
      exports.push({
        exportedName: fn.name,
        type: 'function'
      });
    });

    // Extract module name from file path
    const moduleName = payload.module || absolutePath.replace(/\.py$/, '').replace(/\//g, '.');

    return {
      path: absolutePath,
      moduleName,
      classes: classes.map(cls => ({
        name: cls.name,
        methods: Array.isArray(cls.methods) ? cls.methods : [],
        bases: Array.isArray(cls.bases) ? cls.bases : [],
        decorators: Array.isArray(cls.decorators) ? cls.decorators : []
      })),
      functions: functions.map(fn => ({
        name: fn.name,
        decorators: Array.isArray(fn.decorators) ? fn.decorators : [],
        isAsync: Boolean(fn.isAsync)
      })),
      exports
    };
  }
}

class PythonDiscoveryIntegration extends BaseLanguageIntegration {
  constructor(discoveryEngine) {
    super(discoveryEngine, 'python');
    this.collector = new PythonDiscoveryCollector();
  }

  getFileExtension() {
    return '.py';
  }

  async parseFile(filePath) {
    const metadata = await this.collector.parseFile(filePath);
    if (!metadata) {
      return null;
    }

    metadata.moduleName = metadata.moduleName || this.computeModuleName(filePath);
    metadata.exports = this.buildExports(metadata);
    metadata.pythonMetadata = {
      classes: metadata.classes,
      functions: metadata.functions,
      moduleName: metadata.moduleName,
      path: metadata.path
    };

    return metadata;
  }

  extractCandidates(metadata) {
    const candidates = [];
    const moduleName = metadata.moduleName || null;

    (metadata.classes || []).forEach(cls => {
      candidates.push({
        name: cls.name,
        type: 'class',
        module: moduleName,
        fullName: moduleName ? `${moduleName}.${cls.name}` : cls.name,
        methods: cls.methods.map(name => ({ name })),
        metadata: cls,
        visibility: cls.name.startsWith('_') ? 'private' : 'public',
        exported: !cls.name.startsWith('_')
      });
    });

    (metadata.functions || []).forEach(fn => {
      candidates.push({
        name: fn.name,
        type: 'function',
        module: moduleName,
        fullName: moduleName ? `${moduleName}.${fn.name}` : fn.name,
        methods: [],
        metadata: fn,
        visibility: fn.name.startsWith('_') ? 'private' : 'public',
        exported: !fn.name.startsWith('_')
      });
    });

    return candidates;
  }

  scorePackageMatching(candidate, signature, metadata) {
    if (!signature?.module) {
      return 0;
    }

    const candidateModule = candidate.module || metadata?.moduleName || null;
    if (!candidateModule) {
      return -3;
    }

    if (candidateModule === signature.module) {
      return 16;
    }

    if (candidateModule.endsWith(`.${signature.module}`)) {
      return 8;
    }

    if (signature.module.endsWith(`.${candidateModule}`)) {
      return 5;
    }

    return -6;
  }

  scoreLanguageSpecific(candidate, signature) {
    let score = 0;

    if (candidate.type === 'class' && signature.baseClass) {
      const bases = Array.isArray(candidate.metadata?.bases) ? candidate.metadata.bases : null;
      if (bases) {
        const matches = bases.includes(signature.baseClass);
        score += matches ? 8 : -4;
      }
    }

    if (Array.isArray(signature.decorators) && signature.decorators.length > 0) {
      const decorators = new Set(candidate.metadata?.decorators || []);
      let hits = 0;
      signature.decorators.forEach(decorator => {
        if (decorators.has(decorator)) {
          hits += 1;
        }
      });
      score += hits * 4;
      if (hits === 0) {
        score -= 2;
      }
    }

    if (candidate.type === 'function' && signature.isAsync !== undefined) {
      const isAsync = Boolean(candidate.metadata?.isAsync);
      score += isAsync === Boolean(signature.isAsync) ? 6 : -3;
    }

    return score;
  }

  getCandidateMethods(candidate) {
    const methods = new Set();
    (candidate.methods || []).forEach(method => {
      const name = typeof method === 'string' ? method : method.name;
      if (name) {
        methods.add(name.toLowerCase());
      }
    });
    return methods;
  }

  generateTestContent(target, options = {}) {
    return this.generatePytestTest({
      signature: options.signature || {},
      moduleName: target.module || target.metadata?.moduleName || options.moduleName || null,
      targetKind: target.type || options.targetKind || 'class',
      depth: options.depth || 0
    });
  }

  generatePytestTest({ signature, moduleName, targetKind, depth }) {
    const slug = this.slugify(signature.name || 'target');
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
      const joined = methods.map(method => `'${method}'`).join(', ');
      signatureLines.push(`        methods=[${joined}],`);
    }

    signatureLines.push('    )');

    const discoveryBlock = [
      'Target = engine.discover(',
      ...signatureLines.map(line => `        ${line}`),
      '    )'
    ].join('\n');

    return `from pathlib import Path

from adaptive_tests_py import Signature, get_engine


def test_${slug}_discovery():
    """Adaptive discovery test for ${signature.name}"""
    project_root = ${projectRootExpr}
    engine = get_engine(project_root)

    ${discoveryBlock}

    assert Target is not None
`;
  }

  buildExports(metadata) {
    const exports = [];
    const moduleName = metadata.moduleName || null;

    (metadata.classes || []).forEach(cls => {
      exports.push({
        exportedName: cls.name,
        access: { type: 'default' },
        info: {
          name: cls.name,
          kind: 'class',
          methods: cls.methods,
          module: moduleName,
          python: {
            type: 'class',
            name: cls.name,
            module: moduleName,
            methods: cls.methods,
            bases: cls.bases,
            decorators: cls.decorators
          }
        }
      });
    });

    (metadata.functions || []).forEach(fn => {
      exports.push({
        exportedName: fn.name,
        access: { type: 'default' },
        info: {
          name: fn.name,
          kind: 'function',
          methods: [],
          module: moduleName,
          python: {
            type: 'function',
            name: fn.name,
            module: moduleName,
            decorators: fn.decorators,
            isAsync: Boolean(fn.isAsync)
          }
        }
      });
    });

    return exports;
  }

  computeModuleName(filePath) {
    const absolute = path.resolve(filePath);
    const root = this.engine?.rootPath || process.cwd();
    const relative = path.relative(root, absolute).replace(/\\/g, '/');

    if (!relative || relative.startsWith('..')) {
      return path.basename(absolute, '.py');
    }

    const withoutExt = relative.replace(/\.py$/, '');
    const parts = withoutExt.split('/').filter(Boolean);
    if (parts.length === 0) {
      return path.basename(absolute, '.py');
    }

    if (parts[parts.length - 1] === '__init__') {
      parts.pop();
    }

    return parts.join('.') || path.basename(absolute, '.py');
  }

  slugify(value) {
    return (value || '')
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[-\s]+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase() || 'target';
  }
}

module.exports = {
  PythonDiscoveryIntegration,
  PythonDiscoveryCollector
};
