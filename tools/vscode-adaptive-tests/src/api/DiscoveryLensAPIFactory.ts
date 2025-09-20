import * as vscode from 'vscode';
import { DiscoveryLensPanel } from '../webview/DiscoveryLensPanel';
import { IDiscoveryLensAPI, DiscoveryLensAPIOptions } from '../types/api';

/**
 * Factory for creating and managing Discovery Lens API instances
 *
 * This factory enables other extensions to obtain a reference to the
 * Discovery Lens API for cross-extension communication and coordination.
 */
export class DiscoveryLensAPIFactory {
    private static instance: DiscoveryLensAPIFactory;
    private currentPanel: DiscoveryLensPanel | undefined;
    private context: vscode.ExtensionContext | undefined;

    private constructor() {}

    /**
     * Get the singleton factory instance
     */
    public static getInstance(): DiscoveryLensAPIFactory {
        if (!DiscoveryLensAPIFactory.instance) {
            DiscoveryLensAPIFactory.instance = new DiscoveryLensAPIFactory();
        }
        return DiscoveryLensAPIFactory.instance;
    }

    /**
     * Initialize the factory with extension context
     */
    public initialize(context: vscode.ExtensionContext): void {
        this.context = context;
    }

    /**
     * Get or create the Discovery Lens API
     */
    public getDiscoveryLensAPI(options?: DiscoveryLensAPIOptions): IDiscoveryLensAPI {
        if (!this.context) {
            throw new Error('DiscoveryLensAPIFactory not initialized. Call initialize() first.');
        }

        if (!this.currentPanel) {
            this.currentPanel = new DiscoveryLensPanel(this.context);
            this.currentPanel.onDidDispose(() => {
                this.currentPanel = undefined;
            });
        }

        // If custom discovery engine provided, inject it
        if (options?.discoveryEngine) {
            // This would require modifying DiscoveryLensPanel constructor
            // to accept optional engine parameter
        }

        // Auto-show if requested
        if (options?.autoShow) {
            this.currentPanel.show();
        }

        return this.currentPanel;
    }

    /**
     * Check if a Discovery Lens panel is currently active
     */
    public hasActivePanel(): boolean {
        return this.currentPanel !== undefined;
    }

    /**
     * Dispose of the current panel
     */
    public dispose(): void {
        if (this.currentPanel) {
            this.currentPanel.dispose();
            this.currentPanel = undefined;
        }
    }
}

/**
 * Global factory function for external extensions
 *
 * This function is the primary entry point for other extensions
 * to obtain the Discovery Lens API.
 *
 * @example
 * ```typescript
 * // In another extension
 * const adaptiveTests = vscode.extensions.getExtension('adaptive-tests.vscode-adaptive-tests');
 * if (adaptiveTests) {
 *     const api = adaptiveTests.exports;
 *     const discoveryLens = api.getDiscoveryLensAPI();
 *
 *     // Use the API
 *     const results = await discoveryLens.runDiscovery({
 *         name: 'UserService',
 *         type: 'class'
 *     });
 * }
 * ```
 */
export function getDiscoveryLensAPI(options?: DiscoveryLensAPIOptions): IDiscoveryLensAPI {
    return DiscoveryLensAPIFactory.getInstance().getDiscoveryLensAPI(options);
}