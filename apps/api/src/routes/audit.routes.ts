import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { streamSSE } from "hono/streaming";
import type { AppEnv } from "../app.js";
import { type AuditSSEEvent, subscribe } from "../lib/audit-events.js";
import * as auditRepo from "../repositories/audit.repository.js";
import * as briefRepo from "../repositories/brief.repository.js";
import {
	type AuditProgressResponse,
	type AuditStateResponse,
	type AuditTier,
	type ComponentStatesResponse,
	type HealthScoreResponse,
	type SearchIntentResponse,
	type SectionInfoResponse,
	type SectionStatsResponse,
	type UpgradeHints,
	analysisResponseSchema,
	auditResponseSchema,
	auditStateSchema,
	briefResponseSchema,
	createAuditSchema,
	discoverRequestSchema,
	discoverResponseSchema,
	tierLimits,
} from "../schemas/audit.schema.js";
import { generateTemplate } from "../services/brief/templates.js";
import {
	discoverSections,
	discoverSectionsStream,
} from "../services/crawler/crawler.js";
import type { AnalysisResult } from "../services/seo/analysis.js";
import type { AuditProgress } from "../types/audit-progress.js";

type StatusString = "pending" | "running" | "completed" | "retrying" | "failed";

function extractStatus(value: unknown): StatusString {
	if (typeof value === "string") return value as StatusString;
	if (value && typeof value === "object" && "status" in value) {
		return (value as { status: string }).status as StatusString;
	}
	return "pending";
}

function toProgressResponse(
	progress: AuditProgress | null,
): AuditProgressResponse | null {
	if (!progress) return null;
	return {
		crawl: extractStatus(progress.crawl),
		technicalIssues: extractStatus(progress.technicalIssues),
		internalLinking: extractStatus(progress.internalLinking),
		duplicateContent: extractStatus(progress.duplicateContent),
		redirectChains: extractStatus(progress.redirectChains),
		coreWebVitals: extractStatus(progress.coreWebVitals),
		currentRankings: extractStatus(progress.currentRankings),
		competitorAnalysis: extractStatus(progress.competitorAnalysis),
		keywordOpportunities: extractStatus(progress.keywordOpportunities),
		intentClassification: extractStatus(progress.intentClassification),
		keywordClustering: extractStatus(progress.keywordClustering),
		quickWins: extractStatus(progress.quickWins),
		briefs: extractStatus(progress.briefs),
		retryCount: progress.retryCount ?? 0,
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
	const limits = tierLimits[tier];
	const displayedOpportunities =
		limits.keywords === "all"
			? totalOpportunities
			: Math.min(totalOpportunities, limits.keywords);

	const tierUpgrades: UpgradeHints["tierUpgrades"] = {};
	const tiers: AuditTier[] = ["SCAN", "AUDIT", "DEEP_DIVE"];
	for (const t of tiers) {
		if (t !== tier) {
			const l = tierLimits[t];
			tierUpgrades[t] = {
				keywords: l.keywords,
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
	coreWebVitals?: AnalysisResult["coreWebVitals"],
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
	const limits = tierLimits[tier];

	// Filter opportunities based on tier
	const opportunities =
		limits.keywords === "all"
			? allOpportunities
			: allOpportunities.slice(0, limits.keywords);

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
		cannibalizationIssues: analysis.cannibalizationIssues ?? [],
		snippetOpportunities: analysis.snippetOpportunities ?? [],
		sectionStats,
		healthScore,
		discoveredCompetitors: analysis.discoveredCompetitors ?? [],
		upgradeHints: buildUpgradeHints(tier, allOpportunities.length),
		coreWebVitals,
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
	progress: unknown;
	opportunities: unknown;
	healthScore: unknown;
	briefs: BriefDbModel[];
};

type ComponentStatus = "pending" | "running" | "completed" | "failed";

function getProgressStatus(
	progress: AuditProgress | null,
	key: keyof AuditProgress,
): ComponentStatus {
	if (!progress) return "pending";
	const value = progress[key];
	if (typeof value === "string") return value as ComponentStatus;
	if (value && typeof value === "object" && "status" in value) {
		return (value as { status: string }).status as ComponentStatus;
	}
	return "pending";
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

function buildAuditState(audit: AuditDbModel): AuditStateResponse {
	const progress = audit.progress as AuditProgress | null;
	const analysis = audit.opportunities as AnalysisResult | null;
	const healthScore = audit.healthScore as HealthScoreResponse | null;

	// Build component states from progress + analysis data
	const components: ComponentStatesResponse = {
		crawl: buildComponentState(getProgressStatus(progress, "crawl"), null),
		technical: buildComponentState(
			getProgressStatus(progress, "technicalIssues"),
			analysis?.technicalIssues ?? [],
		),
		internalLinking: buildComponentState(
			getProgressStatus(progress, "internalLinking"),
			analysis?.internalLinkingIssues ?? {
				orphanPages: [],
				underlinkedPages: [],
			},
		),
		duplicateContent: buildComponentState(
			getProgressStatus(progress, "duplicateContent"),
			[], // Not stored separately yet
		),
		redirectChains: buildComponentState(
			getProgressStatus(progress, "redirectChains"),
			[], // Not stored separately yet
		),
		coreWebVitals: buildComponentState(
			getProgressStatus(progress, "coreWebVitals"),
			analysis?.coreWebVitals,
		),
		rankings: buildComponentState(
			getProgressStatus(progress, "currentRankings"),
			analysis?.currentRankings ?? [],
		),
		opportunities: buildComponentState(
			getProgressStatus(progress, "keywordOpportunities"),
			analysis?.opportunities ?? [],
		),
		quickWins: buildComponentState(
			getProgressStatus(progress, "quickWins"),
			analysis?.quickWins ?? [],
		),
		competitors: buildComponentState(
			getProgressStatus(progress, "competitorAnalysis"),
			{
				gaps: analysis?.competitorGaps ?? [],
				discovered: analysis?.discoveredCompetitors ?? [],
			},
		),
		cannibalization: buildComponentState(
			getProgressStatus(progress, "cannibalization"),
			analysis?.cannibalizationIssues ?? [],
		),
		snippets: buildComponentState(
			getProgressStatus(progress, "snippetOpportunities"),
			analysis?.snippetOpportunities ?? [],
		),
		briefs: buildComponentState(
			getProgressStatus(progress, "briefs"),
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

	// Derive isNewSite from rankings
	const currentRankings = analysis?.currentRankings ?? [];
	const isNewSite = currentRankings.length === 0;

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
		components,
		cwvStream: [], // Populated via SSE during analysis
		isNewSite,
		opportunityClusters: analysis?.opportunityClusters,
		actionPlan: analysis?.actionPlan,
		healthScore,
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
		if (audit.progress) {
			const progress = toProgressResponse(
				audit.progress as AuditProgress | null,
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
					console.error("[audit-stream] Error writing SSE:", err);
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

	const audit = await auditRepo.createAudit({
		siteUrl: body.siteUrl,
		productDesc: body.productDesc,
		competitors: body.competitors,
		sections: body.sections ?? [],
		tier: body.tier,
		email: body.email,
	});

	return c.json(
		{
			accessToken: audit.accessToken,
			status: audit.status,
			siteUrl: audit.siteUrl,
			productDesc: audit.productDesc,
			competitors: audit.competitors,
			sections: audit.sections,
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
		progress: audit.progress,
		opportunities: audit.opportunities,
		healthScore: audit.healthScore,
		briefs: audit.briefs,
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
			analysis.coreWebVitals,
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
