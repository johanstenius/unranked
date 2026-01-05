import { z } from "@hono/zod-openapi";

export const auditTierSchema = z.enum(["FREE", "SCAN", "AUDIT", "DEEP_DIVE"]);
export type AuditTier = z.infer<typeof auditTierSchema>;

export const auditStatusSchema = z.enum([
	"PENDING",
	"CRAWLING",
	"ANALYZING",
	"GENERATING_BRIEFS",
	"RETRYING",
	"COMPLETED",
	"FAILED",
]);
export type AuditStatus = z.infer<typeof auditStatusSchema>;

export const sectionInfoSchema = z.object({
	path: z.string(),
	pageCount: z.number(),
	contentScore: z.number(),
});
export type SectionInfoResponse = z.infer<typeof sectionInfoSchema>;

export const discoverRequestSchema = z.object({
	siteUrl: z.string().url(),
});
export type DiscoverRequest = z.infer<typeof discoverRequestSchema>;

export const validateUrlRequestSchema = z.object({
	url: z.string().url(),
});
export type ValidateUrlRequest = z.infer<typeof validateUrlRequestSchema>;

export const validateUrlResponseSchema = z.object({
	valid: z.boolean(),
	error: z.string().optional(),
});
export type ValidateUrlResponse = z.infer<typeof validateUrlResponseSchema>;

export const discoverResponseSchema = z.object({
	sections: z.array(sectionInfoSchema),
	totalUrls: z.number(),
});
export type DiscoverResponse = z.infer<typeof discoverResponseSchema>;

// SSE Event schemas
export const discoverEventSitemapSchema = z.object({
	type: z.literal("sitemap"),
	totalUrls: z.number(),
});

export const discoverEventSectionsSchema = z.object({
	type: z.literal("sections"),
	sections: z.array(z.object({ path: z.string(), pageCount: z.number() })),
});

export const discoverEventScoredSchema = z.object({
	type: z.literal("scored"),
	section: sectionInfoSchema,
});

export const discoverEventDoneSchema = z.object({
	type: z.literal("done"),
});

export const discoverEventSchema = z.discriminatedUnion("type", [
	discoverEventSitemapSchema,
	discoverEventSectionsSchema,
	discoverEventScoredSchema,
	discoverEventDoneSchema,
]);
export type DiscoverEventResponse = z.infer<typeof discoverEventSchema>;

export const createAuditSchema = z.object({
	siteUrl: z.string().url(),
	productDesc: z.string().max(500).optional(),
	competitors: z
		.array(z.string().min(1).max(100))
		.max(5)
		.optional()
		.transform((val) => val ?? []),
	sections: z
		.array(z.string())
		.optional()
		.describe(
			"Sections to include (e.g. ['/blog', '/guides']). If empty, all sections.",
		),
	tier: auditTierSchema,
	email: z.string().email(),
});
export type CreateAuditInput = z.infer<typeof createAuditSchema>;

export const currentRankingSchema = z.object({
	url: z.string(),
	keyword: z.string(),
	position: z.number(),
	searchVolume: z.number(),
	estimatedTraffic: z.number(),
});
export type CurrentRankingResponse = z.infer<typeof currentRankingSchema>;

export const componentStatusSchema = z.enum([
	"pending",
	"running",
	"completed",
	"retrying",
	"failed",
]);

export const auditProgressSchema = z.object({
	crawl: componentStatusSchema,
	technicalIssues: componentStatusSchema,
	internalLinking: componentStatusSchema,
	duplicateContent: componentStatusSchema,
	redirectChains: componentStatusSchema,
	coreWebVitals: componentStatusSchema,
	currentRankings: componentStatusSchema,
	competitorAnalysis: componentStatusSchema,
	keywordOpportunities: componentStatusSchema,
	intentClassification: componentStatusSchema,
	keywordClustering: componentStatusSchema,
	quickWins: componentStatusSchema,
	briefs: componentStatusSchema,
	lastRetryAt: z.string().optional(),
	retryCount: z.number(),
});
export type AuditProgressResponse = z.infer<typeof auditProgressSchema>;

export const auditResponseSchema = z.object({
	accessToken: z.string(),
	status: auditStatusSchema,
	siteUrl: z.string(),
	productDesc: z.string().nullable(),
	competitors: z.array(z.string()),
	sections: z.array(z.string()).nullable(),
	detectedSections: z.array(sectionInfoSchema).nullable(),
	tier: auditTierSchema,
	pagesFound: z.number().nullable(),
	sitemapUrlCount: z.number().nullable(),
	currentRankings: z.array(currentRankingSchema).nullable(),
	progress: auditProgressSchema.nullable(),
	createdAt: z.string(),
	completedAt: z.string().nullable(),
});
export type AuditResponse = z.infer<typeof auditResponseSchema>;

