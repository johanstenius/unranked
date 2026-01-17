/**
 * Crawl Job - Background crawl for paid tiers
 *
 * Runs independently of the interactive flow.
 * Sets crawlComplete=true when done so final analysis can proceed.
 */

import type PgBoss from "pg-boss";
import { emitCrawlPages } from "../lib/audit-events.js";
import { createLogger } from "../lib/logger.js";
import * as auditRepo from "../repositories/audit.repository.js";
import * as crawledPageRepo from "../repositories/crawled-page.repository.js";
import { getLimits } from "../schemas/audit.schema.js";
import type { AuditTier } from "../schemas/audit.schema.js";
import { crawlDocs } from "../services/crawler/crawler.js";

const log = createLogger("crawl.job");

export type CrawlJobData = {
	auditId: string;
};

const JOB_OPTIONS: PgBoss.SendOptions = {
	retryLimit: 3,
	retryDelay: 30,
	retryBackoff: true,
	expireInSeconds: 600,
};

export async function registerCrawlJob(boss: PgBoss): Promise<void> {
	await boss.createQueue("audit.crawl");

	await boss.work<CrawlJobData>("audit.crawl", async (jobs) => {
		for (const job of jobs) {
			const { auditId } = job.data;
			const jobLog = createLogger("crawl.job", { auditId, jobId: job.id });
			jobLog.info("Starting background crawl");

			try {
				await processCrawl(auditId, jobLog);
			} catch (error) {
				jobLog.error({ error }, "Crawl failed");
				throw error;
			}
		}
	});

	log.info("Crawl job handler registered");
}

async function processCrawl(
	auditId: string,
	jobLog: ReturnType<typeof createLogger>,
): Promise<void> {
	const audit = await auditRepo.getAuditById(auditId);
	if (!audit) {
		throw new Error(`Audit ${auditId} not found`);
	}

	const tier = audit.tier as AuditTier;
	const limits = getLimits(tier, audit.isNewSite);
	const sectionsFilter = audit.sections.length > 0 ? audit.sections : undefined;

	// Crawl the site
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

	// Update audit with crawl results
	await auditRepo.updateAudit(auditId, {
		pagesFound: result.pages.length,
		detectedSections: result.sections,
		hasRobotsTxt: result.hasRobotsTxt,
		robotsTxtContent: result.robotsTxtContent,
		hasSitemap: result.hasSitemap,
		redirectChains: result.redirectChains,
		crawlComplete: true,
	});

	// Emit SSE event for frontend
	emitCrawlPages(auditId, result.pages.length, result.sitemapUrlCount);

	jobLog.info({ pagesFound: result.pages.length }, "Background crawl complete");
}

export async function queueCrawlJob(
	boss: PgBoss,
	auditId: string,
): Promise<void> {
	log.info({ auditId }, "Queueing crawl job");
	const jobId = await boss.send("audit.crawl", { auditId }, JOB_OPTIONS);
	if (!jobId) {
		throw new Error("Failed to queue crawl job");
	}
	log.info({ auditId, jobId }, "Crawl job queued");
}
