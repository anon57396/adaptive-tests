/**
 * Configuration Loader for Adaptive Tests
 *
 * Loads and merges configuration from multiple sources:
 * 1. Inline config (highest priority)
 * 2. adaptive-tests.config.js
 * 3. .adaptive-testsrc.json
 * 4. package.json "adaptive-tests" field
 * 5. Enhanced default config (lowest priority)
 *
 * Enhanced with language-specific configuration support.
 */

const fs = require('fs');
const path = require('path');
const { getLogger } = require('./logger');
const {
  ENHANCED_CONFIG_SCHEMA,
  ConfigSchemaValidator,
  LANGUAGE_EXTENSIONS
} = require('./enhanced-config-schema');

const DEFAULT_CONFIG = {
  discovery: {
    // File extensions to consider
    extensions: ['.js', '.cjs', '.mjs', '.ts', '.tsx'],

    // Maximum directory depth to scan
    maxDepth: 10,

    // Directories to skip
    skipDirectories: ['node_modules', '.git', '.svn', '.hg', 'coverage', 'dist', 'build', 'scripts'],

    // Scoring configuration
    scoring: {
      minCandidateScore: -100,
      recency: {
        maxBonus: 0,
        halfLifeHours: 6
      },

      // Path scoring
      paths: {
        positive: {
          '/src/': 12,
          '/app/': 6,
          '/lib/': 4,
          '/core/': 4
        },
        negative: {
          '/__tests__/': -50,
          '/__mocks__/': -45,
          '/tests/': -40,
          '/test/': -35,
          '/spec/': -35,
          '/mock': -30,
          '/mocks/': -30,
          '/fake': -25,
          '/stub': -25,
          '/fixture': -15,
          '/fixtures/': -15,
          '/temp/': -15,
          '/tmp/': -15,
          '/sandbox/': -15,
          '/deprecated/': -20,
          '/broken': -60
        }
      },

      // File name scoring
      fileName: {
        exactMatch: 45,
        caseInsensitive: 30,
        partialMatch: 8,
        regexMatch: 12
      },

      // Extension scoring
      extensions: {
        '.ts': 18,
        '.tsx': 18,
        '.mjs': 6,
        '.cjs': 4,
        '.js': 0
      },

      // Type hints in file content
      typeHints: {
        'class': 15,
        'function': 12,
        'module': 10
      },

      // Method mention scoring
      methods: {
        perMention: 3,
        maxMentions: 5
      },

      // Export hint scoring
      exports: {
        moduleExports: 30,
        namedExport: 30,
        defaultExport: 30
      },

      // Name mention scoring
      names: {
        perMention: 2,
        maxMentions: 5
      },

      // Target name match scoring
      target: {
        exactName: 35
      },

      // Custom scoring functions
      custom: []
    },

    // Caching configuration
    cache: {
      enabled: true,
      file: '.test-discovery-cache.json',
      ttl: 24 * 60 * 60, // 24 hour TTL by default
      logWarnings: false
    },

    // Security configuration
    security: {
      allowUnsafeRequires: true,
      blockedTokens: [
        'process.exit(',
        'child_process.exec',
        'child_process.spawn',
        'child_process.fork',
        'fs.rmSync',
        'fs.rmdirSync',
        'fs.unlinkSync',
        'rimraf'
      ]
    }
  }
};

class ConfigLoader {
  constructor(rootPath = process.cwd()) {
    this.rootPath = rootPath;
    this.config = null;
    this.validator = new ConfigSchemaValidator();
    this.logger = getLogger('ConfigLoader');
  }

  /**
   * Load configuration from all sources and merge
   * @param {object} inlineConfig - Configuration passed directly
   * @returns {object} Merged configuration
   */
  load(inlineConfig = {}) {
    if (this.config) {
      return this.config;
    }

    // Start with enhanced default schema
    let config = this.deepClone(ENHANCED_CONFIG_SCHEMA);

    // Backward compatibility: merge old default config for missing sections
    config = this.deepMerge(config, this.deepClone(DEFAULT_CONFIG));

    // Load from package.json
    const packageConfig = this.loadFromPackageJson();
    if (packageConfig) {
      config = this.deepMerge(config, packageConfig);
    }

    // Load from .adaptive-testsrc.json
    const jsonConfig = this.loadFromJsonFile();
    if (jsonConfig) {
      config = this.deepMerge(config, jsonConfig);
    }

    // Load from adaptive-tests.config.js
    const jsConfig = this.loadFromJsFile();
    if (jsConfig) {
      config = this.deepMerge(config, jsConfig);
    }

    // Apply inline config (highest priority)
    if (inlineConfig && Object.keys(inlineConfig).length > 0) {
      config = this.deepMerge(config, inlineConfig);
    }

    // Auto-detect and configure languages based on project structure
    config = this.autoConfigureLanguages(config);

    // Validate and normalize the config
    this.config = this.validateEnhancedConfig(config);
    return this.config;
  }

