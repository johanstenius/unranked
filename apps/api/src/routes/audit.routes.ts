import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { streamSSE } from "hono/streaming";
import type { AppEnv } from "../app.js";
import {
	type AuditSSEEvent,
	emitAuditStatus,
	subscribe,
} from "../lib/audit-events.js";
import { createLogger } from "../lib/logger.js";

const log = createLogger("audit.routes");
import { queueCrawlJob } from "../jobs/crawl.job.js";
import { queueFinalAnalysisJob } from "../jobs/final-analysis.job.js";
import { queueFreeAuditJob } from "../jobs/free-audit.job.js";
import { getQueue } from "../lib/queue.js";
import * as auditRepo from "../repositories/audit.repository.js";
import * as briefRepo from "../repositories/brief.repository.js";
import * as crawledPageRepo from "../repositories/crawled-page.repository.js";
import {
	type AuditProgressResponse,
	type AuditStateResponse,
	type AuditTier,
	type ComponentStatesResponse,
	type HealthScoreResponse,
	type SearchIntentResponse,
	type SectionInfoResponse,
	type SectionStatsResponse,
	TIERS,
	type UpgradeHints,
	analysisResponseSchema,
	auditResponseSchema,
	auditStateSchema,
	briefResponseSchema,
	createAuditSchema,
	discoverRequestSchema,
	discoverResponseSchema,
	getComponents,
	getLimits,
	getPhases,
} from "../schemas/audit.schema.js";
import { buildBriefRecommendations } from "../services/brief-recommendations.js";
import {
	type GeneratedBrief,
	generateSingleBrief,
} from "../services/brief/generator.js";
import { generateTemplate } from "../services/brief/templates.js";
import { suggestCompetitors } from "../services/competitor-suggestions.js";
import {
	discoverSections,
	discoverSectionsStream,
} from "../services/crawler/crawler.js";
import type {
	AnalysisResult,
	OpportunityCluster,
} from "../services/seo/analysis.js";
import { preflightRankingsCheck } from "../services/seo/dataforseo.js";
import type { PipelineState } from "../types/audit-state.js";
type StatusString = "pending" | "running" | "completed" | "retrying" | "failed";

type PipelineProgress = Record<string, { status?: string }>;

function getStatus(
	progress: PipelineProgress | undefined,
	key: string,
): StatusString {
	const comp = progress?.[key];
	if (!comp?.status) return "pending";
	return comp.status as StatusString;
}

function toProgressResponse(
	pipelineState: { progress?: PipelineProgress; retryCount?: number } | null,
): AuditProgressResponse | null {
	if (!pipelineState) return null;
	const progress = pipelineState.progress;
	return {
		crawl: getStatus(progress, "crawl"),
		technicalIssues: getStatus(progress, "technicalIssues"),
		internalLinking: getStatus(progress, "internalLinking"),
		duplicateContent: getStatus(progress, "duplicateContent"),
		redirectChains: getStatus(progress, "redirectChains"),
		currentRankings: getStatus(progress, "currentRankings"),
		competitorAnalysis: getStatus(progress, "competitorAnalysis"),
		keywordOpportunities: getStatus(progress, "keywordOpportunities"),
		snippetOpportunities: getStatus(progress, "snippetOpportunities"),
		quickWins: getStatus(progress, "quickWins"),
		briefs: getStatus(progress, "briefs"),
		actionPlan: getStatus(progress, "actionPlan"),
		retryCount: pipelineState.retryCount ?? 0,
	};
}

function getSectionFromUrl(url: string, baseUrl: string): string {
	try {
		const urlObj = new URL(url);
		const baseUrlObj = new URL(baseUrl);
		if (urlObj.hostname !== baseUrlObj.hostname) return "/";
		const path = urlObj.pathname;
		const segments = path.split("/").filter(Boolean);
		return segments.length > 0 ? `/${segments[0]}` : "/";
	} catch {
		return "/";
	}
}

