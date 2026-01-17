/**
 * Final Analysis Job - Runs after user completes interactive selection
 *
 * Waits for crawl to complete if needed, then runs all analysis components.
 */

import type PgBoss from "pg-boss";
import {
	emitAuditComplete,
	emitAuditStatus,
	emitBriefRecommendations,
	emitComponentComplete,
	emitComponentFail,
	emitComponentStart,
	emitHealthScore,
} from "../lib/audit-events.js";
import { createLogger } from "../lib/logger.js";
import * as auditRepo from "../repositories/audit.repository.js";
import { getPagesByAuditId } from "../repositories/crawled-page.repository.js";
import type { AuditTier } from "../schemas/audit.schema.js";
import { buildHealthScoreInput } from "../services/audit-completion.service.js";
import { buildBriefRecommendations } from "../services/brief-recommendations.js";
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

const log = createLogger("final-analysis.job");

export type FinalAnalysisJobData = {
	auditId: string;
};

const JOB_OPTIONS: PgBoss.SendOptions = {
	retryLimit: 3,
	retryDelay: 30,
	retryBackoff: true,
	expireInSeconds: 900, // 15 min for full analysis
};

const CRAWL_WAIT_INTERVAL_MS = 2000;
const CRAWL_MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutes

export async function registerFinalAnalysisJob(boss: PgBoss): Promise<void> {
	await boss.createQueue("audit.final-analysis");

	await boss.work<FinalAnalysisJobData>(
		"audit.final-analysis",
		async (jobs) => {
			for (const job of jobs) {
				const { auditId } = job.data;
				const jobLog = createLogger("final-analysis.job", {
					auditId,
					jobId: job.id,
				});
				jobLog.info("Starting final analysis");

				try {
					await processFinalAnalysis(auditId, jobLog);
				} catch (error) {
					jobLog.error({ error }, "Final analysis failed");
					await auditRepo.updateAudit(auditId, { status: "FAILED" });
					throw error;
				}
			}
		},
	);

	log.info("Final analysis job handler registered");
}

async function processFinalAnalysis(
	auditId: string,
	jobLog: ReturnType<typeof createLogger>,
): Promise<void> {
	let audit = await auditRepo.getAuditById(auditId);
	if (!audit) {
		throw new Error(`Audit ${auditId} not found`);
	}

	// Wait for crawl to complete if needed
	const startWait = Date.now();
	while (!audit.crawlComplete) {
		if (Date.now() - startWait > CRAWL_MAX_WAIT_MS) {
			throw new Error("Timeout waiting for crawl to complete");
		}
		jobLog.debug("Waiting for crawl to complete...");
		await sleep(CRAWL_WAIT_INTERVAL_MS);
		audit = await auditRepo.getAuditById(auditId);
		if (!audit) {
			throw new Error(`Audit ${auditId} disappeared`);
		}
	}

	jobLog.info("Crawl complete, running analysis");

	const tier = audit.tier as AuditTier;
	const pages = await getPagesByAuditId(auditId);

	if (pages.length === 0) {
		throw new Error("No crawled pages found");
	}

	// Build pipeline input
	const redirectChains = (audit.redirectChains ?? []) as RedirectChain[];
	const pipelineInput: PipelineInput = {
		auditId,
		siteUrl: audit.siteUrl,
		pages,
		competitors: audit.selectedCompetitors,
		targetKeywords: audit.targetKeywords,
		productDesc: audit.productDesc,
		tier,
		crawlMetadata: {
			hasRobotsTxt: audit.hasRobotsTxt ?? false,
			hasSitemap: audit.hasSitemap ?? false,
			redirectChains,
			brokenLinks: [],
			robotsTxtContent: audit.robotsTxtContent ?? null,
			hasLlmsTxt: false,
		},
		isNewSite: audit.isNewSite,
	};

	// Get all components for this tier
	const componentsToRun = getComponentsForTier(tier, audit.isNewSite);

	// Initialize pipeline state
	let state: PipelineState = createEmptyPipelineState();

	// Pipeline callbacks for SSE updates
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

	// Check if all completed
	if (!isAllCompleted(state, componentsToRun)) {
		jobLog.warn("Some components failed, marking audit as failed");
		await auditRepo.updateAudit(auditId, { status: "FAILED" });
		return;
	}

	// Calculate health score
	const healthScore = calculateHealthScore(
		buildHealthScoreInput(state),
		pages.length,
		{
			isFreeTier: tier === "FREE",
			isNewSite: audit.isNewSite ?? false,
		},
	);

	// Complete the audit
	await auditRepo.updateAudit(auditId, {
		status: "COMPLETED",
		completedAt: new Date(),
		pipelineState: state,
		healthScore,
		opportunities: state.results,
	});

	// Build and emit brief recommendations
	const briefRecommendations = buildBriefRecommendations({
		targetKeywords: audit.targetKeywords ?? [],
		quickWins: state.results.quickWins ?? [],
		opportunities: state.results.opportunities ?? [],
	});
	if (briefRecommendations.length > 0) {
		emitBriefRecommendations(auditId, briefRecommendations);
	}

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

	jobLog.info({ tier, pages: pages.length }, "Final analysis complete");
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function queueFinalAnalysisJob(
	boss: PgBoss,
	auditId: string,
): Promise<void> {
	log.info({ auditId }, "Queueing final analysis job");
	const jobId = await boss.send(
		"audit.final-analysis",
		{ auditId },
		JOB_OPTIONS,
	);
	if (!jobId) {
		throw new Error("Failed to queue final analysis job");
	}
	log.info({ auditId, jobId }, "Final analysis job queued");
}