export const searchIntentSchema = z.enum([
	"informational",
	"transactional",
	"navigational",
	"commercial",
]);
export type SearchIntentResponse = z.infer<typeof searchIntentSchema>;

export const briefResponseSchema = z.object({
	id: z.string(),
	keyword: z.string(),
	searchVolume: z.number(),
	difficulty: z.number(),
	title: z.string(),
	structure: z.record(z.string(), z.unknown()),
	questions: z.array(z.string()),
	relatedKw: z.array(z.string()),
	competitors: z.union([z.array(z.unknown()), z.null()]),
	suggestedInternalLinks: z.array(z.string()),
	clusteredKeywords: z.array(z.string()),
	totalClusterVolume: z.number(),
	estimatedEffort: z.string().nullable(),
	intent: searchIntentSchema.nullable(),
	contentTemplate: z.string().nullable(),
	createdAt: z.string(),
});
export type BriefResponse = z.infer<typeof briefResponseSchema>;

// Analysis response schemas
export const opportunitySourceSchema = z.enum([
	"competitor_gap",
	"seed_expansion",
	"content_extraction",
]);
export type OpportunitySourceResponse = z.infer<typeof opportunitySourceSchema>;

export const opportunitySchema = z.object({
	keyword: z.string(),
	searchVolume: z.number(),
	difficulty: z.number(),
	impactScore: z.number(),
	reason: z.string(),
	competitorUrl: z.string().optional(),
	intent: searchIntentSchema.optional(),
	isQuickWin: z.boolean().optional(),
	estimatedTraffic: z.number().optional(),
	competitorPosition: z.number().optional(),
	cluster: z.string().optional(),
	source: opportunitySourceSchema.optional(),
});
export type OpportunityResponse = z.infer<typeof opportunitySchema>;

export const quickWinAiSuggestionsSchema = z.object({
	contentGaps: z.array(z.string()),
	questionsToAnswer: z.array(z.string()),
	internalLinksToAdd: z.array(
		z.object({
			fromPage: z.string(),
			suggestedAnchor: z.string(),
		}),
	),
	estimatedNewPosition: z.number(),
});

export const quickWinSchema = z.object({
	url: z.string(),
	keyword: z.string(),
	currentPosition: z.number(),
	suggestions: z.array(z.string()),
	aiSuggestions: quickWinAiSuggestionsSchema.optional(),
});
export type QuickWinResponse = z.infer<typeof quickWinSchema>;

export const technicalIssueSchema = z.object({
	url: z.string(),
	issue: z.string(),
	severity: z.enum(["low", "medium", "high"]),
});
export type TechnicalIssueResponse = z.infer<typeof technicalIssueSchema>;

export const internalLinkingIssuesSchema = z.object({
	orphanPages: z.array(z.string()),
	underlinkedPages: z.array(
		z.object({
			url: z.string(),
			incomingLinks: z.number(),
		}),
	),
});
export type InternalLinkingIssuesResponse = z.infer<
	typeof internalLinkingIssuesSchema
>;

export const competitorGapSchema = z.object({
	competitor: z.string(),
	totalKeywords: z.number(),
	gapKeywords: z.array(
		z.object({
			keyword: z.string(),
			searchVolume: z.number(),
			difficulty: z.number(),
			competitorPosition: z.number(),
			competitorUrl: z.string(),
		}),
	),
	commonKeywords: z.array(
		z.object({
			keyword: z.string(),
			yourPosition: z.number(),
			theirPosition: z.number(),
		}),
	),
});
export type CompetitorGapResponse = z.infer<typeof competitorGapSchema>;

export const cannibalizationIssueSchema = z.object({
	keyword: z.string(),
	searchVolume: z.number(),
	pages: z.array(
		z.object({
			url: z.string(),
			position: z.number().nullable(),
			signals: z.array(z.enum(["title", "h1", "content"])),
		}),
	),
	severity: z.enum(["high", "medium"]),
});
export type CannibalizationIssueResponse = z.infer<
	typeof cannibalizationIssueSchema
>;

export const snippetOpportunitySchema = z.object({
	keyword: z.string(),
	searchVolume: z.number(),
	snippetType: z.enum(["paragraph", "list", "table", "video"]),
	currentHolder: z.string(),
	yourPosition: z.number().nullable(),
	difficulty: z.enum(["easy", "medium", "hard"]),
	snippetTitle: z.string(),
	snippetContent: z.string(),
});
export type SnippetOpportunityResponse = z.infer<
	typeof snippetOpportunitySchema
>;

export const discoveredCompetitorSchema = z.object({
	domain: z.string(),
	intersections: z.number(),
	avgPosition: z.number(),
	etv: z.number(),
});
export type DiscoveredCompetitorResponse = z.infer<
	typeof discoveredCompetitorSchema
>;

