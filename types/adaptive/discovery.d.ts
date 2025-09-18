export type TargetType = "class" | "function" | "module";
export type DiscoverySignature = {
    /**
     * - The name of the target to discover (e.g., 'Calculator'). Can be a regex.
     */
    name?: string | RegExp | undefined;
    /**
     * - The type of the target ('class', 'function', or 'module').
     */
    type?: TargetType | undefined;
    /**
     * - A list of method names that the target must have.
     */
    methods?: string[] | undefined;
    /**
     * - The specific named export to look for.
     */
    exports?: string | undefined;
};
export type DiscoveryOptions = {
    /**
     * - File extensions to scan (e.g., ['.js', '.ts']).
     */
    extensions?: string[] | undefined;
};
/**
 * The core engine for discovering test targets dynamically.
 */
export class DiscoveryEngine {
    /**
     * @param {string} [rootPath=process.cwd()] - The root directory to start scanning from.
     * @param {DiscoveryOptions} [options={}] - Configuration options for the engine.
     */
    constructor(rootPath?: string, options?: DiscoveryOptions);
    rootPath: string;
    /** @type {string[]} */
    extensions: string[];
    cacheFile: string;
    cache: Map<any, any>;
    discoveryCache: {};
    cacheLoaded: boolean;
    /**
     * Discovers a test target based on a signature.
     * @template T
     * @param {DiscoverySignature} signatureInput - The signature describing the target to find.
     * @returns {Promise<T>} A promise that resolves with the discovered target module or export.
     */
    discoverTarget<T>(signatureInput: DiscoverySignature): Promise<T>;
    collectCandidates(dir: any, signature: any, matches: any, depth: any): void;
    evaluateCandidate(filePath: any, signature: any): {
        path: any;
        fileName: string;
        score: number;
    } | null;
    tryResolveCandidate(candidate: any, signature: any): {
        path: any;
        access: any;
        target: any;
        targetName: any;
        score: any;
    } | null;
    quickNameCheck(fileName: any, content: any, signature: any): boolean;
    resolveTargetFromModule(moduleExports: any, signature: any, fileName: any): any;
    loadModule(entry: any, signature: any): any;
    normalizeCacheEntry(entry: any): {
        path: any;
        access: any;
    } | null;
    applyAccess(moduleExports: any, access: any): any;
    createCacheEntry(candidate: any): {
        path: any;
        access: any;
    };
    loadCache(): void;
    saveCache(): void;
    /**
     * Clears the discovery cache from memory and deletes the .test-discovery-cache.json file.
     * @returns {void}
     */
    clearCache(): void;
    safeReadFile(filePath: any): string | null;
    normalizeSignature(signature: any): any;
    createNameMatcher(name: any): (value: any) => boolean;
    nameMatches(signature: any, value: any): any;
    matchesAnyName(signature: any, exportName: any, targetName: any, fileName: any): any;
    exportMatches(expectedExport: any, access: any, targetName: any): boolean;
    getTargetName(target: any): any;
    validateType(target: any, expectedType: any): any;
    validateMethods(target: any, methods: any): number | null;
    scoreNameMentions(content: any, signature: any): number;
    scoreExportHints(content: any, signature: any): 30 | 0;
    scoreTypeHints(content: any, signature: any): 10 | 12 | 15 | 0;
    scoreMethodMentions(content: any, methods: any): number;
    scoreExtension(filePath: any): 6 | 4 | 18 | 0;
    scoreFileName(fileName: any, signature: any): 12 | 45 | 30 | 8 | 0;
    scoreTargetName(targetName: any, signature: any): 35 | 0;
    scorePath(filePath: any): number;
}
/**
 * Gets a singleton instance of the DiscoveryEngine for a given root path.
 * @param {string} [rootPath=process.cwd()] - The root directory for the engine instance.
 * @returns {DiscoveryEngine} The singleton DiscoveryEngine instance.
 */
export function getDiscoveryEngine(rootPath?: string): DiscoveryEngine;
