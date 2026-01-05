/**
 * Audit Jobs - Primary crawl trigger
 *
 * Flow:
 * 1. Crawl pages
 * 2. Run local components (technical issues, internal linking, duplicates)
 * 3. Run external components (DataForSEO + AI)
 * 4. Calculate health score
 * 5. If all done → complete, else → RETRYING (retry job picks up)
 */

import type PgBoss from "pg-boss";
import {
	emit,
	emitCWVComplete,
	emitCWVPage,
	emitComponentCompleted,
	emitComponentRunning,
	emitHealth,
	emitStatus,
	listenerCount,
} from "../lib/audit-events.js";
import { createLogger } from "../lib/logger.js";
import * as auditRepo from "../repositories/audit.repository.js";
import * as crawledPageRepo from "../repositories/crawled-page.repository.js";
import { tierLimits } from "../schemas/audit.schema.js";
import {
	completeAudit,
	runPendingComponents,
} from "../services/audit-pipeline.service.js";
import { crawlDocs } from "../services/crawler/crawler.js";
import type { RedirectChain } from "../services/crawler/types.js";
import {
	selectPagesToAnalyze,
	streamCWV,
} from "../services/seo/components/cwv.js";
import type {
	CWVPageResult,
	CoreWebVitalsData,
	TierConfig,
} from "../services/seo/components/types.js";
import { clearSerpCache } from "../services/seo/dataforseo.js";
import { calculateHealthScore } from "../services/seo/health-score.js";
import {
	type PipelineInput,
	finalizeOpportunities,
	runExternalComponents,
	runLocalComponents,
} from "../services/seo/pipeline-runner.js";
import {
	type AuditProgress,
	createInitialProgress,
	markComponentCompleted,
} from "../types/audit-progress.js";

const log = createLogger("queue");

const CWV_CONCURRENCY = 15;

function summarizeCWV(pages: CWVPageResult[]): CoreWebVitalsData["summary"] {
	const validPages = pages.filter(
		(p) => p.status === "success" && p.performance != null,
	);

	if (validPages.length === 0) {
		return { good: 0, needsImprovement: 0, poor: 0, avgPerformance: null };
	}

	let good = 0;
	let needsImprovement = 0;
	let poor = 0;
	let totalPerformance = 0;

	for (const page of validPages) {
		const perf = page.performance as number;
		totalPerformance += perf;

		if (perf >= 90) {
			good++;
		} else if (perf >= 50) {
			needsImprovement++;
		} else {
			poor++;
		}
	}

	return {
		good,
		needsImprovement,
		poor,
		avgPerformance: totalPerformance / validPages.length,
	};
}

export type CrawlJobData = {
	auditId: string;
};

const JOB_OPTIONS: PgBoss.SendOptions = {
	retryLimit: 3,
	retryDelay: 30, // 30 seconds between retries
	retryBackoff: true, // Exponential backoff
	expireInSeconds: 600, // 10 minute timeout
};

async function markAuditFailed(auditId: string, error: unknown): Promise<void> {
	const auditLog = createLogger("audit", { auditId });
	const message = error instanceof Error ? error.message : "Unknown error";
	auditLog.error({ error: message }, "Audit failed");

	try {
		await auditRepo.updateAudit(auditId, {
			status: "FAILED",
		});
		// Cleanup crawled pages - no longer needed after failure
		await crawledPageRepo.deleteCrawledPagesByAuditId(auditId);
	} catch (updateError) {
		auditLog.error({ error: updateError }, "Failed to update status");
	}
}

