import { z } from "zod";
import {
	aiReadinessDataSchema,
	auditStatusSchema,
	auditTierSchema,
	briefDataSchema,
	competitorGapSchema,
	currentRankingSchema,
	discoveredCompetitorSchema,
	healthScoreSchema,
	internalLinkingIssuesSchema,
	opportunityClusterSchema,
	opportunitySchema,
	prioritizedActionSchema,
	quickWinSchema,
	snippetOpportunitySchema,
	technicalIssueSchema,
} from "./audit.js";

// ============================================================================
// Interactive Flow Types (for parallel fast-track)
// ============================================================================

export const interactivePhaseSchema = z.enum([
	"discovery",
	"competitor_selection",
	"keyword_analysis",
	"cluster_selection",
	"generating",
	"complete",
]);
export type InteractivePhase = z.infer<typeof interactivePhaseSchema>;

export const competitorSuggestionSchema = z.object({
	domain: z.string(),
	reason: z.string(),
	confidence: z.number(),
});
export type CompetitorSuggestion = z.infer<typeof competitorSuggestionSchema>;

export const clusterSuggestionSchema = z.object({
	id: z.string(),
	name: z.string(),
	keywords: z.array(z.object({ keyword: z.string(), volume: z.number() })),
	totalVolume: z.number(),
});
export type ClusterSuggestion = z.infer<typeof clusterSuggestionSchema>;

export const briefRecommendationSourceSchema = z.enum([
	"target",
	"quick_win",
	"gap",
]);
export type BriefRecommendationSource = z.infer<
	typeof briefRecommendationSourceSchema
>;

export const briefRecommendationSchema = z.object({
	id: z.string(),
	keyword: z.string(),
	source: briefRecommendationSourceSchema,
	priority: z.number(),
	searchVolume: z.number().optional(),
	currentPosition: z.number().optional(),
	url: z.string().optional(),
	reason: z.string(),
});
export type BriefRecommendation = z.infer<typeof briefRecommendationSchema>;

// ============================================================================
// Component State - Discriminated Union
// ============================================================================

/**
 * Generic component state factory.
 * Ensures data exists only when status is "completed".
 */
export function componentStateSchema<T extends z.ZodTypeAny>(dataSchema: T) {
	return z.discriminatedUnion("status", [
		z.object({ status: z.literal("pending") }),
		z.object({ status: z.literal("running") }),
		z.object({ status: z.literal("completed"), data: dataSchema }),
		z.object({ status: z.literal("failed"), error: z.string() }),
	]);
}

export type ComponentState<T> =
	| { status: "pending" }
	| { status: "running" }
	| { status: "completed"; data: T }
	| { status: "failed"; error: string };

// ============================================================================
// Competitor Data
// ============================================================================

export const competitorDataSchema = z.object({
	gaps: z.array(competitorGapSchema),
	discovered: z.array(discoveredCompetitorSchema),
});
export type CompetitorData = z.infer<typeof competitorDataSchema>;

// ============================================================================
// Component States
// ============================================================================

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
export type ComponentStates = z.infer<typeof componentStatesSchema>;

export type StateComponentKey = keyof ComponentStates;

// ============================================================================
// Tier Config Schema (for API responses)
// Types imported from config/tiers.ts which is the single source of truth
// ============================================================================

const phaseInfoSchema = z.object({
	id: z.string(),
	label: z.string(),
	runningLabel: z.string(),
});

const tierLimitsSchema = z.object({
	pages: z.number(),
	competitors: z.number(),
	briefs: z.number(),
	seeds: z.number(),
	pdfExport: z.boolean(),
});

export const tierConfigStateSchema = z.object({
	components: z.array(z.string()),
	phases: z.array(phaseInfoSchema),
	limits: tierLimitsSchema,
});
export type TierConfigState = z.infer<typeof tierConfigStateSchema>;

// ============================================================================
// Unified Audit State
// ============================================================================

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
	tierConfig: tierConfigStateSchema,

	// Component states - status and data unified
	components: componentStatesSchema,

	// Derived data
	isNewSite: z.boolean().optional(),
	opportunityClusters: z.array(opportunityClusterSchema).optional(),
	actionPlan: z.array(prioritizedActionSchema).optional(),
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
export type AuditState = z.infer<typeof auditStateSchema>;

// ============================================================================
// Audit Progress (simplified status-only view)
// ============================================================================

export const auditProgressSchema = z.object({
	crawl: z.string(),
	technicalIssues: z.string(),
	internalLinking: z.string(),
	duplicateContent: z.string(),
	redirectChains: z.string(),
	currentRankings: z.string(),
	competitorAnalysis: z.string(),
	keywordOpportunities: z.string(),
	snippetOpportunities: z.string(),
	quickWins: z.string(),
	briefs: z.string(),
	actionPlan: z.string(),
	aiReadiness: z.string(),
	lastRetryAt: z.string().optional(),
	retryCount: z.number(),
});
export type AuditProgress = z.infer<typeof auditProgressSchema>;

// ============================================================================
// SSE Events
// ============================================================================

const stateComponentKeySchema = z.enum([
	"crawl",
	"technical",
	"internalLinking",
	"duplicateContent",
	"redirectChains",
	"aiReadiness",
	"rankings",
	"opportunities",
	"quickWins",
	"competitors",
	"snippets",
	"briefs",
]);

export const auditSSEEventSchema = z.discriminatedUnion("type", [
	// Status updates
	z.object({
		type: z.literal("audit:status"),
		status: auditStatusSchema,
	}),
	// Component lifecycle
	z.object({
		type: z.literal("component:start"),
		key: stateComponentKeySchema,
	}),
	z.object({
		type: z.literal("component:complete"),
		key: stateComponentKeySchema,
		data: z.unknown(),
	}),
	z.object({
		type: z.literal("component:fail"),
		key: stateComponentKeySchema,
		error: z.string(),
	}),
	// Metadata
	z.object({
		type: z.literal("crawl:pages"),
		count: z.number(),
		sitemapCount: z.number().optional(),
	}),
	z.object({
		type: z.literal("health:score"),
		score: healthScoreSchema,
	}),
	// Derived data
	z.object({
		type: z.literal("clusters"),
		data: z.array(opportunityClusterSchema),
	}),
	z.object({
		type: z.literal("action-plan"),
		data: z.array(prioritizedActionSchema),
	}),
	// Interactive flow events (paid tiers)
	z.object({
		type: z.literal("interactive:phase"),
		phase: interactivePhaseSchema,
	}),
	z.object({
		type: z.literal("interactive:competitor_suggestions"),
		suggestions: z.array(competitorSuggestionSchema),
		maxSelections: z.number(),
	}),
	z.object({ type: z.literal("interactive:crawl_complete") }),
	z.object({ type: z.literal("interactive:waiting_for_crawl") }),
	// Brief recommendations
	z.object({
		type: z.literal("brief-recommendations"),
		data: z.array(briefRecommendationSchema),
	}),
	// Terminal
	z.object({ type: z.literal("audit:complete") }),
	z.object({ type: z.literal("audit:error"), message: z.string() }),
]);
export type AuditSSEEvent = z.infer<typeof auditSSEEventSchema>;
