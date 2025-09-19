/**
 * API Types for Cypher Suite Integration
 *
 * These types define the public API surface for the Discovery Lens,
 * enabling seamless integration with the unified Cypher Suite hub.
 */

/**
 * Represents a single discovery result
 */
export interface DiscoveryResult {
    /** Absolute file path */
    path: string;

    /** Relative path from workspace root */
    relativePath: string;

    /** Discovery score (0-100) */
    score: number;

    /** Breakdown of how the score was calculated */
    scoreBreakdown: ScoreBreakdown;

    /** Metadata extracted from the discovered file */
    metadata?: {
        type: 'class' | 'function' | 'interface' | 'variable' | 'unknown';
        name: string;
        methods?: string[];
        properties?: string[];
        extends?: string;
        implements?: string[];
    };

    /** Language of the discovered file */
    language?: 'javascript' | 'typescript' | 'php' | 'java' | 'python';
}

/**
 * Score breakdown details
 */
export interface ScoreBreakdown {
    /** Individual scoring factors */
    factors: Array<{
        factor: string;
        points: number;
        description: string;
    }>;

    /** Total calculated score */
    total: number;
}

/**
 * Discovery signature used for searching
 */
export interface DiscoverySignature {
    /** Name of the target (class, function, etc.) */
    name: string;

    /** Type of code structure to find */
    type?: 'class' | 'function' | 'interface' | 'trait' | 'variable';

    /** Expected methods (for classes/interfaces) */
    methods?: string[];

    /** Expected properties (for classes) */
    properties?: string[];

    /** Parent class (for inheritance) */
    extends?: string;

    /** Implemented interfaces */
    implements?: string[];

    /** Additional custom criteria */
    [key: string]: any;
}

/**
 * Current state of the Discovery Lens
 */
export interface DiscoveryState {
    /** Currently active signature */
    signature: DiscoverySignature | null;

    /** Last discovery results */
    results: DiscoveryResult[];

    /** Whether discovery is currently running */
    isLoading: boolean;

    /** Last error message, if any */
    lastError: string | null;

    /** Timestamp of last discovery run */
    lastRunTimestamp: number | null;

    /** Current configuration */
    config: {
        showScores: boolean;
        maxResults: number;
        outputDirectory: string;
        autoOpen: boolean;
    };
}

/**
 * Public API for the Discovery Lens
 *
 * This interface enables other extensions in the Cypher Suite
 * to interact with the discovery functionality programmatically.
 */
export interface IDiscoveryLensAPI {
    /**
     * Run discovery with a given signature
     * @param signature The discovery signature to search for
     * @returns Promise resolving to array of discovery results
     */
    runDiscovery(signature: DiscoverySignature): Promise<DiscoveryResult[]>;

    /**
     * Set the signature in the Discovery Lens UI
     * @param signature The signature to display
     */
    setSignature(signature: DiscoverySignature): void;

    /**
     * Get the current state of the Discovery Lens
     * @returns Current state snapshot
     */
    getState(): DiscoveryState;

    /**
     * Open the Discovery Lens panel
     */
    show(): void;

    /**
     * Hide the Discovery Lens panel
     */
    hide(): void;

    /**
     * Clear current results and signature
     */
    clear(): void;

    /**
     * Subscribe to state changes
     * @param callback Function to call when state changes
     * @returns Disposable to unsubscribe
     */
    onStateChange(callback: (state: DiscoveryState) => void): { dispose(): void };

    /**
     * Subscribe to discovery results
     * @param callback Function to call when new results arrive
     * @returns Disposable to unsubscribe
     */
    onResults(callback: (results: DiscoveryResult[]) => void): { dispose(): void };
}

/**
 * Options for creating the Discovery Lens API
 */
export interface DiscoveryLensAPIOptions {
    /** Root path for discovery (defaults to workspace root) */
    rootPath?: string;

    /** Whether to auto-show panel on first discovery */
    autoShow?: boolean;

    /** Custom discovery engine instance */
    discoveryEngine?: any;
}

/**
 * Event emitted when Discovery Lens state changes
 */
export interface DiscoveryStateChangeEvent {
    /** Previous state */
    previousState: DiscoveryState;

    /** New state */
    newState: DiscoveryState;

    /** What triggered the change */
    trigger: 'discovery' | 'signature' | 'clear' | 'config' | 'error';
}

/**
 * Cross-extension message protocol
 *
 * These messages can be sent between Cypher Suite extensions
 * for coordinated discovery operations.
 */
export interface DiscoveryMessage {
    /** Source extension ID */
    source: string;

    /** Target extension ID (or 'broadcast' for all) */
    target: string;

    /** Message type */
    type: 'discovery-request' | 'discovery-response' | 'state-sync' | 'error';

    /** Message payload */
    payload: any;

    /** Correlation ID for request/response matching */
    correlationId?: string;

    /** Timestamp */
    timestamp: number;
}