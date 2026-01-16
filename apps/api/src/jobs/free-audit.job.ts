/**
 * Free Audit Job - Complete flow for FREE tier
 *
 * Crawls and analyzes in one shot, no interactive flow.
 */

import type PgBoss from "pg-boss";
import {
	emitAuditComplete,
	emitAuditStatus,
	emitComponentComplete,
	emitComponentFail,
	emitComponentStart,
	emitCrawlPages,
	emitHealthScore,
} from "../lib/audit-events.js";
import { createLogger } from "../lib/logger.js";
import * as auditRepo from "../repositories/audit.repository.js";
import * as crawledPageRepo from "../repositories/crawled-page.repository.js";
import { getLimits } from "../schemas/audit.schema.js";
import type { AuditTier } from "../schemas/audit.schema.js";
import { buildHealthScoreInput } from "../services/audit-completion.service.js";
import { crawlDocs } from "../services/crawler/crawler.js";
import type { RedirectChain } from "../services/crawler/types.js";
import { sendReportReadyEmail } from "../services/email.service.js";
import type { SSEComponentKey } from "../services/seo/components/types.js";
import { calculateHealthScore } from "../services/seo/health-score.js";
import {
	type PipelineCallbacks,
	type PipelineInput,
	getComponentsForTier,
	isAllCompleted,
	runPipeline,
} from "../services/seo/pipeline-runner.js";
import {
	type PipelineState,
	createEmptyPipelineState,
} from "../types/audit-state.js";

const log = createLogger("free-audit.job");

export type FreeAuditJobData = {
	auditId: string;
};

const JOB_OPTIONS: PgBoss.SendOptions = {
	retryLimit: 3,
	retryDelay: 30,
	retryBackoff: true,
	expireInSeconds: 600,
};

export async function registerFreeAuditJob(boss: PgBoss): Promise<void> {
	await boss.createQueue("audit.free");

	await boss.work<FreeAuditJobData>("audit.free", async (jobs) => {
		for (const job of jobs) {
			const { auditId } = job.data;
			const jobLog = createLogger("free-audit.job", { auditId, jobId: job.id });
			jobLog.info("Starting FREE tier audit");

			try {
				await processFreeAudit(auditId, jobLog);
			} catch (error) {
				jobLog.error({ error }, "FREE audit failed");
				await auditRepo.updateAudit(auditId, { status: "FAILED" });
				throw error;
			}
		}
	});

	log.info("Free audit job handler registered");
}

