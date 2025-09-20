/**
 * Adaptive tests for ESM string utilities
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { getDiscoveryEngine } from '../../../src/index.mjs';

describe('String Utils - Adaptive Discovery (ESM)', () => {
  let stringUtils;
  let StringBuilder;

  beforeAll(async () => {
    const engine = getDiscoveryEngine();

    // Discover ESM module with string functions
    const module = await engine.discoverTarget({
      name: 'string-utils',
      exports: ['capitalize', 'reverse', 'isPalindrome', 'camelCase', 'kebabCase', 'StringBuilder'],
      type: 'module',
      moduleType: 'esm'
    });

    stringUtils = module;
    StringBuilder = module.StringBuilder;
  });

  test('should discover string transformation functions', () => {
    expect(stringUtils.capitalize).toBeDefined();
    expect(stringUtils.reverse).toBeDefined();

    expect(stringUtils.capitalize('hello')).toBe('Hello');
    expect(stringUtils.reverse('hello')).toBe('olleh');
  });

  test('should discover isPalindrome function', () => {
    expect(stringUtils.isPalindrome).toBeDefined();

    expect(stringUtils.isPalindrome('racecar')).toBe(true);
    expect(stringUtils.isPalindrome('A man a plan a canal Panama')).toBe(true);
    expect(stringUtils.isPalindrome('hello')).toBe(false);
  });

  test('should discover case conversion functions', () => {
    expect(stringUtils.camelCase).toBeDefined();
    expect(stringUtils.kebabCase).toBeDefined();

    expect(stringUtils.camelCase('hello world')).toBe('helloWorld');
    expect(stringUtils.camelCase('foo-bar-baz')).toBe('fooBarBaz');

    expect(stringUtils.kebabCase('helloWorld')).toBe('hello-world');
    expect(stringUtils.kebabCase('FooBarBaz')).toBe('foo-bar-baz');
  });

  test('should discover StringBuilder class', () => {
    expect(StringBuilder).toBeDefined();

    const builder = new StringBuilder('Hello');
    expect(builder.toString()).toBe('Hello');

    builder.append(' ').append('World');
    expect(builder.toString()).toBe('Hello World');

    builder.prepend('Say: ');
    expect(builder.toString()).toBe('Say: Hello World');

    builder.clear();
    expect(builder.toString()).toBe('');
  });
});

describe('Named Exports Aliases Discovery (ESM)', () => {
  let aliases;

  beforeAll(async () => {
    const engine = getDiscoveryEngine();

    // Discover aliased exports
    aliases = await engine.discoverTarget({
      name: 'string-utils',
      exports: ['cap', 'rev'],
      type: 'module',
      moduleType: 'esm'
    });
  });

  test('should discover aliased exports', () => {
    expect(aliases.cap).toBeDefined();
    expect(aliases.rev).toBeDefined();

    expect(aliases.cap('test')).toBe('Test');
    expect(aliases.rev('test')).toBe('tset');
  });
});
