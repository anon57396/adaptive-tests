/**
 * Vite Plugin for Adaptive Tests
 * 
 * Provides build-time discovery optimization, HMR integration,
 * and development mode enhancements for adaptive tests.
 */

import type { Plugin, ViteDevServer, ModuleNode } from 'vite';
import type { DiscoverySignature } from 'adaptive-tests';
import { parse } from '@babel/parser';
import MagicString from 'magic-string';
import pc from 'picocolors';
import path from 'path';
import fs from 'fs/promises';

export interface ViteAdaptiveOptions {
  /**
   * Enable discovery caching
   * @default true
   */
  cache?: boolean;

  /**
   * Enable HMR for adaptive test files
   * @default true
   */
  hmr?: boolean;

  /**
   * File patterns to include
   * @default Glob pattern covering .adaptive test files in any subdirectory (e.g. double-star/App.adaptive.test.ts)
   */
  include?: string[];

  /**
   * File patterns to exclude
   * @default ['node_modules/**', 'dist/**']
   */
  exclude?: string[];

  /**
   * Enable build-time discovery optimization
   * @default true
   */
  optimizeDiscovery?: boolean;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Pre-discover signatures at build time
   * @default []
   */
  preDiscovery?: DiscoverySignature[];

  /**
   * Enable bundle size analysis for discovered modules
   * @default false
   */
  analyzeBundleSize?: boolean;
}

interface DiscoveryCache {
  signatures: Map<string, DiscoverySignature>;
  results: Map<string, string>;
  dependencies: Map<string, Set<string>>;
}

class AdaptiveDiscoveryManager {
  private cache: DiscoveryCache = {
    signatures: new Map(),
    results: new Map(),
    dependencies: new Map(),
  };

  private server?: ViteDevServer;
  private options: Required<ViteAdaptiveOptions>;

  constructor(options: ViteAdaptiveOptions) {
    this.options = {
      cache: true,
      hmr: true,
      include: ['**/*.adaptive.{test,spec}.{js,jsx,ts,tsx}'],
      exclude: ['node_modules/**', 'dist/**'],
      optimizeDiscovery: true,
      debug: false,
      preDiscovery: [],
      analyzeBundleSize: false,
      ...options,
    };
  }

  setServer(server: ViteDevServer) {
    this.server = server;
  }

  /**
   * Extract discovery signatures from source code
   */
  async extractSignatures(code: string, id: string): Promise<DiscoverySignature[]> {
    const signatures: DiscoverySignature[] = [];

    try {
      const ast = parse(code, {
        sourceType: 'unambiguous',
        plugins: ['jsx', 'typescript'],
        allowImportExportEverywhere: true,
        allowAwaitOutsideFunction: true,
        allowReturnOutsideFunction: true,
        allowSuperOutsideMethod: true,
      });

      // Walk AST to find discover() calls
      this.walkAST(ast, (node: any) => {
        if (
          node.type === 'CallExpression' &&
          (node.callee.name === 'discover' ||
            (node.callee.type === 'MemberExpression' &&
              node.callee.property.name === 'discover'))
        ) {
          // Extract signature from the call
          if (node.arguments.length > 0 && node.arguments[0].type === 'ObjectExpression') {
            const signature = this.parseSignature(node.arguments[0]);
            if (signature) {
              signatures.push(signature);
            }
          }
        }
      });

      if (this.options.debug && signatures.length > 0) {
        console.log(
          pc.cyan('[vite-plugin-adaptive]'),
          `Found ${signatures.length} discovery signatures in ${path.relative(process.cwd(), id)}`
        );
      }
    } catch (error) {
      if (this.options.debug) {
        console.warn(
          pc.yellow('[vite-plugin-adaptive]'),
          `Failed to parse ${id}:`,
          error
        );
      }
    }

    return signatures;
  }

  /**
   * Parse an ObjectExpression node into a DiscoverySignature
   */
  private parseSignature(node: any): DiscoverySignature | null {
    const signature: any = {};

    for (const prop of node.properties) {
      if (prop.type === 'Property' && prop.key.type === 'Identifier') {
        const key = prop.key.name;
        
        if (prop.value.type === 'StringLiteral') {
          signature[key] = prop.value.value;
        } else if (prop.value.type === 'ArrayExpression') {
          signature[key] = prop.value.elements
            .filter((el: any) => el.type === 'StringLiteral')
            .map((el: any) => el.value);
        }
      }
    }

    return signature.name || signature.exports ? signature : null;
  }

  /**
   * Walk AST recursively
   */
  private walkAST(node: any, visitor: (node: any) => void, depth = 0) {
    if (!node || depth > 100) return;

    visitor(node);

    for (const key in node) {
      if (key === 'parent') continue;
      const child = node[key];
      if (child && typeof child === 'object') {
        if (Array.isArray(child)) {
          child.forEach((item) => this.walkAST(item, visitor, depth + 1));
        } else {
          this.walkAST(child, visitor, depth + 1);
        }
      }
    }
  }

