export type DiscoverySignature = import("./discovery-engine").DiscoverySignature;
export type TargetType = import("./discovery-engine").TargetType;
export type DiscoveryOptions = import("./discovery-engine").DiscoveryOptions;
import { DiscoveryEngine } from "./discovery-engine";
import { AdaptiveTest } from "./test-base";
import { TypeScriptDiscoveryEngine } from "./typescript/discovery";
import { getDiscoveryEngine } from "./discovery-engine";
import { getTypeScriptDiscoveryEngine } from "./typescript/discovery";
import { adaptiveTest } from "./test-base";
/**
 * @typedef {import('./discovery-engine').DiscoverySignature} DiscoverySignature
 * @typedef {import('./discovery-engine').TargetType} TargetType
 * @typedef {import('./discovery-engine').DiscoveryOptions} DiscoveryOptions
 */
/**
 * A convenience function to quickly discover a target without creating an engine instance directly.
 * @template T
 * @param {DiscoverySignature} signature - The signature of the target to discover.
 * @param {string} [rootPath=process.cwd()] - The root directory to scan from.
 * @returns {Promise<T>} A promise that resolves with the discovered target.
 */
export function discover<T = unknown>(signature: DiscoverySignature, rootPath?: string): Promise<T>;
import { ConfigLoader } from "./config-loader";
import { ScoringEngine } from "./scoring-engine";
import { DEFAULT_CONFIG } from "./config-loader";
export { DiscoveryEngine, AdaptiveTest, TypeScriptDiscoveryEngine, getDiscoveryEngine, getTypeScriptDiscoveryEngine, adaptiveTest, ConfigLoader, ScoringEngine, DEFAULT_CONFIG };