  /**
   * Load config from package.json
   */
  loadFromPackageJson() {
    try {
      const packagePath = path.join(this.rootPath, 'package.json');
      if (fs.existsSync(packagePath)) {
        const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        return packageData['adaptive-tests'] || null;
      }
    } catch (error) {
      // Silently ignore errors
    }
    return null;
  }

  /**
   * Load config from .adaptive-testsrc.json
   */
  loadFromJsonFile() {
    const possiblePaths = [
      path.join(this.rootPath, '.adaptive-testsrc.json'),
      path.join(this.rootPath, '.adaptive-testsrc'),
      path.join(this.rootPath, '.config', 'adaptive-tests.json')
    ];

    for (const configPath of possiblePaths) {
      try {
        if (fs.existsSync(configPath)) {
          return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
      } catch (error) {
        getLogger().warn(`Failed to load config from ${configPath}: ${error.message}`);
      }
    }
    return null;
  }

  /**
   * Load config from adaptive-tests.config.js
   */
  loadFromJsFile() {
    const possiblePaths = [
      path.join(this.rootPath, 'adaptive-tests.config.js'),
      path.join(this.rootPath, 'adaptive.config.js'),
      path.join(this.rootPath, '.config', 'adaptive-tests.js')
    ];

    for (const configPath of possiblePaths) {
      try {
        if (fs.existsSync(configPath)) {
          // Clear require cache to get fresh config
          delete require.cache[require.resolve(configPath)];
          return require(configPath);
        }
      } catch (error) {
        if (!error.message.includes('Cannot find module')) {
          getLogger().warn(`Failed to load config from ${configPath}: ${error.message}`);
        }
      }
    }
    return null;
  }

  /**
   * Validate configuration
   */
  validateConfig(config) {
    // Ensure required structure exists
    if (!config.discovery) {
      config.discovery = {};
    }

    if (!config.discovery.scoring) {
      config.discovery.scoring = {};
    }

    // Validate extensions
    if (config.discovery.extensions) {
      config.discovery.extensions = config.discovery.extensions.map(ext =>
        ext.startsWith('.') ? ext : `.${ext}`
      );
      // Remove duplicates
      config.discovery.extensions = [...new Set(config.discovery.extensions)];
    }

    // Validate skip directories
    if (config.discovery.skipDirectories) {
      config.discovery.skipDirectories = [...new Set(config.discovery.skipDirectories)];
    }

    // Validate custom scoring functions
    if (config.discovery.scoring.custom) {
      if (!Array.isArray(config.discovery.scoring.custom)) {
        config.discovery.scoring.custom = [config.discovery.scoring.custom];
      }

      config.discovery.scoring.custom = config.discovery.scoring.custom.filter(scorer => {
        if (typeof scorer === 'function') {
          return true;
        }
        if (scorer && typeof scorer.score === 'function') {
          return true;
        }
        getLogger().warn('Invalid custom scorer removed:', scorer);
        return false;
      });
    }

    // Validate numeric scores
    const validateScores = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          validateScores(obj[key]);
        } else if (typeof obj[key] !== 'number' && typeof obj[key] !== 'function') {
          getLogger().warn(`Invalid score value for ${key}: ${obj[key]}`);
          delete obj[key];
        }
      }
    };

    if (config.discovery.scoring.paths) {
      validateScores(config.discovery.scoring.paths);
    }

    return config;
  }

  /**
   * Deep clone an object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (obj instanceof Function) return obj;

    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    if (!source) return target;

    const result = this.deepClone(target);

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] === null || source[key] === undefined) {
          continue;
        }

        if (typeof source[key] === 'object' && !Array.isArray(source[key]) && !(source[key] instanceof Function)) {
          if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
            result[key] = this.deepMerge(result[key], source[key]);
          } else {
            result[key] = this.deepClone(source[key]);
          }
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * Get the default configuration
   */
  static getDefaultConfig() {
    return DEFAULT_CONFIG;
  }

  /**
   * Auto-detect and configure languages based on project structure
   */
  autoConfigureLanguages(config) {
    try {
      // Detect languages by scanning for common files and dependencies
      const detectedLanguages = this.detectProjectLanguages();

      // Enable language configurations for detected languages
      if (!config.discovery.languages) {
        config.discovery.languages = {};
      }

      for (const language of detectedLanguages) {
        if (!config.discovery.languages[language]) {
          // Use default language config from enhanced schema
          config.discovery.languages[language] =
            ENHANCED_CONFIG_SCHEMA.discovery.languages[language] || { enabled: true };
        }
      }

      this.logger.debug(`Auto-detected languages: ${detectedLanguages.join(', ')}`);
    } catch (error) {
      this.logger.warn('Failed to auto-detect languages:', error);
    }

    return config;
  }

  /**
   * Detect project languages based on files and dependencies
   */
  detectProjectLanguages() {
    const languages = new Set();

    try {
      // Check for language-specific files
      const files = fs.readdirSync(this.rootPath);

      for (const file of files) {
        // Check for specific config files
        if (file === 'package.json') languages.add('javascript');
        if (file === 'tsconfig.json') languages.add('typescript');
        if (file === 'Cargo.toml') languages.add('rust');
        if (file === 'go.mod' || file === 'go.sum') languages.add('go');
        if (file === 'pom.xml' || file === 'build.gradle') languages.add('java');
        if (file === 'composer.json') languages.add('php');
        if (file === 'Gemfile') languages.add('ruby');
        if (file === 'requirements.txt' || file === 'setup.py' || file === 'pyproject.toml') {
          languages.add('python');
        }
      }

      // Scan source directories for language files
      const srcDirs = ['src', 'app', 'lib', 'source'];
      for (const dir of srcDirs) {
        const dirPath = path.join(this.rootPath, dir);
        if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
          this.scanDirectoryForLanguages(dirPath, languages);
        }
      }

      // Check package.json dependencies for language indicators
      const packageJsonPath = path.join(this.rootPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const deps = { ...(packageData.dependencies || {}), ...(packageData.devDependencies || {}) };

        if (deps.typescript || deps['@types/node']) languages.add('typescript');
        if (deps.react || deps['@types/react']) languages.add('javascript');
      }
    } catch (error) {
      this.logger.warn('Error detecting languages:', error);
    }

    return Array.from(languages);
  }

  /**
   * Recursively scan directory for language files
   */
  scanDirectoryForLanguages(dirPath, languages, depth = 0) {
    if (depth > 3) return; // Limit recursion depth

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          this.scanDirectoryForLanguages(
            path.join(dirPath, entry.name),
            languages,
            depth + 1
          );
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);

          // Map extensions to languages
          if (LANGUAGE_EXTENSIONS.javascript.includes(ext)) languages.add('javascript');
          if (LANGUAGE_EXTENSIONS.typescript.includes(ext)) languages.add('typescript');
          if (LANGUAGE_EXTENSIONS.java.includes(ext)) languages.add('java');
          if (LANGUAGE_EXTENSIONS.python.includes(ext)) languages.add('python');
          if (LANGUAGE_EXTENSIONS.rust.includes(ext)) languages.add('rust');
          if (LANGUAGE_EXTENSIONS.go.includes(ext)) languages.add('go');
          if (LANGUAGE_EXTENSIONS.php.includes(ext)) languages.add('php');
          if (LANGUAGE_EXTENSIONS.ruby.includes(ext)) languages.add('ruby');
        }
      }
    } catch (error) {
      // Silently ignore directory read errors
    }
  }

  /**
   * Validate configuration using enhanced schema
   */
  validateEnhancedConfig(config) {
    const validation = this.validator.validate(config);

    if (!validation.valid) {
      this.logger.warn('Configuration validation errors:', validation.errors);

      // Log warnings but continue with invalid config for now
      // In a production environment, you might want to throw an error
      for (const error of validation.errors) {
        this.logger.warn(`Config validation: ${error}`);
      }
    }

    return this.normalizeConfig(config);
  }

  /**
   * Normalize configuration values
   */
  normalizeConfig(config) {
    // Ensure arrays are properly initialized
    if (!config.discovery.extensions) {
      config.discovery.extensions = [];
    }

    if (!config.discovery.skipDirectories) {
      config.discovery.skipDirectories = [];
    }

    // Ensure language configurations are properly initialized
    if (config.discovery.languages) {
      for (const [language, langConfig] of Object.entries(config.discovery.languages)) {
        if (langConfig.enabled === undefined) {
          langConfig.enabled = true;
        }
      }
    }

    // Merge language-specific extensions into global extensions
    if (config.discovery.languages) {
      const languageExtensions = new Set(config.discovery.extensions);

      for (const [language, langConfig] of Object.entries(config.discovery.languages)) {
        if (langConfig.enabled && langConfig.extensions) {
          langConfig.extensions.forEach(ext => languageExtensions.add(ext));
        }
      }

      config.discovery.extensions = Array.from(languageExtensions);
    }

    return config;
  }

  /**
   * Get language-specific configuration
   */
  getLanguageConfig(language) {
    if (!this.config) {
      this.load();
    }

    return this.config.discovery.languages?.[language] || null;
  }

  /**
   * Check if a language is enabled
   */
  isLanguageEnabled(language) {
    const langConfig = this.getLanguageConfig(language);
    return langConfig ? langConfig.enabled !== false : false;
  }

  /**
   * Clear cached configuration
   */
  clearCache() {
    this.config = null;
  }
}

module.exports = { ConfigLoader, DEFAULT_CONFIG };