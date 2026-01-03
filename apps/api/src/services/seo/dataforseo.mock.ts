import type {
	DiscoverCompetitorsOptions,
	DiscoveredCompetitor,
	DomainKeyword,
	DomainKeywordOptions,
	FeaturedSnippet,
	KeywordData,
	RelatedKeyword,
	SerpResult,
	SerpWithFeatures,
	SerpWithPaa,
} from "./dataforseo.js";

export function clearSerpCache(): void {
	console.log("[mock-dataforseo] clearSerpCache (no-op)");
}

export async function getKeywordData(
	keywords: string[],
	_location = "United States",
	_language = "en",
): Promise<KeywordData[]> {
	console.log(
		`[mock-dataforseo] getKeywordData for ${keywords.length} keywords`,
	);
	await simulateDelay(50);

	return keywords.map((keyword, i) => ({
		keyword,
		searchVolume: generateVolume(keyword, i),
		difficulty: 30 + (i % 40),
		cpc: 0.5 + Math.random() * 2,
		competition: 0.3 + Math.random() * 0.5,
	}));
}

export async function getSerpResults(
	keyword: string,
	_location = "United States",
	_language = "en",
): Promise<SerpResult[]> {
	console.log(`[mock-dataforseo] getSerpResults for "${keyword}"`);
	await simulateDelay(30);

	return generateMockSerp(keyword);
}

export async function getSerpWithPaa(
	keyword: string,
	_location = "United States",
	_language = "en",
): Promise<SerpWithPaa> {
	console.log(`[mock-dataforseo] getSerpWithPaa for "${keyword}"`);
	await simulateDelay(30);

	return {
		serp: generateMockSerp(keyword),
		paa: generateMockPaa(keyword),
	};
}

export async function getSerpWithFeatures(
	keyword: string,
	_location = "United States",
	_language = "en",
): Promise<SerpWithFeatures> {
	console.log(`[mock-dataforseo] getSerpWithFeatures for "${keyword}"`);
	await simulateDelay(30);

	return {
		serp: generateMockSerp(keyword),
		paa: generateMockPaa(keyword),
		featuredSnippet: generateMockFeaturedSnippet(keyword),
	};
}

export async function getRelatedKeywords(
	keyword: string,
	_location = "United States",
	_language = "en",
): Promise<RelatedKeyword[]> {
	console.log(`[mock-dataforseo] getRelatedKeywords for "${keyword}"`);
	await simulateDelay(40);

	const prefixes = ["best", "how to", "what is", "top", "free"];
	const suffixes = ["guide", "tutorial", "tips", "examples", "tools"];

	const related: RelatedKeyword[] = [];

	for (const prefix of prefixes.slice(0, 3)) {
		related.push({
			keyword: `${prefix} ${keyword}`,
			searchVolume: 100 + Math.floor(Math.random() * 500),
			difficulty: 25 + Math.floor(Math.random() * 30),
		});
	}

	for (const suffix of suffixes.slice(0, 3)) {
		related.push({
			keyword: `${keyword} ${suffix}`,
			searchVolume: 80 + Math.floor(Math.random() * 400),
			difficulty: 20 + Math.floor(Math.random() * 35),
		});
	}

	return related;
}

export async function getPeopleAlsoAsk(
	keyword: string,
	_location = "United States",
	_language = "en",
): Promise<string[]> {
	console.log(`[mock-dataforseo] getPeopleAlsoAsk for "${keyword}"`);
	await simulateDelay(30);

	return generateMockPaa(keyword);
}

export async function getDomainRankedKeywords(
	domain: string,
	options: DomainKeywordOptions = {},
): Promise<DomainKeyword[]> {
	const { limit = 200, maxPosition = 50 } = options;
	console.log(
		`[mock-dataforseo] getDomainRankedKeywords for ${domain} (limit=${limit})`,
	);
	await simulateDelay(80);

	const domainName = domain.replace(/^www\./, "").split(".")[0];
	const mockKeywords = [
		`${domainName} review`,
		`${domainName} pricing`,
		`${domainName} alternatives`,
		`${domainName} vs competitors`,
		`how to use ${domainName}`,
		`${domainName} tutorial`,
		`${domainName} features`,
		`${domainName} api`,
		`${domainName} integration`,
		`${domainName} documentation`,
	];

	return mockKeywords.slice(0, Math.min(limit, 10)).map((keyword, i) => ({
		keyword,
		position: Math.min(1 + i * 3, maxPosition - 1),
		url: `https://${domain}/${keyword.replace(/\s+/g, "-")}`,
		searchVolume: 500 - i * 40,
		difficulty: 30 + i * 3,
	}));
}

export async function discoverCompetitors(
	domain: string,
	options: DiscoverCompetitorsOptions = {},
): Promise<DiscoveredCompetitor[]> {
	const { limit = 10 } = options;
	console.log(`[mock-dataforseo] discoverCompetitors for ${domain}`);
	await simulateDelay(60);

	const mockCompetitors = [
		"competitor1.com",
		"alternative-site.io",
		"industry-leader.com",
		"startup-rival.co",
		"enterprise-solution.com",
	];

	return mockCompetitors.slice(0, limit).map((comp, i) => ({
		domain: comp,
		intersections: 50 - i * 8,
		avgPosition: 10 + i * 2,
		etv: 5000 - i * 800,
	}));
}

function simulateDelay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateVolume(keyword: string, index: number): number {
	const base = 100 + keyword.length * 50;
	return base + index * 20;
}

function generateMockSerp(keyword: string): SerpResult[] {
	const domains = [
		"wikipedia.org",
		"medium.com",
		"forbes.com",
		"techcrunch.com",
		"hubspot.com",
		"moz.com",
		"searchenginejournal.com",
		"ahrefs.com",
		"semrush.com",
		"backlinko.com",
	];

	return domains.map((domain, i) => {
		const domainName = domain.split(".")[0] ?? domain;
		return {
			position: i + 1,
			url: `https://${domain}/${keyword.replace(/\s+/g, "-")}`,
			title: `${capitalize(keyword)} - Complete Guide | ${domainName.toUpperCase()}`,
			description: `Learn everything about ${keyword}. Our comprehensive guide covers best practices, tips, and expert insights for ${keyword}.`,
		};
	});
}

function generateMockPaa(keyword: string): string[] {
	return [
		`What is ${keyword}?`,
		`How does ${keyword} work?`,
		`Why is ${keyword} important?`,
		`How to get started with ${keyword}?`,
		`What are the benefits of ${keyword}?`,
		`Is ${keyword} worth it?`,
		`How much does ${keyword} cost?`,
		`What are the best ${keyword} tools?`,
	];
}

function generateMockFeaturedSnippet(keyword: string): FeaturedSnippet | null {
	if (Math.random() > 0.6) return null;

	return {
		type: "paragraph",
		url: `https://wikipedia.org/wiki/${keyword.replace(/\s+/g, "_")}`,
		title: `${capitalize(keyword)} - Wikipedia`,
		content: `${capitalize(keyword)} is a concept or practice that involves... This comprehensive definition covers the key aspects and applications.`,
	};
}

function capitalize(str: string): string {
	return str
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}
