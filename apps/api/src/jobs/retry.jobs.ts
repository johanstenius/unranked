/**
 * Retry Jobs - Recovery trigger for failed components
 *
 * Flow:
 * 1. Cron runs every 5 minutes
 * 2. Find RETRYING audits where retryAfter < now
 * 3. Call pipeline service to run pending components
 * 4. Handle 24h timeout, delay emails, support alerts
 */

import type PgBoss from "pg-boss";
import { createLogger } from "../lib/logger.js";
import * as auditRepo from "../repositories/audit.repository.js";
import { deleteCrawledPagesByAuditId } from "../repositories/crawled-page.repository.js";
import {
	completeAudit,
	runPendingComponents,
} from "../services/audit-pipeline.service.js";
import {
	sendAuditDelayEmail,
	sendAuditFailureEmail,
	sendReportReadyEmail,
	sendSupportAlertEmail,
} from "../services/email.service.js";
import {
	type AuditProgress,
	createInitialProgress,
	getComponentsToRun,
	markComponentCompleted,
} from "../types/audit-progress.js";
import type {
	StoredAnalysisData,
	StoredHealthScore,
} from "../types/stored-analysis.js";

const log = createLogger("retry-jobs");

const RETRY_CONFIG = {
	delayEmailAfterMs: 60 * 60 * 1000, // 1 hour
	maxRetryWindowMs: 24 * 60 * 60 * 1000, // 24 hours
	retryIntervalMs: 15 * 60 * 1000, // 15 minutes between retries
	staleThresholdMinutes: 30, // Consider stuck after 30 min
	supportAlertAfterRetries: 5, // Alert support after 5 failed retries
} as const;

export async function registerRetryJobs(boss: PgBoss): Promise<void> {
	log.info("Registering retry job handlers");

	await boss.createQueue("audit.retry-check");

	// Schedule retry check every 5 minutes
	await boss.schedule("audit.retry-check", "*/5 * * * *", {});
	log.info("Retry check scheduled (every 5 minutes)");

	await boss.work("audit.retry-check", async () => {
		log.debug("Running retry check");

		// 1. Recover stale audits stuck in processing
		await recoverStaleAudits();

		// 2. Process audits needing retry
		await processRetryingAudits();

		// 3. Handle expired audits (past 24h)
		await handleExpiredAudits();

		// 4. Retry failed report emails
		await retryMissingReportEmails();
	});

	log.info("Retry job handlers registered");
}

/**
 * Find audits stuck in ANALYZING and move to RETRYING
 */
async function recoverStaleAudits(): Promise<void> {
	const staleAudits = await auditRepo.getStaleProcessingAudits(
		RETRY_CONFIG.staleThresholdMinutes,
	);

	for (const audit of staleAudits) {
		const auditLog = createLogger("stale-recovery", { auditId: audit.id });
		auditLog.warn(
			{ status: audit.status },
			"Found stale audit, moving to RETRYING",
		);

		// Initialize progress if missing, marking local components as completed
		let progress = (audit.progress as AuditProgress) ?? createInitialProgress();

		// If no progress, mark local components completed (crawl succeeded if we got here)
		if (!audit.progress) {
			progress = markComponentCompleted(progress, "crawl");
			progress = markComponentCompleted(progress, "technicalIssues");
			progress = markComponentCompleted(progress, "internalLinking");
			progress = markComponentCompleted(progress, "duplicateContent");
			progress = markComponentCompleted(progress, "redirectChains");
		}

		await auditRepo.updateAudit(audit.id, {
			status: "RETRYING",
			progress,
			retryAfter: new Date(), // Retry immediately
		});

		auditLog.info("Stale audit recovered to RETRYING status");
	}

	if (staleAudits.length > 0) {
		log.info({ count: staleAudits.length }, "Recovered stale audits");
	}
}

/**
 * Process audits in RETRYING status
 */