export const opportunityClusterSchema = z.object({
	topic: z.string(),
	opportunities: z.array(opportunitySchema),
	totalVolume: z.number(),
	avgDifficulty: z.number(),
	suggestedAction: z.enum(["create", "optimize", "expand"]),
	existingPage: z.string().optional(),
});
export type OpportunityClusterResponse = z.infer<
	typeof opportunityClusterSchema
>;

export const sectionStatsSchema = z.object({
	section: z.string(),
	pagesCount: z.number(),
	rankingKeywords: z.number(),
	estimatedTraffic: z.number(),
	technicalIssues: z.number(),
});
export type SectionStatsResponse = z.infer<typeof sectionStatsSchema>;

export const healthScoreComponentSchema = z.object({
	score: z.number(),
	max: z.number(),
	detail: z.string(),
});

export const healthScoreBreakdownSchema = z.object({
	opportunityDiscovery: healthScoreComponentSchema.extend({
		max: z.literal(30),
	}),
	rankingCoverage: healthScoreComponentSchema.extend({ max: z.literal(20) }),
	positionQuality: healthScoreComponentSchema.extend({ max: z.literal(15) }),
	technicalHealth: healthScoreComponentSchema.extend({ max: z.literal(15) }),
	internalLinking: healthScoreComponentSchema.extend({ max: z.literal(10) }),
	contentOpportunity: healthScoreComponentSchema.extend({ max: z.literal(10) }),
});

export const healthScoreGradeSchema = z.enum([
	"excellent",
	"good",
	"needs_work",
	"poor",
]);

export const healthScoreSchema = z.object({
	score: z.number().min(0).max(100),
	grade: healthScoreGradeSchema,
	breakdown: healthScoreBreakdownSchema,
});
export type HealthScoreResponse = z.infer<typeof healthScoreSchema>;

export const upgradeHintsSchema = z.object({
	totalOpportunities: z.number(),
	displayedOpportunities: z.number(),
	briefsAvailable: z.number(),
	competitorsAvailable: z.number(),
	pdfExportAvailable: z.boolean(),
	tierUpgrades: z.record(
		auditTierSchema,
		z.object({
			keywords: z.union([z.number(), z.literal("all")]),
			briefs: z.number(),
			competitors: z.number(),
			pdfExport: z.boolean(),
		}),
	),
});
export type UpgradeHints = z.infer<typeof upgradeHintsSchema>;

// Core Web Vitals schemas
export const cwvPageResultSchema = z.object({
	url: z.string(),
	lcp: z.number().nullable(),
	cls: z.number().nullable(),
	inp: z.number().nullable(),
	performance: z.number().nullable(),
	status: z.enum(["success", "failed"]),
	error: z.string().optional(),
});
export type CWVPageResultResponse = z.infer<typeof cwvPageResultSchema>;

export const coreWebVitalsSchema = z.object({
	pages: z.array(cwvPageResultSchema),
	summary: z.object({
		good: z.number(),
		needsImprovement: z.number(),
		poor: z.number(),
		avgPerformance: z.number().nullable(),
	}),
});
export type CoreWebVitalsResponse = z.infer<typeof coreWebVitalsSchema>;

export const analysisResponseSchema = z.object({
	currentRankings: z.array(currentRankingSchema),
	opportunities: z.array(opportunitySchema),
	opportunityClusters: z.array(opportunityClusterSchema),
	quickWins: z.array(quickWinSchema),
	technicalIssues: z.array(technicalIssueSchema),
	internalLinkingIssues: internalLinkingIssuesSchema,
	competitorGaps: z.array(competitorGapSchema),
	cannibalizationIssues: z.array(cannibalizationIssueSchema),
	snippetOpportunities: z.array(snippetOpportunitySchema),
	sectionStats: z.array(sectionStatsSchema),
	healthScore: healthScoreSchema.nullable(),
	discoveredCompetitors: z.array(discoveredCompetitorSchema),
	upgradeHints: upgradeHintsSchema.optional(),
	coreWebVitals: coreWebVitalsSchema.optional(),
});
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;

export const UNLIMITED = -1;

export type TierLimits = {
	pages: number;
	keywords: number | "all";
	briefs: number; // UNLIMITED (-1) = no limit
	competitors: number;
	seeds: number; // Number of top keywords used for seed expansion
	pdfExport: boolean;
};

export const tierLimits: Record<AuditTier, TierLimits> = {
	FREE: {
		pages: 50,
		keywords: 0,
		briefs: 0,
		competitors: 0,
		seeds: 0,
		pdfExport: false,
	},
	SCAN: {
		pages: 50,
		keywords: "all",
		briefs: 1,
		competitors: 0,
		seeds: 3,
		pdfExport: true,
	},
	AUDIT: {
		pages: 200,
		keywords: "all",
		briefs: 5,
		competitors: 1,
		seeds: 5,
		pdfExport: true,
	},
	DEEP_DIVE: {
		pages: 500,
		keywords: "all",
		briefs: UNLIMITED,
		competitors: 3,
		seeds: 10,
		pdfExport: true,
	},
};
