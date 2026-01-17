import {
	briefRecommendationSchema as sharedBriefRecommendationSchema,
	clusterSuggestionSchema as sharedClusterSuggestionSchema,
	competitorSuggestionSchema as sharedCompetitorSuggestionSchema,
	interactivePhaseSchema as sharedInteractivePhaseSchema,
} from "@docrank/shared";
import { z } from "@hono/zod-openapi";

export const auditTierSchema = z.enum(["FREE", "SCAN", "AUDIT", "DEEP_DIVE"]);
export type AuditTier = z.infer<typeof auditTierSchema>;

export const auditStatusSchema = z.enum([
	"PENDING",
	"CRAWLING",
	"SELECTING_COMPETITORS",
	"SELECTING_TOPICS",
	"ANALYZING",
	"GENERATING_BRIEFS", // Legacy - kept for existing audits
	"RETRYING", // Legacy - kept for existing audits
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
	// Extracted info when valid (optional, may fail extraction)
	productDescription: z.string().optional(),
	seedKeywords: z.array(z.string()).optional(),
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
	targetKeywords: z
		.array(z.string().min(1).max(100))
		.max(10)
		.optional()
		.transform((val) => val ?? [])
		.describe(
			"Keywords you want to target (helpful for new sites without rankings)",
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
	currentRankings: componentStatusSchema,
	competitorAnalysis: componentStatusSchema,
	keywordOpportunities: componentStatusSchema,
	snippetOpportunities: componentStatusSchema,
	quickWins: componentStatusSchema,
	briefs: componentStatusSchema,
	actionPlan: componentStatusSchema,
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
	targetKeywords: z.array(z.string()),
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
	"target_keyword",
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

export const analysisResponseSchema = z.object({
	currentRankings: z.array(currentRankingSchema),
	opportunities: z.array(opportunitySchema),
	opportunityClusters: z.array(opportunityClusterSchema),
	quickWins: z.array(quickWinSchema),
	technicalIssues: z.array(technicalIssueSchema),
	internalLinkingIssues: internalLinkingIssuesSchema,
	competitorGaps: z.array(competitorGapSchema),
	snippetOpportunities: z.array(snippetOpportunitySchema),
	sectionStats: z.array(sectionStatsSchema),
	healthScore: healthScoreSchema.nullable(),
	discoveredCompetitors: z.array(discoveredCompetitorSchema),
	upgradeHints: upgradeHintsSchema.optional(),
});
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;

// Tier limits are now in @docrank/shared - re-export for convenience
export {
	UNLIMITED,
	TIERS,
	getLimits,
	getComponents,
	getPhases,
	hasComponent,
} from "@docrank/shared";
export type {
	TierLimits,
	TierConfig,
	ComponentId,
	PhaseInfo,
} from "@docrank/shared";

// ============================================================================
// Unified Audit State Schema - Single source of truth
// ============================================================================

/**
 * Component state - discriminated union ensures data exists when completed
 */
function componentStateSchema<T extends z.ZodTypeAny>(dataSchema: T) {
	return z.discriminatedUnion("status", [
		z.object({ status: z.literal("pending") }),
		z.object({ status: z.literal("running") }),
		z.object({ status: z.literal("completed"), data: dataSchema }),
		z.object({ status: z.literal("failed"), error: z.string() }),
	]);
}

// Brief schema for unified state (matches BriefData type)
const briefDataSchema = z.object({
	id: z.string(),
	keyword: z.string(),
	searchVolume: z.number(),
	difficulty: z.number(),
	intent: searchIntentSchema.nullable(),
	title: z.string(),
	structure: z.record(z.string(), z.unknown()),
	questions: z.array(z.string()),
	relatedKw: z.array(z.string()),
	competitors: z.array(
		z.object({
			domain: z.string(),
			url: z.string(),
			title: z.string(),
		}),
	),
	suggestedInternalLinks: z.array(z.string()),
});

// Competitor data schema
const competitorDataSchema = z.object({
	gaps: z.array(competitorGapSchema),
	discovered: z.array(discoveredCompetitorSchema),
});

// AI Readiness schemas
const aiBotStatusSchema = z.object({
	bot: z.string(),
	provider: z.string(),
	purpose: z.enum(["training", "search", "live", "indexing"]),
	status: z.enum(["allowed", "blocked", "not_specified"]),
	rule: z.string().optional(),
});

const robotsTxtAnalysisSchema = z.object({
	exists: z.boolean(),
	aiBots: z.array(aiBotStatusSchema),
	summary: z.object({
		allowed: z.number(),
		blocked: z.number(),
		unspecified: z.number(),
	}),
});

const llmsTxtInfoSchema = z.object({
	exists: z.boolean(),
	url: z.string().nullable(),
});

const contentStructureAnalysisSchema = z.object({
	headingHierarchy: z.object({
		score: z.number(),
		pagesWithProperH1: z.number(),
		pagesWithMultipleH1: z.number(),
		pagesWithNoH1: z.number(),
		avgHeadingsPerPage: z.number(),
	}),
	structuredData: z.object({
		pagesWithSchema: z.number(),
		schemaTypes: z.array(z.string()),
		hasFAQSchema: z.boolean(),
		hasArticleSchema: z.boolean(),
		hasProductSchema: z.boolean(),
	}),
	contentQuality: z.object({
		avgWordCount: z.number(),
		avgReadabilityScore: z.number().nullable(),
		pagesWithThinContent: z.number(),
	}),
});

const aiReadinessDataSchema = z.object({
	robotsTxtAnalysis: robotsTxtAnalysisSchema,
	llmsTxt: llmsTxtInfoSchema,
	contentStructure: contentStructureAnalysisSchema,
	score: z.number(),
});

// Component states schema
export const componentStatesSchema = z.object({
	crawl: componentStateSchema(z.null()),
	technical: componentStateSchema(z.array(technicalIssueSchema)),
	internalLinking: componentStateSchema(internalLinkingIssuesSchema),
	duplicateContent: componentStateSchema(
		z.array(
			z.object({
				pages: z.array(z.string()),
				similarity: z.number(),
			}),
		),
	),
	redirectChains: componentStateSchema(
		z.array(
			z.object({
				chain: z.array(z.string()),
				finalUrl: z.string(),
			}),
		),
	),
	aiReadiness: componentStateSchema(aiReadinessDataSchema),
	rankings: componentStateSchema(z.array(currentRankingSchema)),
	opportunities: componentStateSchema(z.array(opportunitySchema)),
	quickWins: componentStateSchema(z.array(quickWinSchema)),
	competitors: componentStateSchema(competitorDataSchema),
	snippets: componentStateSchema(z.array(snippetOpportunitySchema)),
	briefs: componentStateSchema(z.array(briefDataSchema)),
});
export type ComponentStatesResponse = z.infer<typeof componentStatesSchema>;

// Action item schema for action plan
const actionItemSchema = z.object({
	id: z.string(),
	priority: z.number(),
	type: z.string(),
	title: z.string(),
	description: z.string(),
	url: z.string().optional(),
	keyword: z.string().optional(),
	estimatedImpact: z.object({
		trafficGain: z.number().optional(),
		searchVolume: z.number().optional(),
	}),
	category: z.string(),
});

// Tier config schema (included in state, drives frontend)
const phaseInfoSchema = z.object({
	id: z.string(),
	label: z.string(),
	runningLabel: z.string(),
});

const tierLimitsResponseSchema = z.object({
	pages: z.number(),
	competitors: z.number(),
	briefs: z.number(),
	seeds: z.number(),
	pdfExport: z.boolean(),
});

const tierConfigResponseSchema = z.object({
	components: z.array(z.string()),
	phases: z.array(phaseInfoSchema),
	limits: tierLimitsResponseSchema,
});

export type TierConfigResponse = z.infer<typeof tierConfigResponseSchema>;

/**
 * Interactive flow types - imported from @docrank/shared
 */
export const interactivePhaseSchema = sharedInteractivePhaseSchema;
export const competitorSuggestionSchema = sharedCompetitorSuggestionSchema;
export const clusterSuggestionSchema = sharedClusterSuggestionSchema;
export const briefRecommendationSchema = sharedBriefRecommendationSchema;

/**
 * Unified audit state - single source of truth
 */
export const auditStateSchema = z.object({
	// Identity
	id: z.string(),
	accessToken: z.string(),
	siteUrl: z.string(),
	tier: auditTierSchema,

	// Overall status
	status: auditStatusSchema,
	createdAt: z.string(),
	completedAt: z.string().nullable(),

	// Crawl metadata
	pagesFound: z.number().nullable(),
	sitemapUrlCount: z.number().nullable(),

	// Tier configuration (drives what frontend tracks)
	tierConfig: tierConfigResponseSchema,

	// Component states - status and data unified
	components: componentStatesSchema,

	// Derived data
	isNewSite: z.boolean().optional(),
	opportunityClusters: z.array(opportunityClusterSchema).optional(),
	actionPlan: z.array(actionItemSchema).optional(),
	healthScore: healthScoreSchema.nullable(),

	// Interactive flow state (paid tiers only)
	interactivePhase: interactivePhaseSchema.optional(),
	suggestedCompetitors: z.array(competitorSuggestionSchema).optional(),
	selectedCompetitors: z.array(z.string()).optional(),
	crawlComplete: z.boolean().optional(),
	interactiveComplete: z.boolean().optional(),

	// Brief recommendations (unified from multiple sources)
	briefRecommendations: z.array(briefRecommendationSchema).optional(),
});
export type AuditStateResponse = z.infer<typeof auditStateSchema>;
