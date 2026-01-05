/**
 * Unified Audit State - Single source of truth for audit data.
 *
 * Design principles:
 * 1. Status + data together - each component's status lives with its data
 * 2. Discriminated unions - TypeScript ensures data exists when status is 'completed'
 * 3. SSE events update this state directly
 * 4. REST returns this state for initial hydration
 */

import type { AuditStatus, AuditTier } from "@prisma/client";
import type { BriefStructure, SearchIntent } from "../services/ai/anthropic.js";
import type {
	CannibalizationIssue,
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
	CWVPageResult,
	CoreWebVitalsData,
} from "../services/seo/components/types.js";
import type { DiscoveredCompetitor } from "../services/seo/dataforseo.js";
import type { HealthScore } from "../services/seo/health-score.js";
import type { InternalLinkingIssues } from "../services/seo/internal-linking.js";

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
	| "coreWebVitals"
	| "rankings"
	| "opportunities"
	| "quickWins"
	| "competitors"
	| "cannibalization"
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
	coreWebVitals: ComponentState<CoreWebVitalsData>;
	rankings: ComponentState<CurrentRanking[]>;
	opportunities: ComponentState<Opportunity[]>;
	quickWins: ComponentState<QuickWin[]>;
	competitors: ComponentState<CompetitorData>;
	cannibalization: ComponentState<CannibalizationIssue[]>;
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

	// Streaming state (CWV pages as they arrive)
	cwvStream: CWVPageResult[];

	// Derived data (computed after components complete)
	opportunityClusters?: OpportunityCluster[];
	actionPlan?: PrioritizedAction[];
	healthScore?: HealthScore;
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

	// CWV streaming (individual pages as they complete)
	| { type: "cwv:page"; page: CWVPageResult }

	// Metadata updates
	| { type: "crawl:pages"; count: number; sitemapCount?: number }
	| { type: "health:score"; score: HealthScore }

	// Derived data (clusters, action plan)
	| { type: "clusters"; data: OpportunityCluster[] }
	| { type: "action-plan"; data: PrioritizedAction[] }

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
		coreWebVitals: { status: "pending" },
		rankings: { status: "pending" },
		opportunities: { status: "pending" },
		quickWins: { status: "pending" },
		competitors: { status: "pending" },
		cannibalization: { status: "pending" },
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
