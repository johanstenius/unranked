// Single source of truth - re-export everything from shared
export * from "@docrank/shared";

// ============================================================================
// Frontend-specific types (API responses, discovery events)
// ============================================================================

import type {
	AuditProgress,
	AuditStatus,
	AuditTier,
	CompetitorGap,
	ComponentState,
	CurrentRanking,
	DiscoveredCompetitor,
	HealthScore,
	InternalLinkingIssues,
	Opportunity,
	OpportunityCluster,
	PrioritizedAction,
	QuickWin,
	SearchIntent,
	SnippetOpportunity,
	TechnicalIssue,
} from "@docrank/shared";

export type SectionInfo = {
	path: string;
	pageCount: number;
	contentScore: number;
};

export type Audit = {
	accessToken: string;
	status: AuditStatus;
	siteUrl: string;
	productDesc: string | null;
	competitors: string[];
	sections: string[] | null;
	detectedSections: SectionInfo[] | null;
	tier: AuditTier;
	pagesFound: number | null;
	sitemapUrlCount: number | null;
	currentRankings: CurrentRanking[] | null;
	progress: AuditProgress | null;
	retryAfter: string | null;
	createdAt: string;
	startedAt: string | null;
	completedAt: string | null;
};

export type DiscoverEventSitemap = { type: "sitemap"; totalUrls: number };
export type DiscoverEventSections = {
	type: "sections";
	sections: Array<{ path: string; pageCount: number }>;
};
export type DiscoverEventScored = { type: "scored"; section: SectionInfo };
export type DiscoverEventDone = { type: "done" };
export type DiscoverEvent =
	| DiscoverEventSitemap
	| DiscoverEventSections
	| DiscoverEventScored
	| DiscoverEventDone;

export type Brief = {
	id: string;
	keyword: string;
	searchVolume: number;
	difficulty: number;
	title: string;
	structure: Record<string, unknown>;
	questions: string[];
	relatedKw: string[];
	competitors: unknown[] | null;
	suggestedInternalLinks: string[];
	clusteredKeywords: string[];
	totalClusterVolume: number;
	estimatedEffort: string | null;
	intent: SearchIntent | null;
	contentTemplate: string | null;
	createdAt: string;
};

export type SectionStats = {
	section: string;
	pagesCount: number;
	rankingKeywords: number;
	estimatedTraffic: number;
	technicalIssues: number;
};

export type Analysis = {
	isNewSite?: boolean;
	currentRankings: CurrentRanking[];
	opportunities: Opportunity[];
	opportunityClusters: OpportunityCluster[];
	quickWins: QuickWin[];
	technicalIssues: TechnicalIssue[];
	internalLinkingIssues: InternalLinkingIssues;
	competitorGaps: CompetitorGap[];
	snippetOpportunities: SnippetOpportunity[];
	sectionStats: SectionStats[];
	healthScore: HealthScore | null;
	discoveredCompetitors: DiscoveredCompetitor[];
	actionPlan?: PrioritizedAction[];
};

export type CreateAuditInput = {
	siteUrl: string;
	productDesc?: string;
	competitors?: string[];
	sections?: string[];
	tier: AuditTier;
	email: string;
};

export type CheckoutResponse = {
	checkoutUrl: string | null;
	accessToken: string;
};

export type DiscoverResponse = {
	sections: SectionInfo[];
	totalUrls: number;
};

export type ComponentKey = keyof Omit<
	AuditProgress,
	"lastRetryAt" | "retryCount"
>;

export type RedirectChain = {
	chain: string[];
	finalUrl: string;
};

export function isComponentCompleted<T>(
	component: ComponentState<T>,
): component is { status: "completed"; data: T } {
	return component.status === "completed";
}

export function getComponentData<T>(
	component: ComponentState<T>,
): T | undefined {
	return component.status === "completed" ? component.data : undefined;
}
