/**
 * Webpack Plugin for Adaptive Tests
 * 
 * Provides build-time discovery optimization, development mode enhancements,
 * and bundle analysis for adaptive tests.
 */

import { Compiler, WebpackPluginInstance, Compilation, Module } from 'webpack';
import { parse } from '@babel/parser';
import path from 'path';
import fs from 'fs';

export interface WebpackAdaptiveOptions {
  /**
   * Enable discovery caching
   * @default true
   */
  cache?: boolean;

  /**
   * File patterns to include
   * @default [/\.adaptive\.(test|spec)\.[jt]sx?$/]
   */
  include?: RegExp[];

  /**
   * File patterns to exclude
   * @default [/node_modules/]
   */
  exclude?: RegExp[];

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
   * Enable bundle size analysis
   * @default false
   */
  analyzeBundleSize?: boolean;

  /**
   * Output directory for discovery manifest
   * @default '.adaptive'
   */
  manifestDir?: string;

  /**
   * Generate discovery manifest file
   * @default true
   */
  generateManifest?: boolean;
}

interface DiscoveryManifest {
  version: string;
  timestamp: string;
  discoveries: Array<{
    signature: any;
    file: string;
    resolvedPath?: string;
    bundleSize?: number;
  }>;
}

class AdaptiveTestsWebpackPlugin implements WebpackPluginInstance {
  private options: Required<WebpackAdaptiveOptions>;
  private discoveryCache: Map<string, any> = new Map();
  private manifest: DiscoveryManifest;

