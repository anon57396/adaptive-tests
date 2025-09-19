/**
 * Tests for jest-adaptive transformer
 */

const transformer = require('../transformer');

describe('jest-adaptive transformer', () => {
  describe('process', () => {
    test('should not transform non-adaptive files', () => {
      const source = `const foo = require('foo');\nconsole.log(foo);`;
      const result = transformer.process(source, 'test.js', {});
      
      expect(result.code).toBe(source);
    });

    test('should not transform files that already import adaptive-tests', () => {
      const source = `const { discover } = require('adaptive-tests');\nconsole.log(discover);`;
      const result = transformer.process(source, 'test.adaptive.js', {});
      
      expect(result.code).toBe(source);
    });

    test('should inject CommonJS require for adaptive files', () => {
      const source = `describe('Test', () => {\n  test('example', () => {});\n});`;
      const result = transformer.process(source, 'test.adaptive.js', {});
      
      expect(result.code).toContain("require('adaptive-tests')");
      expect(result.code).toContain('discover');
      expect(result.code).toContain('adaptiveTest');
    });

    test('should inject ES6 import for ES modules', () => {
      const source = `import React from 'react';\ndescribe('Test', () => {});`;
      const result = transformer.process(source, 'test.adaptive.js', {});
      
      expect(result.code).toContain("import { discover, adaptiveTest, getDiscoveryEngine } from 'adaptive-tests'");
      expect(result.code).toContain("import React from 'react'");
    });

    test('should add comment for files using globals', () => {
      const source = `describe('Test', () => {\n  beforeAll(async () => {\n    const Target = await discover({ name: 'Target' });\n  });\n});`;
      const result = transformer.process(source, 'test.adaptive.js', {});
      
      // When using globals, it adds a comment OR the require
      expect(result.code).toMatch(/(Adaptive test globals|adaptive-tests)/);
      expect(result.code).toContain('discover');
    });

    test('should handle parsing errors gracefully', () => {
      const source = `this is not valid JavaScript {{{`;
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = transformer.process(source, 'test.adaptive.js', {});
      
      expect(result.code).toBe(source);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('getCacheKey', () => {
    test('should generate consistent cache keys', () => {
      const source = 'const foo = 1;';
      const path = 'test.js';
      const options = {};

      const key1 = transformer.getCacheKey(source, path, options);
      const key2 = transformer.getCacheKey(source, path, options);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^[a-f0-9]{32}$/); // MD5 hash
    });

    test('should generate different keys for different inputs', () => {
      const options = {};

      const key1 = transformer.getCacheKey('code1', 'path1', options);
      const key2 = transformer.getCacheKey('code2', 'path1', options);
      const key3 = transformer.getCacheKey('code1', 'path2', options);

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });
  });
});