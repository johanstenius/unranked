/**
 * Component Architecture Types
 *
 * Each component is independently callable and retryable.
 * Dependencies are declared and resolved by the pipeline.
 */

import type { ApiUsage } from "../../../types/api-usage.js";
import type {
	BrokenLink,
	CrawledPage,
	RedirectChain,
} from "../../crawler/types.js";
import type {
	CompetitorGap,
	CurrentRanking,
	Opportunity,
	OpportunityCluster,
	PrioritizedAction,
	QuickWin,
	SnippetOpportunity,
	TechnicalIssue,
} from "../analysis.js";
import type { DiscoveredCompetitor } from "../dataforseo.js";
import type { InternalLinkingIssues } from "../internal-linking.js";

// ============================================================================
// Component Keys & Dependencies
// ============================================================================

export type ComponentKey =
	| "crawl"
	| "technicalIssues"
	| "internalLinking"
	| "duplicateContent"
	| "currentRankings"
	| "keywordOpportunities"
	| "competitorAnalysis"
	| "snippetOpportunities"
	| "quickWins"
	| "briefs"
	| "actionPlan"
	| "aiReadiness";

/**
 * Component dependency graph.
 * Key = component, Value = components that must complete first.
 */
export const COMPONENT_DEPENDENCIES: Record<ComponentKey, ComponentKey[]> = {
	// Crawl - first component, no deps
	crawl: [],

	// Local - depend on crawl (need pages)
	technicalIssues: ["crawl"],
	internalLinking: ["crawl"],
	duplicateContent: ["crawl"],
	aiReadiness: ["crawl"],

	// External APIs - depend on crawl (need pages/hostname)
	currentRankings: ["crawl"],
	keywordOpportunities: ["currentRankings"],
	competitorAnalysis: ["currentRankings"],
	snippetOpportunities: ["currentRankings", "competitorAnalysis"],

	// AI - depends on DataForSEO
	quickWins: ["currentRankings"],
	briefs: ["keywordOpportunities", "competitorAnalysis"],

	// Aggregation - runs after all data is collected
	actionPlan: [
		"technicalIssues",
		"internalLinking",
		"quickWins",
		"keywordOpportunities",
		"snippetOpportunities",
	],
};

/**
 * Components that require external APIs or network (retryable on failure)
 */
export const EXTERNAL_COMPONENTS: readonly ComponentKey[] = [
	"crawl", // Network requests to crawl site
	"currentRankings",
	"keywordOpportunities",
	"competitorAnalysis",
	"snippetOpportunities",
	"quickWins",
	"briefs",
] as const;

/**
 * Components that are local-only (always succeed, no network)
 */
export const LOCAL_COMPONENTS: readonly ComponentKey[] = [
	"technicalIssues",
	"internalLinking",
	"duplicateContent",
	"aiReadiness",
	"actionPlan",
] as const;

/**
 * All component keys in execution order
 */
export const ALL_COMPONENTS: readonly ComponentKey[] = [
	"crawl",
	"technicalIssues",
	"internalLinking",
	"duplicateContent",
	"aiReadiness",
	"currentRankings",
	"keywordOpportunities",
	"competitorAnalysis",
	"snippetOpportunities",
	"quickWins",
	"briefs",
	"actionPlan",
] as const;

// ============================================================================
// Component Context (input to components)
// ============================================================================

export type CrawlMetadata = {
	hasRobotsTxt: boolean;
	hasSitemap: boolean;
	redirectChains: RedirectChain[];
	brokenLinks: BrokenLink[];
	robotsTxtContent: string | null;
	hasLlmsTxt: boolean;
};

export type TierConfig = {
	tier: "FREE" | "SCAN" | "AUDIT" | "DEEP_DIVE";
	maxCompetitors: number;
	maxSeeds: number;
	maxBriefs: number;
	maxSnippets: number;
};

/**
 * Pre-fetched ranking data from pre-flight check.
 * Reused by rankings component to avoid duplicate API calls.
 */
export type PrefetchedRanking = {
	url: string;
	keyword: string;
	position: number;
	searchVolume: number;
	estimatedTraffic: number;
};

/**
 * Immutable context passed to all components
 */
