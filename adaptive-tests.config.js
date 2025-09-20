/**
 * Adaptive Tests Configuration
 *
 * This configuration showcases all available options.
 * Copy this file to your project root and customize as needed.
 */

module.exports = {
  discovery: {
    // File extensions to scan
    extensions: ['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx'],

    // Maximum directory depth
    maxDepth: 10,

    // Directories to skip
    skipDirectories: [
      'node_modules',
      '.git',
      'coverage',
      'dist',
      'build',
      'scripts',
      '__tests__',
      '.next',
      '.nuxt'
    ],

    // Scoring configuration
    scoring: {
      minCandidateScore: -100,
      allowLooseNameMatch: true,
      looseNamePenalty: -20,
      recency: {
        maxBonus: 0,
        halfLifeHours: 2
      },

      // Path scoring - customize for your project structure
      paths: {
        positive: {
          // Domain-driven design structure
          '/domain/': 25,
          '/entities/': 20,
          '/services/': 15,
          '/repositories/': 15,

          // Common patterns
          '/src/': 12,
          '/app/': 10,
          '/lib/': 8,
          '/core/': 8,
          '/components/': 5,
          '/modules/': 10,
          '/fixtures/temp/': 200,
          '/tests/fixtures/inheritance/': 150,

          // Business logic locations
          '/business/': 20,
          '/logic/': 15,
          '/models/': 15,
          '/controllers/': 10
        },
        negative: {
          // Test-related
          '/__tests__/': -50,
          '/__mocks__/': -45,
          '/tests/': -40,
          '/test/': -35,
          '/spec/': -35,
          '/.test.': -100, // Strongly avoid test files
          '/.spec.': -100,

          // Development/debug code
          '/mock': -30,
          '/mocks/': -30,
          '/fake': -25,
          '/stub': -25,
          '/fixture': -20,
          '/fixtures/': -20,
          '/samples/': -15,
          '/examples/': -10, // Lower penalty for examples

          // Temporary/experimental
          '/temp/': -30,
          '/tmp/': -30,
          '/sandbox/': -25,
          '/experiment/': -20,
          '/poc/': -20,
          '/prototype/': -15,

          // Deprecated/legacy
          '/deprecated/': -40,
          '/legacy/': -35,
          '/old/': -35,
          '/backup/': -50,
          '/broken': -60,
          '/_archive/': -100
        }
      },

      // File name matching scores
      fileName: {
        exactMatch: 50,        // Exact name match
        caseInsensitive: 35,   // Case-insensitive match
        partialMatch: 10,      // Contains the name
        regexMatch: 15         // Regex pattern match
      },

      // Extension preference
      extensions: {
        '.ts': 20,    // Prefer TypeScript
        '.tsx': 18,
        '.jsx': 5,
        '.mjs': 6,
        '.cjs': 4,
        '.js': 0      // JavaScript baseline
      },

      // Type hint scores (when checking file content)
      typeHints: {
        'class': 15,
        'function': 12,
        'module': 10,
        'object': 8
      },

      // Method mention scoring
      methods: {
        perMention: 3,
        maxMentions: 5,
        allMethodsBonus: 10  // Bonus if all required methods found
      },

      // Export pattern scoring
      exports: {
        moduleExports: 30,
        namedExport: 30,
        defaultExport: 25
      },

      // Name mention scoring (in file content)
      names: {
        perMention: 2,
        maxMentions: 5
      },

      // Target validation scoring
      target: {
        exactName: 40
      },

      // Custom scoring functions
      custom: [
        {
          name: 'prefer-newer-files',
          score: function(candidate, signature, content) {
            // Prefer files modified more recently
            try {
              const stats = require('fs').statSync(candidate.path);
              const daysSinceModified = (Date.now() - stats.mtime) / (1000 * 60 * 60 * 24);
              if (daysSinceModified < 7) return 5;   // Modified this week
              if (daysSinceModified < 30) return 2;  // Modified this month
              return 0;
            } catch (e) {
              return 0;
            }
          }
        },
        {
          name: 'avoid-generated-files',
          score: function(candidate, signature, content) {
            // Penalize auto-generated files
            if (content.includes('@generated') || content.includes('AUTO-GENERATED')) {
              return -20;
            }
            return 0;
          }
        },
        {
          name: 'prefer-documented',
          score: function(candidate, signature, content) {
            // Boost well-documented code
            const hasJsDoc = content.includes('/**') && content.includes('*/');
            const hasComments = (content.match(/\/\//g) || []).length;

            if (hasJsDoc) return 8;
            if (hasComments > 5) return 3;
            return 0;
          }
        }
      ]
    },

    // Caching configuration
    cache: {
      enabled: true,
      file: '.test-discovery-cache.json',
      ttl: null // No expiry (clear manually with await engine.clearCache())
    }
  }
};