export class ScoringEngine {
    constructor(config?: {});
    config: any;
    compiledScorers: ({
        type: string;
        fn: any;
        name?: undefined;
    } | {
        type: string;
        name: any;
        fn: any;
    })[];
    /**
     * Compile scoring functions for better performance
     */
    compileScorers(): ({
        type: string;
        fn: any;
        name?: undefined;
    } | {
        type: string;
        name: any;
        fn: any;
    })[];
    /**
     * Calculate total score for a candidate
     */
    calculateScore(candidate: any, signature: any, content?: null): number;
    /**
     * Score based on file path
     */
    scorePath(filePath: any): number;
    /**
     * Score based on file extension
     */
    scoreExtension(filePath: any): any;
    /**
     * Score based on file name match
     */
    scoreFileName(fileName: any, signature: any): any;
    /**
     * Score based on type hints in content
     */
    scoreTypeHints(content: any, signature: any): any;
    /**
     * Score based on method mentions in content
     */
    scoreMethodMentions(content: any, methods: any): number;
    /**
     * Score based on export hints
     */
    scoreExportHints(content: any, signature: any): any;
    /**
     * Score based on name mentions
     */
    scoreNameMentions(content: any, signature: any): number;
    /**
     * Apply custom scoring functions
     */
    scoreCustom(candidate: any, signature: any, content: any): number;
    /**
     * Score target name match (after module is loaded)
     */
    scoreTargetName(targetName: any, signature: any): any;
    /**
     * Score method validation (after module is loaded)
     */
    scoreMethodValidation(target: any, methods: any): any;
    /**
     * Escape special regex characters
     */
    escapeRegExp(str: any): string;
    /**
     * Update configuration
     */
    updateConfig(config: any): void;
}
