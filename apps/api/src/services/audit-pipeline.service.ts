/**
 * Audit Pipeline Service
 *
 * Single source of truth for running audit components.
 * Both primary flow (after crawl) and retry flow call this.
 *
 * Key guarantees:
 * 1. Atomic progress updates before and after each component
 * 2. Stale detection - "running" > 10 min = treat as failed
 * 3. No stuck components - all failures are recoverable
 */

import { createLogger } from "../lib/logger.js";
import * as auditRepo from "../repositories/audit.repository.js";
import * as briefRepo from "../repositories/brief.repository.js";
import {
	type PageModel,
	deleteCrawledPagesByAuditId,
	getPagesByAuditId,
} from "../repositories/crawled-page.repository.js";
import { tierLimits } from "../schemas/audit.schema.js";
import {
	type AuditProgress,
	type ComponentKey,
	RETRYABLE_COMPONENTS,
	createInitialProgress,
	getComponentsToRun,
	incrementRetry,
	isComponentStale,
	isFullyCompleted,
	markComponentCompleted,
	markComponentFailed,
	markComponentRunning,
} from "../types/audit-progress.js";
import type { StoredAnalysisData } from "../types/stored-analysis.js";
import {
	generateReportToken,
	getReportTokenExpiry,
	sendReportReadyEmail,
} from "./email.service.js";
import {
	runBriefs,
	runCompetitorDiscovery,
	runCurrentRankings,
	runIntentClassification,
	runKeywordClustering,
	runKeywordData,
	runQuickWins,
} from "./seo/analysis-components.js";

const log = createLogger("audit-pipeline");

type AuditForPipeline = {
	id: string;
	siteUrl: string;
	competitors: string[];
	tier: string;
	productDesc: string | null;
	email: string;
	progress: unknown;
	opportunities: unknown;
};

export type RunPendingResult = {
	allDone: boolean;
	progress: AuditProgress;
	componentsRun: ComponentKey[];
	componentsFailed: ComponentKey[];
};

/**
 * Run all pending/failed/stale components for an audit.
 * Updates progress atomically before and after each component.
 *
 * @param audit - The audit to process
 * @returns Result with updated progress and completion status
 */
