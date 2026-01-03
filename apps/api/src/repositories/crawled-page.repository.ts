import { db } from "../lib/db.js";

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

export function getCrawledPagesByAuditId(auditId: string) {
	return db.crawledPage.findMany({
		where: { auditId },
	});
}

export function deleteCrawledPagesByAuditId(auditId: string) {
	return db.crawledPage.deleteMany({
		where: { auditId },
	});
}
