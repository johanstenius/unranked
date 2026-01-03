import * as cheerio from "cheerio";
import readability from "text-readability";
import { createLogger } from "../../lib/logger.js";
import type {
	BrokenLink,
	CrawlResult,
	CrawledPage,
	DiscoverEvent,
	DiscoverResult,
	RedirectChain,
	SectionInfo,
} from "./types.js";

const log = createLogger("crawler");

const SAMPLES_PER_SECTION = 3;
const SCORE_THRESHOLD_SHOW = 2;
const FETCH_TIMEOUT_MS = 10000;
const MAX_SITEMAP_DEPTH = 3;
const MAX_REDIRECTS = 10;

type RawSection = { path: string; pageCount: number };

const BLOCKED_HOSTS = new Set([
	"localhost",
	"127.0.0.1",
	"0.0.0.0",
	"[::1]",
	"metadata.google.internal",
	"169.254.169.254",
]);

function isPrivateIP(hostname: string): boolean {
	if (BLOCKED_HOSTS.has(hostname)) return true;
	const parts = hostname.split(".").map(Number);
	if (parts.length !== 4) return false;
	const [a, b, c, d] = parts as [number, number, number, number];
	if (a === 10) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	return false;
}

function validateUrl(url: string): void {
	const parsed = new URL(url);
	if (!["http:", "https:"].includes(parsed.protocol)) {
		throw new Error(`Invalid protocol: ${parsed.protocol}`);
	}
	if (isPrivateIP(parsed.hostname)) {
		throw new Error(`Blocked host: ${parsed.hostname}`);
	}
}

type FetchResult = {
	content: string;
	finalUrl: string;
	redirectChain: string[] | null; // null = no redirects, array = chain including original
};

async function fetchPage(url: string): Promise<FetchResult> {
	validateUrl(url);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	const chain: string[] = [url];
	let currentUrl = url;

	try {
		for (let i = 0; i < MAX_REDIRECTS; i++) {
			const response = await fetch(currentUrl, {
				headers: {
					"User-Agent": "Unranked Bot/1.0 (SEO Analysis Tool)",
				},
				signal: controller.signal,
				redirect: "manual",
			});

			// Check for redirect status codes
			if (response.status >= 300 && response.status < 400) {
				const location = response.headers.get("location");
				if (!location) {
					throw new Error(
						`Redirect ${response.status} without Location header`,
					);
				}

				// Resolve relative URLs
				const nextUrl = new URL(location, currentUrl).href;
				validateUrl(nextUrl);
				chain.push(nextUrl);
				currentUrl = nextUrl;
				continue;
			}

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			const content = await response.text();
			return {
				content,
				finalUrl: currentUrl,
				redirectChain: chain.length > 1 ? chain : null,
			};
		}

		throw new Error(`Too many redirects (>${MAX_REDIRECTS})`);
	} finally {
		clearTimeout(timeout);
	}
}

async function checkUrlStatus(url: string): Promise<number | null> {
	try {
		validateUrl(url);
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000);

		try {
			const response = await fetch(url, {
				method: "HEAD",
				headers: {
					"User-Agent": "Unranked Bot/1.0 (SEO Analysis Tool)",
				},
				signal: controller.signal,
			});
			return response.status;
		} finally {
			clearTimeout(timeout);
		}
	} catch {
		return null;
	}
}

function extractLinks(html: string, baseUrl: string): string[] {
	const $ = cheerio.load(html);
	const links: string[] = [];
	const base = new URL(baseUrl);

	$("a[href]").each((_, el) => {
		const href = $(el).attr("href");
		if (!href) return;

		try {
			const url = new URL(href, baseUrl);
			if (url.hostname === base.hostname && !url.hash) {
				links.push(url.href.replace(/\/$/, ""));
			}
		} catch {
			// Invalid URL, skip
		}
	});

	return [...new Set(links)];
}

function getSection(url: string, baseUrl: string): string {
	try {
		const parsed = new URL(url);
		const base = new URL(baseUrl);
		const path = parsed.pathname;

		if (parsed.hostname !== base.hostname) return "";

		const segments = path.split("/").filter(Boolean);
		if (segments.length === 0) return "/";

		return `/${segments[0]}`;
	} catch {
		return "";
	}
}

const IGNORED_SECTIONS = new Set([
	"/login",
	"/logout",
	"/signin",
	"/signout",
	"/signup",
	"/register",
	"/auth",
	"/oauth",
	"/sso",
	"/settings",
	"/account",
	"/profile",
	"/dashboard",
	"/admin",
	"/cart",
	"/checkout",
	"/404",
	"/500",
	"/error",
	"/privacy",
	"/terms",
	"/legal",
	"/cookies",
	"/unsubscribe",
	"/confirm",
	"/verify",
	"/reset",
	"/forgot",
	"/invite",
]);