function buildUpgradeHints(
	tier: AuditTier,
	totalOpportunities: number,
): UpgradeHints {
	const limits = TIERS[tier].limits;
	// FREE tier has no opportunities component, paid tiers show all
	const hasOpportunities = tier !== "FREE";
	const displayedOpportunities = hasOpportunities ? totalOpportunities : 0;

	const tierUpgrades: UpgradeHints["tierUpgrades"] = {};
	const allTiers: AuditTier[] = ["SCAN", "AUDIT", "DEEP_DIVE"];
	for (const t of allTiers) {
		if (t !== tier) {
			const l = TIERS[t].limits;
			tierUpgrades[t] = {
				keywords: "all", // Paid tiers always show all
				briefs: l.briefs,
				competitors: l.competitors,
				pdfExport: l.pdfExport,
			};
		}
	}

	return {
		totalOpportunities,
		displayedOpportunities,
		briefsAvailable: limits.briefs,
		competitorsAvailable: limits.competitors,
		pdfExportAvailable: limits.pdfExport,
		tierUpgrades,
	};
}

function buildAnalysisResponse(
	analysis: AnalysisResult,
	detectedSections: SectionInfoResponse[],
	siteUrl: string,
	healthScore: HealthScoreResponse | null,
	tier: AuditTier,
) {
	const sectionStats: SectionStatsResponse[] = detectedSections.map((s) => {
		const sectionRankings = (analysis.currentRankings ?? []).filter(
			(r) => getSectionFromUrl(r.url, siteUrl) === s.path,
		);
		const sectionIssues = (analysis.technicalIssues ?? []).filter(
			(i) => getSectionFromUrl(i.url, siteUrl) === s.path,
		);

		return {
			section: s.path,
			pagesCount: s.pageCount,
			rankingKeywords: sectionRankings.length,
			estimatedTraffic: sectionRankings.reduce(
				(sum, r) => sum + r.estimatedTraffic,
				0,
			),
			technicalIssues: sectionIssues.length,
		};
	});

	const allOpportunities = analysis.opportunities ?? [];

	// FREE tier has no opportunities component, paid tiers show all
	const opportunities = tier === "FREE" ? [] : allOpportunities;

	return {
		currentRankings: analysis.currentRankings ?? [],
		opportunities,
		opportunityClusters: analysis.opportunityClusters ?? [],
		quickWins: analysis.quickWins ?? [],
		technicalIssues: analysis.technicalIssues ?? [],
		internalLinkingIssues: analysis.internalLinkingIssues ?? {
			orphanPages: [],
			underlinkedPages: [],
		},
		competitorGaps: analysis.competitorGaps ?? [],
		snippetOpportunities: analysis.snippetOpportunities ?? [],
		sectionStats,
		healthScore,
		discoveredCompetitors: analysis.discoveredCompetitors ?? [],
		upgradeHints: buildUpgradeHints(tier, allOpportunities.length),
	};
}

type BriefDbModel = {
	id: string;
	keyword: string;
	searchVolume: number;
	difficulty: number;
	title: string;
	structure: unknown;
	questions: string[];
	relatedKw: string[];
	competitors: unknown;
	suggestedInternalLinks: string[];
	clusteredKeywords: string[];
	totalClusterVolume: number;
	estimatedEffort: string | null;
	intent: string | null;
	createdAt: Date;
};

function mapBriefToResponse(brief: BriefDbModel) {
	const intent = brief.intent as SearchIntentResponse | null;
	const structure = brief.structure as Record<string, unknown>;
	return {
		id: brief.id,
		keyword: brief.keyword,
		searchVolume: brief.searchVolume,
		difficulty: brief.difficulty,
		title: brief.title,
		structure,
		questions: brief.questions,
		relatedKw: brief.relatedKw,
		competitors: brief.competitors as unknown[] | null,
		suggestedInternalLinks: brief.suggestedInternalLinks,
		clusteredKeywords: brief.clusteredKeywords,
		totalClusterVolume: brief.totalClusterVolume,
		estimatedEffort: brief.estimatedEffort,
		intent,
		contentTemplate: generateTemplate(
			{
				title: brief.title,
				structure: structure as {
					h2s: Array<{ title: string; h3s?: string[] }>;
				},
				questions: brief.questions,
				relatedKw: brief.relatedKw,
				suggestedInternalLinks: brief.suggestedInternalLinks,
			},
			intent,
		),
		createdAt: brief.createdAt.toISOString(),
	};
}

// ============================================================================
// Unified Audit State Builder
// ============================================================================

