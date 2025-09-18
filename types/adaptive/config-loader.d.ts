export class ConfigLoader {
    /**
     * Get the default configuration
     */
    static getDefaultConfig(): {
        discovery: {
            extensions: string[];
            maxDepth: number;
            skipDirectories: string[];
            scoring: {
                minCandidateScore: number;
                recency: {
                    maxBonus: number;
                    halfLifeHours: number;
                };
                paths: {
                    positive: {
                        '/src/': number;
                        '/app/': number;
                        '/lib/': number;
                        '/core/': number;
                    };
                    negative: {
                        '/__tests__/': number;
                        '/__mocks__/': number;
                        '/tests/': number;
                        '/test/': number;
                        '/spec/': number;
                        '/mock': number;
                        '/mocks/': number;
                        '/fake': number;
                        '/stub': number;
                        '/fixture': number;
                        '/fixtures/': number;
                        '/temp/': number;
                        '/tmp/': number;
                        '/sandbox/': number;
                        '/deprecated/': number;
                        '/broken': number;
                    };
                };
                fileName: {
                    exactMatch: number;
                    caseInsensitive: number;
                    partialMatch: number;
                    regexMatch: number;
                };
                extensions: {
                    '.ts': number;
                    '.tsx': number;
                    '.mjs': number;
                    '.cjs': number;
                    '.js': number;
                };
                typeHints: {
                    class: number;
                    function: number;
                    module: number;
                };
                methods: {
                    perMention: number;
                    maxMentions: number;
                };
                exports: {
                    moduleExports: number;
                    namedExport: number;
                    defaultExport: number;
                };
                names: {
                    perMention: number;
                    maxMentions: number;
                };
                target: {
                    exactName: number;
                };
                custom: never[];
            };
            cache: {
                enabled: boolean;
                file: string;
                ttl: null;
            };
            security: {
                allowUnsafeRequires: boolean;
                blockedTokens: string[];
            };
        };
    };
    constructor(rootPath?: string);
    rootPath: string;
    config: any;
    /**
     * Load configuration from all sources and merge
     * @param {object} inlineConfig - Configuration passed directly
     * @returns {object} Merged configuration
     */
    load(inlineConfig?: object): object;
    /**
     * Load config from package.json
     */
    loadFromPackageJson(): any;
    /**
     * Load config from .adaptive-testsrc.json
     */
    loadFromJsonFile(): any;
    /**
     * Load config from adaptive-tests.config.js
     */
    loadFromJsFile(): any;
    /**
     * Validate configuration
     */
    validateConfig(config: any): any;
    /**
     * Deep clone an object
     */
    deepClone(obj: any): any;
    /**
     * Deep merge two objects
     */
    deepMerge(target: any, source: any): any;
    /**
     * Clear cached configuration
     */
    clearCache(): void;
}
export namespace DEFAULT_CONFIG {
    namespace discovery {
        let extensions: string[];
        let maxDepth: number;
        let skipDirectories: string[];
        namespace scoring {
            export let minCandidateScore: number;
            export namespace recency {
                let maxBonus: number;
                let halfLifeHours: number;
            }
            export namespace paths {
                let positive: {
                    '/src/': number;
                    '/app/': number;
                    '/lib/': number;
                    '/core/': number;
                };
                let negative: {
                    '/__tests__/': number;
                    '/__mocks__/': number;
                    '/tests/': number;
                    '/test/': number;
                    '/spec/': number;
                    '/mock': number;
                    '/mocks/': number;
                    '/fake': number;
                    '/stub': number;
                    '/fixture': number;
                    '/fixtures/': number;
                    '/temp/': number;
                    '/tmp/': number;
                    '/sandbox/': number;
                    '/deprecated/': number;
                    '/broken': number;
                };
            }
            export namespace fileName {
                let exactMatch: number;
                let caseInsensitive: number;
                let partialMatch: number;
                let regexMatch: number;
            }
            let extensions_1: {
                '.ts': number;
                '.tsx': number;
                '.mjs': number;
                '.cjs': number;
                '.js': number;
            };
            export { extensions_1 as extensions };
            export namespace typeHints {
                let _class: number;
                export { _class as class };
                let _function: number;
                export { _function as function };
                export let module: number;
            }
            export namespace methods {
                let perMention: number;
                let maxMentions: number;
            }
            export namespace exports {
                let moduleExports: number;
                let namedExport: number;
                let defaultExport: number;
            }
            export namespace names {
                let perMention_1: number;
                export { perMention_1 as perMention };
                let maxMentions_1: number;
                export { maxMentions_1 as maxMentions };
            }
            export namespace target {
                let exactName: number;
            }
            export let custom: never[];
        }
        namespace cache {
            let enabled: boolean;
            let file: string;
            let ttl: null;
        }
        namespace security {
            let allowUnsafeRequires: boolean;
            let blockedTokens: string[];
        }
    }
}
