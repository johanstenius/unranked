/**
 * Component-level status for audit progress tracking.
 * Each section of the audit report can be independently tracked.
 */
export type ComponentStatus = "pending" | "running" | "completed" | "failed";

/**
 * Per-component progress with timestamps for stale detection.
 * If status="running" and startedAt > 10 min ago, treat as failed.
 */
export type ComponentProgress = {
	status: ComponentStatus;
	startedAt?: string; // ISO date - when we started running
	completedAt?: string; // ISO date - when we finished
	error?: string; // Last error message for debugging
};

/**
 * Component keys that can have ComponentProgress values (excludes metadata)
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
	crawl: ComponentProgress;

	// Local components (always succeed - no external deps)
	technicalIssues: ComponentProgress;
	internalLinking: ComponentProgress;
	duplicateContent: ComponentProgress;
	redirectChains: ComponentProgress;

	// DataForSEO dependent components
	currentRankings: ComponentProgress;
	competitorAnalysis: ComponentProgress;
	keywordOpportunities: ComponentProgress;

	// Claude dependent components
	intentClassification: ComponentProgress;
	keywordClustering: ComponentProgress;
	quickWins: ComponentProgress;
	briefs: ComponentProgress;

	// Retry metadata
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
 * All component keys
 */
export const ALL_COMPONENTS: readonly ComponentKey[] = [
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
] as const;

/**
 * Stale threshold - if a component is "running" for longer than this, treat as failed.
 * Catches scenarios where the process died unexpectedly (server crash, OOM, deploy).
 * Normal errors are caught and marked failed properly - this is just for crashes.
 */
export const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Create a pending component progress
 */
function pendingProgress(): ComponentProgress {
	return { status: "pending" };
}

/**
 * Create initial progress state for a new audit
 */
export function createInitialProgress(): AuditProgress {
	return {
		crawl: pendingProgress(),
		technicalIssues: pendingProgress(),
		internalLinking: pendingProgress(),
		duplicateContent: pendingProgress(),
		redirectChains: pendingProgress(),
		currentRankings: pendingProgress(),
		competitorAnalysis: pendingProgress(),
		keywordOpportunities: pendingProgress(),
		intentClassification: pendingProgress(),
		keywordClustering: pendingProgress(),
		quickWins: pendingProgress(),
		briefs: pendingProgress(),
		retryCount: 0,
	};
}

/**
 * Check if all components are completed
 */
export function isFullyCompleted(progress: AuditProgress): boolean {
	return ALL_COMPONENTS.every((key) => progress[key].status === "completed");
}

/**
 * Check if component is stale (running too long, likely crashed)
 */
export function isComponentStale(component: ComponentProgress): boolean {
	if (component.status !== "running" || !component.startedAt) {
		return false;
	}
	const startedAt = new Date(component.startedAt).getTime();
	return Date.now() - startedAt > STALE_THRESHOLD_MS;
}

/**
 * Check if any components need to be run (pending, failed, or stale)
 */
export function hasComponentsToRun(progress: AuditProgress): boolean {
	return RETRYABLE_COMPONENTS.some((key) => {
		const comp = progress[key];
		return (
			comp.status === "pending" ||
			comp.status === "failed" ||
			isComponentStale(comp)
		);
	});
}

/**
 * Get list of components that need to be run (pending, failed, or stale)
 */
export function getComponentsToRun(progress: AuditProgress): ComponentKey[] {
	return RETRYABLE_COMPONENTS.filter((key) => {
		const comp = progress[key];
		return (
			comp.status === "pending" ||
			comp.status === "failed" ||
			isComponentStale(comp)
		);
	});
}

/**
 * Check if local (non-API) components are all completed
 */
export function localComponentsCompleted(progress: AuditProgress): boolean {
	return LOCAL_COMPONENTS.every((key) => progress[key].status === "completed");
}

/**
 * Mark component as starting (running with startedAt timestamp)
 */
export function markComponentRunning(
	progress: AuditProgress,
	component: ComponentKey,
): AuditProgress {
	return {
		...progress,
		[component]: {
			status: "running" as const,
			startedAt: new Date().toISOString(),
		},
	};
}

/**
 * Mark component as completed
 */
export function markComponentCompleted(
	progress: AuditProgress,
	component: ComponentKey,
): AuditProgress {
	return {
		...progress,
		[component]: {
			status: "completed" as const,
			startedAt: progress[component].startedAt,
			completedAt: new Date().toISOString(),
		},
	};
}

/**
 * Mark component as failed with error message
 */
export function markComponentFailed(
	progress: AuditProgress,
	component: ComponentKey,
	error: string,
): AuditProgress {
	return {
		...progress,
		[component]: {
			status: "failed" as const,
			startedAt: progress[component].startedAt,
			completedAt: new Date().toISOString(),
			error,
		},
	};
}

/**
 * Increment retry count
 */
export function incrementRetry(progress: AuditProgress): AuditProgress {
	return {
		...progress,
		retryCount: progress.retryCount + 1,
	};
}

// Legacy helpers for backward compatibility during migration
export function setComponentStatus(
	progress: AuditProgress,
	component: ComponentKey,
	status: ComponentStatus,
): AuditProgress {
	return {
		...progress,
		[component]: { ...progress[component], status },
	};
}

export function getRetryingComponents(progress: AuditProgress): ComponentKey[] {
	return getComponentsToRun(progress);
}

export function hasRetryingComponents(progress: AuditProgress): boolean {
	return hasComponentsToRun(progress);
}
