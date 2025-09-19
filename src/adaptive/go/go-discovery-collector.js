/**
 * Go Discovery Collector
 *
 * Parses Go source files using web-tree-sitter and extracts metadata about
 * structs, interfaces, functions, methods, and types. The resulting
 * metadata powers CLI integrations such as scaffold and discovery bridges.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');

class GoDiscoveryCollector {
  constructor(config = {}) {
    this.config = {
      extensions: ['.go'],
      skipPatterns: [
        'vendor/',
        'node_modules/',
        '_test.go',
        'testdata/',
        '.git/',
        'build/',
        'dist/'
      ],
      ...config
    };

    this.initialized = false;
    this.parserPath = null;
    this.parserSourcePath = null;
    this.binaryName = process.platform === 'win32' ? 'go-ast-parser.exe' : 'go-ast-parser';
  }

  async initialize() {
    if (this.initialized) return;

    const embeddedBinary = this.resolveEmbeddedBinary();
    if (embeddedBinary) {
      this.parserPath = embeddedBinary;
      this.initialized = true;
      return;
    }

    const sourcePath = this.findParserSource();
    if (!sourcePath) {
      throw new Error('Go AST parser source not found. Ensure go-ast-parser.go is present alongside the Go integration.');
    }
    this.parserSourcePath = sourcePath;

    if (!this.hasGoToolchain()) {
      throw new Error('Go toolchain not detected and no prebuilt parser available. Please install Go 1.18+ to enable Go discovery.');
    }

    const builtBinary = this.ensureBuiltBinary(sourcePath);
    if (builtBinary) {
      this.parserPath = builtBinary;
    }

    this.initialized = true;
  }

  resolveEmbeddedBinary() {
    const candidates = [
      path.join(__dirname, this.binaryName),
      path.join(__dirname, 'go-ast-parser'),
      path.join(__dirname, 'go-ast-parser.exe')
    ];

    for (const candidate of candidates) {
      try {
        const stats = fs.statSync(candidate);
        if (stats.isFile()) {
          return candidate;
        }
      } catch (error) {
        // Ignore missing files
      }
    }
    return null;
  }

  findParserSource() {
    const visited = new Set();
    const queue = [{ dir: __dirname, depth: 0 }];
    const maxDepth = 6;

    while (queue.length > 0) {
      const { dir, depth } = queue.shift();
      if (visited.has(dir) || depth > maxDepth) {
        continue;
      }
      visited.add(dir);

      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch (error) {
        continue;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isFile() && entry.name === 'go-ast-parser.go') {
          return fullPath;
        }
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '.git') {
            continue;
          }
          queue.push({ dir: fullPath, depth: depth + 1 });
        }
      }
    }

    return null;
  }

  hasGoToolchain() {
    try {
      const result = spawnSync('go', ['version'], { encoding: 'utf8' });
      return result.status === 0;
    } catch (error) {
      return false;
    }
  }

  ensureBuiltBinary(sourcePath) {
    try {
      const cacheDir = path.join(os.tmpdir(), 'adaptive-tests-go-parser');
      const binaryName = `${process.platform}-${process.arch}-${this.binaryName}`;
      const outputPath = path.join(cacheDir, binaryName);

      fs.mkdirSync(cacheDir, { recursive: true });

      const sourceStat = fs.statSync(sourcePath);
      const needsRebuild = !fs.existsSync(outputPath) || fs.statSync(outputPath).mtimeMs < sourceStat.mtimeMs;

      if (!needsRebuild) {
        return outputPath;
      }

      const build = spawnSync('go', ['build', '-o', outputPath, sourcePath], {
        cwd: path.dirname(sourcePath),
        encoding: 'utf8'
      });

      if (build.status !== 0) {
        if (process.env.DEBUG_DISCOVERY) {
          const reason = build.stderr || build.stdout || 'unknown error';
          console.error('[adaptive-tests] Failed to build Go parser:', reason.trim());
        }
        return null;
      }

      try {
        fs.chmodSync(outputPath, 0o755);
      } catch (error) {
        // Ignore chmod errors on platforms that do not support POSIX permissions
      }
      return outputPath;
    } catch (error) {
      if (process.env.DEBUG_DISCOVERY) {
        console.error('[adaptive-tests] Unable to prepare Go parser binary:', error.message);
      }
      return null;
    }
  }

  spawnParserProcess(filePath) {
    if (this.parserPath) {
      return spawn(this.parserPath, [filePath]);
    }

    if (!this.parserSourcePath) {
      throw new Error('Go parser source unavailable for Go runtime invocation. Ensure initialize() completed successfully.');
    }

    return spawn('go', ['run', this.parserSourcePath, '--', filePath], {
      cwd: path.dirname(this.parserSourcePath)
    });
  }

  shouldScanFile(filePath) {
    const ext = path.extname(filePath);
    if (!this.config.extensions.includes(ext)) {
      return false;
    }

    const normalized = filePath.replace(/\\/g, '/');
    return !this.config.skipPatterns.some(pattern => normalized.includes(pattern));
  }

  async parseFile(filePath) {
    try {
      await this.initialize();
    } catch (error) {
      if (process.env.DEBUG_DISCOVERY) {
        console.error(`[adaptive-tests] Failed to initialize Go parser: ${error.message}`);
      }
      return null;
    }

    try {
      return await this.extractMetadata(filePath);
    } catch (error) {
      if (process.env.DEBUG_DISCOVERY) {
        console.error(`[adaptive-tests] Failed to parse Go file ${filePath}:`, error);
      }
      return null;
    }
  }

  async extractMetadata(filePath) {
    return new Promise((resolve, reject) => {
      const child = this.spawnParserProcess(filePath);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Go parser failed: ${stderr}`));
          return;
        }

        try {
          const metadata = JSON.parse(stdout);
          resolve(metadata);
        } catch (error) {
          reject(new Error(`Failed to parse Go parser output: ${error.message}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to spawn Go parser: ${error.message}`));
      });
    });
  }

  isExported(name) {
    return name && name.length > 0 && /^[A-Z]/.test(name);
  }

  containsGenerics(typeStr) {
    return typeStr && (typeStr.includes('[') && typeStr.includes(']') && !typeStr.startsWith('[]') && !typeStr.startsWith('map['));
  }
}

module.exports = {
  GoDiscoveryCollector
};