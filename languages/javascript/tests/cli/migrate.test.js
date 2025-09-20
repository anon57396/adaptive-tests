/**
 * Test suite for the migration tool CLI
 */

const { analyzeTestFile, generateAdaptiveTest } = require('../../src/cli/migrate');
const path = require('path');
const fs = require('fs');

describe('Migration Tool', () => {
  const fixtureDir = path.join(__dirname, '..', 'fixtures', 'migration');
  const traditionalTestPath = path.join(__dirname, '../../languages/javascript/examples/calculator/tests/traditional/Calculator.test.js');

  describe('analyzeTestFile', () => {
    test('should analyze a traditional Jest test file', () => {
      const result = analyzeTestFile(traditionalTestPath);
      
      expect(result).toBeDefined();
      expect(result.className).toBe('Calculator');
      expect(result.methods).toBeInstanceOf(Set);
      expect(Array.from(result.methods)).toContain('add');
      expect(Array.from(result.methods)).toContain('subtract');
      expect(Array.from(result.methods)).toContain('multiply');
      expect(Array.from(result.methods)).toContain('divide');
      expect(result.framework).toBe('jest');
    });

    test('should extract require statements', () => {
      const result = analyzeTestFile(traditionalTestPath);
      
      expect(result.requires).toHaveLength(1);
      expect(result.requires[0]).toMatchObject({
        source: '../../src/Calculator',
        name: 'Calculator',
        isDefault: true
      });
    });

    test('should identify test descriptions', () => {
      const result = analyzeTestFile(traditionalTestPath);
      
      expect(result.describes).toContain('Calculator - Traditional Tests');
      expect(result.describes).toContain('Basic Operations');
      expect(result.describes).toContain('Advanced Operations');
      expect(result.describes).toContain('History');
    });
  });

  describe('generateAdaptiveTest', () => {
    test('should generate a valid adaptive test', () => {
      const analysis = analyzeTestFile(traditionalTestPath);
      const output = generateAdaptiveTest(analysis, traditionalTestPath);
      
      expect(output).toContain("const { discover } = require('adaptive-tests');");
      expect(output).toContain("describe('Calculator', () => {");
      expect(output).toContain("Calculator = await discover({");
      expect(output).toContain("name: 'Calculator',");
      expect(output).toContain("type: 'class',");
      expect(output).toContain("methods: [");
      expect(output).toContain("'add'");
      expect(output).toContain("'subtract'");
    });

    test('should include discovery validation test', () => {
      const analysis = analyzeTestFile(traditionalTestPath);
      const output = generateAdaptiveTest(analysis, traditionalTestPath);
      
      expect(output).toContain("test('should discover Calculator', () => {");
      expect(output).toContain("expect(Calculator).toBeDefined();");
      expect(output).toContain("expect(typeof Calculator).toBe('function');");
    });

    test('should generate method tests', () => {
      const analysis = analyzeTestFile(traditionalTestPath);
      const output = generateAdaptiveTest(analysis, traditionalTestPath);
      
      expect(output).toContain("test('should have add method', () => {");
      expect(output).toContain("expect(instance.add).toBeDefined();");
      expect(output).toContain("expect(typeof instance.add).toBe('function');");
    });

    test('should include migration instructions', () => {
      const analysis = analyzeTestFile(traditionalTestPath);
      const output = generateAdaptiveTest(analysis, traditionalTestPath);
      
      expect(output).toContain('TODO: Migrate your specific test implementations here');
      expect(output).toContain('Migrated from:');
    });
  });

  describe('Edge cases', () => {
    test('should handle files without imports gracefully', () => {
      const tempFile = path.join(__dirname, 'temp-test.js');
      fs.writeFileSync(tempFile, `
        describe('Test', () => {
          test('example', () => {
            expect(1).toBe(1);
          });
        });
      `);
      
      try {
        const result = analyzeTestFile(tempFile);
        expect(result).toBeDefined();
        expect(result.imports).toEqual([]);
        expect(result.requires).toEqual([]);
      } finally {
        fs.unlinkSync(tempFile);
      }
    });
  });
});