import { z } from "zod";

// ============================================================================
// Core Enums
// ============================================================================

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

export const componentStatusSchema = z.enum([
	"pending",
	"running",
	"completed",
	"retrying",
	"failed",
]);
export type ComponentStatus = z.infer<typeof componentStatusSchema>;

export const searchIntentSchema = z.enum([
	"informational",
	"transactional",
	"navigational",
	"commercial",
]);
export type SearchIntent = z.infer<typeof searchIntentSchema>;

export const opportunitySourceSchema = z.enum([
	"competitor_gap",
	"seed_expansion",
	"content_extraction",
	"target_keyword",
]);
export type OpportunitySource = z.infer<typeof opportunitySourceSchema>;

// ============================================================================
// Basic Schemas
// ============================================================================

export const currentRankingSchema = z.object({
	url: z.string(),
	keyword: z.string(),
	position: z.number(),
	searchVolume: z.number(),
	estimatedTraffic: z.number(),
});
export type CurrentRanking = z.infer<typeof currentRankingSchema>;

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
export type Opportunity = z.infer<typeof opportunitySchema>;

export const opportunityClusterSchema = z.object({
	topic: z.string(),
	opportunities: z.array(opportunitySchema),
	totalVolume: z.number(),
	avgDifficulty: z.number(),
	suggestedAction: z.enum(["create", "optimize", "expand"]),
	existingPage: z.string().optional(),
});
export type OpportunityCluster = z.infer<typeof opportunityClusterSchema>;

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
export type QuickWinAiSuggestions = z.infer<typeof quickWinAiSuggestionsSchema>;

export const quickWinSchema = z.object({
	url: z.string(),
	keyword: z.string(),
	currentPosition: z.number(),
	suggestions: z.array(z.string()),
	aiSuggestions: quickWinAiSuggestionsSchema.optional(),
});
export type QuickWin = z.infer<typeof quickWinSchema>;

export const technicalIssueSchema = z.object({
	url: z.string(),
	issue: z.string(),
	severity: z.enum(["low", "medium", "high"]),
});
export type TechnicalIssue = z.infer<typeof technicalIssueSchema>;

export const internalLinkingIssuesSchema = z.object({
	orphanPages: z.array(z.string()),
	underlinkedPages: z.array(
		z.object({
			url: z.string(),
			incomingLinks: z.number(),
		}),
	),
});
export type InternalLinkingIssues = z.infer<typeof internalLinkingIssuesSchema>;

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
export type CompetitorGap = z.infer<typeof competitorGapSchema>;

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
export type SnippetOpportunity = z.infer<typeof snippetOpportunitySchema>;

export const discoveredCompetitorSchema = z.object({
	domain: z.string(),
	intersections: z.number(),
	avgPosition: z.number(),
	etv: z.number(),
});
export type DiscoveredCompetitor = z.infer<typeof discoveredCompetitorSchema>;

// ============================================================================
// Health Score
// ============================================================================

export const healthScoreComponentSchema = z.object({
	score: z.number(),
	max: z.number(),
	detail: z.string(),
});
export type HealthScoreComponent = z.infer<typeof healthScoreComponentSchema>;

export const healthScoreBreakdownSchema = z.object({
	opportunityDiscovery: healthScoreComponentSchema,
	rankingCoverage: healthScoreComponentSchema,
	positionQuality: healthScoreComponentSchema,
	technicalHealth: healthScoreComponentSchema,
	internalLinking: healthScoreComponentSchema,
	contentOpportunity: healthScoreComponentSchema,
	aiReadiness: healthScoreComponentSchema,
});
export type HealthScoreBreakdown = z.infer<typeof healthScoreBreakdownSchema>;

export const healthScoreGradeSchema = z.enum([
	"excellent",
	"good",
	"needs_work",
	"poor",
]);
export type HealthScoreGrade = z.infer<typeof healthScoreGradeSchema>;

export const healthScoreSchema = z.object({
	score: z.number().min(0).max(100),
	grade: healthScoreGradeSchema,
	breakdown: healthScoreBreakdownSchema,
});
export type HealthScore = z.infer<typeof healthScoreSchema>;

// ============================================================================
// AI Readiness
// ============================================================================

export const aiBotStatusSchema = z.object({
	bot: z.string(),
	provider: z.string(),
	purpose: z.enum(["training", "search", "live", "indexing"]),
	status: z.enum(["allowed", "blocked", "not_specified"]),
	rule: z.string().optional(),
});
export type AIBotStatus = z.infer<typeof aiBotStatusSchema>;

export const robotsTxtAnalysisSchema = z.object({
	exists: z.boolean(),
	aiBots: z.array(aiBotStatusSchema),
	summary: z.object({
		allowed: z.number(),
		blocked: z.number(),
		unspecified: z.number(),
	}),
});
export type RobotsTxtAnalysis = z.infer<typeof robotsTxtAnalysisSchema>;

export const llmsTxtInfoSchema = z.object({
	exists: z.boolean(),
	url: z.string().nullable(),
});
export type LlmsTxtInfo = z.infer<typeof llmsTxtInfoSchema>;

export const contentStructureAnalysisSchema = z.object({
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
export type ContentStructureAnalysis = z.infer<
	typeof contentStructureAnalysisSchema
>;

export const aiReadinessDataSchema = z.object({
	robotsTxtAnalysis: robotsTxtAnalysisSchema,
	llmsTxt: llmsTxtInfoSchema,
	contentStructure: contentStructureAnalysisSchema,
	score: z.number(),
});
export type AIReadinessData = z.infer<typeof aiReadinessDataSchema>;

// ============================================================================
// Briefs
// ============================================================================

export const briefCompetitorSchema = z.object({
	domain: z.string(),
	url: z.string(),
	title: z.string(),
});
export type BriefCompetitor = z.infer<typeof briefCompetitorSchema>;

export const briefDataSchema = z.object({
	id: z.string(),
	keyword: z.string(),
	searchVolume: z.number(),
	difficulty: z.number(),
	intent: searchIntentSchema.nullable(),
	title: z.string(),
	structure: z.record(z.string(), z.unknown()),
	questions: z.array(z.string()),
	relatedKw: z.array(z.string()),
	competitors: z.array(briefCompetitorSchema),
	suggestedInternalLinks: z.array(z.string()),
	clusteredKeywords: z.array(z.string()).optional(),
	totalClusterVolume: z.number().optional(),
	estimatedEffort: z.string().nullable().optional(),
});
export type BriefData = z.infer<typeof briefDataSchema>;

// ============================================================================
// Action Plan
// ============================================================================

export const actionTypeSchema = z.enum([
	"fix_technical",
	"add_internal_links",
	"optimize_existing",
	"create_content",
	"steal_snippet",
]);
export type ActionType = z.infer<typeof actionTypeSchema>;

export const actionCategorySchema = z.enum([
	"technical",
	"content",
	"linking",
	"optimization",
]);
export type ActionCategory = z.infer<typeof actionCategorySchema>;

export const prioritizedActionSchema = z.object({
	id: z.string(),
	priority: z.number(),
	type: actionTypeSchema,
	title: z.string(),
	description: z.string(),
	url: z.string().optional(),
	keyword: z.string().optional(),
	estimatedImpact: z.object({
		trafficGain: z.number().optional(),
		searchVolume: z.number().optional(),
	}),
	category: actionCategorySchema,
	effort: z.enum(["low", "medium", "high"]),
});
export type PrioritizedAction = z.infer<typeof prioritizedActionSchema>;
