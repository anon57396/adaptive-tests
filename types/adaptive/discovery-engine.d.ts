export class DiscoveryEngine {
    constructor(rootPath?: string, config?: {});
    rootPath: string;
    config: any;
    scoringEngine: ScoringEngine;
    discoveryCache: Map<any, any>;
    persistentCache: {};
    cacheLoaded: boolean;
    cacheLoadPromise: Promise<void> | null;
    cachedModules: Set<any>;
    moduleVersions: Map<any, any>;
    ensureCacheLoaded(): Promise<void>;
    /**
     * Discover a target module/class/function
     */
    discoverTarget(signature: any): Promise<any>;
    /**
     * Collect all candidates matching the signature
     */
    collectCandidates(dir: any, signature: any, depth?: number, candidates?: any[]): Promise<any[]>;
    /**
     * Evaluate a file as a potential candidate
     */
    evaluateCandidate(filePath: any, signature: any): Promise<{
        path: any;
        fileName: string;
        content: string;
        mtimeMs: number | null;
    } | null>;
    isCandidateSafe(candidate: any): boolean;
    tokenizeName(name: any): any;
    /**
     * Quick check if file name could match signature
     */
    quickNameCheck(fileName: any, signature: any): boolean;
    /**
     * Try to resolve a candidate by loading and validating it
     */
    tryResolveCandidate(candidate: any, signature: any): Promise<{
        target: any;
        access: {
            type: string;
            name?: undefined;
        };
        score: number;
    } | {
        target: any;
        access: {
            type: string;
            name: string;
        };
        score: number;
    } | null>;
    compileFreshModule(modulePath: any): any;
    /**
     * Resolve target from module exports
     */
    resolveTargetFromModule(moduleExports: any, signature: any, candidate: any): {
        target: any;
        access: {
            type: string;
            name?: undefined;
        };
        score: number;
    } | {
        target: any;
        access: {
            type: string;
            name: string;
        };
        score: number;
    } | null;
    /**
     * Validate that a target matches the signature requirements
     */
    validateTarget(target: any, signature: any): {
        score: number;
    } | null;
    /**
     * Validate type
     */
    validateType(target: any, expectedType: any): any;
    /**
     * Validate name
     */
    validateName(targetName: any, expectedName: any): boolean;
    /**
     * Validate methods exist
     */
    validateMethods(target: any, methods: any): number | null;
    /**
     * Validate properties exist (NEW!)
     */
    validateProperties(target: any, properties: any): number | null;
    /**
     * Validate inheritance chain (NEW!)
     */
    validateInheritance(target: any, baseClass: any): boolean;
    /**
     * Validate instanceof (NEW!)
     */
    validateInstanceOf(target: any, expectedClass: any): boolean;
    /**
     * Get target name
     */
    getTargetName(target: any): any;
    /**
     * Should skip directory
     */
    shouldSkipDirectory(dirName: any): any;
    /**
     * Normalize signature
     */
    normalizeSignature(signature: any): any;
    /**
     * Get cache key for signature
     */
    getCacheKey(signature: any): string;
    serializeCacheValue(value: any): any;
    calculateRecencyBonus(mtimeMs: any): any;
    /**
     * Load module from cache entry
     */
    loadModule(cacheEntry: any, signature: any): any;
    /**
     * Create discovery error with helpful message
     */
    createDiscoveryError(signature: any, candidates?: any[]): Error;
    /**
     * Load cache from disk
     */
    loadCache(): Promise<void>;
    /**
     * Save cache to disk
     */
    saveCache(): Promise<void>;
    /**
     * Clear all caches
     */
    clearCache(): Promise<void>;
    /**
     * Ensure TypeScript support
     */
    ensureTypeScriptSupport(): void;
    _tsNodeRegistered: boolean | undefined;
}
export function getDiscoveryEngine(rootPath?: string, config?: {}): any;
import { ScoringEngine } from "./scoring-engine";
