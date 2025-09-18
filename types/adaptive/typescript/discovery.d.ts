export type DiscoveryOptions = import("../discovery").DiscoveryOptions;
/**
 * @typedef {import('../discovery').DiscoveryOptions} DiscoveryOptions
 */
/**
 * An extension of the DiscoveryEngine that understands TypeScript files.
 */
export class TypeScriptDiscoveryEngine extends DiscoveryEngine {
}
/**
 * Gets a singleton instance of the TypeScriptDiscoveryEngine for a given root path.
 * @param {string} [rootPath=process.cwd()] - The root directory for the engine instance.
 * @returns {TypeScriptDiscoveryEngine} The singleton TypeScriptDiscoveryEngine instance.
 */
export function getTypeScriptDiscoveryEngine(rootPath?: string): TypeScriptDiscoveryEngine;
import { DiscoveryEngine } from "../discovery";
