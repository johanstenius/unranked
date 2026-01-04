import type { Prisma } from "@prisma/client";
import { db } from "../lib/db.js";

/**
 * Domain model for a crawled page.
 * Used by services - transforms nullable DB fields to defaults.
 */
export type PageModel = {
	url: string;
	title: string;
	h1: string;
	content: string;
	wordCount: number;
	section: string;
	outboundLinks: string[];
	readabilityScore: number | null;
	codeBlockCount: number;
	imageCount: number;
	codeBlocks: string[];
	metaDescription: string | null;
	canonicalUrl: string | null;
	ogTitle: string | null;
	ogDescription: string | null;
	ogImage: string | null;
	h1Count: number;
	h2s: string[];
	h3s: string[];
	imagesWithoutAlt: number;
	hasSchemaOrg: boolean;
	schemaTypes: string[];
	hasViewport: boolean;
};

/**
 * Input type for creating crawled pages in the database.
 */
export type CreateCrawledPageInput = {
	auditId: string;
	url: string;
	title?: string | null;
	h1?: string | null;
	content?: string | null;
	wordCount?: number | null;
	section?: string | null;
	outboundLinks?: string[];
	readabilityScore?: number | null;
	codeBlockCount?: number;
	imageCount?: number;
	codeBlocks?: string[];
	metaDescription?: string | null;
	canonicalUrl?: string | null;
	ogTitle?: string | null;
	ogDescription?: string | null;
	ogImage?: string | null;
	h1Count?: number;
	h2s?: string[];
	h3s?: string[];
	imagesWithoutAlt?: number;
	hasSchemaOrg?: boolean;
	schemaTypes?: string[];
	hasViewport?: boolean;
};

export function createCrawledPage(input: CreateCrawledPageInput) {
	return db.crawledPage.create({
		data: input,
	});
}

export function createManyCrawledPages(inputs: CreateCrawledPageInput[]) {
	return db.crawledPage.createMany({
		data: inputs,
	});
}

/**
 * Get raw DB records for an audit.
 * Use getPagesByAuditId() for domain models.
 */
export function getCrawledPagesByAuditId(auditId: string) {
	return db.crawledPage.findMany({
		where: { auditId },
	});
}

/**
 * Get crawled pages as domain models.
 * Transforms nullable DB fields to sensible defaults.
 */
export async function getPagesByAuditId(auditId: string): Promise<PageModel[]> {
	const dbPages = await db.crawledPage.findMany({
		where: { auditId },
	});

	return dbPages.map((p) => ({
		url: p.url,
		title: p.title ?? "",
		h1: p.h1 ?? "",
		content: p.content ?? "",
		wordCount: p.wordCount ?? 0,
		section: p.section ?? "",
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
		h1Count: p.h1Count,
		h2s: p.h2s,
		h3s: p.h3s,
		imagesWithoutAlt: p.imagesWithoutAlt,
		hasSchemaOrg: p.hasSchemaOrg,
		schemaTypes: p.schemaTypes,
		hasViewport: p.hasViewport,
	}));
}

export function deleteCrawledPagesByAuditId(auditId: string) {
	return db.crawledPage.deleteMany({
		where: { auditId },
	});
}

/**
 * Update Core Web Vitals data for a crawled page.
 */
export function updateCWV(
	auditId: string,
	url: string,
	cwvData: Prisma.InputJsonValue,
) {
	return db.crawledPage.updateMany({
		where: { auditId, url },
		data: { coreWebVitals: cwvData },
	});
}