export async function runPendingComponents(
	audit: AuditForPipeline,
): Promise<RunPendingResult> {
	const pipelineLog = createLogger("pipeline", { auditId: audit.id });
	const hostname = new URL(audit.siteUrl).hostname;

	// Get or initialize progress
	let progress = (audit.progress as AuditProgress) ?? createInitialProgress();
	const analysisData = (audit.opportunities as StoredAnalysisData) ?? {};

	// Detect and reset stale components
	for (const component of RETRYABLE_COMPONENTS) {
		if (isComponentStale(progress[component])) {
			pipelineLog.warn(
				{ component },
				"Detected stale component, marking failed",
			);
			progress = markComponentFailed(
				progress,
				component,
				"Component timed out (stale)",
			);
			await saveProgress(audit.id, progress);
		}
	}

	// Get components that need to run
	const componentsToRun = getComponentsToRun(progress);
	if (componentsToRun.length === 0) {
		pipelineLog.debug("No components to run");
		return {
			allDone: isFullyCompleted(progress),
			progress,
			componentsRun: [],
			componentsFailed: [],
		};
	}

	pipelineLog.info(
		{ components: componentsToRun },
		"Running pending components",
	);

	const componentsRun: ComponentKey[] = [];
	const componentsFailed: ComponentKey[] = [];

	// Load pages once if needed for any component
	let pages: PageModel[] | null = null;
	const needsPages = componentsToRun.some(
		(c) => c === "quickWins" || c === "briefs",
	);
	if (needsPages) {
		pages = await getPagesByAuditId(audit.id);
	}

	// Run each component
	for (const component of componentsToRun) {
		const componentLog = createLogger("component", {
			auditId: audit.id,
			component,
		});

		// ATOMIC: Mark as running BEFORE we start
		progress = markComponentRunning(progress, component);
		await saveProgress(audit.id, progress);

		try {
			const result = await runComponent(
				component,
				hostname,
				audit,
				analysisData,
				pages,
			);

			if (result.ok) {
				// ATOMIC: Mark as completed AFTER success
				progress = markComponentCompleted(progress, component);
				await saveProgress(audit.id, progress);

				// Store component result if it has data
				if (result.data !== undefined) {
					await storeComponentResult(
						audit.id,
						component,
						result.data,
						analysisData,
					);
				}

				componentsRun.push(component);
				componentLog.info("Component completed");
			} else {
				// ATOMIC: Mark as failed AFTER failure
				progress = markComponentFailed(progress, component, result.error);
				await saveProgress(audit.id, progress);

				componentsFailed.push(component);
				componentLog.warn({ error: result.error }, "Component failed");
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			progress = markComponentFailed(progress, component, errorMessage);
			await saveProgress(audit.id, progress);

			componentsFailed.push(component);
			componentLog.error({ error: errorMessage }, "Component threw exception");
		}
	}

	// Increment retry count if we ran anything
	if (componentsRun.length > 0 || componentsFailed.length > 0) {
		progress = incrementRetry(progress);
		await saveProgress(audit.id, progress);
	}

	const allDone = isFullyCompleted(progress);
	pipelineLog.info(
		{
			allDone,
			ran: componentsRun.length,
			failed: componentsFailed.length,
		},
		"Pipeline run complete",
	);

	return { allDone, progress, componentsRun, componentsFailed };
}

/**
 * Complete an audit - generate token, update status, send email.
 * Called when all components are done.
 */
export async function completeAudit(auditId: string): Promise<void> {
	const completeLog = createLogger("complete", { auditId });

	const reportToken = generateReportToken();
	const reportTokenExpiresAt = getReportTokenExpiry();

	await auditRepo.updateAudit(auditId, {
		status: "COMPLETED",
		completedAt: new Date(),
		reportToken,
		reportTokenExpiresAt,
		retryAfter: null,
	});

	const audit = await auditRepo.getAuditById(auditId);
	if (!audit) {
		completeLog.error("Audit not found after completion");
		return;
	}

	const analysisData = audit.opportunities as StoredAnalysisData | null;
	const healthScore = analysisData?.healthScore;
	const opportunitiesCount = analysisData?.opportunities?.length ?? 0;
	const briefsCount = audit.briefs?.length ?? 0;

	try {
		await sendReportReadyEmail({
			to: audit.email,
			siteUrl: audit.siteUrl,
			reportToken,
			healthScore: healthScore?.score,
			healthGrade: healthScore?.grade,
			opportunitiesCount,
			briefsCount,
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

	// Cleanup crawled pages - no longer needed after completion
	await deleteCrawledPagesByAuditId(auditId);
	completeLog.debug("Cleaned up crawled pages");
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

async function saveProgress(
	auditId: string,
	progress: AuditProgress,
): Promise<void> {
	await auditRepo.updateAudit(auditId, { progress });
}

type ComponentRunResult =
	| { ok: true; data?: unknown }
	| { ok: false; error: string };

async function runComponent(
	component: ComponentKey,
	hostname: string,
	audit: AuditForPipeline,
	analysisData: StoredAnalysisData,
	pages: PageModel[] | null,
): Promise<ComponentRunResult> {
	switch (component) {
		case "currentRankings": {
			const result = await runCurrentRankings(hostname);
			if (result.ok) {
				return { ok: true, data: result.data };
			}
			return { ok: false, error: result.error };
		}

		case "competitorAnalysis": {
			const result = await runCompetitorDiscovery(hostname);
			if (result.ok) {
				return { ok: true, data: result.data };
			}
			return { ok: false, error: result.error };
		}

		case "keywordOpportunities": {
			// For now, just check if API is available
			const result = await runKeywordData([]);
			if (result.ok) {
				return { ok: true };
			}
			return { ok: false, error: result.error };
		}

		case "intentClassification": {
			const result = await runIntentClassification([]);
			if (result.ok) {
				return { ok: true };
			}
			return { ok: false, error: result.error };
		}

		case "keywordClustering": {
			const result = await runKeywordClustering([]);
			if (result.ok) {
				return { ok: true };
			}
			return { ok: false, error: result.error };
		}

		case "quickWins": {
			if (!analysisData.currentRankings || !pages || pages.length === 0) {
				return { ok: false, error: "Missing data for quick wins" };
			}
			const result = await runQuickWins(analysisData.currentRankings, pages);
			if (result.ok) {
				return { ok: true, data: result.data };
			}
			return { ok: false, error: result.error };
		}

		case "briefs": {
			if (!analysisData.opportunities || !pages || pages.length === 0) {
				return { ok: false, error: "Missing data for briefs" };
			}
			const tierKey = audit.tier as keyof typeof tierLimits;
			const limits = tierLimits[tierKey] ?? tierLimits.FREE;

			const result = await runBriefs(
				analysisData.opportunities,
				audit.productDesc,
				pages,
				limits.briefs,
				analysisData.opportunityClusters, // Reuse existing clusters
			);

			if (result.ok) {
				// Store briefs in database
				for (const brief of result.data.briefs) {
					await briefRepo.createBrief({
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
					});
				}
				return { ok: true };
			}
			return { ok: false, error: result.error };
		}

		// Local components should already be completed
		default:
			return { ok: true };
	}
}

async function storeComponentResult(
	auditId: string,
	component: ComponentKey,
	data: unknown,
	existingData: StoredAnalysisData,
): Promise<void> {
	const fieldMap: Partial<Record<ComponentKey, keyof StoredAnalysisData>> = {
		currentRankings: "currentRankings",
		competitorAnalysis: "competitorGaps",
		quickWins: "quickWins",
		actionPlan: "actionPlan",
	};

	const field = fieldMap[component];
	if (field) {
		await auditRepo.updateAudit(auditId, {
			opportunities: {
				...existingData,
				[field]: data,
			},
		});
	}
}
