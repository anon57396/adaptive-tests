/**
 * Go Discovery Collector
 *
 * Parses Go source files using web-tree-sitter and extracts metadata about
 * structs, interfaces, functions, methods, and types. The resulting
 * metadata powers CLI integrations such as scaffold and discovery bridges.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

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

    this.parserPath = path.join(__dirname, 'go-ast-parser');
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Check if Go AST parser exists
      await fs.promises.access(this.parserPath, fs.constants.F_OK);
      this.initialized = true;
    } catch (error) {
      throw new Error(`Go AST parser not found at ${this.parserPath}. Please build it first.`);
    }
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
    await this.initialize();

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
      const child = spawn(this.parserPath, [filePath]);
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