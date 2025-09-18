/**
 * StringUtils - A test fixture for demonstrating adaptive discovery
 * This module can be moved, renamed, or refactored and adaptive tests will still find it
 */

class StringUtils {
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  reverse(str) {
    if (!str) return '';
    return str.split('').reverse().join('');
  }

  isPalindrome(str) {
    if (!str) return false;
    const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean === clean.split('').reverse().join('');
  }

  truncate(str, length = 30, suffix = '...') {
    if (!str || str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  }

  countWords(str) {
    if (!str) return 0;
    return str.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}

module.exports = StringUtils;