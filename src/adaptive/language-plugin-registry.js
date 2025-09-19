/**
 * Language Plugin Registry
 *
 * Provides auto-discovery and management of language integration plugins.
 * Eliminates hardcoded language imports and enables dynamic plugin loading.
 */

const fs = require('fs');
const path = require('path');
const { getLogger } = require('./logger');

class LanguagePluginRegistry {
  constructor(config = {}) {
    this.plugins = new Map(); // language -> plugin instance
    this.pluginClasses = new Map(); // language -> plugin class
    this.extensionMap = new Map(); // extension -> language
    this.pluginPaths = new Map(); // language -> file path
    this.config = config;
    this.loaded = false;
    this.logger = getLogger('LanguagePluginRegistry');
    this.errors = new Map(); // language -> error info
  }

  /**
   * Initialize the registry by discovering and registering plugins
   */
  async initialize() {
    if (this.loaded) {
      return;
    }

    try {
      await this.discoverPlugins();
      this.loaded = true;
      this.logger.debug(`Initialized with ${this.pluginClasses.size} language plugins`);
    } catch (error) {
      this.logger.error('Failed to initialize plugin registry:', error);
      throw error;
    }
  }

  /**
   * Discover language plugins by scanning the adaptive directory
   */
  async discoverPlugins() {
    const adaptiveDir = __dirname;
    this.logger.debug(`Scanning for plugins in: ${adaptiveDir}`);

    try {
      const entries = await fs.promises.readdir(adaptiveDir, { withFileTypes: true });

      const discoveryTasks = entries
        .filter(entry => entry.isDirectory())
        .map(dir => this.discoverPluginInDirectory(path.join(adaptiveDir, dir.name)));

      // Run plugin discovery in parallel for better performance
      await Promise.allSettled(discoveryTasks);

      this.logger.info(`Discovered ${this.pluginClasses.size} language plugins: ${Array.from(this.pluginClasses.keys()).join(', ')}`);
    } catch (error) {
      this.logger.error('Error scanning adaptive directory:', error);
      throw error;
    }
  }