type AuditDbModel = {
	id: string;
	accessToken: string;
	siteUrl: string;
	tier: AuditTier;
	status: string;
	createdAt: Date;
	completedAt: Date | null;
	pagesFound: number | null;
	sitemapUrlCount: number | null;
	pipelineState: unknown;
	healthScore: unknown;
	briefs: BriefDbModel[];
	isNewSite: boolean;
	targetKeywords: string[];
	// New simplified flow columns
	crawlComplete: boolean;
	suggestedCompetitors: unknown;
	selectedCompetitors: string[];
	suggestedClusters: unknown;
	selectedClusters: string[];
};

type ComponentStatus = "pending" | "running" | "completed" | "failed";

type PipelineStateJson = {
	progress?: Record<string, { status?: string }>;
	results?: AnalysisResult;
};

function getProgressStatus(
	pipelineState: PipelineStateJson | null,
	key: string,
): ComponentStatus {
	if (!pipelineState?.progress) return "pending";
	const comp = pipelineState.progress[key];
	if (!comp?.status) return "pending";
	return comp.status as ComponentStatus;
}

function buildComponentState<T>(
	status: ComponentStatus,
	data: T | undefined,
	errorMsg?: string,
):
	| { status: "pending" }
	| { status: "running" }
	| { status: "completed"; data: T }
	| { status: "failed"; error: string } {
	switch (status) {
		case "completed":
			return { status: "completed", data: data as T };
		case "failed":
			return { status: "failed", error: errorMsg ?? "Component failed" };
		case "running":
			return { status: "running" };
		default:
			return { status: "pending" };
	}
}

type PipelineStateWithInteractive = PipelineStateJson & {
	interactivePhase?: string;
	suggestedCompetitors?: Array<{
		domain: string;
		reason: string;
		confidence: number;
	}>;
	selectedCompetitors?: string[];
	suggestedClusters?: Array<{
		id: string;
		name: string;
		keywords: Array<{ keyword: string; volume: number }>;
		totalVolume: number;
	}>;
	selectedClusterIds?: string[];
	crawlComplete?: boolean;
	interactiveComplete?: boolean;
};