async function processRetryingAudits(): Promise<void> {
	const auditsToRetry = await auditRepo.getAuditsNeedingRetry();
	log.debug({ count: auditsToRetry.length }, "Found audits needing retry");

	for (const audit of auditsToRetry) {
		const auditLog = createLogger("retry", { auditId: audit.id });
		const progress =
			(audit.progress as AuditProgress) ?? createInitialProgress();
		const ageMs = Date.now() - audit.createdAt.getTime();

		// Check 24h timeout
		if (ageMs > RETRY_CONFIG.maxRetryWindowMs) {
			auditLog.info("Audit exceeded 24h retry window, marking as failed");
			await handleAuditTimeout(
				audit.id,
				audit.email,
				audit.siteUrl,
				audit.tier,
			);
			continue;
		}

		// Check if delay email should be sent (>1 hour and not sent yet)
		if (ageMs > RETRY_CONFIG.delayEmailAfterMs && !audit.delayEmailSentAt) {
			auditLog.info("Sending delay notification email");
			try {
				await sendAuditDelayEmail({
					to: audit.email,
					siteUrl: audit.siteUrl,
					auditId: audit.id,
				});
				await auditRepo.updateAudit(audit.id, {
					delayEmailSentAt: new Date(),
				});
			} catch (emailError) {
				auditLog.error({ error: emailError }, "Failed to send delay email");
			}
		}

		// Check if support should be alerted (after N retries for paid audits)
		const retryingComponents = getComponentsToRun(progress);
		if (
			progress.retryCount >= RETRY_CONFIG.supportAlertAfterRetries &&
			!audit.supportAlertSentAt
		) {
			const isPaid = audit.tier !== "FREE";
			if (isPaid) {
				auditLog.warn(
					{ retryCount: progress.retryCount },
					"Alerting support - paid audit struggling",
				);
			}
			try {
				await sendSupportAlertEmail({
					auditId: audit.id,
					siteUrl: audit.siteUrl,
					email: audit.email,
					tier: audit.tier,
					retryCount: progress.retryCount,
					failingComponents: retryingComponents,
				});
				await auditRepo.updateAudit(audit.id, {
					supportAlertSentAt: new Date(),
				});
			} catch (alertError) {
				auditLog.error({ error: alertError }, "Failed to send support alert");
			}
		}

		// Skip if no components need retry
		if (retryingComponents.length === 0) {
			auditLog.debug("No components to retry");
			continue;
		}

		auditLog.info(
			{ components: retryingComponents },
			"Retrying failed components via pipeline service",
		);

		// Run pending components via pipeline service
		const pipelineResult = await runPendingComponents({
			id: audit.id,
			siteUrl: audit.siteUrl,
			competitors: audit.competitors,
			tier: audit.tier,
			productDesc: audit.productDesc,
			email: audit.email,
			progress,
			opportunities: audit.opportunities,
		});

		if (pipelineResult.allDone) {
			auditLog.info("All components completed after retry");
			await completeAudit(audit.id);
		} else {
			// Schedule next retry
			const nextRetry = new Date(Date.now() + RETRY_CONFIG.retryIntervalMs);
			await auditRepo.updateAudit(audit.id, {
				retryAfter: nextRetry,
			});
			auditLog.info(
				{
					nextRetry,
					ran: pipelineResult.componentsRun.length,
					failed: pipelineResult.componentsFailed.length,
				},
				"Scheduled next retry",
			);
		}
	}
}

/**
 * Handle audits that exceeded the 24h retry window
 */
async function handleExpiredAudits(): Promise<void> {
	const expiredAudits = await auditRepo.getExpiredRetryingAudits(24);
	for (const audit of expiredAudits) {
		log.info({ auditId: audit.id }, "Handling expired audit");
		await handleAuditTimeout(audit.id, audit.email, audit.siteUrl, audit.tier);
	}
}

async function handleAuditTimeout(
	auditId: string,
	email: string,
	siteUrl: string,
	tier: string,
): Promise<void> {
	const auditLog = createLogger("retry", { auditId });

	try {
		await sendAuditFailureEmail({
			to: email,
			siteUrl,
			auditId,
		});
	} catch (emailError) {
		auditLog.error({ error: emailError }, "Failed to send failure email");
	}

	const isPaid = tier !== "FREE";
	await auditRepo.updateAudit(auditId, {
		status: "FAILED",
		retryAfter: null,
	});

	// Cleanup crawled pages - no longer needed after failure
	await deleteCrawledPagesByAuditId(auditId);

	if (isPaid) {
		auditLog.warn("Paid audit failed after 24h - needs refund review");
	}
}

/**
 * Retry sending report emails for completed audits where email failed
 */
async function retryMissingReportEmails(): Promise<void> {
	const auditsNeedingEmail = await auditRepo.getAuditsMissingReportEmail();

	if (auditsNeedingEmail.length === 0) {
		return;
	}

	log.info(
		{ count: auditsNeedingEmail.length },
		"Retrying missing report emails",
	);

	for (const audit of auditsNeedingEmail) {
		const auditLog = createLogger("retry-email", { auditId: audit.id });

		// Skip FREE tier - they don't receive emails
		if (audit.tier === "FREE") {
			continue;
		}

		const healthScore = audit.healthScore as StoredHealthScore | null;
		const analysisData = audit.opportunities as StoredAnalysisData | null;

		try {
			await sendReportReadyEmail({
				to: audit.email,
				siteUrl: audit.siteUrl,
				accessToken: audit.accessToken,
				healthScore: healthScore?.score,
				healthGrade: healthScore?.grade,
				opportunitiesCount: analysisData?.opportunities?.length ?? 0,
				briefsCount: audit.briefs?.length ?? 0,
			});

			await auditRepo.updateAudit(audit.id, {
				reportEmailSentAt: new Date(),
			});

			auditLog.info("Report email sent successfully on retry");
		} catch (emailError) {
			auditLog.error({ error: emailError }, "Report email retry failed");
		}
	}
}
