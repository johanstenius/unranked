import type PgBoss from "pg-boss";
import { createLogger } from "../lib/logger.js";
import * as auditRepo from "../repositories/audit.repository.js";
import * as briefRepo from "../repositories/brief.repository.js";
import * as crawledPageRepo from "../repositories/crawled-page.repository.js";
import { tierLimits } from "../schemas/audit.schema.js";
import { generateBriefs } from "../services/brief/generator.js";
import { crawlDocs } from "../services/crawler/crawler.js";
import type { RedirectChain } from "../services/crawler/types.js";
import {
	generateReportToken,
	getReportTokenExpiry,
	sendReportReadyEmail,
} from "../services/email.service.js";
import { analyzeSite } from "../services/seo/analysis.js";
import { clearSerpCache } from "../services/seo/dataforseo.js";
import { calculateHealthScore } from "../services/seo/health-score.js";

const log = createLogger("queue");

export type CrawlJobData = {
	auditId: string;
};

export type AnalyzeJobData = {
	auditId: string;
};

export type BriefsJobData = {
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

type HealthScoreData = {
	score: number;
	grade: string;
};

type AnalysisOpportunities = {
	opportunities?: Array<unknown>;
};

async function completeAuditAndNotify(
	auditId: string,
	briefsCount: number,
): Promise<void> {
	const reportToken = generateReportToken();
	const reportTokenExpiresAt = getReportTokenExpiry();

	await auditRepo.updateAudit(auditId, {
		status: "COMPLETED",
		completedAt: new Date(),
		reportToken,
		reportTokenExpiresAt,
	});

	const audit = await auditRepo.getAuditById(auditId);
	if (!audit) {
		createLogger("email", { auditId }).error(
			"Audit not found after completion",
		);
		return;
	}

	const healthScore = audit.healthScore as HealthScoreData | null;
	const opportunities = audit.opportunities as AnalysisOpportunities | null;

	try {
		await sendReportReadyEmail({
			to: audit.email,
			siteUrl: audit.siteUrl,
			reportToken,
			healthScore: healthScore?.score,
			healthGrade: healthScore?.grade,
			opportunitiesCount: opportunities?.opportunities?.length ?? 0,
			briefsCount,
		});
	} catch (emailError) {
		createLogger("email", { auditId }).error(
			{ error: emailError },
			"Failed to send report email",
		);
	}
}

export async function registerAuditJobs(boss: PgBoss): Promise<void> {
	log.info("Registering audit job handlers");

	// Create queues (pg-boss v10 requires explicit queue creation)
	await boss.createQueue("audit.crawl");
	await boss.createQueue("audit.analyze");
	await boss.createQueue("audit.briefs");
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

				await auditRepo.updateAuditStatus(auditId, "CRAWLING");

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

				// Store crawled pages with all fields
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
						// SEO meta fields
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

				jobLog.info({ pagesFound: result.pages.length }, "Crawl complete");

				// Queue next job
				await boss.send("audit.analyze", { auditId }, JOB_OPTIONS);
			} catch (error) {
				await markAuditFailed(auditId, error);
				throw error; // Re-throw to trigger pg-boss retry
			}
		}
	});

	await boss.work<AnalyzeJobData>("audit.analyze", async (jobs) => {
		for (const job of jobs) {
			const { auditId } = job.data;
			const jobLog = createLogger("audit.analyze", { auditId, jobId: job.id });
			jobLog.info("Starting analysis");

			try {
				const audit = await auditRepo.getAuditById(auditId);
				if (!audit) {
					throw new Error(`Audit ${auditId} not found`);
				}

				// Skip if already failed
				if (audit.status === "FAILED") {
					jobLog.info("Skipping - audit already failed");
					return;
				}

				await auditRepo.updateAuditStatus(auditId, "ANALYZING");

				const crawledPages =
					await crawledPageRepo.getCrawledPagesByAuditId(auditId);

				if (crawledPages.length === 0) {
					throw new Error("No crawled pages found");
				}

				const pages = crawledPages.map((p) => ({
					url: p.url,
					title: p.title,
					h1: p.h1,
					content: p.content,
					wordCount: p.wordCount ?? 0,
					section: p.section ?? "",
					outboundLinks: p.outboundLinks,
					readabilityScore: p.readabilityScore,
					codeBlockCount: p.codeBlockCount,
					imageCount: p.imageCount,
					codeBlocks: p.codeBlocks,
					// SEO meta fields
					metaDescription: p.metaDescription,
					canonicalUrl: p.canonicalUrl,
					ogTitle: p.ogTitle,
					ogDescription: p.ogDescription,
					ogImage: p.ogImage,
					h1Count: p.h1Count,
					h2s: p.h2s,
					h3s: p.h3s,
					imagesWithoutAlt: p.imagesWithoutAlt,
					hasSchemaOrg: p.hasSchemaOrg,
					schemaTypes: p.schemaTypes,
					hasViewport: p.hasViewport,
				}));

				const limits = tierLimits[audit.tier];
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

				jobLog.info(
					{
						opportunities: analysis.opportunities.length,
						healthScore: healthScore.score,
					},
					"Analysis complete",
				);

				// Queue next job
				await boss.send("audit.briefs", { auditId }, JOB_OPTIONS);
			} catch (error) {
				await markAuditFailed(auditId, error);
				throw error;
			}
		}
	});

	await boss.work<BriefsJobData>("audit.briefs", async (jobs) => {
		for (const job of jobs) {
			const { auditId } = job.data;
			const jobLog = createLogger("audit.briefs", { auditId, jobId: job.id });
			jobLog.info("Generating briefs");

			try {
				const audit = await auditRepo.getAuditById(auditId);
				if (!audit) {
					throw new Error(`Audit ${auditId} not found`);
				}

				// Skip if already failed
				if (audit.status === "FAILED") {
					jobLog.info("Skipping - audit already failed");
					return;
				}

				await auditRepo.updateAuditStatus(auditId, "GENERATING_BRIEFS");

				const limits = tierLimits[audit.tier];

				// Skip brief generation for tiers with 0 briefs (FREE)
				if (limits.briefs === 0) {
					jobLog.info("Tier has 0 briefs, completing");
					await completeAuditAndNotify(auditId, 0);
					return;
				}

				const analysisResult = audit.opportunities as {
					opportunities: Array<{
						keyword: string;
						searchVolume: number;
						difficulty: number;
						impactScore: number;
						reason: string;
						competitorUrl?: string;
					}>;
				} | null;
				const opportunities = analysisResult?.opportunities ?? [];

				if (opportunities.length === 0) {
					jobLog.info("No opportunities found, completing");
					await completeAuditAndNotify(auditId, 0);
					return;
				}

				const crawledPages =
					await crawledPageRepo.getCrawledPagesByAuditId(auditId);
				const pages = crawledPages.map((p) => ({
					url: p.url,
					title: p.title,
					h1: p.h1,
					content: p.content,
					wordCount: p.wordCount ?? 0,
					section: p.section ?? "",
					outboundLinks: p.outboundLinks,
					readabilityScore: p.readabilityScore,
					codeBlockCount: p.codeBlockCount,
					imageCount: p.imageCount,
					codeBlocks: p.codeBlocks,
					// SEO meta fields
					metaDescription: p.metaDescription,
					canonicalUrl: p.canonicalUrl,
					ogTitle: p.ogTitle,
					ogDescription: p.ogDescription,
					ogImage: p.ogImage,
					h2s: p.h2s,
					h3s: p.h3s,
					imagesWithoutAlt: p.imagesWithoutAlt,
					hasSchemaOrg: p.hasSchemaOrg,
				}));

				const { briefs, failedCount, failedKeywords } = await generateBriefs(
					opportunities,
					audit.productDesc,
					pages,
					limits.briefs,
				);

				if (failedCount > 0) {
					jobLog.warn({ failedCount, failedKeywords }, "Some briefs failed");
				}

				// Store briefs
				for (const brief of briefs) {
					await briefRepo.createBrief({
						auditId,
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

				await completeAuditAndNotify(auditId, briefs.length);

				jobLog.info(
					{ briefsGenerated: briefs.length, failedCount },
					"Briefs complete",
				);
			} catch (error) {
				await markAuditFailed(auditId, error);
				throw error;
			}
		}
	});

	log.info("All audit job handlers registered");
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
