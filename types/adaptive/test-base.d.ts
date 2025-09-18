export type DiscoverySignature = import("./discovery-engine").DiscoverySignature;
export type DiscoveryEngine = import("./discovery-engine").DiscoveryEngine;
/**
 * @typedef {import('./discovery-engine').DiscoverySignature} DiscoverySignature
 * @typedef {import('./discovery-engine').DiscoveryEngine} DiscoveryEngine
 */
/**
 * An abstract base class for creating adaptive tests.
 * @abstract
 */
export class AdaptiveTest {
    /** @type {DiscoveryEngine} */
    discoveryEngine: DiscoveryEngine;
    /** @type {any} */
    target: any;
    /**
     * Defines the signature of the target module to be discovered.
     * This method must be implemented by the subclass.
     * @abstract
     * @returns {DiscoverySignature}
     */
    getTargetSignature(): DiscoverySignature;
    /**
     * Contains the actual test logic (e.g., using Jest or Mocha).
     * This method must be implemented by the subclass.
     * @abstract
     * @param {any} target - The discovered target module or export.
     * @returns {Promise<void> | void}
     */
    runTests(target: any): Promise<void> | void;
    /**
     * Executes the adaptive test lifecycle: discovery and execution.
     * @returns {Promise<void>}
     */
    execute(): Promise<void>;
    /**
     * Helper method to get a specific export from a discovered module.
     * @template T
     * @param {any} module - The discovered module.
     * @param {string} name - The name of the export to retrieve.
     * @returns {T}
     */
    getExport<T>(module: any, name: string): T;
}
/**
 * A Jest/Mocha compatible test runner for adaptive tests.
 * @template {new () => AdaptiveTest} T
 * @param {T} TestClass - The AdaptiveTest class to run.
 * @returns {void}
 */
export function adaptiveTest<T extends new () => AdaptiveTest>(TestClass: T): void;
