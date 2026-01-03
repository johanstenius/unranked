/**
 * Audit Jobs - Primary crawl trigger
 *
 * Flow:
 * 1. Crawl pages
 * 2. Run local analysis (technical issues, health score)
 * 3. Call pipeline service for external components (DataForSEO/Claude)
 * 4. If all done → complete, else → RETRYING (retry job picks up)
 */

import type PgBoss from "pg-boss";
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
import { analyzeSite } from "../services/seo/analysis.js";
import { clearSerpCache } from "../services/seo/dataforseo.js";
import { calculateHealthScore } from "../services/seo/health-score.js";
import {
	type AuditProgress,
	createInitialProgress,
	markComponentCompleted,
} from "../types/audit-progress.js";

const log = createLogger("queue");

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
				});

				// ============================================================
				// PHASE 1: Crawl pages
				// ============================================================
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

				jobLog.info({ pagesFound: result.pages.length }, "Crawl complete");

				// ============================================================
				// PHASE 2: Local analysis (always succeeds - no external deps)
				// ============================================================
				await auditRepo.updateAudit(auditId, { status: "ANALYZING" });

				const pages = result.pages.map((p) => ({
					url: p.url,
					title: p.title,
					h1: p.h1,
					content: p.content,
					wordCount: p.wordCount,
					section: p.section,
					outboundLinks: p.outboundLinks,
					readabilityScore: p.readabilityScore,
					codeBlockCount: p.codeBlockCount,
					imageCount: p.imageCount,
					codeBlocks: p.codeBlocks,
					metaDescription: p.metaDescription,
					canonicalUrl: p.canonicalUrl,
					ogTitle: p.ogTitle,
					ogDescription: p.ogDescription,
					ogImage: p.ogImage,
					h1Count: p.h1Count ?? 1,
					h2s: p.h2s ?? [],
					h3s: p.h3s ?? [],
					imagesWithoutAlt: p.imagesWithoutAlt ?? 0,
					hasSchemaOrg: p.hasSchemaOrg ?? false,
					schemaTypes: p.schemaTypes ?? [],
					hasViewport: p.hasViewport ?? false,
				}));

				const isFreeTier = audit.tier === "FREE";
				const redirectChains = (audit.redirectChains ?? []) as RedirectChain[];
				const analysis = await analyzeSite(pages, audit.competitors, {
					maxCompetitors: limits.competitors,
					maxSeeds: limits.seeds,
					isFreeTier,
					hasRobotsTxt: audit.hasRobotsTxt ?? undefined,
					hasSitemap: audit.hasSitemap ?? undefined,
					redirectChains,
				});

				const healthScore = calculateHealthScore(analysis, pages.length, {
					isFreeTier,
				});

				await auditRepo.updateAudit(auditId, {
					opportunities: analysis,
					healthScore,
				});

				// Mark local components completed
				progress = markComponentCompleted(progress, "technicalIssues");
				progress = markComponentCompleted(progress, "internalLinking");
				progress = markComponentCompleted(progress, "duplicateContent");
				progress = markComponentCompleted(progress, "redirectChains");
				await auditRepo.updateAudit(auditId, { progress });

				jobLog.info(
					{
						healthScore: healthScore.score,
						opportunities: analysis.opportunities.length,
					},
					"Local analysis complete",
				);

				// ============================================================
				// PHASE 3: External components (DataForSEO/Claude)
				// ============================================================
				const freshAudit = await auditRepo.getAuditById(auditId);
				if (!freshAudit) {
					throw new Error(`Audit ${auditId} not found after analysis`);
				}

				const pipelineResult = await runPendingComponents({
					id: freshAudit.id,
					siteUrl: freshAudit.siteUrl,
					competitors: freshAudit.competitors,
					tier: freshAudit.tier,
					productDesc: freshAudit.productDesc,
					email: freshAudit.email,
					progress: freshAudit.progress as AuditProgress,
					opportunities: freshAudit.opportunities,
				});

				if (pipelineResult.allDone) {
					jobLog.info("All components done, completing audit");
					await completeAudit(auditId);
				} else {
					// Some components failed - set RETRYING for retry job to pick up
					jobLog.info(
						{
							ran: pipelineResult.componentsRun.length,
							failed: pipelineResult.componentsFailed.length,
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