export async function registerAuditJobs(boss: PgBoss): Promise<void> {
	log.info("Registering audit job handlers");

	await boss.createQueue("audit.crawl");
	log.info("Queues created");

	await boss.work<CrawlJobData>("audit.crawl", async (jobs) => {
		for (const job of jobs) {
			const { auditId } = job.data;
			const jobLog = createLogger("audit.crawl", { auditId, jobId: job.id });
			jobLog.info("Starting crawl");

			// Clear SERP cache at start of each audit
			clearSerpCache();

			try {
				const audit = await auditRepo.getAuditById(auditId);
				if (!audit) {
					throw new Error(`Audit ${auditId} not found`);
				}

				// Initialize progress
				let progress = createInitialProgress();

				await auditRepo.updateAudit(auditId, {
					status: "CRAWLING",
					progress,
					startedAt: new Date(),
				});
				emitStatus(auditId, "CRAWLING");

				// ============================================================
				// PHASE 1: Crawl pages
				// ============================================================
				emitComponentRunning(auditId, "crawl");
				const limits = tierLimits[audit.tier];
				const sectionsFilter =
					audit.sections.length > 0 ? audit.sections : undefined;
				const result = await crawlDocs(
					audit.siteUrl,
					limits.pages,
					sectionsFilter,
					async (sitemapUrlCount) => {
						await auditRepo.updateAudit(auditId, { sitemapUrlCount });
					},
				);

				if (result.pages.length === 0) {
					throw new Error("No pages crawled - site may be inaccessible");
				}

				// Store crawled pages
				await crawledPageRepo.deleteCrawledPagesByAuditId(auditId);
				await crawledPageRepo.createManyCrawledPages(
					result.pages.map((page) => ({
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
					pagesFound: result.pages.length,
					detectedSections: result.sections,
					hasRobotsTxt: result.hasRobotsTxt,
					hasSitemap: result.hasSitemap,
					redirectChains: result.redirectChains,
				});

				// Mark crawl completed
				progress = markComponentCompleted(progress, "crawl");
				await auditRepo.updateAudit(auditId, { progress });
				emitComponentCompleted(auditId, "crawl");

				jobLog.info({ pagesFound: result.pages.length }, "Crawl complete");

				// ============================================================
				// PHASE 2: Run pipeline components
				// ============================================================
				await auditRepo.updateAudit(auditId, { status: "ANALYZING" });
				emitStatus(auditId, "ANALYZING");

				const isFreeTier = audit.tier === "FREE";
				const redirectChains = (result.redirectChains ?? []) as RedirectChain[];

				// Build pipeline input
				const pipelineInput: PipelineInput = {
					auditId,
					siteUrl: audit.siteUrl,
					pages: result.pages,
					competitors: audit.competitors,
					productDesc: audit.productDesc,
					tier: audit.tier as "FREE" | "SCAN" | "AUDIT" | "DEEP_DIVE",
					crawlMetadata: {
						hasRobotsTxt: result.hasRobotsTxt,
						hasSitemap: result.hasSitemap,
						redirectChains,
						brokenLinks: result.brokenLinks,
					},
				};

				// Run local components (always succeed)
				emitComponentRunning(auditId, "technicalIssues");
				emitComponentRunning(auditId, "internalLinking");
				const localPipelineResult = await runLocalComponents(pipelineInput);

				// Mark local components completed and emit events
				progress = markComponentCompleted(progress, "technicalIssues");
				emitComponentCompleted(auditId, "technicalIssues");
				progress = markComponentCompleted(progress, "internalLinking");
				emitComponentCompleted(auditId, "internalLinking");
				progress = markComponentCompleted(progress, "duplicateContent");
				emitComponentCompleted(auditId, "duplicateContent");
				progress = markComponentCompleted(progress, "redirectChains");
				emitComponentCompleted(auditId, "redirectChains");

				// Store partial results so frontend can show results page
				const partialResults = {
					technicalIssues: localPipelineResult.results.technicalIssues ?? [],
					internalLinkingIssues: localPipelineResult.results
						.internalLinkingIssues ?? {
						orphanPages: [],
						underlinkedPages: [],
					},
					// Initialize empty arrays for data that will come later
					currentRankings: [],
					opportunities: [],
					opportunityClusters: [],
					quickWins: [],
					competitorGaps: [],
					cannibalizationIssues: [],
					snippetOpportunities: [],
					discoveredCompetitors: [],
					actionPlan: [],
				};

				await auditRepo.updateAudit(auditId, {
					progress,
					opportunities: partialResults,
				});

				// Emit event so frontend knows partial results are ready
				emit(auditId, { type: "partial-ready" as const });

				jobLog.info(
					{
						technicalIssues:
							localPipelineResult.results.technicalIssues?.length ?? 0,
					},
					"Local components complete, partial results stored",
				);

				// ============================================================
				// PHASE 2.5: Run Core Web Vitals with streaming
				// ============================================================
				const tierConfig: TierConfig = {
					tier: audit.tier as "FREE" | "SCAN" | "AUDIT" | "DEEP_DIVE",
					maxCompetitors: limits.competitors,
					maxSeeds: limits.seeds,
					maxBriefs: limits.briefs === -1 ? 100 : limits.briefs,
					maxSnippets: 10,
				};

				const cwvUrls = selectPagesToAnalyze(result.pages, tierConfig);
				jobLog.info(
					{ cwvPages: cwvUrls.length, urls: cwvUrls },
					"Starting CWV analysis",
				);

				emitComponentRunning(auditId, "coreWebVitals");
				const seenUrls = new Set<string>();
				const cwvResults = await streamCWV(
					cwvUrls,
					CWV_CONCURRENCY,
					async (pageResult) => {
						const isDuplicate = seenUrls.has(pageResult.url);
						seenUrls.add(pageResult.url);

						jobLog.info(
							{
								url: pageResult.url,
								performance: pageResult.performance,
								status: pageResult.status,
								error: pageResult.error,
								isDuplicate,
								hasListeners: listenerCount(auditId),
							},
							"CWV page result",
						);

						// Save to DB
						await crawledPageRepo.updateCWV(
							auditId,
							pageResult.url,
							pageResult,
						);
						// Emit SSE event
						emitCWVPage(auditId, pageResult);
					},
				);

				// Build CWV summary
				const coreWebVitals: CoreWebVitalsData = {
					pages: cwvResults,
					summary: summarizeCWV(cwvResults),
				};

				// Mark CWV completed and emit
				progress = markComponentCompleted(progress, "coreWebVitals");
				await auditRepo.updateAudit(auditId, { progress });
				emitComponentCompleted(auditId, "coreWebVitals");
				jobLog.info(
					{
						totalPages: cwvResults.length,
						summary: coreWebVitals.summary,
						hasListeners: listenerCount(auditId),
					},
					"Emitting CWV complete",
				);
				emitCWVComplete(auditId, coreWebVitals);

				jobLog.info(
					{
						cwvPages: cwvResults.length,
						avgPerformance: coreWebVitals.summary.avgPerformance,
					},
					"CWV complete",
				);

				// Add CWV to local results for pipeline
				const resultsWithCWV = {
					...localPipelineResult.results,
					coreWebVitals,
				};

				// Run external components (may fail, retryable)
				emitComponentRunning(auditId, "currentRankings");
				emitComponentRunning(auditId, "keywordOpportunities");
				const pipelineResult = await runExternalComponents(
					pipelineInput,
					resultsWithCWV,
					localPipelineResult.usage,
				);

				// Finalize opportunities
				const finalResults = finalizeOpportunities(pipelineResult.results);

				// Calculate health score
				const healthScore = calculateHealthScore(
					{
						technicalIssues: finalResults.technicalIssues ?? [],
						internalLinkingIssues: finalResults.internalLinkingIssues ?? {
							orphanPages: [],
							underlinkedPages: [],
						},
						opportunities: finalResults.opportunities ?? [],
						currentRankings: finalResults.currentRankings ?? [],
						quickWins: finalResults.quickWins ?? [],
						competitorGaps: finalResults.competitorGaps ?? [],
						cannibalizationIssues: finalResults.cannibalizationIssues ?? [],
						snippetOpportunities: finalResults.snippetOpportunities ?? [],
						opportunityClusters: finalResults.opportunityClusters ?? [],
						discoveredCompetitors: finalResults.discoveredCompetitors ?? [],
						actionPlan: finalResults.actionPlan ?? [],
						coreWebVitals: finalResults.coreWebVitals,
					},
					result.pages.length,
					{ isFreeTier },
				);

				// Emit health score via SSE
				emitHealth(auditId, healthScore);

				// Store results
				await auditRepo.updateAudit(auditId, {
					opportunities: {
						...finalResults,
						healthScore,
					},
					healthScore,
					apiUsage: pipelineResult.usage,
				});

				// Update progress for completed external components and emit events
				for (const completed of pipelineResult.completed) {
					progress = markComponentCompleted(progress, completed);
					emitComponentCompleted(auditId, completed);
				}
				await auditRepo.updateAudit(auditId, { progress });

				jobLog.info(
					{
						healthScore: healthScore.score,
						opportunities: finalResults.opportunities?.length ?? 0,
						completed: pipelineResult.completed.length,
						failed: pipelineResult.failed.length,
					},
					"Analysis complete",
				);

				// ============================================================
				// PHASE 3: Complete or retry
				// ============================================================
				if (pipelineResult.failed.length === 0) {
					jobLog.info("All components done, completing audit");
					await completeAudit(auditId);
				} else {
					// Some components failed - set RETRYING for retry job to pick up
					jobLog.info(
						{
							completed: pipelineResult.completed.length,
							failed: pipelineResult.failed.map((f) => f.key),
						},
						"Some components failed, setting RETRYING",
					);
					await auditRepo.updateAudit(auditId, {
						status: "RETRYING",
						retryAfter: new Date(Date.now() + 15 * 60 * 1000), // 15 min
					});
				}
			} catch (error) {
				await markAuditFailed(auditId, error);
				throw error; // Re-throw to trigger pg-boss retry
			}
		}
	});

	log.info("Audit job handlers registered");
}

export async function queueCrawlJob(
	boss: PgBoss,
	auditId: string,
): Promise<void> {
	log.info({ auditId }, "Queueing audit.crawl");
	try {
		const jobId = await boss.send("audit.crawl", { auditId }, JOB_OPTIONS);
		if (!jobId) {
			throw new Error("pg-boss returned null job ID - schema may not exist");
		}
		log.info({ auditId, jobId }, "Job queued");
	} catch (error) {
		log.error({ auditId, error }, "Failed to queue job");
		throw error;
	}
}
