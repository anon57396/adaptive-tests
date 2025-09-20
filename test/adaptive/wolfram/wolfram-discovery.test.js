/**
 * Comprehensive test suite for Wolfram Language discovery integration
 * Tests parsing, discovery, scoring, and test generation capabilities
 */

const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const path = require('path');
const fs = require('fs');
const { WolframDiscoveryCollector } = require('../../../languages/javascript/src/wolfram/wolfram-discovery-collector');
const { WolframDiscoveryIntegration } = require('../../../languages/javascript/src/wolfram/wolfram-discovery-integration');
const { DiscoveryEngine } = require('../../../languages/javascript/src/discovery-engine');

describe('Wolfram Discovery Integration', () => {
  let collector;
  let integration;
  let engine;
  let testDataPath;

  beforeAll(() => {
    testDataPath = path.join(__dirname, '../../fixtures/wolfram');

    // Create test data directory if it doesn't exist
    if (!fs.existsSync(testDataPath)) {
      fs.mkdirSync(testDataPath, { recursive: true });
    }
  });

  beforeEach(() => {
    collector = new WolframDiscoveryCollector();
    engine = new DiscoveryEngine({
      rootPath: testDataPath,
      languages: ['wolfram']
    });
    integration = new WolframDiscoveryIntegration(engine);
  });

  afterAll(() => {
    // Cleanup
    if (integration) {
      integration.clearCache();
    }
  });

  describe('WolframDiscoveryCollector', () => {
    describe('File Support', () => {
      it('should identify supported file extensions', () => {
        expect(collector.shouldScanFile('test.wl')).toBe(true);
        expect(collector.shouldScanFile('test.m')).toBe(true);
        expect(collector.shouldScanFile('test.wls')).toBe(true);
        expect(collector.shouldScanFile('test.nb')).toBe(true);
        expect(collector.shouldScanFile('test.wlt')).toBe(true);
        expect(collector.shouldScanFile('test.js')).toBe(false);
        expect(collector.shouldScanFile('test.py')).toBe(false);
      });

      it('should return supported extensions list', () => {
        const extensions = collector.getSupportedExtensions();
        expect(extensions).toContain('.wl');
        expect(extensions).toContain('.m');
        expect(extensions).toContain('.nb');
        expect(extensions.length).toBeGreaterThanOrEqual(4);
      });
    });

    describe('Kernel Detection', () => {
      it('should detect Wolfram kernel availability', () => {
        const kernelInfo = collector.kernelInfo;
        expect(kernelInfo).toBeDefined();
        expect(kernelInfo.available).toBeDefined();

        if (kernelInfo.available) {
          expect(kernelInfo.executable).toBeTruthy();
          console.log(`Wolfram kernel detected: ${kernelInfo.executable} ${kernelInfo.version}`);
        } else {
          console.log('No Wolfram kernel available - using fallback parsing');
        }
      });

      it('should check CodeParse support for modern versions', () => {
        if (collector.kernelInfo.available && collector.kernelInfo.version !== 'unknown') {
          const hasCodeParse = collector.kernelInfo.hasCodeParse;
          expect(typeof hasCodeParse).toBe('boolean');
        }
      });
    });

    describe('Package Parsing', () => {
      const packageCode = `
        (* Test Package *)
        BeginPackage["TestPackage\`", {"System\`"}]

        TestFunction::usage = "TestFunction[x] does something"
        TestSymbol::usage = "A test symbol"

        Begin["\`Private\`"]

        TestFunction[x_] := x^2
        TestFunction[x_, y_] := x + y

        privateHelper[x_] := x * 2

        TestSymbol = 42

        End[]
        EndPackage[]
      `;

      it('should parse package structure', async () => {
        const testFile = path.join(testDataPath, 'test-package.wl');
        fs.writeFileSync(testFile, packageCode);

        const metadata = await collector.parseFile(testFile);

        expect(metadata).toBeDefined();
        expect(metadata.packages).toBeDefined();
        expect(metadata.packages.length).toBeGreaterThan(0);

        const pkg = metadata.packages[0];
        expect(pkg.name).toBe('TestPackage`');
        expect(pkg.dependencies).toContain('System`');
      });

      it('should identify public and private functions', async () => {
        const testFile = path.join(testDataPath, 'test-package.wl');
        fs.writeFileSync(testFile, packageCode);

        const metadata = await collector.parseFile(testFile);

        expect(metadata.functions).toBeDefined();
        expect(metadata.functions.length).toBeGreaterThan(0);

        const publicFuncs = metadata.functions.filter(f => f.isPublic);
        const privateFuncs = metadata.functions.filter(f => !f.isPublic);

        expect(publicFuncs.length).toBeGreaterThan(0);
        expect(privateFuncs.length).toBeGreaterThan(0);
      });
    });

    describe('Pattern Detection', () => {
      const patternCode = `
        (* Pattern-based definitions *)
        f[x_Integer] := x^2
        g[x_Real, y_Real] := Sqrt[x^2 + y^2]
        h[x_?NumericQ] := N[x]
        seq[args___] := {args}
        optional[x_, y_:1] := x + y

        (* Memoization pattern *)
        fib[0] = 0
        fib[1] = 1
        fib[n_Integer?Positive] := fib[n] = fib[n-1] + fib[n-2]

        (* Conditional patterns *)
        pos[x_ /; x > 0] := "positive"
        neg[x_ /; x < 0] := "negative"
      `;

      it('should detect pattern-based functions', async () => {
        const testFile = path.join(testDataPath, 'test-patterns.wl');
        fs.writeFileSync(testFile, patternCode);

        const metadata = await collector.parseFile(testFile);

        expect(metadata.functions).toBeDefined();
        const patternFuncs = metadata.functions.filter(f => f.hasPattern);
        expect(patternFuncs.length).toBeGreaterThan(0);
      });

      it('should detect memoization patterns', async () => {
        const testFile = path.join(testDataPath, 'test-patterns.wl');
        fs.writeFileSync(testFile, patternCode);

        const metadata = await collector.parseFile(testFile);

        const memoizedFuncs = metadata.functions.filter(f => f.hasMemoization);
        expect(memoizedFuncs.length).toBeGreaterThan(0);

        const fib = memoizedFuncs.find(f => f.name === 'fib');
        expect(fib).toBeDefined();
      });

      it('should extract parameter patterns', async () => {
        const testFile = path.join(testDataPath, 'test-patterns.wl');
        fs.writeFileSync(testFile, patternCode);

        const metadata = await collector.parseFile(testFile);

        const funcWithParams = metadata.functions.find(f => f.parameters && f.parameters.length > 0);
        expect(funcWithParams).toBeDefined();

        if (funcWithParams && funcWithParams.parameters.length > 0) {
          const param = funcWithParams.parameters[0];
          expect(param).toHaveProperty('name');
          expect(param).toHaveProperty('pattern');
        }
      });
    });

    describe('Notebook Parsing', () => {
      it('should handle notebook files', async () => {
        // Simple notebook structure (text-based, not full JSON)
        const notebookContent = `
          (* ::Package:: *)
          (* ::Title:: *)
          (*Test Notebook*)

          (* ::Section:: *)
          (*Definitions*)

          testFunc[x_] := x^2

          (* ::Section:: *)
          (*Tests*)

          VerificationTest[
            testFunc[3],
            9
          ]
        `;

        const testFile = path.join(testDataPath, 'test-notebook.nb');
        fs.writeFileSync(testFile, notebookContent);

        const metadata = await collector.parseFile(testFile);

        expect(metadata).toBeDefined();
        // Notebook parsing might extract functions and tests
        if (metadata.functions) {
          expect(Array.isArray(metadata.functions)).toBe(true);
        }
        if (metadata.tests) {
          expect(Array.isArray(metadata.tests)).toBe(true);
        }
      });
    });

    describe('Error Handling', () => {
      it('should handle non-existent files gracefully', async () => {
        const metadata = await collector.parseFile('/non/existent/file.wl');
        expect(metadata).toBeNull();
      });

      it('should handle malformed code gracefully', async () => {
        const malformedCode = `
          BeginPackage["Unclosed"
          (* Missing closing bracket and EndPackage *)
          This is not valid ( Wolfram ] code
        `;

        const testFile = path.join(testDataPath, 'test-malformed.wl');
        fs.writeFileSync(testFile, malformedCode);

        const metadata = await collector.parseFile(testFile);
        // Should still return some metadata, even if incomplete
        expect(metadata).toBeDefined();
      });
    });

    describe('Caching', () => {
      it('should cache parse results', async () => {
        const testFile = path.join(testDataPath, 'test-cache.wl');
        fs.writeFileSync(testFile, 'f[x_] := x^2');

        const metadata1 = await collector.parseFile(testFile);
        const metadata2 = await collector.parseFile(testFile);

        expect(metadata1).toEqual(metadata2);

        // If using kernel, second parse should be faster (from cache)
        if (collector.useKernel) {
          const startTime = Date.now();
          await collector.parseFile(testFile);
          const cachedTime = Date.now() - startTime;
          expect(cachedTime).toBeLessThan(100); // Should be very fast from cache
        }
      });

      it('should invalidate cache on file change', async () => {
        const testFile = path.join(testDataPath, 'test-cache-invalidate.wl');

        fs.writeFileSync(testFile, 'f[x_] := x^2');
        const metadata1 = await collector.parseFile(testFile);

        // Wait a bit and modify file
        await new Promise(resolve => setTimeout(resolve, 10));
        fs.writeFileSync(testFile, 'g[x_] := x^3');

        const metadata2 = await collector.parseFile(testFile);

        expect(metadata1).not.toEqual(metadata2);
      });
    });
  });

  describe('WolframDiscoveryIntegration', () => {
    describe('Candidate Extraction', () => {
      it('should extract candidates from metadata', () => {
        const metadata = {
          packages: [{
            name: 'TestPkg`',
            exports: ['Func1', 'Func2']
          }],
          functions: [{
            name: 'TestFunc',
            context: 'TestPkg`',
            isPublic: true,
            hasPattern: true
          }],
          symbols: [{
            name: 'TestSymbol',
            context: 'TestPkg`',
            isConstant: true
          }]
        };

        const candidates = integration.extractCandidates(metadata);

        expect(candidates).toBeDefined();
        expect(candidates.length).toBeGreaterThan(0);

        const packageCandidate = candidates.find(c => c.type === 'package');
        expect(packageCandidate).toBeDefined();
        expect(packageCandidate.name).toBe('TestPkg`');

        const functionCandidate = candidates.find(c => c.type === 'function');
        expect(functionCandidate).toBeDefined();

        const symbolCandidate = candidates.find(c => c.type === 'symbol');
        expect(symbolCandidate).toBeDefined();
      });
    });

    describe('Scoring', () => {
      it('should score exact name matches highly', () => {
        const candidate = {
          name: 'Fibonacci',
          type: 'function',
          hasPattern: true
        };

        const signature = {
          name: 'Fibonacci',
          type: 'function'
        };

        const score = integration.scoreCandidate(candidate, signature);
        expect(score).toBeGreaterThan(0);
      });

      it('should score context matches', () => {
        const candidate = {
          name: 'TestFunc',
          context: 'MathUtils`',
          type: 'function'
        };

        const signature = {
          name: 'TestFunc',
          context: 'MathUtils`'
        };

        const score = integration.scoreCandidate(candidate, signature);
        expect(score).toBeGreaterThan(0);
      });

      it('should score pattern characteristics', () => {
        const candidate = {
          name: 'Func',
          hasPattern: true,
          hasMemoization: true,
          type: 'function'
        };

        const signature = {
          name: 'Func',
          hasPattern: true,
          hasMemoization: true
        };

        const score = integration.scoreCandidate(candidate, signature);

        const noPatternCandidate = { ...candidate, hasPattern: false };
        const noPatternScore = integration.scoreCandidate(noPatternCandidate, signature);

        expect(score).toBeGreaterThan(noPatternScore);
      });
    });

    describe('Test Generation', () => {
      it('should generate VerificationTest for packages', () => {
        const target = {
          name: 'TestPackage`',
          type: 'package',
          context: 'TestPackage`',
          exports: ['Func1', 'Func2']
        };

        const testContent = integration.generateTestContent(target);

        expect(testContent).toContain('VerificationTest');
        expect(testContent).toContain('Needs["TestPackage`"]');
        expect(testContent).toContain('TestID');
      });

      it('should generate function tests with patterns', () => {
        const target = {
          name: 'TestFunc',
          type: 'function',
          fullName: 'TestPackage`TestFunc',
          hasPattern: true,
          parameters: [
            { name: 'x', pattern: 'Integer' },
            { name: 'y', pattern: 'Real' }
          ]
        };

        const testContent = integration.generateTestContent(target);

        expect(testContent).toContain('VerificationTest');
        expect(testContent).toContain('TestFunc');
        expect(testContent).toContain('42'); // Integer test value
        expect(testContent).toContain('3.14'); // Real test value
      });

      it('should generate memoization tests', () => {
        const target = {
          name: 'Fibonacci',
          type: 'function',
          hasMemoization: true
        };

        const testContent = integration.generateTestContent(target);

        expect(testContent).toContain('Memoization');
        expect(testContent).toContain('AbsoluteTiming');
        expect(testContent).toContain('timing2 < timing1');
      });
    });

    describe('Context Resolution', () => {
      it('should resolve symbols within contexts', () => {
        // Populate context cache
        integration.contextCache.set('TestPkg`', {
          exports: ['Func1', 'Func2', 'Symbol1'],
          dependencies: ['System`']
        });

        const resolved = integration.resolveSymbol('Func1', 'TestPkg`');
        expect(resolved).toContain('Func1');
      });

      it('should discover related symbols', async () => {
        // Populate context cache
        integration.contextCache.set('MathUtils`', {
          exports: ['Sin', 'Cos', 'Tan'],
          dependencies: []
        });

        const target = {
          name: 'Sin',
          type: 'function',
          context: 'MathUtils`'
        };

        const related = await integration.discoverRelatedSymbols(target);
        expect(Array.isArray(related)).toBe(true);
        expect(related).toContain('Cos');
        expect(related).toContain('Tan');
      });
    });

    describe('Async Operations', () => {
      it('should support async file parsing', async () => {
        const testFile = path.join(testDataPath, 'test-async.wl');
        fs.writeFileSync(testFile, 'f[x_] := x^2');

        const metadata = await integration.parseFileAsync(testFile);

        expect(metadata).toBeDefined();
        expect(metadata.language).toBe('wolfram');
      });

      it('should support async candidate evaluation', async () => {
        const candidate = {
          name: 'TestFunc',
          type: 'function'
        };

        const signature = {
          name: 'TestFunc'
        };

        const result = await integration.evaluateCandidateAsync(candidate, signature);

        expect(result).toBeDefined();
        expect(result.score).toBeDefined();
      });

      it('should support async test generation', async () => {
        const target = {
          name: 'TestFunc',
          type: 'function'
        };

        const testContent = await integration.generateTestAsync(target);

        expect(testContent).toBeDefined();
        expect(testContent).toContain('VerificationTest');
      });
    });

    describe('Statistics and Monitoring', () => {
      it('should provide integration statistics', () => {
        const stats = integration.getStats();

        expect(stats).toBeDefined();
        expect(stats.contextsCached).toBeDefined();
        expect(stats.kernelAvailable).toBeDefined();
        expect(stats.supportedExtensions).toBeDefined();
        expect(Array.isArray(stats.supportedExtensions)).toBe(true);
      });
    });

    describe('Integration with DiscoveryEngine', () => {
      it('should integrate with discovery engine', async () => {
        const testFile = path.join(testDataPath, 'engine-test.wl');
        fs.writeFileSync(testFile, `
          BeginPackage["EngineTest\`"]
          TestFunction::usage = "Test function"
          Begin["\`Private\`"]
          TestFunction[x_] := x^2
          End[]
          EndPackage[]
        `);

        await engine.scanDirectory(testDataPath);

        const result = await engine.discover({
          name: 'TestFunction',
          language: 'wolfram'
        });

        if (result) {
          expect(result.name).toContain('TestFunction');
        }
      });
    });
  });
});

// Export for use in other tests
module.exports = {
  WolframTestHelpers: {
    createTestPackage: (name, content) => {
      const packageCode = `
        BeginPackage["${name}\`"]
        ${content}
        EndPackage[]
      `;
      return packageCode;
    },

    createTestFunction: (name, pattern = 'x_', body = 'x^2') => {
      return `${name}[${pattern}] := ${body}`;
    },

    createMemoizedFunction: (name) => {
      return `
        ${name}[0] = 0
        ${name}[1] = 1
        ${name}[n_Integer?Positive] := ${name}[n] = ${name}[n-1] + ${name}[n-2]
      `;
    }
  }
};