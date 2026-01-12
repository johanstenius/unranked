/**
 * Unified Audit State
 *
 * Two state types:
 * 1. PipelineState - Backend storage, used by pipeline runner + retry
 * 2. AuditState - Frontend state, used by SSE + REST API
 *
 * PipelineState is stored in DB and passed between pipeline runs.
 * AuditState is derived from PipelineState for frontend consumption.
 */

import type { AuditStatus, AuditTier } from "@prisma/client";
import type { BriefStructure, SearchIntent } from "../services/ai/anthropic.js";
import type {
	CompetitorGap,
	CurrentRanking,
	Opportunity,
	OpportunityCluster,
	PrioritizedAction,
	QuickWin,
	SnippetOpportunity,
	TechnicalIssue,
} from "../services/seo/analysis.js";
import type {
	AIReadinessData,
	ComponentKey,
	ComponentResults,
} from "../services/seo/components/types.js";
import type { DiscoveredCompetitor } from "../services/seo/dataforseo.js";
import type { HealthScore } from "../services/seo/health-score.js";
import type { InternalLinkingIssues } from "../services/seo/internal-linking.js";
import { type ApiUsage, createEmptyUsage } from "./api-usage.js";

// ============================================================================
// Pipeline State (Backend - stored in DB)
// ============================================================================

export type ComponentStatus = "pending" | "running" | "completed" | "failed";

// ============================================================================
// Interactive Flow State (for parallel fast-track)
// ============================================================================

/**
 * Interactive phase - tracks user decision points in fast-track flow
 * Only applies to paid tiers (SCAN, AUDIT, DEEP_DIVE)
 */
export type InteractivePhase =
	| "discovery" // Finding competitors (AI suggestion running)
	| "competitor_selection" // Waiting for user to select competitors
	| "keyword_analysis" // Fetching keywords, clustering
	| "cluster_selection" // Waiting for user to select clusters
	| "generating" // Final generation (merge point reached)
	| "complete"; // Interactive flow complete

/**
 * Suggested competitor from AI
 */
export type CompetitorSuggestion = {
	domain: string;
	reason: string;
	confidence: number; // 0-1
};

/**
 * Suggested cluster for brief generation
 */
export type ClusterSuggestion = {
	id: string;
	name: string;
	keywords: Array<{ keyword: string; volume: number }>;
	totalVolume: number;
};

export type ComponentProgress = {
	status: ComponentStatus;
	startedAt?: string; // ISO string for JSON storage
	completedAt?: string;
	error?: string;
};

/**
 * Pipeline state - stored in DB, passed between pipeline runs.
 * Single source of truth for audit execution state.
 */
export type PipelineState = {
	/** Progress for each component */
	progress: Partial<Record<ComponentKey, ComponentProgress>>;

	/** Results from completed components */
	results: ComponentResults;

	/** API usage tracking */
	usage: ApiUsage;

	/** True if site has no existing Google rankings */
	isNewSite?: boolean;

	/** Retry metadata */
	retryCount?: number;

	// Interactive flow state (for parallel fast-track)
	/** Current interactive phase - only for paid tiers */
	interactivePhase?: InteractivePhase;

	/** AI-suggested competitors */
	suggestedCompetitors?: CompetitorSuggestion[];

	/** User-selected competitor domains */
	selectedCompetitors?: string[];

	/** AI-suggested clusters for briefs */
	suggestedClusters?: ClusterSuggestion[];

	/** User-selected cluster IDs */
	selectedClusterIds?: string[];

	/** True when crawl job completes */
	crawlComplete?: boolean;

	/** True when interactive fast-track completes */
	interactiveComplete?: boolean;
};

// Pipeline State Helpers

export function createEmptyPipelineState(): PipelineState {
	return {
		progress: {},
		results: {},
		usage: createEmptyUsage(),
		retryCount: 0,
	};
}

export function isPipelineComponentCompleted(
	state: PipelineState,
	key: ComponentKey,
): boolean {
	return state.progress[key]?.status === "completed";
}