function buildAuditState(audit: AuditDbModel): AuditStateResponse {
	const pipelineState =
		audit.pipelineState as PipelineStateWithInteractive | null;
	const analysis = pipelineState?.results ?? null;
	const healthScore = audit.healthScore as HealthScoreResponse | null;

	// Build brief recommendations from available data
	const briefRecommendations = buildBriefRecommendations({
		targetKeywords: audit.targetKeywords ?? [],
		quickWins: analysis?.quickWins ?? [],
		opportunities: analysis?.opportunities ?? [],
	});

	// Build component states from pipelineState.progress + pipelineState.results
	const components: ComponentStatesResponse = {
		crawl: buildComponentState(getProgressStatus(pipelineState, "crawl"), null),
		technical: buildComponentState(
			getProgressStatus(pipelineState, "technicalIssues"),
			analysis?.technicalIssues ?? [],
		),
		internalLinking: buildComponentState(
			getProgressStatus(pipelineState, "internalLinking"),
			analysis?.internalLinkingIssues ?? {
				orphanPages: [],
				underlinkedPages: [],
			},
		),
		duplicateContent: buildComponentState(
			getProgressStatus(pipelineState, "duplicateContent"),
			[], // Not stored separately yet
		),
		redirectChains: buildComponentState(
			getProgressStatus(pipelineState, "redirectChains"),
			[], // Not stored separately yet
		),
		aiReadiness: buildComponentState(
			getProgressStatus(pipelineState, "aiReadiness"),
			analysis?.aiReadiness,
		),
		rankings: buildComponentState(
			getProgressStatus(pipelineState, "currentRankings"),
			analysis?.currentRankings ?? [],
		),
		opportunities: buildComponentState(
			getProgressStatus(pipelineState, "keywordOpportunities"),
			analysis?.opportunities ?? [],
		),
		quickWins: buildComponentState(
			getProgressStatus(pipelineState, "quickWins"),
			analysis?.quickWins ?? [],
		),
		competitors: buildComponentState(
			getProgressStatus(pipelineState, "competitorAnalysis"),
			{
				gaps: analysis?.competitorGaps ?? [],
				discovered: analysis?.discoveredCompetitors ?? [],
			},
		),
		snippets: buildComponentState(
			getProgressStatus(pipelineState, "snippetOpportunities"),
			analysis?.snippetOpportunities ?? [],
		),
		briefs: buildComponentState(
			getProgressStatus(pipelineState, "briefs"),
			audit.briefs.map((b) => ({
				id: b.id,
				keyword: b.keyword,
				searchVolume: b.searchVolume,
				difficulty: b.difficulty,
				intent: b.intent as
					| "informational"
					| "transactional"
					| "navigational"
					| "commercial"
					| null,
				title: b.title,
				structure: b.structure as Record<string, unknown>,
				questions: b.questions,
				relatedKw: b.relatedKw,
				competitors: ((b.competitors as unknown[]) ?? []).map((c) => {
					const comp = c as { domain?: string; url?: string; title?: string };
					return {
						domain: comp.domain ?? "",
						url: comp.url ?? "",
						title: comp.title ?? "",
					};
				}),
				suggestedInternalLinks: b.suggestedInternalLinks,
			})),
		),
	};

	// Build tier config based on tier and isNewSite
	const tierConfig = {
		components: getComponents(audit.tier, audit.isNewSite),
		phases: getPhases(audit.tier).map((p) => ({
			id: p.id,
			label: p.label,
			runningLabel: p.runningLabel,
		})),
		limits: getLimits(audit.tier, audit.isNewSite),
	};

	// Map status to interactivePhase for frontend compatibility
	let interactivePhase: AuditStateResponse["interactivePhase"] = undefined;
	if (audit.status === "SELECTING_COMPETITORS") {
		interactivePhase = "competitor_selection";
	} else if (audit.status === "ANALYZING") {
		interactivePhase = "generating";
	} else if (audit.status === "COMPLETED") {
		interactivePhase = "complete";
	}

	return {
		id: audit.id,
		accessToken: audit.accessToken,
		siteUrl: audit.siteUrl,
		tier: audit.tier,
		status: audit.status as AuditStateResponse["status"],
		createdAt: audit.createdAt.toISOString(),
		completedAt: audit.completedAt?.toISOString() ?? null,
		pagesFound: audit.pagesFound,
		sitemapUrlCount: audit.sitemapUrlCount,
		tierConfig,
		components,
		isNewSite: audit.isNewSite,
		opportunityClusters: analysis?.opportunityClusters,
		actionPlan: analysis?.actionPlan,
		healthScore,
		// Interactive flow state - now from top-level columns
		interactivePhase,
		suggestedCompetitors:
			audit.suggestedCompetitors as AuditStateResponse["suggestedCompetitors"],
		selectedCompetitors: audit.selectedCompetitors,
		suggestedClusters:
			audit.suggestedClusters as AuditStateResponse["suggestedClusters"],
		selectedClusterIds: audit.selectedClusters,
		crawlComplete: audit.crawlComplete,
		interactiveComplete:
			audit.status === "ANALYZING" || audit.status === "COMPLETED",
		briefRecommendations,
	};
}

export const auditRoutes = new OpenAPIHono<AppEnv>();

const discoverRoute = createRoute({
	method: "post",
	path: "/audits/discover",
	request: {
		body: {
			content: {
				"application/json": {
					schema: discoverRequestSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: discoverResponseSchema,
				},
			},
			description: "Discovered sections",
		},
	},
});

auditRoutes.openapi(discoverRoute, async (c) => {
	const { siteUrl } = c.req.valid("json");
	const result = await discoverSections(siteUrl);
	return c.json(result, 200);
});

// SSE streaming endpoint for progressive discovery
auditRoutes.post("/audits/discover/stream", async (c) => {
	const body = await c.req.json();
	const parsed = discoverRequestSchema.safeParse(body);

	if (!parsed.success) {
		return c.json(
			{ error: "Invalid request: siteUrl must be a valid URL" },
			400,
		);
	}

	const { siteUrl } = parsed.data;

	return streamSSE(c, async (stream) => {
		let eventId = 0;
		for await (const event of discoverSectionsStream(siteUrl)) {
			await stream.writeSSE({
				id: String(eventId++),
				event: event.type,
				data: JSON.stringify(event),
			});
		}
	});
});