  /**
   * Discover plugin in a specific directory
   */
  async discoverPluginInDirectory(dirPath) {
    try {
      const dirName = path.basename(dirPath);
      const integrationFile = path.join(dirPath, `${dirName}-discovery-integration.js`);

      // Check if integration file exists
      try {
        await fs.promises.access(integrationFile, fs.constants.F_OK);
      } catch {
        // No integration file in this directory
        return;
      }

      // Load the plugin class
      const pluginModule = require(integrationFile);
      const expectedClassName = `${this.capitalize(dirName)}DiscoveryIntegration`;

      if (!pluginModule[expectedClassName]) {
        this.logger.warn(`Plugin ${integrationFile} does not export ${expectedClassName}`);
        return;
      }

      const PluginClass = pluginModule[expectedClassName];

      // Validate that it extends BaseLanguageIntegration
      if (!this.isValidPlugin(PluginClass)) {
        this.logger.warn(`Plugin ${expectedClassName} does not extend BaseLanguageIntegration`);
        return;
      }

      // Register the plugin
      this.registerPlugin(dirName, PluginClass, integrationFile);

    } catch (error) {
      this.logger.error(`Error discovering plugin in ${dirPath}:`, error);
      this.errors.set(path.basename(dirPath), {
        error: error.message,
        path: dirPath,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Register a plugin class
   */
  registerPlugin(language, PluginClass, filePath) {
    try {
      this.pluginClasses.set(language, PluginClass);
      this.pluginPaths.set(language, filePath);

      // Create a temporary instance to get the file extension
      const tempInstance = new PluginClass(null);
      const extension = tempInstance.getFileExtension();

      if (extension) {
        this.extensionMap.set(extension, language);
        this.logger.debug(`Registered ${language} plugin: ${extension} -> ${language}`);
      }

    } catch (error) {
      this.logger.error(`Error registering plugin ${language}:`, error);
      this.errors.set(language, {
        error: error.message,
        path: filePath,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Check if a class is a valid plugin
   */
  isValidPlugin(PluginClass) {
    try {
      // Create a temporary instance to check interface
      const instance = new PluginClass(null);

      // Check for required methods from BaseLanguageIntegration
      const requiredMethods = ['getFileExtension', 'parseFile', 'extractCandidates', 'generateTestContent'];

      for (const method of requiredMethods) {
        if (typeof instance[method] !== 'function') {
          this.logger.warn(`Plugin missing required method: ${method}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.warn(`Error validating plugin:`, error);
      return false;
    }
  }

  /**
   * Get a plugin instance by language name
   */
  async getPlugin(language, discoveryEngine = null) {
    await this.initialize();

    // Check if plugin is disabled by configuration
    if (this.isPluginDisabled(language)) {
      return null;
    }

    // Return cached instance if available
    if (this.plugins.has(language)) {
      return this.plugins.get(language);
    }

    // Load plugin on demand
    if (this.pluginClasses.has(language)) {
      try {
        const PluginClass = this.pluginClasses.get(language);
        const instance = new PluginClass(discoveryEngine);

        // Cache the instance for future use
        this.plugins.set(language, instance);

        this.logger.debug(`Loaded ${language} plugin instance`);
        return instance;

      } catch (error) {
        this.logger.error(`Error instantiating ${language} plugin:`, error);
        this.errors.set(language, {
          error: error.message,
          type: 'instantiation',
          timestamp: new Date().toISOString()
        });
        return null;
      }
    }

    this.logger.warn(`Plugin not found for language: ${language}`);
    return null;
  }

  /**
   * Get a plugin by file extension
   */
  async getPluginByExtension(extension, discoveryEngine = null) {
    await this.initialize();

    const language = this.extensionMap.get(extension);
    if (!language) {
      this.logger.debug(`No plugin found for extension: ${extension}`);
      return null;
    }

    return this.getPlugin(language, discoveryEngine);
  }

  /**
   * Get all supported file extensions
   */
  async getSupportedExtensions() {
    await this.initialize();
    return Array.from(this.extensionMap.keys());
  }

  /**
   * Get all supported languages
   */
  async getSupportedLanguages() {
    await this.initialize();
    return Array.from(this.pluginClasses.keys()).filter(lang => !this.isPluginDisabled(lang));
  }

  /**
   * Get plugin metadata
   */
  async getPluginMetadata() {
    await this.initialize();

    const metadata = {};

    for (const [language, PluginClass] of this.pluginClasses) {
      try {
        const tempInstance = new PluginClass(null);
        metadata[language] = {
          extension: tempInstance.getFileExtension(),
          enabled: !this.isPluginDisabled(language),
          path: this.pluginPaths.get(language),
          hasError: this.errors.has(language)
        };

        if (this.errors.has(language)) {
          metadata[language].error = this.errors.get(language);
        }
      } catch (error) {
        metadata[language] = {
          enabled: false,
          hasError: true,
          error: {
            error: error.message,
            type: 'metadata',
            timestamp: new Date().toISOString()
          }
        };
      }
    }

    return metadata;
  }

  /**
   * Check if a plugin is disabled by configuration
   */
  isPluginDisabled(language) {
    const pluginConfig = this.config.discovery?.plugins;
    if (!pluginConfig) {
      return false;
    }

    // If there's an explicit disabled list
    if (Array.isArray(pluginConfig.disabled) && pluginConfig.disabled.includes(language)) {
      return true;
    }

    // If there's an enabled list and this language is not in it
    if (Array.isArray(pluginConfig.enabled) && !pluginConfig.enabled.includes(language)) {
      return true;
    }

    return false;
  }

  /**
   * Detect language from file path
   */
  async detectLanguage(filePath) {
    const extension = path.extname(filePath);
    const plugin = await this.getPluginByExtension(extension);
    return plugin ? this.extensionMap.get(extension) : null;
  }

  /**
   * Clear plugin cache (useful for testing)
   */
  clearCache() {
    this.plugins.clear();
    this.loaded = false;
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return {
      totalPlugins: this.pluginClasses.size,
      loadedInstances: this.plugins.size,
      supportedExtensions: this.extensionMap.size,
      errors: this.errors.size,
      loaded: this.loaded
    };
  }

  /**
   * Capitalize first letter of string
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Singleton pattern for global access
   */
  static getInstance(config = {}) {
    if (!LanguagePluginRegistry._instance) {
      LanguagePluginRegistry._instance = new LanguagePluginRegistry(config);
    }
    return LanguagePluginRegistry._instance;
  }

  /**
   * Reset singleton (useful for testing)
   */
  static resetInstance() {
    LanguagePluginRegistry._instance = null;
  }
}

module.exports = {
  LanguagePluginRegistry
};