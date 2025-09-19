declare const _exports: {
    LegacyDiscoveryEngine: typeof adaptive.DiscoveryEngine;
    getLegacyEngine: typeof getLegacyEngine;
    DiscoveryEngine: typeof adaptive.DiscoveryEngine;
    AdaptiveTest: typeof adaptive.AdaptiveTest;
    TypeScriptDiscoveryEngine: typeof adaptive.TypeScriptDiscoveryEngine;
    getDiscoveryEngine: typeof adaptive.getDiscoveryEngine;
    getTypeScriptDiscoveryEngine: typeof adaptive.getTypeScriptDiscoveryEngine;
    adaptiveTest: typeof adaptive.adaptiveTest;
    discover: typeof adaptive.discover;
    ConfigLoader: typeof adaptive.ConfigLoader;
    ScoringEngine: typeof adaptive.ScoringEngine;
    DEFAULT_CONFIG: {
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
    setLogger: typeof adaptive.setLogger;
    getLogger: typeof adaptive.getLogger;
};
export = _exports;
import adaptive = require("./adaptive");
declare function getLegacyEngine(...args: any[]): any;
