"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscoveryLensAPIFactory = void 0;
exports.getDiscoveryLensAPI = getDiscoveryLensAPI;
const DiscoveryLensPanel_1 = require("../webview/DiscoveryLensPanel");
/**
 * Factory for creating and managing Discovery Lens API instances
 *
 * This factory enables other extensions to obtain a reference to the
 * Discovery Lens API for cross-extension communication and coordination.
 */
class DiscoveryLensAPIFactory {
    constructor() { }
    /**
     * Get the singleton factory instance
     */
    static getInstance() {
        if (!DiscoveryLensAPIFactory.instance) {
            DiscoveryLensAPIFactory.instance = new DiscoveryLensAPIFactory();
        }
        return DiscoveryLensAPIFactory.instance;
    }
    /**
     * Initialize the factory with extension context
     */
    initialize(context) {
        this.context = context;
    }
    /**
     * Get or create the Discovery Lens API
     */
    getDiscoveryLensAPI(options) {
        if (!this.context) {
            throw new Error('DiscoveryLensAPIFactory not initialized. Call initialize() first.');
        }
        if (!this.currentPanel) {
            this.currentPanel = new DiscoveryLensPanel_1.DiscoveryLensPanel(this.context);
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
    hasActivePanel() {
        return this.currentPanel !== undefined;
    }
    /**
     * Dispose of the current panel
     */
    dispose() {
        if (this.currentPanel) {
            this.currentPanel.dispose();
            this.currentPanel = undefined;
        }
    }
}
exports.DiscoveryLensAPIFactory = DiscoveryLensAPIFactory;
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
function getDiscoveryLensAPI(options) {
    return DiscoveryLensAPIFactory.getInstance().getDiscoveryLensAPI(options);
}
//# sourceMappingURL=DiscoveryLensAPIFactory.js.map