/**
 * Enhanced Adaptive Tests Configuration Example
 *
 * This configuration showcases the new language-specific options
 * and enhanced configuration schema capabilities.
 */

module.exports = {
  discovery: {
    // Global discovery settings
    extensions: ['.js', '.ts', '.tsx', '.java', '.py', '.rs', '.go', '.php', '.rb'],
    maxDepth: 12,
    skipDirectories: [
      'node_modules', '.git', 'coverage', 'dist', 'build', 'target',
      '__tests__', '__pycache__', '.next', '.nuxt', 'deps', 'vendor'
    ],

    // Language-specific configurations
    languages: {
      typescript: {
        enabled: true,
        extensions: ['.ts', '.tsx'],
        skipPatterns: ['*.d.ts', '*.test.ts'],
        scoring: {
          nameMatching: {
            exactMatch: 60, // Higher score for TypeScript exact matches
            caseInsensitive: 40,
            partialMatch: 30
          },
          customScoring: {
            preferTypedCode: 20,  // Boost for typed code
            preferGenerics: 15,   // Boost for generic types
            preferInterfaces: 12  // Boost for interfaces
          }
        },
        parser: {
          timeout: 8000, // Longer timeout for TypeScript compilation
          options: {
            useTypeScript: true,
            strictMode: true,
            emitDecoratorMetadata: true
          }
        },
        testGeneration: {
          enabled: true,
          templatePath: 'jest-ts',
          outputPath: 'tests/typescript',
          options: {
            useJest: true,
            generateMocks: true,
            includeTypes: true
          }
        }
      },

      rust: {
        enabled: true,
        extensions: ['.rs'],
        skipPatterns: ['target/*', '*.rlib', 'Cargo.lock'],
        scoring: {
          nameMatching: {
            exactMatch: 55,
            caseInsensitive: 35,
            partialMatch: 25
          },
          customScoring: {
            preferPublicItems: 18,  // Boost for pub items
            preferTraits: 15,       // Boost for traits
            preferGenerics: 12,     // Boost for generic types
            preferDerives: 10       // Boost for derive attributes
          }
        },
        parser: {
          timeout: 10000, // Longer timeout for Rust compilation
          options: {
            edition: '2021',
            enableFeatures: ['async-await', 'const-generics']
          }
        },
        testGeneration: {
          enabled: true,
          templatePath: 'rust-test',
          outputPath: 'tests',
          options: {
            useCargoTest: true,
            generateBenchmarks: true,
            generateIntegrationTests: false
          }
        }
      },

      java: {
        enabled: true,
        extensions: ['.java'],
        skipPatterns: ['*Test.java', '*Tests.java', 'target/*'],
        scoring: {
          nameMatching: {
            exactMatch: 50,
            caseInsensitive: 30,
            partialMatch: 20
          },
          customScoring: {
            preferPublicClasses: 15,
            preferAnnotations: 12,
            preferInheritance: 10,
            preferInterfaces: 8
          }
        },
        parser: {
          timeout: 12000, // Longer timeout for Java compilation
          options: {
            javaVersion: '17',
            enablePreview: false
          }
        },
        testGeneration: {
          enabled: true,
          templatePath: 'junit5',
          outputPath: 'src/test/java',
          options: {
            useJUnit5: true,
            generateMockito: true,
            generateParameterized: true
          }
        }
      },

      python: {
        enabled: true,
        extensions: ['.py'],
        skipPatterns: ['__pycache__/*', '*.pyc', '*_test.py'],
        scoring: {
          customScoring: {
            preferClasses: 12,
            preferAsyncMethods: 8,
            preferTypeHints: 10
          }
        },
        parser: {
          timeout: 6000,
          options: {
            pythonVersion: 'python3.10',
            enableAsync: true,
            useBlack: true
          }
        },
        testGeneration: {
          enabled: true,
          templatePath: 'pytest',
          outputPath: 'tests',
          options: {
            usePytest: true,
            generateFixtures: true,
            generateAsyncTests: true
          }
        }
      },

      go: {
        enabled: true,
        extensions: ['.go'],
        skipPatterns: ['*_test.go', 'vendor/*', '.git/*'],
        scoring: {
          customScoring: {
            preferExportedSymbols: 18,
            preferInterfaces: 15,
            preferMethods: 12
          }
        },
        parser: {
          timeout: 8000,
          options: {
            goVersion: '1.20',
            enableModules: true
          }
        },
        testGeneration: {
          enabled: true,
          templatePath: 'go-test',
          outputPath: 'same-directory',
          options: {
            useTestify: true,
            generateBenchmarks: true,
            generateTableTests: true
          }
        }
      }
    },

    // Plugin configuration
    plugins: {
      enabled: true,
      autoDiscovery: true,
      disabled: [], // No disabled plugins

      // Plugin-specific configuration
      configuration: {
        'rust-integration': {
          useLezerParser: true,
          enableIncrementalParsing: true,
          cacheMetadata: true
        },
        'java-integration': {
          useAdvancedParsing: true,
          enableJavaDoc: true,
          cacheMetadata: true
        },
        'typescript-integration': {
          strictTypeChecking: true,
          enableTsServer: false
        }
      }
    }
  },

  // Enhanced global scoring
  scoring: {
    minCandidateScore: -80, // More lenient minimum score
    recency: {
      maxBonus: 15,  // Higher recency bonus
      halfLifeHours: 8
    },

    // Project-specific path scoring
    paths: {
      positive: {
        // Domain-driven design patterns
        '/src/domain/': 30,
        '/src/entities/': 25,
        '/src/services/': 20,
        '/src/repositories/': 18,
        '/src/controllers/': 15,

        // Standard source paths
        '/src/': 15,
        '/app/': 12,
        '/lib/': 10,
        '/core/': 10,

        // Language-specific paths
        '/src/main/java/': 20,  // Maven structure
        '/src/main/rust/': 18,  // Rust source
        '/pkg/': 15,            // Go packages
      },
      negative: {
        // Test directories
        '/__tests__/': -60,
        '/tests/': -50,
        '/test/': -45,
        '/spec/': -40,
        '/.test.': -120,
        '/.spec.': -120,

        // Build and generated directories
        '/target/': -70,    // Rust/Maven builds
        '/build/': -60,     // General builds
        '/dist/': -55,      // Distribution
        '/node_modules/': -100,
        '/vendor/': -80,    // PHP/Go vendor

        // Development artifacts
        '/mock': -40,
        '/temp/': -40,
        '/tmp/': -40,
        '/debug/': -35,
        '/deprecated/': -50
      }
    },

    // Language-aware extension scoring
    extensions: {
      '.ts': 25,     // Highest preference for TypeScript
      '.tsx': 23,
      '.rs': 22,     // High preference for Rust
      '.java': 20,   // High preference for Java
      '.go': 18,     // High preference for Go
      '.py': 15,     // Medium-high for Python
      '.php': 12,    // Medium for PHP
      '.rb': 10,     // Medium for Ruby
      '.jsx': 8,
      '.js': 5,      // Lower preference for plain JS
      '.mjs': 7,
      '.cjs': 6
    },

    // Enhanced custom scoring
    custom: [
      {
        name: 'prefer-recent-modifications',
        score: function(candidate, signature, content) {
          try {
            const stats = require('fs').statSync(candidate.path);
            const daysSinceModified = (Date.now() - stats.mtime) / (1000 * 60 * 60 * 24);

            if (daysSinceModified < 1) return 15;   // Modified today
            if (daysSinceModified < 7) return 10;   // Modified this week
            if (daysSinceModified < 30) return 5;   // Modified this month
            if (daysSinceModified > 365) return -5; // Very old files
            return 0;
          } catch (e) {
            return 0;
          }
        }
      },
      {
        name: 'boost-well-documented-code',
        score: function(candidate, signature, content) {
          let score = 0;

          // JSDoc/TypeDoc
          if (content.includes('/**') && content.includes('*/')) score += 12;

          // Rust doc comments
          if (content.includes('///') || content.includes('//!')) score += 10;

          // Java doc
          if (content.includes('* @param') || content.includes('* @return')) score += 8;

          // Python docstrings
          if (content.includes('"""') && content.split('"""').length > 2) score += 8;

          return score;
        }
      },
      {
        name: 'penalize-generated-and-legacy',
        score: function(candidate, signature, content) {
          let penalty = 0;

          // Generated files
          if (content.includes('@generated') ||
              content.includes('AUTO-GENERATED') ||
              content.includes('Code generated by')) {
            penalty -= 25;
          }

          // Legacy patterns
          if (content.includes('TODO: refactor') ||
              content.includes('FIXME') ||
              content.includes('DEPRECATED')) {
            penalty -= 10;
          }

          return penalty;
        }
      }
    ]
  },

  // Enhanced cache configuration
  cache: {
    enabled: true,
    file: '.adaptive-tests-cache.json',
    ttl: null,

    // Language-specific cache settings
    languages: {
      java: {
        ttl: 7200000, // 2 hours for Java (slow compilation)
        file: '.adaptive-tests-java-cache.json'
      },
      rust: {
        ttl: 10800000, // 3 hours for Rust (very slow compilation)
        file: '.adaptive-tests-rust-cache.json'
      },
      typescript: {
        ttl: 3600000, // 1 hour for TypeScript
        file: '.adaptive-tests-ts-cache.json'
      }
    }
  },

  // Test generation configuration
  testGeneration: {
    enabled: true,
    defaultLanguage: 'typescript',

    global: {
      outputBase: 'tests/adaptive',
      overwrite: false,
      generateAssertions: true,
      generateMocks: true
    },

    templates: {
      customPath: './custom-test-templates',

      builtin: {
        javascript: 'jest',
        typescript: 'jest-ts',
        java: 'junit5',
        python: 'pytest',
        rust: 'rust-test',
        go: 'go-test',
        php: 'phpunit',
        ruby: 'rspec'
      }
    }
  }
};