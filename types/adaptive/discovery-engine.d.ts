export type TargetType = 'class' | 'function' | 'object' | 'module';
export interface DiscoverySignature {
    name?: string | RegExp;
    type?: TargetType;
    exports?: string;
    methods?: string[];
    properties?: string[];
    extends?: string | Function;
    instanceof?: string | Function;
    language?: string;
    [key: string]: any;
}
export interface DiscoveryOptions {
    rootPath?: string;
    config?: any;
}
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
    discoverTarget<T = unknown>(signature: DiscoverySignature): Promise<T>;
    /**
     * Collect all candidates matching the signature
     */
    collectCandidates(dir: any, signature: DiscoverySignature, depth?: number, candidates?: any[]): Promise<any[]>;
    /**
     * Evaluate a file as a potential candidate
     */
    evaluateCandidate(filePath: any, signature: DiscoverySignature): Promise<{
        path: any;
        fileName: string;
        content: string;
        mtimeMs: number | null;
    } | null>;
    isCandidateSafe(candidate: any): boolean;
    analyzeModuleExports(content: any, fileName: any): {
        exports: {
            exportedName: string;
            access: {
                type: string;
                name: null;
            };
            info: {
                kind: any;
                name: any;
                methods: any[];
                properties: any[];
                extends: any;
            };
        }[];
    } | null;
    normalizeExportInfo(info: any): {
        kind: any;
        name: any;
        methods: any[];
        properties: any[];
        extends: any;
    };
    makeUnknownInfo(name: any): {
        kind: string;
        name: any;
        methods: never[];
        properties: never[];
        extends: null;
    };
    extractClassInfo(node: any, fallbackName: any): {
        kind: string;
        name: any;
        methods: Set<any>;
        properties: Set<any>;
        extends: any;
    };
    extractFunctionInfo(node: any, fallbackName: any): {
        kind: string;
        name: any;
        methods: Set<any>;
        properties: Set<any>;
        extends: null;
    };
    extractValueInfo(node: any, fallbackName: any): {
        kind: string;
        name: any;
        methods: Set<any>;
        properties: Set<any>;
        extends: any;
    } | {
        kind: string;
        name: any;
        methods: never[];
        properties: never[];
        extends: null;
    } | null;
    isModuleExports(node: any): any;
    isExportsMember(node: any): any;
    getMemberName(node: any): any;
    getSpecifierName(node: any): any;
    resolveExpressionName(node: any): any;
    selectExportFromMetadata(candidate: any, signature: DiscoverySignature): any;
    matchesSignatureMetadata(entry: any, signature: DiscoverySignature): boolean;
    extractExportByAccess(moduleExports: any, access: any): any;
    tokenizeName(name: any): any;
    /**
     * Quick check if file name could match signature
     */
    quickNameCheck(fileName: any, signature: DiscoverySignature): boolean;
    /**
     * Try to resolve a candidate by loading and validating it
     */
    tryResolveCandidate(candidate: any, signature: DiscoverySignature): Promise<{
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
    } | {
        target: any;
        access: any;
    } | null>;
    compileFreshModule(modulePath: any): any;
    /**
     * Resolve target from module exports
     */
    resolveTargetFromModule(moduleExports: any, signature: DiscoverySignature, candidate: any): {
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
    validateTarget(target: any, signature: DiscoverySignature): {
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
    normalizeSignature(signature: DiscoverySignature): DiscoverySignature;
    /**
     * Get cache key for signature
     */
    getCacheKey(signature: DiscoverySignature): string;
    serializeCacheValue(value: any): any;
    calculateRecencyBonus(mtimeMs: any): any;
    /**
     * Load module from cache entry
     */
    loadModule(cacheEntry: any, signature: DiscoverySignature): any;
    /**
     * Create discovery error with helpful message
     */
    createDiscoveryError(signature: DiscoverySignature, candidates?: any[]): Error;
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
