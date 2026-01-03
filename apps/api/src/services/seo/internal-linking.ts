import type { CrawledPage } from "../crawler/types.js";

export type LinkGraph = Map<string, Set<string>>;

export type InternalLinkingIssues = {
	orphanPages: string[];
	underlinkedPages: Array<{ url: string; incomingLinks: number }>;
};

export function buildLinkGraph(pages: CrawledPage[]): LinkGraph {
	const graph: LinkGraph = new Map();
	const pageUrls = new Set(pages.map((p) => p.url));

	for (const page of pages) {
		const outbound = new Set(
			page.outboundLinks.filter((link) => pageUrls.has(link)),
		);
		graph.set(page.url, outbound);
	}

	return graph;
}

export function getInboundLinks(graph: LinkGraph): Map<string, string[]> {
	const inbound = new Map<string, string[]>();

	for (const url of graph.keys()) {
		inbound.set(url, []);
	}

	for (const [source, targets] of graph.entries()) {
		for (const target of targets) {
			const existing = inbound.get(target);
			if (existing) {
				existing.push(source);
			}
		}
	}

	return inbound;
}

export function findOrphanPages(graph: LinkGraph): string[] {
	const inbound = getInboundLinks(graph);
	const orphans: string[] = [];

	for (const [url, sources] of inbound.entries()) {
		if (sources.length === 0) {
			orphans.push(url);
		}
	}

	return orphans;
}

export function findUnderlinkedPages(
	graph: LinkGraph,
	threshold = 2,
): Array<{ url: string; incomingLinks: number }> {
	const inbound = getInboundLinks(graph);
	const underlinked: Array<{ url: string; incomingLinks: number }> = [];

	for (const [url, sources] of inbound.entries()) {
		if (sources.length > 0 && sources.length < threshold) {
			underlinked.push({ url, incomingLinks: sources.length });
		}
	}

	return underlinked.sort((a, b) => a.incomingLinks - b.incomingLinks);
}

export function analyzeInternalLinking(
	pages: CrawledPage[],
): InternalLinkingIssues {
	const graph = buildLinkGraph(pages);
	return {
		orphanPages: findOrphanPages(graph),
		underlinkedPages: findUnderlinkedPages(graph),
	};
}

export function findLinkingSuggestions(
	targetKeyword: string,
	pages: CrawledPage[],
	excludeUrls: string[] = [],
): string[] {
	const suggestions: string[] = [];
	const keywordLower = targetKeyword.toLowerCase();
	const excludeSet = new Set(excludeUrls);

	for (const page of pages) {
		if (excludeSet.has(page.url)) continue;

		const content = (page.content ?? "").toLowerCase();
		const title = (page.title ?? "").toLowerCase();

		if (content.includes(keywordLower) || title.includes(keywordLower)) {
			suggestions.push(page.url);
		}
	}

	return suggestions.slice(0, 5);
}
