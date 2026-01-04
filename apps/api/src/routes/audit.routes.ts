import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";
import { streamSSE } from "hono/streaming";
import type { AppEnv } from "../app.js";
import * as auditRepo from "../repositories/audit.repository.js";
import * as briefRepo from "../repositories/brief.repository.js";
import {
	type AuditTier,
	type HealthScoreResponse,
	type SearchIntentResponse,
	type SectionInfoResponse,
	type SectionStatsResponse,
	type UpgradeHints,
	analysisResponseSchema,
	auditResponseSchema,
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
import { sendReportReadyEmail } from "../services/email.service.js";
import type { AnalysisResult } from "../services/seo/analysis.js";

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
					schema: auditResponseSchema,
				},
			},
			description: "Audit details",
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

	const storedAnalysis = audit.opportunities as AnalysisResult | null;

	return c.json(
		{
			accessToken: audit.accessToken,
			status: audit.status,
			siteUrl: audit.siteUrl,
			productDesc: audit.productDesc,
			competitors: audit.competitors,
			sections: audit.sections,
			detectedSections: audit.detectedSections as SectionInfoResponse[] | null,
			tier: audit.tier,
			pagesFound: audit.pagesFound,
			sitemapUrlCount: audit.sitemapUrlCount,
			currentRankings: storedAnalysis?.currentRankings ?? null,
			createdAt: audit.createdAt.toISOString(),
			completedAt: audit.completedAt?.toISOString() ?? null,
		},
		200,
	);
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

// Resend report email
const resendEmailRoute = createRoute({
	method: "post",
	path: "/audits/{token}/resend-email",
	request: {
		params: z.object({
			token: z.string(),
		}),
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: z.object({ success: z.boolean() }),
				},
			},
			description: "Email sent",
		},
		404: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string() }),
				},
			},
			description: "Audit not found or expired",
		},
		400: {
			content: {
				"application/json": {
					schema: z.object({ error: z.string() }),
				},
			},
			description: "Cannot resend email",
		},
	},
});

auditRoutes.openapi(resendEmailRoute, async (c) => {
	const { token } = c.req.valid("param");

	const audit = await auditRepo.getAuditByAccessToken(token);
	if (!audit) {
		return c.json({ error: "Audit not found" }, 404);
	}

	if (audit.expiresAt < new Date()) {
		return c.json({ error: "Audit link has expired" }, 404);
	}

	if (audit.status !== "COMPLETED") {
		return c.json({ error: "Audit not completed" }, 400);
	}

	if (!audit.email) {
		return c.json({ error: "No email address on audit" }, 400);
	}

	const storedAnalysis = audit.opportunities as AnalysisResult | null;
	const healthScore = audit.healthScore as HealthScoreResponse | null;

	await sendReportReadyEmail({
		to: audit.email,
		siteUrl: audit.siteUrl,
		accessToken: audit.accessToken,
		healthScore: healthScore?.score,
		healthGrade: healthScore?.grade,
		opportunitiesCount: storedAnalysis?.opportunities?.length ?? 0,
		briefsCount: audit.briefs.length,
	});

	return c.json({ success: true }, 200);
});