async function processFreeAudit(
	auditId: string,
	jobLog: ReturnType<typeof createLogger>,
): Promise<void> {
	const audit = await auditRepo.getAuditById(auditId);
	if (!audit) {
		throw new Error(`Audit ${auditId} not found`);
	}

	const tier = audit.tier as AuditTier;
	const limits = getLimits(tier, audit.isNewSite);

	// Update status to CRAWLING
	await auditRepo.updateAudit(auditId, {
		status: "CRAWLING",
		startedAt: new Date(),
	});
	emitAuditStatus(auditId, "CRAWLING");

	// Crawl
	const sectionsFilter = audit.sections.length > 0 ? audit.sections : undefined;
	const crawlResult = await crawlDocs(
		audit.siteUrl,
		limits.pages,
		sectionsFilter,
		async (sitemapUrlCount) => {
			await auditRepo.updateAudit(auditId, { sitemapUrlCount });
		},
	);

	if (crawlResult.pages.length === 0) {
		throw new Error("No pages crawled - site may be inaccessible");
	}

	// Store pages
	await crawledPageRepo.deleteCrawledPagesByAuditId(auditId);
	await crawledPageRepo.createManyCrawledPages(
		crawlResult.pages.map((page) => ({
			auditId,
			url: page.url,
			title: page.title,
			h1: page.h1,
			content: page.content,
			wordCount: page.wordCount,
			section: page.section,
			outboundLinks: page.outboundLinks,
			readabilityScore: page.readabilityScore,
			codeBlockCount: page.codeBlockCount,
			imageCount: page.imageCount,
			codeBlocks: page.codeBlocks,
			metaDescription: page.metaDescription,
			canonicalUrl: page.canonicalUrl,
			ogTitle: page.ogTitle,
			ogDescription: page.ogDescription,
			ogImage: page.ogImage,
			h1Count: page.h1Count ?? 1,
			h2s: page.h2s ?? [],
			h3s: page.h3s ?? [],
			imagesWithoutAlt: page.imagesWithoutAlt ?? 0,
			hasSchemaOrg: page.hasSchemaOrg ?? false,
			schemaTypes: page.schemaTypes ?? [],
			hasViewport: page.hasViewport ?? false,
		})),
	);

	await auditRepo.updateAudit(auditId, {
		pagesFound: crawlResult.pages.length,
		detectedSections: crawlResult.sections,
		hasRobotsTxt: crawlResult.hasRobotsTxt,
		hasSitemap: crawlResult.hasSitemap,
		redirectChains: crawlResult.redirectChains,
		crawlComplete: true,
	});

	emitCrawlPages(
		auditId,
		crawlResult.pages.length,
		crawlResult.sitemapUrlCount,
	);
	jobLog.info({ pagesFound: crawlResult.pages.length }, "Crawl complete");

	// Update status to ANALYZING
	await auditRepo.updateAudit(auditId, { status: "ANALYZING" });
	emitAuditStatus(auditId, "ANALYZING");

	// Build pipeline input
	const redirectChains = (crawlResult.redirectChains ?? []) as RedirectChain[];
	const pipelineInput: PipelineInput = {
		auditId,
		siteUrl: audit.siteUrl,
		pages: crawlResult.pages,
		competitors: [],
		targetKeywords: audit.targetKeywords,
		productDesc: audit.productDesc,
		tier,
		crawlMetadata: {
			hasRobotsTxt: crawlResult.hasRobotsTxt,
			hasSitemap: crawlResult.hasSitemap,
			redirectChains,
			brokenLinks: crawlResult.brokenLinks,
			robotsTxtContent: crawlResult.robotsTxtContent,
			hasLlmsTxt: crawlResult.hasLlmsTxt,
		},
		isNewSite: audit.isNewSite,
	};

	// Get components for FREE tier
	const componentsToRun = getComponentsForTier(tier, audit.isNewSite);

	// Initialize pipeline state
	let state: PipelineState = createEmptyPipelineState();

	// Pipeline callbacks
	const callbacks: PipelineCallbacks = {
		onStateUpdate: async (newState) => {
			state = newState;
			await auditRepo.updateAudit(auditId, { pipelineState: state });
		},
		onComponentStart: (key: SSEComponentKey) => {
			emitComponentStart(auditId, key);
		},
		onComponentComplete: (key: SSEComponentKey, data: unknown) => {
			emitComponentComplete(auditId, key, data);
		},
		onComponentFailed: (key: SSEComponentKey, error: string) => {
			emitComponentFail(auditId, key, error);
		},
	};

	// Run all components
	state = await runPipeline(pipelineInput, componentsToRun, state, callbacks);

	// Check completion
	if (!isAllCompleted(state, componentsToRun)) {
		jobLog.warn("Some components failed");
		await auditRepo.updateAudit(auditId, { status: "FAILED" });
		return;
	}

	// Calculate health score
	const healthScore = calculateHealthScore(
		buildHealthScoreInput(state),
		crawlResult.pages.length,
		{
			isFreeTier: tier === "FREE",
			isNewSite: audit.isNewSite ?? false,
		},
	);

	// Complete
	await auditRepo.updateAudit(auditId, {
		status: "COMPLETED",
		completedAt: new Date(),
		pipelineState: state,
		healthScore,
		opportunities: state.results,
	});

	// Emit health score before completion so frontend has data
	if (healthScore) {
		emitHealthScore(auditId, healthScore);
	}
	emitAuditStatus(auditId, "COMPLETED");
	emitAuditComplete(auditId);

	// Send report email
	try {
		await sendReportReadyEmail({
			to: audit.email,
			siteUrl: audit.siteUrl,
			accessToken: audit.accessToken,
			healthScore: healthScore?.score,
			healthGrade: healthScore?.grade,
			opportunitiesCount: state.results.opportunities?.length ?? 0,
			briefsCount: 0, // Briefs generated on-demand, not at completion
		});
		await auditRepo.updateAudit(auditId, { reportEmailSentAt: new Date() });
	} catch (error) {
		jobLog.error({ error }, "Failed to send report email");
	}

	jobLog.info({ pages: crawlResult.pages.length }, "FREE audit complete");
}

export async function queueFreeAuditJob(
	boss: PgBoss,
	auditId: string,
): Promise<void> {
	log.info({ auditId }, "Queueing FREE audit job");
	const jobId = await boss.send("audit.free", { auditId }, JOB_OPTIONS);
	if (!jobId) {
		throw new Error("Failed to queue FREE audit job");
	}
	log.info({ auditId, jobId }, "FREE audit job queued");
}