// SSE endpoint for real-time audit progress updates
auditRoutes.get("/audits/:token/stream", async (c) => {
	const token = c.req.param("token");

	const audit = await auditRepo.getAuditByAccessToken(token);
	if (!audit) {
		return c.json({ error: "Audit not found" }, 404);
	}

	// If already completed, send complete event immediately
	if (audit.status === "COMPLETED") {
		return streamSSE(c, async (stream) => {
			await stream.writeSSE({
				id: "0",
				event: "complete",
				data: JSON.stringify({ type: "complete" }),
			});
		});
	}

	return streamSSE(c, async (stream) => {
		let eventId = 0;

		// Send initial status
		await stream.writeSSE({
			id: String(eventId++),
			event: "status",
			data: JSON.stringify({ type: "status", status: audit.status }),
		});

		// Send current progress if available
		if (audit.pipelineState) {
			const progress = toProgressResponse(
				audit.pipelineState as {
					progress?: PipelineProgress;
					retryCount?: number;
				},
			);
			await stream.writeSSE({
				id: String(eventId++),
				event: "progress",
				data: JSON.stringify({ type: "progress", progress }),
			});
		}

		// Subscribe to events for this audit
		const unsubscribe = subscribe(audit.id, (event: AuditSSEEvent) => {
			stream
				.writeSSE({
					id: String(eventId++),
					event: event.type,
					data: JSON.stringify(event),
				})
				.catch((err) => {
					log.error({ error: err }, "Error writing SSE");
				});
		});

		// Keep connection alive with heartbeat
		const heartbeat = setInterval(() => {
			stream
				.writeSSE({
					id: String(eventId++),
					event: "heartbeat",
					data: JSON.stringify({ type: "heartbeat", timestamp: Date.now() }),
				})
				.catch(() => {
					// Connection closed, clean up
					clearInterval(heartbeat);
					unsubscribe();
				});
		}, 15000); // Every 15 seconds

		// Wait for abort signal (client disconnect)
		try {
			await new Promise<void>((resolve) => {
				c.req.raw.signal.addEventListener("abort", () => {
					resolve();
				});
			});
		} finally {
			clearInterval(heartbeat);
			unsubscribe();
		}
	});
});

const createAuditRoute = createRoute({
	method: "post",
	path: "/audits",
	request: {
		body: {
			content: {
				"application/json": {
					schema: createAuditSchema,
				},
			},
		},
	},
	responses: {
		201: {
			content: {
				"application/json": {
					schema: auditResponseSchema,
				},
			},
			description: "Audit created",
		},
	},
});

auditRoutes.openapi(createAuditRoute, async (c) => {
	const body = c.req.valid("json");
	const tier = body.tier as AuditTier;
	const isPaidTier = tier !== "FREE";

	// Pre-flight rankings check for paid tiers
	let isNewSite = false;
	let prefetchedRankings:
		| {
				url: string;
				keyword: string;
				position: number;
				searchVolume: number;
				estimatedTraffic: number;
		  }[]
		| null = null;

	if (isPaidTier) {
		const limits = TIERS[tier].limits;
		const preflight = await preflightRankingsCheck(body.siteUrl, limits.pages);
		isNewSite = preflight.isNewSite;
		prefetchedRankings = preflight.rankings;
	}

	// Create audit
	const audit = await auditRepo.createAudit({
		siteUrl: body.siteUrl,
		productDesc: body.productDesc,
		competitors: body.competitors,
		sections: body.sections ?? [],
		targetKeywords: body.targetKeywords,
		tier: body.tier,
		email: body.email,
		isNewSite,
		prefetchedRankings: prefetchedRankings ?? undefined,
	});

	const queue = await getQueue();

	if (isPaidTier) {
		// Paid tier: queue background crawl, run competitor suggestions inline
		await queueCrawlJob(queue, audit.id);

		// Generate competitor suggestions immediately
		const suggestions = await suggestCompetitors({
			productDesc: body.productDesc ?? "",
			seedKeywords: body.targetKeywords ?? [],
			siteUrl: body.siteUrl,
		});

		// Update audit with suggestions and set status to SELECTING_COMPETITORS
		await auditRepo.updateAudit(audit.id, {
			suggestedCompetitors: suggestions,
			status: "SELECTING_COMPETITORS",
			startedAt: new Date(),
		});

		log.info(
			{ auditId: audit.id, suggestions: suggestions.length },
			"Paid tier audit created, competitor selection ready",
		);
	} else {
		// FREE tier: queue full audit job
		await queueFreeAuditJob(queue, audit.id);
		log.info({ auditId: audit.id }, "FREE tier audit created and queued");
	}

	return c.json(
		{
			accessToken: audit.accessToken,
			status: isPaidTier ? "SELECTING_COMPETITORS" : audit.status,
			siteUrl: audit.siteUrl,
			productDesc: audit.productDesc,
			competitors: audit.competitors,
			sections: audit.sections,
			targetKeywords: audit.targetKeywords,
			detectedSections: null,
			tier: audit.tier,
			pagesFound: audit.pagesFound,
			sitemapUrlCount: audit.sitemapUrlCount,
			currentRankings: null,
			progress: null,
			createdAt: audit.createdAt.toISOString(),
			completedAt: audit.completedAt?.toISOString() ?? null,
		},
		201,
	);
});

