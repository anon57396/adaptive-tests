export type DiscoveryOptions = import("../discovery-engine").DiscoveryOptions;
/**
 * @typedef {import('../discovery-engine').DiscoveryOptions} DiscoveryOptions
 */
/**
 * An extension of the DiscoveryEngine that understands TypeScript files.
 */
export class TypeScriptDiscoveryEngine extends DiscoveryEngine {
    /**
     * @param {string} [rootPath=process.cwd()] - The root directory to start scanning from.
     * @param {DiscoveryOptions} [options={}] - Configuration options for the engine.
     */
    constructor(rootPath?: string, options?: DiscoveryOptions);
}
/**
 * Gets a singleton instance of the TypeScriptDiscoveryEngine for a given root path.
 * @param {string} [rootPath=process.cwd()] - The root directory for the engine instance.
 * @returns {TypeScriptDiscoveryEngine} The singleton TypeScriptDiscoveryEngine instance.
 */
export function getTypeScriptDiscoveryEngine(rootPath?: string): TypeScriptDiscoveryEngine;
import { DiscoveryEngine } from "../discovery-engine";