  constructor(options: WebpackAdaptiveOptions = {}) {
    this.options = {
      cache: true,
      include: [/\.adaptive\.(test|spec)\.[jt]sx?$/],
      exclude: [/node_modules/],
      optimizeDiscovery: true,
      debug: false,
      analyzeBundleSize: false,
      manifestDir: '.adaptive',
      generateManifest: true,
      ...options,
    };

    this.manifest = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      discoveries: [],
    };
  }

  apply(compiler: Compiler): void {
    const pluginName = 'AdaptiveTestsWebpackPlugin';

    // Add loader for adaptive test files
    compiler.options.module.rules.push({
      test: /\.adaptive\.(test|spec)\.[jt]sx?$/,
      exclude: /node_modules/,
      use: [
        {
          loader: path.resolve(__dirname, 'loader.js'),
          options: {
            cache: this.options.cache,
            optimizeDiscovery: this.options.optimizeDiscovery,
          },
        },
      ],
    });

    // Hook into compilation
    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      this.handleCompilation(compilation);
    });

    // Analyze modules after optimization
    compiler.hooks.afterEmit.tapAsync(pluginName, (compilation, callback) => {
      this.analyzeModules(compilation);
      this.generateManifest(compilation);
      callback();
    });

    // Watch for file changes in development
    compiler.hooks.watchRun.tap(pluginName, (compiler) => {
      if (this.options.debug) {
        console.log('[webpack-plugin-adaptive] Watch run triggered');
      }
      // Invalidate cache for changed files
      this.invalidateCache();
    });

    // Add virtual module for discovery API
    this.setupVirtualModule(compiler);
  }

  private handleCompilation(compilation: Compilation): void {
    const pluginName = 'AdaptiveTestsWebpackPlugin';

    // Process modules to extract discovery signatures
    compilation.hooks.succeedModule.tap(pluginName, (module: Module) => {
      if (this.shouldProcessModule(module)) {
        this.processModule(module);
      }
    });

    // Optimize chunks if enabled
    if (this.options.optimizeDiscovery) {
      compilation.hooks.optimizeChunks.tap(pluginName, (chunks) => {
        this.optimizeChunks(chunks);
      });
    }
  }

  private shouldProcessModule(module: Module): boolean {
    const resource = (module as any).resource;
    if (!resource) return false;

    // Check include patterns
    const included = this.options.include.some((pattern) => pattern.test(resource));
    if (!included) return false;

    // Check exclude patterns
    const excluded = this.options.exclude.some((pattern) => pattern.test(resource));
    return !excluded;
  }

  private processModule(module: Module): void {
    const resource = (module as any).resource;
    const source = (module as any).originalSource?.()?.source();

    if (!source) return;

    try {
      const signatures = this.extractSignatures(source, resource);
      
      if (signatures.length > 0) {
        // Cache signatures for this module
        this.discoveryCache.set(resource, signatures);
        
        // Add to manifest
        signatures.forEach((sig) => {
          this.manifest.discoveries.push({
            signature: sig,
            file: resource,
          });
        });

        if (this.options.debug) {
          console.log(
            `[webpack-plugin-adaptive] Found ${signatures.length} signatures in ${path.relative(process.cwd(), resource)}`
          );
        }
      }
    } catch (error) {
      if (this.options.debug) {
        console.warn(
          `[webpack-plugin-adaptive] Failed to process ${resource}:`,
          error
        );
      }
    }
  }

  private extractSignatures(code: string, file: string): any[] {
    const signatures: any[] = [];

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
          if (node.arguments.length > 0 && node.arguments[0].type === 'ObjectExpression') {
            const signature = this.parseSignature(node.arguments[0]);
            if (signature) {
              signatures.push(signature);
            }
          }
        }
      });
    } catch (error) {
      // Parsing failed
    }

    return signatures;
  }

  private parseSignature(node: any): any {
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

  private walkAST(node: any, visitor: (node: any) => void, depth = 0): void {
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

  private optimizeChunks(chunks: Set<any>): void {
    // Group test chunks with their discovered dependencies
    for (const chunk of chunks) {
      const modules = chunk.getModules();
      const hasAdaptiveTests = modules.some((m: Module) => this.shouldProcessModule(m));
      
      if (hasAdaptiveTests) {
        // Mark chunk for special handling
        (chunk as any).__adaptive = true;
        
        if (this.options.debug) {
          console.log(
            `[webpack-plugin-adaptive] Optimizing chunk: ${chunk.name || chunk.id}`
          );
        }
      }
    }
  }

  private analyzeModules(compilation: Compilation): void {
    if (!this.options.analyzeBundleSize) return;

    const analysis: Array<{ signature: string; size: number; file: string }> = [];

    for (const [file, signatures] of this.discoveryCache.entries()) {
      const module = Array.from(compilation.modules).find(
        (m: any) => m.resource === file
      );
      
      if (module) {
        const size = (module as any).size?.() || 0;
        signatures.forEach((sig: any) => {
          analysis.push({
            signature: JSON.stringify(sig),
            size,
            file: path.relative(process.cwd(), file),
          });
        });
      }
    }

    if (analysis.length > 0) {
      console.log('\n[webpack-plugin-adaptive] Bundle Size Analysis:');
      console.log('═'.repeat(50));
      
      analysis
        .sort((a, b) => b.size - a.size)
        .forEach(({ signature, size, file }) => {
          const sizeStr = (size / 1024).toFixed(2) + ' KB';
          console.log(`  • ${signature}`);
          console.log(`    Size: ${sizeStr}`);
          console.log(`    File: ${file}`);
        });
      
      const totalSize = analysis.reduce((sum, item) => sum + item.size, 0);
      console.log('═'.repeat(50));
      console.log(`Total: ${(totalSize / 1024).toFixed(2)} KB\n`);
    }
  }

  private generateManifest(compilation: Compilation): void {
    if (!this.options.generateManifest) return;

    const outputPath = path.join(
      compilation.outputOptions.path!,
      this.options.manifestDir,
      'discovery-manifest.json'
    );

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(this.manifest, null, 2));
    
    if (this.options.debug) {
      console.log(
        `[webpack-plugin-adaptive] Generated manifest: ${path.relative(process.cwd(), outputPath)}`
      );
    }
  }

  private invalidateCache(): void {
    if (this.options.cache) {
      // In development, we might want to selectively invalidate
      // For now, clear everything
      this.discoveryCache.clear();
      this.manifest.discoveries = [];
    }
  }

  private setupVirtualModule(compiler: Compiler): void {
    // Add a virtual module that provides discovery API
    const virtualModuleId = 'adaptive-tests/webpack';
    const virtualModulePath = path.resolve(compiler.context, 'node_modules', virtualModuleId);

    // Add resolver to handle virtual module
    compiler.hooks.normalModuleFactory.tap('AdaptiveTestsWebpackPlugin', (nmf) => {
      nmf.hooks.resolve.tapAsync('AdaptiveTestsWebpackPlugin', (data, callback) => {
        if (data.request === virtualModuleId) {
          callback(null, {
            ...data,
            request: virtualModulePath,
          });
        } else {
          callback(null, data);
        }
      });
    });
  }
}

export default AdaptiveTestsWebpackPlugin;
export { AdaptiveTestsWebpackPlugin };