export function getPipelineComponentsToRun(
	state: PipelineState,
	allComponents: ComponentKey[],
): ComponentKey[] {
	return allComponents.filter((key) => {
		const status = state.progress[key]?.status;
		return !status || status === "pending" || status === "failed";
	});
}

export function markPipelineRunning(
	state: PipelineState,
	key: ComponentKey,
): PipelineState {
	return {
		...state,
		progress: {
			...state.progress,
			[key]: {
				status: "running" as const,
				startedAt: new Date().toISOString(),
			},
		},
	};
}

export function markPipelineCompleted(
	state: PipelineState,
	key: ComponentKey,
	results: ComponentResults,
): PipelineState {
	const existing = state.progress[key];
	return {
		...state,
		progress: {
			...state.progress,
			[key]: {
				status: "completed" as const,
				startedAt: existing?.startedAt,
				completedAt: new Date().toISOString(),
			},
		},
		results,
	};
}

export function markPipelineFailed(
	state: PipelineState,
	key: ComponentKey,
	error: string,
): PipelineState {
	const existing = state.progress[key];
	return {
		...state,
		progress: {
			...state.progress,
			[key]: {
				status: "failed" as const,
				startedAt: existing?.startedAt,
				error,
			},
		},
	};
}

export function arePipelineComponentsCompleted(
	state: PipelineState,
	components: ComponentKey[],
): boolean {
	return components.every((key) => state.progress[key]?.status === "completed");
}

export function getPipelineFailedComponents(
	state: PipelineState,
): ComponentKey[] {
	return Object.entries(state.progress)
		.filter(([_, p]) => p?.status === "failed")
		.map(([key]) => key as ComponentKey);
}

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export function getPipelineStaleComponents(
	state: PipelineState,
	thresholdMs = STALE_THRESHOLD_MS,
): ComponentKey[] {
	const now = Date.now();
	return Object.entries(state.progress)
		.filter(([_, p]) => {
			if (p?.status !== "running" || !p.startedAt) return false;
			const elapsed = now - new Date(p.startedAt).getTime();
			return elapsed > thresholdMs;
		})
		.map(([key]) => key as ComponentKey);
}

// ============================================================================
// Frontend State (for SSE + REST API)
// ============================================================================

/**
 * Component state - discriminated union ensures data exists when completed
 */
export type ComponentState<T> =
	| { status: "pending" }
	| { status: "running" }
	| { status: "completed"; data: T }
	| { status: "failed"; error: string };

/**
 * Brief with full structure for API response
 */
export type BriefData = {
	id: string;
	keyword: string;
	searchVolume: number;
	difficulty: number;
	intent: SearchIntent;
	title: string;
	structure: BriefStructure;
	questions: string[];
	relatedKw: string[];
	competitors: Array<{
		domain: string;
		url: string;
		title: string;
	}>;
	suggestedInternalLinks: string[];
};

/**
 * Internal linking data grouped
 */
export type InternalLinkingData = InternalLinkingIssues;

/**
 * Duplicate content data (pages grouped by similarity)
 */
export type DuplicateContentData = Array<{
	pages: string[];
	similarity: number;
}>;

/**
 * Redirect chain data
 */
export type RedirectChainData = Array<{
	chain: string[];
	finalUrl: string;
}>;

/**
 * Competitor analysis data
 */
export type CompetitorData = {
	gaps: CompetitorGap[];
	discovered: DiscoveredCompetitor[];
};

/**
 * Component keys for the unified state
 */
export type StateComponentKey =
	| "crawl"
	| "technical"
	| "internalLinking"
	| "duplicateContent"
	| "redirectChains"
	| "aiReadiness"
	| "rankings"
	| "opportunities"
	| "quickWins"
	| "competitors"
	| "snippets"
	| "briefs";

/**
 * All component states with their respective data types
 */
