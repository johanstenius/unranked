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
 * Component keys that can have ComponentStatus values (excludes metadata)
 */
export type ComponentKey =
	| "crawl"
	| "technicalIssues"
	| "internalLinking"
	| "duplicateContent"
	| "redirectChains"
	| "currentRankings"
	| "competitorAnalysis"
	| "keywordOpportunities"
	| "intentClassification"
	| "keywordClustering"
	| "quickWins"
	| "briefs";

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
export const DATAFORSEO_COMPONENTS: readonly ComponentKey[] = [
	"currentRankings",
	"competitorAnalysis",
	"keywordOpportunities",
] as const;

/**
 * Component keys that depend on Claude/Anthropic API
 */
export const CLAUDE_COMPONENTS: readonly ComponentKey[] = [
	"intentClassification",
	"keywordClustering",
	"quickWins",
	"briefs",
] as const;

/**
 * Component keys that are local (always succeed)
 */
export const LOCAL_COMPONENTS: readonly ComponentKey[] = [
	"technicalIssues",
	"internalLinking",
	"duplicateContent",
	"redirectChains",
] as const;

/**
 * Retryable component keys (those with external dependencies)
 */
export const RETRYABLE_COMPONENTS: readonly ComponentKey[] = [
	"currentRankings",
	"competitorAnalysis",
	"keywordOpportunities",
	"intentClassification",
	"keywordClustering",
	"quickWins",
	"briefs",
] as const;

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
	const components: ComponentKey[] = [
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
	return RETRYABLE_COMPONENTS.some((key) => progress[key] === "retrying");
}

/**
 * Get list of components that are in retrying state
 */
export function getRetryingComponents(progress: AuditProgress): ComponentKey[] {
	return RETRYABLE_COMPONENTS.filter((key) => progress[key] === "retrying");
}

/**
 * Check if local (non-API) components are all completed
 */
export function localComponentsCompleted(progress: AuditProgress): boolean {
	return LOCAL_COMPONENTS.every((key) => progress[key] === "completed");
}

/**
 * Update a component's status immutably
 */
export function setComponentStatus(
	progress: AuditProgress,
	component: ComponentKey,
	status: ComponentStatus,
): AuditProgress {
	return { ...progress, [component]: status };
}

/**
 * Update multiple components at once immutably
 */
export function setComponentStatuses(
	progress: AuditProgress,
	updates: Partial<Record<ComponentKey, ComponentStatus>>,
): AuditProgress {
	return { ...progress, ...updates };
}

/**
 * Increment retry count and set timestamp
 */
export function incrementRetry(progress: AuditProgress): AuditProgress {
	return {
		...progress,
		retryCount: progress.retryCount + 1,
		lastRetryAt: new Date().toISOString(),
	};
}
