/**
 * Component-level status for audit progress tracking.
 * Each section of the audit report can be independently tracked.
 */
export type ComponentStatus =
	| "pending"
	| "running"
	| "completed"
	| "retrying"
	| "failed";

/**
 * Tracks the status of each component/section in an audit.
 * This enables partial completion and graceful degradation when
 * external services (DataForSEO, Claude) fail.
 */
export type AuditProgress = {
	// Phase tracking
	crawl: ComponentStatus;

	// Local components (always succeed - no external deps)
	technicalIssues: ComponentStatus;
	internalLinking: ComponentStatus;
	duplicateContent: ComponentStatus;
	redirectChains: ComponentStatus;

	// DataForSEO dependent components
	currentRankings: ComponentStatus;
	competitorAnalysis: ComponentStatus;
	keywordOpportunities: ComponentStatus;

	// Claude dependent components
	intentClassification: ComponentStatus;
	keywordClustering: ComponentStatus;
	quickWins: ComponentStatus;
	briefs: ComponentStatus;

	// Retry metadata
	lastRetryAt?: string; // ISO date string
	retryCount: number;
};

/**
 * Component keys that depend on DataForSEO API
 */
export const DATAFORSEO_COMPONENTS: (keyof AuditProgress)[] = [
	"currentRankings",
	"competitorAnalysis",
	"keywordOpportunities",
];

/**
 * Component keys that depend on Claude/Anthropic API
 */
export const CLAUDE_COMPONENTS: (keyof AuditProgress)[] = [
	"intentClassification",
	"keywordClustering",
	"quickWins",
	"briefs",
];

/**
 * Component keys that are local (always succeed)
 */
export const LOCAL_COMPONENTS: (keyof AuditProgress)[] = [
	"technicalIssues",
	"internalLinking",
	"duplicateContent",
	"redirectChains",
];

/**
 * Create initial progress state for a new audit
 */
export function createInitialProgress(): AuditProgress {
	return {
		crawl: "pending",
		technicalIssues: "pending",
		internalLinking: "pending",
		duplicateContent: "pending",
		redirectChains: "pending",
		currentRankings: "pending",
		competitorAnalysis: "pending",
		keywordOpportunities: "pending",
		intentClassification: "pending",
		keywordClustering: "pending",
		quickWins: "pending",
		briefs: "pending",
		retryCount: 0,
	};
}

/**
 * Check if all components are completed
 */
export function isFullyCompleted(progress: AuditProgress): boolean {
	const components: (keyof AuditProgress)[] = [
		"crawl",
		"technicalIssues",
		"internalLinking",
		"duplicateContent",
		"redirectChains",
		"currentRankings",
		"competitorAnalysis",
		"keywordOpportunities",
		"intentClassification",
		"keywordClustering",
		"quickWins",
		"briefs",
	];

	return components.every((key) => progress[key] === "completed");
}

/**
 * Check if any components are in retrying state
 */
export function hasRetryingComponents(progress: AuditProgress): boolean {
	const components: (keyof AuditProgress)[] = [
		"currentRankings",
		"competitorAnalysis",
		"keywordOpportunities",
		"intentClassification",
		"keywordClustering",
		"quickWins",
		"briefs",
	];

	return components.some((key) => progress[key] === "retrying");
}

/**
 * Get list of components that are in retrying state
 */
export function getRetryingComponents(
	progress: AuditProgress,
): (keyof AuditProgress)[] {
	const components: (keyof AuditProgress)[] = [
		"currentRankings",
		"competitorAnalysis",
		"keywordOpportunities",
		"intentClassification",
		"keywordClustering",
		"quickWins",
		"briefs",
	];

	return components.filter((key) => progress[key] === "retrying");
}

/**
 * Check if local (non-API) components are all completed
 */
export function localComponentsCompleted(progress: AuditProgress): boolean {
	return LOCAL_COMPONENTS.every((key) => progress[key] === "completed");
}