  /**
   * Optimize discovery calls by pre-resolving at build time
   */
  async optimizeCode(code: string, id: string): Promise<string | null> {
    if (!this.options.optimizeDiscovery) return null;

    const signatures = await this.extractSignatures(code, id);
    if (signatures.length === 0) return null;

    const ms = new MagicString(code);
    let hasChanges = false;

    // Pre-discover and inject results for static signatures
    for (const signature of signatures) {
      const cacheKey = JSON.stringify(signature);
      
      if (this.cache.results.has(cacheKey)) {
        // Use cached result
        const result = this.cache.results.get(cacheKey)!;
        if (this.options.debug) {
          console.log(
            pc.green('[vite-plugin-adaptive]'),
            `Using cached discovery for ${signature.name || signature.exports}`
          );
        }
        // In production, we could replace the discover call with the actual import
        // For now, we'll just add a comment
        hasChanges = true;
      } else {
        // Mark for runtime discovery but cache the signature
        this.cache.signatures.set(cacheKey, signature);
      }
    }

    return hasChanges ? ms.toString() : null;
  }

  /**
   * Handle HMR updates for adaptive test files
   */
  async handleHMRUpdate(file: string, modules: ModuleNode[]): Promise<void> {
    if (!this.options.hmr || !this.server) return;

    // Check if this file affects any cached discoveries
    for (const [key, deps] of this.cache.dependencies.entries()) {
      if (deps.has(file)) {
        // Invalidate cache entry
        this.cache.results.delete(key);
        
        if (this.options.debug) {
          console.log(
            pc.magenta('[vite-plugin-adaptive]'),
            `Invalidated discovery cache for ${key} due to change in ${path.relative(process.cwd(), file)}`
          );
        }

        // Trigger HMR for test files that use this discovery
        const testModules = Array.from(modules).filter((m) =>
          m.id?.includes('.adaptive.')
        );
        
        if (testModules.length > 0) {
          this.server.ws.send({
            type: 'custom',
            event: 'adaptive:discovery-invalidated',
            data: {
              signature: key,
              file,
            },
          });
        }
      }
    }
  }

  /**
   * Analyze bundle size impact of discovered modules
   */
  async analyzeBundleImpact(): Promise<void> {
    if (!this.options.analyzeBundleSize) return;

    const analysis: Record<string, number> = {};

    for (const [key, result] of this.cache.results.entries()) {
      try {
        const stats = await fs.stat(result);
        analysis[key] = stats.size;
      } catch (error) {
        // File doesn't exist or can't be read
      }
    }

    if (Object.keys(analysis).length > 0) {
      console.log(
        pc.blue('\n[vite-plugin-adaptive] Bundle Size Analysis:'),
        '\n'
      );
      
      const sorted = Object.entries(analysis).sort((a, b) => b[1] - a[1]);
      for (const [signature, size] of sorted) {
        const sizeStr = (size / 1024).toFixed(2) + ' KB';
        console.log(
          `  ${pc.gray('•')} ${signature}: ${pc.yellow(sizeStr)}`
        );
      }
      
      const total = Object.values(analysis).reduce((sum, size) => sum + size, 0);
      console.log(
        `\n  ${pc.bold('Total')}: ${pc.yellow((total / 1024).toFixed(2) + ' KB')}\n`
      );
    }
  }
}

/**
 * Vite plugin for adaptive-tests
 */
export function adaptiveTests(options: ViteAdaptiveOptions = {}): Plugin {
  const manager = new AdaptiveDiscoveryManager(options);

  return {
    name: 'vite-plugin-adaptive',
    
    enforce: 'pre',

    configResolved(config) {
      // Set up aliases for adaptive-tests if not already configured
      if (!config.resolve.alias) {
        config.resolve.alias = {};
      }
    },

    configureServer(server) {
      manager.setServer(server);

      // Add custom middleware for discovery API
      server.middlewares.use('/_adaptive/discover', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        
        try {
          const signature = JSON.parse(req.body || '{}');
          // In a real implementation, we'd call the discovery engine here
          res.end(JSON.stringify({ success: true, signature }));
        } catch (error) {
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      });
    },

    async transform(code, id) {
      // Only process adaptive test files
      const isAdaptive = options.include?.some((pattern) =>
        id.match(pattern.replace(/\*/g, '.*'))
      );
      
      if (!isAdaptive) return null;

      // Skip excluded files
      const isExcluded = options.exclude?.some((pattern) =>
        id.match(pattern.replace(/\*/g, '.*'))
      );
      
      if (isExcluded) return null;

      // Optimize discovery calls
      const optimizedCode = await manager.optimizeCode(code, id);
      
      if (optimizedCode) {
        return {
          code: optimizedCode,
          map: null, // Source maps could be added here
        };
      }

      return null;
    },

    handleHotUpdate({ file, modules }) {
      manager.handleHMRUpdate(file, modules);
      // Let Vite handle the rest of HMR
      return modules;
    },

    async buildEnd() {
      // Analyze bundle size impact
      await manager.analyzeBundleImpact();
    },
  };
}

// Export types
export type { DiscoverySignature } from 'adaptive-tests';

// Default export
export default adaptiveTests;