export type ComponentContext = {
	auditId: string;
	siteUrl: string;
	hostname: string;
	pages: CrawledPage[];
	crawlMetadata: CrawlMetadata;
	competitors: string[];
	targetKeywords: string[];
	productDesc: string | null;
	tier: TierConfig;
	usage: ApiUsage;
	/** Pre-fetched rankings from pre-flight check (paid tiers only) */
	prefetchedRankings: PrefetchedRanking[] | null;
};

// ============================================================================
// AI Readiness Types
// ============================================================================

export type AIBotStatus = {
	bot: string;
	provider: string;
	purpose: "training" | "search" | "live" | "indexing";
	status: "allowed" | "blocked" | "not_specified";
	rule?: string;
};

export type RobotsTxtAnalysis = {
	exists: boolean;
	aiBots: AIBotStatus[];
	summary: {
		allowed: number;
		blocked: number;
		unspecified: number;
	};
};

export type LlmsTxtInfo = {
	exists: boolean;
	url: string | null;
};

export type ContentStructureAnalysis = {
	headingHierarchy: {
		score: number; // 0-100
		pagesWithProperH1: number;
		pagesWithMultipleH1: number;
		pagesWithNoH1: number;
		avgHeadingsPerPage: number;
	};
	structuredData: {
		pagesWithSchema: number;
		schemaTypes: string[];
		hasFAQSchema: boolean;
		hasArticleSchema: boolean;
		hasProductSchema: boolean;
	};
	contentQuality: {
		avgWordCount: number;
		avgReadabilityScore: number | null;
		pagesWithThinContent: number; // < 300 words
	};
};

export type AIReadinessData = {
	robotsTxtAnalysis: RobotsTxtAnalysis;
	llmsTxt: LlmsTxtInfo;
	contentStructure: ContentStructureAnalysis;
	score: number;
};

// ============================================================================
// Component Results (accumulated state)
// ============================================================================

/**
 * Results accumulated across component runs.
 * Components read from here and write to here.
 */
export type ComponentResults = {
	// Site status
	isNewSite?: boolean; // true if site has no rankings (derived from currentRankings)

	// Local
	technicalIssues?: TechnicalIssue[];
	internalLinkingIssues?: InternalLinkingIssues;
	duplicateGroups?: Array<{ urls: string[]; type: "exact" | "near" }>;
	aiReadiness?: AIReadinessData;

	// DataForSEO
	currentRankings?: CurrentRanking[];
	opportunities?: Opportunity[];
	competitorGaps?: CompetitorGap[];
	discoveredCompetitors?: DiscoveredCompetitor[];
	snippetOpportunities?: SnippetOpportunity[];

	// AI
	opportunityClusters?: OpportunityCluster[];
	quickWins?: QuickWin[];

	// Aggregation
	actionPlan?: PrioritizedAction[];
};

// ============================================================================
// Component Function Signature
// ============================================================================

export type ComponentResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: string };

/**
 * Every component implements this interface
 */
export type ComponentFn<T> = (
	ctx: ComponentContext,
	results: ComponentResults,
) => Promise<ComponentResult<T>>;

/**
 * SSE component keys - used for frontend state
 * These are the canonical keys used in SSE events.
 */
export type SSEComponentKey =
	| "crawl"
	| "technical"
	| "internalLinking"
	| "duplicateContent"
	| "redirectChains"
	| "rankings"
	| "opportunities"
	| "quickWins"
	| "competitors"
	| "snippets"
	| "briefs"
	| "aiReadiness";

/**
 * Component registry entry (uses unknown for registry compatibility)
 */
export type ComponentEntry<T = unknown> = {
	key: ComponentKey;
	dependencies: ComponentKey[];
	run: (
		ctx: ComponentContext,
		results: ComponentResults,
	) => Promise<ComponentResult<T>>;
	/** Store result in ComponentResults */
	store: (results: ComponentResults, data: T) => ComponentResults;
	/** SSE key for this component (null = don't emit) */
	sseKey: SSEComponentKey | null;
	/** Extract SSE data from results after storing */
	getSSEData: (results: ComponentResults) => unknown;
};

/**
 * Simple registry type - uses unknown to allow mixed component types
 */
export type ComponentRegistry = Record<ComponentKey, ComponentEntry<unknown>>;