const getAuditRoute = createRoute({
	method: "get",
	path: "/audits/{token}",
	request: {
		params: z.object({
			token: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: auditStateSchema,
				},
			},
			description: "Unified audit state",
		},
		404: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string() }),
				},
			},
			description: "Audit not found or expired",
		},
	},
});

auditRoutes.openapi(getAuditRoute, async (c) => {
	const { token } = c.req.valid("param");

	const audit = await auditRepo.getAuditByAccessToken(token);

	if (!audit) {
		return c.json({ error: "Audit not found" }, 404);
	}

	if (audit.expiresAt < new Date()) {
		return c.json({ error: "Audit link has expired" }, 404);
	}

	const auditState = buildAuditState({
		id: audit.id,
		accessToken: audit.accessToken,
		siteUrl: audit.siteUrl,
		tier: audit.tier,
		status: audit.status,
		createdAt: audit.createdAt,
		completedAt: audit.completedAt,
		pagesFound: audit.pagesFound,
		sitemapUrlCount: audit.sitemapUrlCount,
		pipelineState: audit.pipelineState,
		healthScore: audit.healthScore,
		briefs: audit.briefs,
		isNewSite: audit.isNewSite,
		targetKeywords: audit.targetKeywords ?? [],
		// New columns
		crawlComplete: audit.crawlComplete,
		suggestedCompetitors: audit.suggestedCompetitors,
		selectedCompetitors: audit.selectedCompetitors,
		suggestedClusters: audit.suggestedClusters,
		selectedClusters: audit.selectedClusters,
	});

	return c.json(auditState, 200);
});

const getAuditAnalysisRoute = createRoute({
	method: "get",
	path: "/audits/{token}/analysis",
	request: {
		params: z.object({
			token: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: analysisResponseSchema,
				},
			},
			description: "Full analysis results",
		},
		404: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string() }),
				},
			},
			description: "Audit not found, expired, or analysis not complete",
		},
	},
});

auditRoutes.openapi(getAuditAnalysisRoute, async (c) => {
	const { token } = c.req.valid("param");

	const audit = await auditRepo.getAuditByAccessToken(token);

	if (!audit) {
		return c.json({ error: "Audit not found" }, 404);
	}

	if (audit.expiresAt < new Date()) {
		return c.json({ error: "Audit link has expired" }, 404);
	}

	if (!audit.opportunities) {
		return c.json({ error: "Analysis not complete" }, 404);
	}

	const analysis = audit.opportunities as AnalysisResult;
	const detectedSections =
		(audit.detectedSections as SectionInfoResponse[]) ?? [];
	const healthScore = audit.healthScore as HealthScoreResponse | null;

	return c.json(
		buildAnalysisResponse(
			analysis,
			detectedSections,
			audit.siteUrl,
			healthScore,
			audit.tier,
		),
		200,
	);
});

const getAuditBriefsRoute = createRoute({
	method: "get",
	path: "/audits/{token}/briefs",
	request: {
		params: z.object({
			token: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.array(briefResponseSchema),
				},
			},
			description: "List of briefs",
		},
		404: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string() }),
				},
			},
			description: "Audit not found or expired",
		},
	},
});

auditRoutes.openapi(getAuditBriefsRoute, async (c) => {
	const { token } = c.req.valid("param");

	const audit = await auditRepo.getAuditByAccessToken(token);

	if (!audit) {
		return c.json({ error: "Audit not found" }, 404);
	}

	if (audit.expiresAt < new Date()) {
		return c.json({ error: "Audit link has expired" }, 404);
	}

	return c.json(audit.briefs.map(mapBriefToResponse), 200);
});

