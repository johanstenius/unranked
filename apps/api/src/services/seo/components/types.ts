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
	CannibalizationIssue,
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
	| "technicalIssues"
	| "internalLinking"
	| "duplicateContent"
	| "coreWebVitals"
	| "currentRankings"
	| "keywordOpportunities"
	| "competitorAnalysis"
	| "cannibalization"
	| "intentClassification"
	| "keywordClustering"
	| "quickWins"
	| "snippetOpportunities"
	| "briefs"
	| "actionPlan";

/**
 * Component dependency graph.
 * Key = component, Value = components that must complete first.
 */
export const COMPONENT_DEPENDENCIES: Record<ComponentKey, ComponentKey[]> = {
	// Local - no deps on other components
	technicalIssues: [],
	internalLinking: [],
	duplicateContent: [],

	// External APIs - no deps on other components
	coreWebVitals: [],
	currentRankings: [],
	keywordOpportunities: ["currentRankings"],
	competitorAnalysis: ["currentRankings"],
	cannibalization: ["currentRankings"],
	snippetOpportunities: ["currentRankings", "competitorAnalysis"],

	// AI - depends on DataForSEO
	intentClassification: ["keywordOpportunities", "competitorAnalysis"],
	keywordClustering: ["intentClassification"],
	quickWins: ["currentRankings"],
	briefs: ["keywordClustering"],

	// Aggregation - runs after all data is collected
	actionPlan: [
		"technicalIssues",
		"internalLinking",
		"quickWins",
		"keywordOpportunities",
		"cannibalization",
		"snippetOpportunities",
	],
};

/**
 * Components that require external APIs (retryable on failure)
 */
export const EXTERNAL_COMPONENTS: readonly ComponentKey[] = [
	"coreWebVitals",
	"currentRankings",
	"keywordOpportunities",
	"competitorAnalysis",
	"snippetOpportunities",
	"intentClassification",
	"keywordClustering",
	"quickWins",
	"briefs",
] as const;

/**
 * Components that are local-only (always succeed)
 */
export const LOCAL_COMPONENTS: readonly ComponentKey[] = [
	"technicalIssues",
	"internalLinking",
	"duplicateContent",
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
};

export type TierConfig = {
	tier: "FREE" | "SCAN" | "AUDIT" | "DEEP_DIVE";
	maxCompetitors: number;
	maxSeeds: number;
	maxBriefs: number;
	maxSnippets: number;
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
	productDesc: string | null;
	tier: TierConfig;
	usage: ApiUsage;
};

// ============================================================================
// Core Web Vitals Types
// ============================================================================

export type CWVPageResult = {
	url: string;
	lcp: number | null; // Largest Contentful Paint (ms)
	cls: number | null; // Cumulative Layout Shift (score)
	inp: number | null; // Interaction to Next Paint (ms)
	performance: number | null; // Overall performance score (0-100)
	status: "success" | "failed";
	error?: string;
};

export type CoreWebVitalsData = {
	pages: CWVPageResult[];
	summary: {
		good: number;
		needsImprovement: number;
		poor: number;
		avgPerformance: number | null;
	};
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

	// Core Web Vitals (PageSpeed Insights)
	coreWebVitals?: CoreWebVitalsData;

	// DataForSEO
	currentRankings?: CurrentRanking[];
	opportunities?: Opportunity[];
	competitorGaps?: CompetitorGap[];
	discoveredCompetitors?: DiscoveredCompetitor[];
	cannibalizationIssues?: CannibalizationIssue[];
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
	| "coreWebVitals"
	| "rankings"
	| "opportunities"
	| "quickWins"
	| "competitors"
	| "cannibalization"
	| "snippets"
	| "briefs";

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
