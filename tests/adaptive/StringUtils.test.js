/**
 * Adaptive test for StringUtils
 * This test will find StringUtils wherever it lives in the codebase
 * Move the file, rename it, or refactor it - this test will still work!
 */

const path = require('path');
const { getDiscoveryEngine } = require('../../src/adaptive/discovery-engine');

// Create discovery engine starting from project root
const engine = getDiscoveryEngine(path.resolve(__dirname, '../..'));

describe('StringUtils - Adaptive Discovery', () => {
  let StringUtils;
  let utils;

  beforeAll(async () => {
    // Discover StringUtils class dynamically
    // No hardcoded path - the engine will find it!
    StringUtils = await engine.discoverTarget({
      name: 'StringUtils',
      type: 'class',
      methods: ['capitalize', 'reverse', 'isPalindrome', 'truncate', 'countWords']
    });

    utils = new StringUtils();
  });

  test('should discover StringUtils class', () => {
    expect(StringUtils).toBeDefined();
    expect(StringUtils.name).toBe('StringUtils');
  });

  describe('String Operations', () => {
    test('capitalize() should capitalize first letter', () => {
      expect(utils.capitalize('hello')).toBe('Hello');
      expect(utils.capitalize('WORLD')).toBe('WORLD');
      expect(utils.capitalize('')).toBe('');
      expect(utils.capitalize(null)).toBe('');
    });

    test('reverse() should reverse strings', () => {
      expect(utils.reverse('hello')).toBe('olleh');
      expect(utils.reverse('12345')).toBe('54321');
      expect(utils.reverse('')).toBe('');
      expect(utils.reverse(null)).toBe('');
    });

    test('isPalindrome() should detect palindromes', () => {
      expect(utils.isPalindrome('racecar')).toBe(true);
      expect(utils.isPalindrome('A man a plan a canal Panama')).toBe(true);
      expect(utils.isPalindrome('hello')).toBe(false);
      expect(utils.isPalindrome('')).toBe(false);
      expect(utils.isPalindrome(null)).toBe(false);
    });

    test('truncate() should truncate long strings', () => {
      const longString = 'This is a very long string that needs to be truncated';
      expect(utils.truncate(longString, 20)).toBe('This is a very lo...');
      expect(utils.truncate('short', 10)).toBe('short');
      expect(utils.truncate(longString, 20, '…')).toBe('This is a very long…');
    });

    test('countWords() should count words accurately', () => {
      expect(utils.countWords('Hello world')).toBe(2);
      expect(utils.countWords('  Multiple   spaces   between   words  ')).toBe(4);
      expect(utils.countWords('')).toBe(0);
      expect(utils.countWords(null)).toBe(0);
    });
  });
});

/**
 * This test demonstrates:
 * - No hardcoded import paths
 * - Discovery based on class signature (name + methods)
 * - Tests will survive if StringUtils.js is moved to any location
 * - Tests will survive if the file is renamed (as long as class name stays the same)
 * - Tests validate the discovered module has expected methods
 */