export type ComponentStates = {
	crawl: ComponentState<null>; // Crawl has no data, just status
	technical: ComponentState<TechnicalIssue[]>;
	internalLinking: ComponentState<InternalLinkingData>;
	duplicateContent: ComponentState<DuplicateContentData>;
	redirectChains: ComponentState<RedirectChainData>;
	aiReadiness: ComponentState<AIReadinessData>;
	rankings: ComponentState<CurrentRanking[]>;
	opportunities: ComponentState<Opportunity[]>;
	quickWins: ComponentState<QuickWin[]>;
	competitors: ComponentState<CompetitorData>;
	snippets: ComponentState<SnippetOpportunity[]>;
	briefs: ComponentState<BriefData[]>;
};

/**
 * Unified audit state - single source of truth
 */
export type AuditState = {
	// Identity
	id: string;
	accessToken: string;
	siteUrl: string;
	tier: AuditTier;

	// Overall status
	status: AuditStatus;
	createdAt: string;
	completedAt?: string;

	// Crawl metadata
	pagesFound?: number;
	sitemapUrlCount?: number;

	// Component states - status and data unified
	components: ComponentStates;

	// Derived data (computed after components complete)
	opportunityClusters?: OpportunityCluster[];
	actionPlan?: PrioritizedAction[];
	healthScore?: HealthScore;

	// Interactive flow state (for paid tiers)
	interactivePhase?: InteractivePhase;
	suggestedCompetitors?: CompetitorSuggestion[];
	selectedCompetitors?: string[];
	suggestedClusters?: ClusterSuggestion[];
	selectedClusterIds?: string[];
	crawlComplete?: boolean;
	interactiveComplete?: boolean;
};

/**
 * SSE Event types - clean, data-carrying events
 */
export type AuditSSEEvent =
	// Overall audit status
	| { type: "audit:status"; status: AuditStatus }

	// Component lifecycle
	| { type: "component:start"; key: StateComponentKey }
	| { type: "component:complete"; key: StateComponentKey; data: unknown }
	| { type: "component:fail"; key: StateComponentKey; error: string }

	// Metadata updates
	| { type: "crawl:pages"; count: number; sitemapCount?: number }
	| { type: "health:score"; score: HealthScore }

	// Derived data (clusters, action plan)
	| { type: "clusters"; data: OpportunityCluster[] }
	| { type: "action-plan"; data: PrioritizedAction[] }

	// Interactive flow events (paid tiers only)
	| {
			type: "interactive:phase";
			phase: InteractivePhase;
	  }
	| {
			type: "interactive:competitor_suggestions";
			suggestions: CompetitorSuggestion[];
			maxSelections: number;
	  }
	| {
			type: "interactive:cluster_suggestions";
			clusters: ClusterSuggestion[];
			maxSelections: number;
	  }
	| { type: "interactive:crawl_complete" }
	| { type: "interactive:waiting_for_crawl" }

	// Terminal events
	| { type: "audit:complete" }
	| { type: "audit:error"; message: string };

/**
 * Create initial component states (all pending)
 */
export function createInitialComponentStates(): ComponentStates {
	return {
		crawl: { status: "pending" },
		technical: { status: "pending" },
		internalLinking: { status: "pending" },
		duplicateContent: { status: "pending" },
		redirectChains: { status: "pending" },
		aiReadiness: { status: "pending" },
		rankings: { status: "pending" },
		opportunities: { status: "pending" },
		quickWins: { status: "pending" },
		competitors: { status: "pending" },
		snippets: { status: "pending" },
		briefs: { status: "pending" },
	};
}

/**
 * Helper to extract data from a completed component (type-safe)
 */
export function getComponentData<T>(
	component: ComponentState<T>,
): T | undefined {
	return component.status === "completed" ? component.data : undefined;
}

/**
 * Check if component is completed
 */
export function isComponentCompleted<T>(
	component: ComponentState<T>,
): component is { status: "completed"; data: T } {
	return component.status === "completed";
}
