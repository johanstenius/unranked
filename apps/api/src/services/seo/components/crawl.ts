/**
 * Crawl Component
 *
 * First component in the pipeline - crawls the site and stores pages.
 * Pages are stored in the crawled_pages table, not in ComponentResults.
 */

import { getErrorMessage } from "../../../lib/errors.js";
import { createLogger } from "../../../lib/logger.js";
import * as crawledPageRepo from "../../../repositories/crawled-page.repository.js";
import { TIERS } from "../../../schemas/audit.schema.js";
import { crawlDocs } from "../../crawler/crawler.js";
import type { CrawlResult } from "../../crawler/types.js";
import type {
	ComponentContext,
	ComponentEntry,
	ComponentResult,
	ComponentResults,
	CrawlMetadata,
} from "./types.js";

const log = createLogger("components.crawl");

export type CrawlComponentResult = {
	pageCount: number;
	metadata: CrawlMetadata;
};

async function runCrawl(
	ctx: ComponentContext,
	_results: ComponentResults,
): Promise<ComponentResult<CrawlComponentResult>> {
	const { siteUrl, tier, auditId } = ctx;

	const maxPages = TIERS[tier.tier].limits.pages;

	log.info({ siteUrl, maxPages, tier: tier.tier }, "Starting crawl");

	try {
		const crawlResult: CrawlResult = await crawlDocs(siteUrl, maxPages);

		// Store pages to DB
		if (crawlResult.pages.length > 0) {
			await crawledPageRepo.createManyCrawledPages(
				crawlResult.pages.map((p) => ({
					auditId,
					url: p.url,
					title: p.title ?? null,
					h1: p.h1 ?? null,
					content: p.content ?? null,
					wordCount: p.wordCount,
					section: p.section,
					outboundLinks: p.outboundLinks,
					readabilityScore: p.readabilityScore,
					codeBlockCount: p.codeBlockCount,
					imageCount: p.imageCount,
					codeBlocks: p.codeBlocks,
					metaDescription: p.metaDescription ?? null,
					canonicalUrl: p.canonicalUrl ?? null,
					ogTitle: p.ogTitle ?? null,
					ogDescription: p.ogDescription ?? null,
					ogImage: p.ogImage ?? null,
					h1Count: p.h1Count ?? 1,
					h2s: p.h2s ?? [],
					h3s: p.h3s ?? [],
					imagesWithoutAlt: p.imagesWithoutAlt ?? 0,
					hasSchemaOrg: p.hasSchemaOrg ?? false,
					schemaTypes: p.schemaTypes ?? [],
					hasViewport: p.hasViewport ?? true,
				})),
			);
		}

		const metadata: CrawlMetadata = {
			hasRobotsTxt: crawlResult.hasRobotsTxt,
			hasSitemap: crawlResult.hasSitemap,
			redirectChains: crawlResult.redirectChains,
			brokenLinks: crawlResult.brokenLinks,
			robotsTxtContent: crawlResult.robotsTxtContent,
			hasLlmsTxt: crawlResult.hasLlmsTxt,
		};

		log.info(
			{ pageCount: crawlResult.pages.length, auditId },
			"Crawl complete, pages stored",
		);

		return {
			ok: true,
			data: {
				pageCount: crawlResult.pages.length,
				metadata,
			},
		};
	} catch (error) {
		const message = getErrorMessage(error);
		log.error({ error: message, siteUrl }, "Crawl failed");
		return { ok: false, error: message };
	}
}

export const crawlComponent: ComponentEntry<CrawlComponentResult> = {
	key: "crawl",
	dependencies: [],
	run: runCrawl,
	// Crawl stores pages in separate table, metadata goes to results
	store: (results, _data) => results, // Pages in separate table
	sseKey: "crawl",
	getSSEData: () => null, // Pages count emitted via separate event
};