const getBriefRoute = createRoute({
	method: "get",
	path: "/briefs/{id}",
	request: {
		params: z.object({
			id: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: briefResponseSchema,
				},
			},
			description: "Brief details",
		},
		404: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string() }),
				},
			},
			description: "Brief not found",
		},
	},
});

auditRoutes.openapi(getBriefRoute, async (c) => {
	const { id } = c.req.valid("param");
	const brief = await briefRepo.getBriefById(id);

	if (!brief) {
		return c.json({ error: "Brief not found" }, 404);
	}

	return c.json(mapBriefToResponse(brief), 200);
});

// ============================================================================
// Brief Generation Endpoint (On-Demand)
// ============================================================================

const generateBriefsRequestSchema = z.object({
	clusterTopics: z
		.array(z.string())
		.min(1, "At least one cluster must be selected")
		.max(15, "Maximum 15 clusters allowed"),
});

const generateBriefsRoute = createRoute({
	method: "post",
	path: "/audits/{token}/briefs/generate",
	request: {
		params: z.object({
			token: z.string(),
		}),
		body: {
			content: {
				"application/json": {
					schema: generateBriefsRequestSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"text/event-stream": {
					schema: z.any(),
				},
			},
			description: "SSE stream of brief generation progress",
		},
		400: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string() }),
				},
			},
			description: "Invalid request or limit exceeded",
		},
		404: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string() }),
				},
			},
			description: "Audit not found or expired",
		},
	},
});

auditRoutes.openapi(generateBriefsRoute, async (c) => {
	const { token } = c.req.valid("param");
	const { clusterTopics } = c.req.valid("json");

	const audit = await auditRepo.getAuditByAccessToken(token);

	if (!audit) {
		return c.json({ error: "Audit not found" }, 404);
	}

	if (audit.expiresAt < new Date()) {
		return c.json({ error: "Audit link has expired" }, 404);
	}

	const tier = audit.tier as AuditTier;
	const limits = getLimits(tier, audit.isNewSite);

	// Check how many briefs already exist
	const existingBriefs = await briefRepo.getBriefsByAuditId(audit.id);
	const briefsRemaining = limits.briefs - existingBriefs.length;

	if (briefsRemaining <= 0) {
		return c.json({ error: "Brief limit reached for this tier" }, 400);
	}

	if (clusterTopics.length > briefsRemaining) {
		return c.json(
			{
				error: `Can only generate ${briefsRemaining} more briefs (limit: ${limits.briefs})`,
			},
			400,
		);
	}

	// Get clusters from pipeline state
	const pipelineState = audit.pipelineState as {
		results?: { opportunityClusters?: OpportunityCluster[] };
	} | null;
	const allClusters = pipelineState?.results?.opportunityClusters ?? [];

	if (allClusters.length === 0) {
		return c.json({ error: "No clusters available" }, 400);
	}

	// Filter to selected clusters
	const selectedClusters = allClusters.filter((c) =>
		clusterTopics.includes(c.topic),
	);

	if (selectedClusters.length === 0) {
		return c.json({ error: "No matching clusters found" }, 400);
	}

	// Get crawled pages for internal linking suggestions
	const crawledPages = await crawledPageRepo.getCrawledPagesByAuditId(audit.id);

	// Stream brief generation
	return streamSSE(c, async (stream) => {
		let generated = 0;
		let failed = 0;

		for (const cluster of selectedClusters) {
			try {
				// Send progress event
				await stream.writeSSE({
					event: "progress",
					data: JSON.stringify({
						current: generated + 1,
						total: selectedClusters.length,
						topic: cluster.topic,
					}),
				});

				// Generate the brief
				const brief = await generateSingleBrief(
					cluster,
					audit.productDesc,
					crawledPages.map((p) => ({
						url: p.url,
						title: p.title ?? "",
						h1: p.h1 ?? "",
						content: p.content ?? "",
						wordCount: p.wordCount ?? 0,
						section: p.section ?? "/",
						outboundLinks: (p.outboundLinks as string[]) ?? [],
						readabilityScore: p.readabilityScore ?? null,
						codeBlockCount: p.codeBlockCount ?? 0,
						imageCount: p.imageCount ?? 0,
						codeBlocks: (p.codeBlocks as string[]) ?? [],
						metaDescription: p.metaDescription ?? undefined,
						canonicalUrl: p.canonicalUrl ?? undefined,
						ogTitle: p.ogTitle ?? undefined,
						ogDescription: p.ogDescription ?? undefined,
						ogImage: p.ogImage ?? undefined,
						h1Count: p.h1Count ?? 1,
						h2s: (p.h2s as string[]) ?? [],
						h3s: (p.h3s as string[]) ?? [],
						imagesWithoutAlt: p.imagesWithoutAlt ?? 0,
						hasSchemaOrg: p.hasSchemaOrg ?? false,
						schemaTypes: (p.schemaTypes as string[]) ?? [],
						hasViewport: p.hasViewport ?? false,
					})),
				);

				// Store brief in database
				const storedBrief = await briefRepo.createBrief({
					auditId: audit.id,
					keyword: brief.keyword,
					searchVolume: brief.searchVolume,
					difficulty: brief.difficulty,
					title: brief.title,
					structure: brief.structure,
					questions: brief.questions,
					relatedKw: brief.relatedKw,
					competitors: brief.competitors,
					suggestedInternalLinks: brief.suggestedInternalLinks,
					clusteredKeywords: brief.clusteredKeywords,
					totalClusterVolume: brief.totalClusterVolume,
					intent: brief.intent,
					estimatedEffort: brief.estimatedEffort,
				});

				// Send brief event
				await stream.writeSSE({
					event: "brief",
					data: JSON.stringify(
						mapBriefToResponse({
							...storedBrief,
							competitors: brief.competitors,
						}),
					),
				});

				generated++;
			} catch (error) {
				log.error({ error, topic: cluster.topic }, "Brief generation failed");
				failed++;

				await stream.writeSSE({
					event: "error",
					data: JSON.stringify({
						topic: cluster.topic,
						error: error instanceof Error ? error.message : "Unknown error",
					}),
				});
			}
		}

		// Send completion event
		await stream.writeSSE({
			event: "done",
			data: JSON.stringify({ generated, failed }),
		});
	});
});

