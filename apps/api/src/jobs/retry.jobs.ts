/**
 * Retry job for RETRYING audits.
 * Runs periodically to retry failed components and handle timeout logic.
 */

import type PgBoss from "pg-boss";
import { createLogger } from "../lib/logger.js";
import * as auditRepo from "../repositories/audit.repository.js";
import {
	sendAuditDelayEmail,
	sendAuditFailureEmail,
} from "../services/email.service.js";
import {
	type AuditProgress,
	CLAUDE_COMPONENTS,
	type ComponentKey,
	DATAFORSEO_COMPONENTS,
	getRetryingComponents,
	incrementRetry,
	isFullyCompleted,
	setComponentStatus,
} from "../types/audit-progress.js";

const log = createLogger("retry-jobs");

const RETRY_CONFIG = {
	delayEmailAfterMs: 60 * 60 * 1000, // 1 hour
	maxRetryWindowMs: 24 * 60 * 60 * 1000, // 24 hours
	retryIntervalMs: 15 * 60 * 1000, // 15 minutes between retries
} as const;

export async function registerRetryJobs(boss: PgBoss): Promise<void> {
	log.info("Registering retry job handlers");

	await boss.createQueue("audit.retry-check");

	// Schedule retry check every 5 minutes
	await boss.schedule("audit.retry-check", "*/5 * * * *", {});
	log.info("Retry check scheduled (every 5 minutes)");

	await boss.work("audit.retry-check", async () => {
		log.debug("Running retry check");

		// Get audits in RETRYING status that are ready for retry
		const auditsToRetry = await auditRepo.getAuditsNeedingRetry();
		log.debug({ count: auditsToRetry.length }, "Found audits needing retry");

		for (const audit of auditsToRetry) {
			const auditLog = createLogger("retry", { auditId: audit.id });
			const progress = audit.progress as AuditProgress | null;

			if (!progress) {
				auditLog.warn("Audit has no progress data, skipping");
				continue;
			}

			const ageMs = Date.now() - audit.createdAt.getTime();

			// Check 24h timeout
			if (ageMs > RETRY_CONFIG.maxRetryWindowMs) {
				auditLog.info("Audit exceeded 24h retry window, marking as failed");
				await handleAuditTimeout(audit.id, audit.email, audit.siteUrl);
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

			// Get components that need retry
			const retryingComponents = getRetryingComponents(progress);
			if (retryingComponents.length === 0) {
				auditLog.debug("No components to retry");
				continue;
			}

			auditLog.info(
				{ components: retryingComponents },
				"Retrying failed components",
			);

			// Retry each component (immutable updates)
			let updatedProgress = progress;

			for (const component of retryingComponents) {
				try {
					const success = await retryComponent(audit, component);
					if (success) {
						updatedProgress = setComponentStatus(
							updatedProgress,
							component,
							"completed",
						);
						auditLog.info({ component }, "Component retry succeeded");
					} else {
						auditLog.debug(
							{ component },
							"Component retry failed, will try again",
						);
					}
				} catch (error) {
					auditLog.error({ component, error }, "Component retry threw error");
				}
			}

			// Increment retry metadata
			updatedProgress = incrementRetry(updatedProgress);

			// Check if now complete
			if (isFullyCompleted(updatedProgress)) {
				auditLog.info("All components completed after retry");
				await auditRepo.updateAudit(audit.id, {
					progress: updatedProgress,
					status: "COMPLETED",
					completedAt: new Date(),
					retryAfter: null,
				});

				// Queue briefs job if needed
				// Note: In a real implementation, you'd queue the briefs job here
			} else {
				// Schedule next retry
				const nextRetry = new Date(Date.now() + RETRY_CONFIG.retryIntervalMs);
				await auditRepo.updateAudit(audit.id, {
					progress: updatedProgress,
					retryAfter: nextRetry,
				});
				auditLog.info({ nextRetry }, "Scheduled next retry");
			}
		}

		// Also check for expired retrying audits (past 24h)
		const expiredAudits = await auditRepo.getExpiredRetryingAudits(24);
		for (const audit of expiredAudits) {
			log.info({ auditId: audit.id }, "Handling expired audit");
			await handleAuditTimeout(audit.id, audit.email, audit.siteUrl);
		}
	});

	log.info("Retry job handlers registered");
}

async function handleAuditTimeout(
	auditId: string,
	email: string,
	siteUrl: string,
): Promise<void> {
	const auditLog = createLogger("retry", { auditId });

	try {
		// Send failure email
		await sendAuditFailureEmail({
			to: email,
			siteUrl,
			auditId,
		});
	} catch (emailError) {
		auditLog.error({ error: emailError }, "Failed to send failure email");
	}

	// Mark as failed
	await auditRepo.updateAudit(auditId, {
		status: "FAILED",
		retryAfter: null,
	});
}

async function retryComponent(
	audit: { id: string; siteUrl: string; competitors: string[] },
	component: ComponentKey,
): Promise<boolean> {
	const log = createLogger("retry-component", { auditId: audit.id, component });

	// Check if component is DataForSEO or Claude dependent
	const isDataForSeo = DATAFORSEO_COMPONENTS.includes(component);
	const isClaude = CLAUDE_COMPONENTS.includes(component);

	if (!isDataForSeo && !isClaude) {
		// Local components should never be in retrying state
		log.warn("Local component in retrying state, this should not happen");
		return true;
	}

	// For now, just check if the API is available
	// In a full implementation, you would re-run the specific component logic
	// This is a placeholder that returns true to simulate retry success in tests
	log.info("Retry component placeholder - would retry API call here");

	// Return false to simulate that retry is still needed
	// In production, this would actually call the API and return true on success
	return false;
}