function shouldSkipUrl(url: string, baseUrl: string): boolean {
	const section = getSection(url, baseUrl);
	return IGNORED_SECTIONS.has(section);
}

function groupBySection(urls: string[], baseUrl: string): RawSection[] {
	const sectionCounts = new Map<string, number>();

	for (const url of urls) {
		const section = getSection(url, baseUrl);
		if (section) {
			sectionCounts.set(section, (sectionCounts.get(section) || 0) + 1);
		}
	}

	return [...sectionCounts.entries()]
		.filter(([path]) => !IGNORED_SECTIONS.has(path))
		.map(([path, pageCount]) => ({ path, pageCount }))
		.sort((a, b) => b.pageCount - a.pageCount);
}

function scorePageContent(html: string): number {
	const $ = cheerio.load(html);
	let score = 0;

	// Get text content (clone to avoid mutating original)
	const $clone = $.root().clone();
	$clone.find("script, style, nav, footer, header").remove();
	const text = $clone.text().replace(/\s+/g, " ").trim();
	const wordCount = text.split(/\s+/).filter(Boolean).length;

	// Word count signals
	if (wordCount > 300) score += 2;
	if (wordCount > 1000) score += 1;

	// Heading structure
	if ($("h2").length > 0 || $("h3").length > 0) score += 2;

	// Code blocks (technical content)
	if ($("pre, code").length > 0) score += 2;

	// Semantic markup
	if ($("article").length > 0 || $("main").length > 0) score += 1;

	// Documentation patterns (sidebar/toc)
	const hasSidebar =
		$("aside").length > 0 ||
		$('[class*="sidebar"]').length > 0 ||
		$('[class*="toc"]').length > 0 ||
		$('[class*="table-of-contents"]').length > 0;
	if (hasSidebar) score += 1;

	// Schema.org Article
	const hasArticleSchema =
		$('script[type="application/ld+json"]')
			.text()
			.toLowerCase()
			.includes("article") || $('[itemtype*="Article"]').length > 0;
	if (hasArticleSchema) score += 1;

	return score;
}

function sampleUrls(urls: string[], count: number): string[] {
	const copy = [...urls];
	const result: string[] = [];
	const iterations = Math.min(count, copy.length);
	for (let i = 0; i < iterations; i++) {
		const idx = Math.floor(Math.random() * copy.length);
		const url = copy.splice(idx, 1)[0];
		if (url) result.push(url);
	}
	return result;
}