// ============================================================================
// Interactive Flow Selection Endpoints
// ============================================================================

const selectCompetitorsRequestSchema = z.object({
	competitors: z
		.array(z.string())
		.min(1, "Must select at least one competitor")
		.max(5, "Maximum 5 competitors allowed"),
});

const selectCompetitorsRoute = createRoute({
	method: "post",
	path: "/audits/{token}/competitors/select",
	request: {
		params: z.object({
			token: z.string(),
		}),
		body: {
			content: {
				"application/json": {
					schema: selectCompetitorsRequestSchema,
				},
			},
		},
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({ success: z.boolean() }),
				},
			},
			description: "Competitors selected, analysis started",
		},
		400: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string() }),
				},
			},
			description: "Invalid selection or wrong phase",
		},
		404: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string() }),
				},
			},
			description: "Audit not found or expired",
		},
	},
});

auditRoutes.openapi(selectCompetitorsRoute, async (c) => {
	const { token } = c.req.valid("param");
	const { competitors } = c.req.valid("json");

	const audit = await auditRepo.getAuditByAccessToken(token);

	if (!audit) {
		return c.json({ error: "Audit not found" }, 404);
	}

	if (audit.expiresAt < new Date()) {
		return c.json({ error: "Audit link has expired" }, 404);
	}

	// Verify we're in the right status
	if (audit.status !== "SELECTING_COMPETITORS") {
		return c.json(
			{
				error: `Invalid status: ${audit.status}, expected SELECTING_COMPETITORS`,
			},
			400,
		);
	}

	// Check tier limits
	const tier = audit.tier as AuditTier;
	const limits = getLimits(tier, audit.isNewSite);

	if (competitors.length > limits.competitors) {
		return c.json(
			{ error: `Max ${limits.competitors} competitors for ${tier} tier` },
			400,
		);
	}

	// Update audit with selected competitors and start analysis
	await auditRepo.updateAudit(audit.id, {
		selectedCompetitors: competitors,
		competitors, // Also update the legacy competitors field
		status: "ANALYZING",
	});

	emitAuditStatus(audit.id, "ANALYZING");

	// Queue final analysis job immediately
	const queue = await getQueue();
	await queueFinalAnalysisJob(queue, audit.id);

	log.info(
		{ auditId: audit.id, competitors: competitors.length },
		"Competitors selected, analysis started",
	);

	return c.json({ success: true }, 200);
});
