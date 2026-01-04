// Audit types
export type AuditTier = "FREE" | "SCAN" | "AUDIT" | "DEEP_DIVE";

export type AuditStatus =
	| "PENDING"
	| "CRAWLING"
	| "ANALYZING"
	| "GENERATING_BRIEFS"
	| "RETRYING"
	| "COMPLETED"
	| "FAILED";

// Component-level status for audit progress tracking
export type ComponentStatus =
	| "pending"
	| "running"
	| "completed"
	| "retrying"
	| "failed";

// Component-level progress tracking
export type AuditProgress = {
	crawl: ComponentStatus;
	technicalIssues: ComponentStatus;
	internalLinking: ComponentStatus;
	duplicateContent: ComponentStatus;
	redirectChains: ComponentStatus;
	currentRankings: ComponentStatus;
	competitorAnalysis: ComponentStatus;
	keywordOpportunities: ComponentStatus;
	intentClassification: ComponentStatus;
	keywordClustering: ComponentStatus;
	quickWins: ComponentStatus;
	briefs: ComponentStatus;
	lastRetryAt?: string;
	retryCount: number;
};

export type SectionInfo = {
	path: string;
	pageCount: number;
	contentScore: number;
};

export type CurrentRanking = {
	url: string;
	keyword: string;
	position: number;
	searchVolume: number;
	estimatedTraffic: number;
};

export type Audit = {
	id: string;
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
	completedAt: string | null;
};

// SSE Discovery Events
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

// Brief types
export type SearchIntent =
	| "informational"
	| "transactional"
	| "navigational"
	| "commercial";

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

// Analysis types
export type OpportunitySource =
	| "competitor_gap"
	| "seed_expansion"
	| "content_extraction";

export type Opportunity = {
	keyword: string;
	searchVolume: number;
	difficulty: number;
	impactScore: number;
	reason: string;
	competitorUrl?: string;
	intent?: SearchIntent;
	isQuickWin?: boolean;
	estimatedTraffic?: number;
	competitorPosition?: number;
	cluster?: string;
	source?: OpportunitySource;
};

export type QuickWinAiSuggestions = {
	contentGaps: string[];
	questionsToAnswer: string[];
	internalLinksToAdd: Array<{
		fromPage: string;
		suggestedAnchor: string;
	}>;
	estimatedNewPosition: number;
};

export type QuickWin = {
	url: string;
	keyword: string;
	currentPosition: number;
	suggestions: string[];
	aiSuggestions?: QuickWinAiSuggestions;
};

export type TechnicalIssue = {
	url: string;
	issue: string;
	severity: "low" | "medium" | "high";
};

export type InternalLinkingIssues = {
	orphanPages: string[];
	underlinkedPages: Array<{
		url: string;
		incomingLinks: number;
	}>;
};

export type CompetitorGapKeyword = {
	keyword: string;
	searchVolume: number;
	difficulty: number;
	competitorPosition: number;
	competitorUrl: string;
};

export type CompetitorGap = {
	competitor: string;
	totalKeywords: number;
	gapKeywords: CompetitorGapKeyword[];
	commonKeywords: Array<{
		keyword: string;
		yourPosition: number;
		theirPosition: number;
	}>;
};

export type CannibalizationIssue = {
	keyword: string;
	searchVolume: number;
	pages: Array<{
		url: string;
		position: number | null;
		signals: ("title" | "h1" | "content")[];
	}>;
	severity: "high" | "medium";
};

export type SnippetOpportunity = {
	keyword: string;
	searchVolume: number;
	snippetType: "paragraph" | "list" | "table" | "video";
	currentHolder: string;
	yourPosition: number | null;
	difficulty: "easy" | "medium" | "hard";
	snippetTitle: string;
	snippetContent: string;
};

export type SectionStats = {
	section: string;
	pagesCount: number;
	rankingKeywords: number;
	estimatedTraffic: number;
	technicalIssues: number;
};

export type DiscoveredCompetitor = {
	domain: string;
	intersections: number;
	avgPosition: number;
	etv: number;
};

export type OpportunityCluster = {
	topic: string;
	opportunities: Opportunity[];
	totalVolume: number;
	avgDifficulty: number;
	suggestedAction: "create" | "optimize" | "expand";
	existingPage?: string;
};

export type ActionType =
	| "fix_technical"
	| "add_internal_links"
	| "optimize_existing"
	| "create_content"
	| "fix_cannibalization"
	| "steal_snippet";

export type ActionCategory =
	| "technical"
	| "content"
	| "linking"
	| "optimization";

export type PrioritizedAction = {
	id: string;
	priority: number;
	type: ActionType;
	title: string;
	description: string;
	url?: string;
	keyword?: string;
	estimatedImpact: {
		trafficGain?: number;
		searchVolume?: number;
	};
	effort: "low" | "medium" | "high";
	category: ActionCategory;
};

// Health Score types
export type HealthScoreGrade = "excellent" | "good" | "needs_work" | "poor";

export type HealthScoreComponent = {
	score: number;
	max: number;
	detail: string;
};

export type HealthScoreBreakdown = {
	opportunityDiscovery: HealthScoreComponent & { max: 30 };
	rankingCoverage: HealthScoreComponent & { max: 20 };
	positionQuality: HealthScoreComponent & { max: 15 };
	technicalHealth: HealthScoreComponent & { max: 15 };
	internalLinking: HealthScoreComponent & { max: 10 };
	contentOpportunity: HealthScoreComponent & { max: 10 };
};

export type HealthScore = {
	score: number;
	grade: HealthScoreGrade;
	breakdown: HealthScoreBreakdown;
};

export type Analysis = {
	currentRankings: CurrentRanking[];
	opportunities: Opportunity[];
	opportunityClusters: OpportunityCluster[];
	quickWins: QuickWin[];
	technicalIssues: TechnicalIssue[];
	internalLinkingIssues: InternalLinkingIssues;
	competitorGaps: CompetitorGap[];
	cannibalizationIssues: CannibalizationIssue[];
	snippetOpportunities: SnippetOpportunity[];
	sectionStats: SectionStats[];
	healthScore: HealthScore | null;
	discoveredCompetitors: DiscoveredCompetitor[];
	actionPlan?: PrioritizedAction[];
};

// API input/output types
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
	auditId: string;
};

export type DiscoverResponse = {
	sections: SectionInfo[];
	totalUrls: number;
};

export type ReportData = {
	audit: Audit;
	analysis: Analysis | null;
	briefs: Brief[];
	expired: boolean;
};