async function scoreSectionContent(
	urls: string[],
	sampleSize: number,
): Promise<number> {
	const sampled = sampleUrls(urls, sampleSize);

	const scores: number[] = [];
	for (const url of sampled) {
		try {
			const result = await fetchPage(url);
			scores.push(scorePageContent(result.content));
		} catch {
			// Skip failed fetches
		}
	}

	if (scores.length === 0) return 0;
	return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function parsePage(
	html: string,
	url: string,
	baseUrl: string,
): CrawledPage & { outboundLinks: string[] } {
	const $ = cheerio.load(html);

	const outboundLinks = extractLinks(html, url);

	// Count code blocks and images before removing elements
	const codeBlockCount = $("pre").length;
	const imageCount = $("img").length;

	// Count images without alt text
	let imagesWithoutAlt = 0;
	$("img").each((_, el) => {
		const alt = $(el).attr("alt");
		if (!alt || alt.trim() === "") {
			imagesWithoutAlt++;
		}
	});

	// Extract code block content (first 5 blocks, max 500 chars each)
	const codeBlocks: string[] = [];
	$("pre")
		.slice(0, 5)
		.each((_, el) => {
			const text = $(el).text().trim().slice(0, 500);
			if (text) codeBlocks.push(text);
		});

	// Extract title and H1 BEFORE removing elements (H1 often inside <header>)
	const title = $("title").text().trim() || null;
	const h1 = $("h1").first().text().trim() || null;
	const h1Count = $("h1").length;

	// Extract meta tags
	const metaDescription =
		$('meta[name="description"]').attr("content")?.trim() || null;
	const canonicalUrl = $('link[rel="canonical"]').attr("href")?.trim() || null;
	const ogTitle =
		$('meta[property="og:title"]').attr("content")?.trim() || null;
	const ogDescription =
		$('meta[property="og:description"]').attr("content")?.trim() || null;
	const ogImage =
		$('meta[property="og:image"]').attr("content")?.trim() || null;

	// Extract all headings
	const h2s: string[] = [];
	$("h2").each((_, el) => {
		const text = $(el).text().trim();
		if (text) h2s.push(text);
	});

	const h3s: string[] = [];
	$("h3").each((_, el) => {
		const text = $(el).text().trim();
		if (text) h3s.push(text);
	});

	// Check for Schema.org markup and extract types
	const schemaScripts = $('script[type="application/ld+json"]');
	const schemaTypes: string[] = [];
	schemaScripts.each((_, el) => {
		try {
			const json = JSON.parse($(el).text());
			// Handle single object or array of objects
			const items = Array.isArray(json) ? json : [json];
			for (const item of items) {
				if (item["@type"]) {
					const types = Array.isArray(item["@type"])
						? item["@type"]
						: [item["@type"]];
					schemaTypes.push(...types);
				}
			}
		} catch {
			// Invalid JSON, skip
		}
	});
	const hasSchemaOrg = schemaTypes.length > 0 || $("[itemtype]").length > 0;

	// Check for viewport meta tag (mobile-friendliness)
	const hasViewport = $('meta[name="viewport"]').length > 0;

	$("script, style, nav, footer, aside").remove();

	const mainContent =
		$("main").text() || $("article").text() || $("body").text();
	const content = mainContent.replace(/\s+/g, " ").trim().slice(0, 10000);
	const wordCount = content.split(/\s+/).filter(Boolean).length;

	// Calculate readability score (Flesch-Kincaid Grade Level)
	// Exclude code blocks - they skew readability metrics
	let readabilityScore: number | null = null;
	if (content && wordCount >= 30) {
		const $readability = $.root().clone();
		$readability.find("pre, code").remove();
		const proseContent = $readability
			.find("main, article, body")
			.first()
			.text()
			.replace(/\s+/g, " ")
			.trim();
		if (proseContent.split(/\s+/).filter(Boolean).length >= 30) {
			const score = readability.fleschKincaidGrade(proseContent);
			// FK Grade Level typically 0-18, clamp unrealistic values
			if (Number.isFinite(score) && score >= 0 && score <= 20) {
				readabilityScore = Math.round(score * 10) / 10;
			}
		}
	}

	return {
		url,
		title,
		h1,
		content: content || null,
		wordCount,
		section: getSection(url, baseUrl),
		outboundLinks,
		readabilityScore,
		codeBlockCount,
		imageCount,
		codeBlocks,
		// Enhanced SEO signals
		metaDescription,
		canonicalUrl,
		ogTitle,
		ogDescription,
		ogImage,
		h1Count,
		h2s,
		h3s,
		imagesWithoutAlt,
		hasSchemaOrg,
		schemaTypes,
		hasViewport,
	};
}

type RobotsTxtResult = {
	exists: boolean;
	sitemaps: string[];
};

async function findSitemapsInRobots(baseUrl: string): Promise<RobotsTxtResult> {
	try {
		const response = await fetch(`${baseUrl}/robots.txt`);
		if (!response.ok) return { exists: false, sitemaps: [] };

		const text = await response.text();
		const matches = [...text.matchAll(/Sitemap:\s*(.+)/gi)];
		const sitemaps = matches
			.map((m) => m[1]?.trim())
			.filter((s): s is string => !!s);
		return { exists: true, sitemaps };
	} catch {
		return { exists: false, sitemaps: [] };
	}
}

async function fetchSitemapRecursive(
	url: string,
	depth: number,
): Promise<string[]> {
	if (depth > MAX_SITEMAP_DEPTH) return [];

	try {
		validateUrl(url);
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

		try {
			const response = await fetch(url, { signal: controller.signal });
			if (!response.ok) return [];

			const xml = await response.text();
			const $ = cheerio.load(xml, { xmlMode: true });

			const pageUrls: string[] = [];
			const nestedSitemaps: string[] = [];

			$("url loc").each((_, el) => {
				pageUrls.push($(el).text());
			});

			$("sitemap loc").each((_, el) => {
				nestedSitemaps.push($(el).text());
			});

			const nestedResults = await Promise.all(
				nestedSitemaps.map((nested) =>
					fetchSitemapRecursive(nested, depth + 1),
				),
			);

			return [...pageUrls, ...nestedResults.flat()];
		} finally {
			clearTimeout(timeout);
		}
	} catch {
		return [];
	}
}

type SitemapResult = {
	urls: string[];
	hasRobotsTxt: boolean;
};

async function fetchSitemap(baseUrl: string): Promise<SitemapResult> {
	const sitemapUrls = [
		`${baseUrl}/sitemap.xml`,
		`${baseUrl}/sitemap_index.xml`,
		`${baseUrl}/sitemap-0.xml`,
	];

	const robotsResult = await findSitemapsInRobots(baseUrl);
	sitemapUrls.unshift(...robotsResult.sitemaps);

	for (const sitemapUrl of sitemapUrls) {
		const urls = await fetchSitemapRecursive(sitemapUrl, 0);
		if (urls.length > 0) {
			return { urls, hasRobotsTxt: robotsResult.exists };
		}
	}

	return { urls: [], hasRobotsTxt: robotsResult.exists };
}

export async function discoverSections(
	siteUrl: string,
): Promise<DiscoverResult> {
	log.info({ siteUrl }, "Discovering sections");

	const baseUrl = new URL(siteUrl).origin;
	const sitemapResult = await fetchSitemap(baseUrl);

	if (sitemapResult.urls.length === 0) {
		log.info("No sitemap found, crawling homepage for links");
		try {
			const result = await fetchPage(siteUrl);
			const links = extractLinks(result.content, siteUrl);
			const rawSections = groupBySection(links, baseUrl);
			const sections = rawSections.map((s) => ({ ...s, contentScore: 0 }));
			return { sections, totalUrls: links.length };
		} catch {
			return { sections: [], totalUrls: 0 };
		}
	}

	log.info({ urlCount: sitemapResult.urls.length }, "Found URLs in sitemap");
	const rawSections = groupBySection(sitemapResult.urls, baseUrl);
	const sections = rawSections.map((s) => ({ ...s, contentScore: 0 }));
	return { sections, totalUrls: sitemapResult.urls.length };
}

export async function* discoverSectionsStream(
	siteUrl: string,
): AsyncGenerator<DiscoverEvent> {
	log.info({ siteUrl }, "Streaming discovery");

	const baseUrl = new URL(siteUrl).origin;
	let allUrls: string[] = [];

	// Try sitemap first
	const sitemapResult = await fetchSitemap(baseUrl);

	if (sitemapResult.urls.length === 0) {
		log.info("No sitemap, crawling homepage");
		try {
			const result = await fetchPage(siteUrl);
			allUrls = extractLinks(result.content, siteUrl);
		} catch {
			yield { type: "done" };
			return;
		}
	} else {
		allUrls = sitemapResult.urls;
	}

	yield { type: "sitemap", totalUrls: allUrls.length };

	// Group URLs by section
	const sectionUrlMap = new Map<string, string[]>();
	for (const url of allUrls) {
		const section = getSection(url, baseUrl);
		if (section && !IGNORED_SECTIONS.has(section)) {
			const urls = sectionUrlMap.get(section) || [];
			urls.push(url);
			sectionUrlMap.set(section, urls);
		}
	}

	// Emit raw sections
	const rawSections = [...sectionUrlMap.entries()]
		.map(([path, urls]) => ({ path, pageCount: urls.length }))
		.sort((a, b) => b.pageCount - a.pageCount);

	yield { type: "sections", sections: rawSections };

	// Score each section
	for (const [path, urls] of sectionUrlMap.entries()) {
		const contentScore = await scoreSectionContent(urls, SAMPLES_PER_SECTION);

		if (contentScore >= SCORE_THRESHOLD_SHOW) {
			yield {
				type: "scored",
				section: { path, pageCount: urls.length, contentScore },
			};
		}
	}

	yield { type: "done" };
}

export async function crawlDocs(
	siteUrl: string,
	maxPages: number,
	sectionsFilter?: string[],
	onSitemapDiscovered?: (sitemapUrlCount: number) => Promise<void>,
): Promise<CrawlResult> {
	log.info({ siteUrl, maxPages }, "Starting crawl");
	if (sectionsFilter?.length) {
		log.info({ sections: sectionsFilter }, "Filtering to sections");
	}

	const baseUrl = new URL(siteUrl).origin;
	const visited = new Set<string>();
	const toVisit: string[] = [];
	const pages: CrawledPage[] = [];
	const errors: Array<{ url: string; error: string }> = [];
	const redirectChains: RedirectChain[] = [];

	log.debug("Checking for sitemap");
	const sitemapResult = await fetchSitemap(baseUrl);
	const sitemapUrls = sitemapResult.urls;

	// Emit sitemap count immediately for UI feedback
	await onSitemapDiscovered?.(sitemapUrls.length);

	function matchesFilter(url: string): boolean {
		if (!sectionsFilter?.length) return true;
		const section = getSection(url, baseUrl);
		return sectionsFilter.includes(section);
	}

	if (sitemapUrls.length > 0) {
		log.info({ urlCount: sitemapUrls.length }, "Found URLs in sitemap");
		const filteredUrls = sitemapUrls
			.filter((url) => !shouldSkipUrl(url, baseUrl))
			.filter(matchesFilter);
		log.info({ urlCount: filteredUrls.length }, "URLs after filtering");
		toVisit.push(...filteredUrls);
	} else {
		log.info("No sitemap found, starting from root URL");
		toVisit.push(siteUrl);
	}

	log.debug({ urlCount: toVisit.length }, "Starting crawl loop");

	while (toVisit.length > 0 && pages.length < maxPages) {
		const url = toVisit.shift();
		if (!url || visited.has(url)) continue;

		visited.add(url);

		try {
			const fetchResult = await fetchPage(url);
			const page = parsePage(fetchResult.content, url, baseUrl);
			pages.push(page);
			log.debug(
				{ progress: `${pages.length}/${maxPages}`, url },
				"Crawled page",
			);

			// Track redirect chains (2+ hops = chain of 3+ URLs)
			if (fetchResult.redirectChain && fetchResult.redirectChain.length > 2) {
				redirectChains.push({
					originalUrl: url,
					finalUrl: fetchResult.finalUrl,
					hops: fetchResult.redirectChain.length - 1,
					chain: fetchResult.redirectChain,
				});
			}

			if (pages.length < maxPages && sitemapUrls.length === 0) {
				const links = extractLinks(fetchResult.content, url);
				for (const link of links) {
					if (
						!visited.has(link) &&
						link.startsWith(siteUrl) &&
						!shouldSkipUrl(link, baseUrl) &&
						matchesFilter(link)
					) {
						toVisit.push(link);
					}
				}
			}
		} catch (error) {
			const msg = error instanceof Error ? error.message : "Unknown error";
			log.debug({ url, error: msg }, "Crawl error");
			errors.push({ url, error: msg });
		}

		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	const rawSections = groupBySection(
		pages.map((p) => p.url),
		baseUrl,
	);
	const sections = rawSections.map((s) => ({ ...s, contentScore: 0 }));

	// Detect broken internal links
	const crawledUrls = new Set(pages.map((p) => p.url));
	const errorUrls = new Set(errors.map((e) => e.url));
	const brokenLinks: BrokenLink[] = [];

	// Collect all internal links that weren't crawled
	const uncrawledLinks = new Map<string, string[]>(); // targetUrl -> sourceUrls
	for (const page of pages) {
		for (const link of page.outboundLinks) {
			if (!crawledUrls.has(link) && !errorUrls.has(link)) {
				const sources = uncrawledLinks.get(link) ?? [];
				sources.push(page.url);
				uncrawledLinks.set(link, sources);
			}
		}
	}

	// Also check links that are in errors (we know they failed)
	for (const page of pages) {
		for (const link of page.outboundLinks) {
			if (errorUrls.has(link)) {
				const error = errors.find((e) => e.url === link);
				const statusMatch = error?.error.match(/HTTP (\d+)/);
				const statusStr = statusMatch?.[1];
				brokenLinks.push({
					sourceUrl: page.url,
					targetUrl: link,
					statusCode: statusStr ? Number.parseInt(statusStr, 10) : undefined,
				});
			}
		}
	}

	// Sample check uncrawled links (max 20 to avoid slowdown)
	const uncrawledList = [...uncrawledLinks.entries()];
	const toCheck = uncrawledList.slice(0, 20);

	if (toCheck.length > 0) {
		log.debug({ count: toCheck.length }, "Checking uncrawled internal links");
		for (const [targetUrl, sourceUrls] of toCheck) {
			const status = await checkUrlStatus(targetUrl);
			if (status && status >= 400) {
				// It's a broken link
				for (const sourceUrl of sourceUrls) {
					brokenLinks.push({
						sourceUrl,
						targetUrl,
						statusCode: status,
					});
				}
			}
		}
	}

	log.info(
		{
			pages: pages.length,
			errors: errors.length,
			brokenLinks: brokenLinks.length,
			redirectChains: redirectChains.length,
		},
		"Crawl complete",
	);
	return {
		pages,
		sections,
		errors,
		brokenLinks,
		redirectChains,
		sitemapUrlCount: sitemapUrls.length,
		hasRobotsTxt: sitemapResult.hasRobotsTxt,
		hasSitemap: sitemapUrls.length > 0,
	};
}
