/**
 * Audit Completion Service
 *
 * Shared logic for completing audits and sending emails.
 * Used by both audit.jobs.ts and retry.jobs.ts.
 */

import {
	emitAuditComplete,
	emitAuditStatus,
	emitHealthScore,
} from "../lib/audit-events.js";
import { createLogger } from "../lib/logger.js";
import * as auditRepo from "../repositories/audit.repository.js";
import { deleteCrawledPagesByAuditId } from "../repositories/crawled-page.repository.js";
import type { PipelineState } from "../types/audit-state.js";
import { sendReportReadyEmail } from "./email.service.js";
import { calculateHealthScore } from "./seo/health-score.js";
import { finalizeOpportunities } from "./seo/pipeline-runner.js";

const log = createLogger("audit-completion");

export type AuditTier = "FREE" | "SCAN" | "AUDIT" | "DEEP_DIVE";

/**
 * Build the input object for calculateHealthScore from pipeline state.
 */
export function buildHealthScoreInput(state: PipelineState) {
	return {
		technicalIssues: state.results.technicalIssues ?? [],
		internalLinkingIssues: state.results.internalLinkingIssues ?? {
			orphanPages: [],
			underlinkedPages: [],
		},
		opportunities: state.results.opportunities ?? [],
		currentRankings: state.results.currentRankings ?? [],
		quickWins: state.results.quickWins ?? [],
		competitorGaps: state.results.competitorGaps ?? [],
		snippetOpportunities: state.results.snippetOpportunities ?? [],
		opportunityClusters: state.results.opportunityClusters ?? [],
		discoveredCompetitors: state.results.discoveredCompetitors ?? [],
		actionPlan: state.results.actionPlan ?? [],
		aiReadiness: state.results.aiReadiness,
	};
}

/**
 * Build default crawl metadata for retry/admin contexts where we don't have full crawl data.
 */
export function buildDefaultCrawlMetadata(audit: {
	hasRobotsTxt?: boolean | null;
	hasSitemap?: boolean | null;
	redirectChains?: unknown;
}) {
	return {
		hasRobotsTxt: audit.hasRobotsTxt ?? false,
		hasSitemap: audit.hasSitemap ?? false,
		redirectChains: (audit.redirectChains ?? []) as Array<{
			originalUrl: string;
			finalUrl: string;
			hops: number;
			chain: string[];
		}>,
		brokenLinks: [] as Array<{
			sourceUrl: string;
			targetUrl: string;
			statusCode?: number;
		}>,
		robotsTxtContent: null as string | null,
		hasLlmsTxt: false,
	};
}

export type CompleteAuditOptions = {
	auditId: string;
	state: PipelineState;
	pageCount: number;
	tier: AuditTier;
	email: string;
	siteUrl: string;
	accessToken: string;
};

/**
 * Finalize and complete an audit:
 * 1. Finalize opportunities
 * 2. Calculate health score
 * 3. Update status to COMPLETED
 * 4. Send report email (if paid tier)
 * 5. Cleanup crawled pages
 */
export async function completeAudit(
	options: CompleteAuditOptions,
): Promise<PipelineState> {
	const {
		auditId,
		state: inputState,
		pageCount,
		tier,
		email,
		siteUrl,
		accessToken,
	} = options;
	const completeLog = createLogger("complete", { auditId });

	// Finalize opportunities
	const state = finalizeOpportunities(inputState);

	// Calculate health score
	const healthScore = calculateHealthScore(
		buildHealthScoreInput(state),
		pageCount,
		{
			isFreeTier: tier === "FREE",
			isNewSite: state.isNewSite ?? false,
			tier,
		},
	);

	emitHealthScore(auditId, healthScore);

	// Update audit with final state
	await auditRepo.updateAudit(auditId, {
		pipelineState: state,
		healthScore,
		apiUsage: state.usage,
		status: "COMPLETED",
		completedAt: new Date(),
		retryAfter: null,
	});

	emitAuditStatus(auditId, "COMPLETED");
	emitAuditComplete(auditId);

	// Send email for paid tiers
	if (tier !== "FREE") {
		try {
			await sendReportReadyEmail({
				to: email,
				siteUrl,
				accessToken,
				healthScore: healthScore.score,
				healthGrade: healthScore.grade,
				opportunitiesCount: state.results.opportunities?.length ?? 0,
				briefsCount: 0, // Briefs stored separately, caller can override if needed
			});

			await auditRepo.updateAudit(auditId, {
				reportEmailSentAt: new Date(),
			});

			completeLog.info("Audit completed and email sent");
		} catch (emailError) {
			completeLog.error(
				{ error: emailError },
				"Failed to send report email - retry job will handle",
			);
		}
	} else {
		completeLog.info("Audit completed (FREE tier - no email)");
	}

	// Cleanup crawled pages
	await deleteCrawledPagesByAuditId(auditId);
	completeLog.debug("Cleaned up crawled pages");

	return state;
}
