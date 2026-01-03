import { env } from "../../config/env.js";
import { createLogger } from "../../lib/logger.js";
import * as mockDataforseo from "./dataforseo.mock.js";

const log = createLogger("dataforseo");

const API_BASE = "https://api.dataforseo.com/v3";

export type SerpResult = {
	position: number;
	url: string;
	title: string;
	description: string;
};

export type FeaturedSnippet = {
	type: "paragraph" | "list" | "table" | "video";
	url: string;
	title: string;
	content: string;
};

// Cache config
const CACHE_CONFIG = {
	ttlMs: 5 * 60 * 1000, // 5 minutes
	maxSize: 200,
} as const;

type CacheEntry = {
	serp: SerpResult[];
	paa: string[];
	featuredSnippet: FeaturedSnippet | null;
	timestamp: number;
};

// Encapsulated SERP cache with stats tracking
const serpCache = createSerpCache();

function createSerpCache() {
	const entries = new Map<string, CacheEntry>();
	let hits = 0;
	let misses = 0;

	function getKey(keyword: string, location: string, language: string): string {
		return JSON.stringify({ keyword, location, language });
	}

	function prune(): void {
		if (entries.size <= CACHE_CONFIG.maxSize) return;

		const now = Date.now();
		for (const [key, entry] of entries) {
			if (now - entry.timestamp > CACHE_CONFIG.ttlMs) {
				entries.delete(key);
			}
		}

		if (entries.size > CACHE_CONFIG.maxSize) {
			const sorted = [...entries.entries()].sort(
				(a, b) => a[1].timestamp - b[1].timestamp,
			);
			const toRemove = sorted.slice(0, entries.size - CACHE_CONFIG.maxSize);
			for (const [key] of toRemove) {
				entries.delete(key);
			}
		}
	}

	return {
		get(
			keyword: string,
			location: string,
			language: string,
		): CacheEntry | undefined {
			const cached = entries.get(getKey(keyword, location, language));
			if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.ttlMs) {
				hits++;
				return cached;
			}
			misses++;
			return undefined;
		},

		set(
			keyword: string,
			location: string,
			language: string,
			entry: CacheEntry,
		): void {
			prune();
			entries.set(getKey(keyword, location, language), entry);
		},

		clear(): void {
			log.debug({ hits, misses, entries: entries.size }, "Clearing SERP cache");
			entries.clear();
			hits = 0;
			misses = 0;
		},
	};
}

export function clearSerpCache(): void {
	if (env.TEST_MODE) {
		mockDataforseo.clearSerpCache();
		return;
	}
	serpCache.clear();
}

function getAuthHeader(): string {
	const credentials = Buffer.from(
		`${env.DATAFORSEO_LOGIN}:${env.DATAFORSEO_PASSWORD}`,
	).toString("base64");
	return `Basic ${credentials}`;
}

const RETRY_CONFIG = {
	maxRetries: 3,
	baseDelayMs: 500,
	maxDelayMs: 5000,
} as const;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiRequest<T>(
	endpoint: string,
	body: unknown,
): Promise<T | null> {
	let lastError: unknown;

	for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
		try {
			const response = await fetch(`${API_BASE}${endpoint}`, {
				method: "POST",
				headers: {
					Authorization: getAuthHeader(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify(body),
			});

			if (response.ok) {
				return response.json() as Promise<T>;
			}

			// Don't retry client errors (4xx) except 429
			if (
				response.status >= 400 &&
				response.status < 500 &&
				response.status !== 429
			) {
				log.error({ status: response.status }, "DataForSEO API error");
				return null;
			}

			lastError = new Error(`HTTP ${response.status}`);
		} catch (error) {
			lastError = error;
		}

		if (attempt < RETRY_CONFIG.maxRetries) {
			const delay = Math.min(
				RETRY_CONFIG.baseDelayMs * 2 ** attempt,
				RETRY_CONFIG.maxDelayMs,
			);
			log.debug(
				{ attempt: attempt + 1, maxRetries: RETRY_CONFIG.maxRetries, delay },
				"Retrying API request",
			);
			await sleep(delay);
		}
	}

	log.error(
		{ error: lastError },
		"DataForSEO API request failed after retries",
	);
	return null;
}

export type KeywordData = {
	keyword: string;
	searchVolume: number;
	difficulty: number;
	cpc: number;
	competition: number;
};

export type RelatedKeyword = {
	keyword: string;
	searchVolume: number;
	difficulty: number;
};

type DataForSeoResponse<T> = {
	tasks: Array<{
		result: T[] | null;
	}>;
};

type KeywordDataResult = {
	keyword: string;
	keyword_info?: {
		search_volume?: number;
		keyword_difficulty?: number;
		cpc?: number;
		competition?: number;
	};
};

type SerpDataResult = {
	items?: Array<{
		type?: string;
		rank_group?: number;
		url?: string;
		title?: string;
		description?: string;
		items?: Array<{
			title?: string;
		}>;
		featured_snippet?: {
			type?: string;
		};
	}>;
};

type RelatedKeywordResult = {
	items?: Array<{
		keyword?: string;
		keyword_info?: {
			search_volume?: number;
			keyword_difficulty?: number;
		};
	}>;
};

export async function getKeywordData(
	keywords: string[],
	location = "United States",
	language = "en",
): Promise<KeywordData[]> {
	if (env.TEST_MODE) {
		return mockDataforseo.getKeywordData(keywords, location, language);
	}

	const response = await apiRequest<DataForSeoResponse<KeywordDataResult>>(
		"/keywords_data/google_ads/search_volume/live",
		[
			{
				keywords,
				location_name: location,
				language_name: language,
			},
		],
	);

	if (!response?.tasks?.[0]?.result) return [];

	return response.tasks[0].result.map((item) => ({
		keyword: item.keyword,
		searchVolume: item.keyword_info?.search_volume ?? 0,
		difficulty: item.keyword_info?.keyword_difficulty ?? 0,
		cpc: item.keyword_info?.cpc ?? 0,
		competition: item.keyword_info?.competition ?? 0,
	}));
}

export type SerpWithPaa = {
	serp: SerpResult[];
	paa: string[];
};

export type SerpWithFeatures = {
	serp: SerpResult[];
	paa: string[];
	featuredSnippet: FeaturedSnippet | null;
};

async function fetchSerpWithFeatures(
	keyword: string,
	location: string,
	language: string,
): Promise<SerpWithFeatures> {
	const cached = serpCache.get(keyword, location, language);
	if (cached) {
		return {
			serp: cached.serp,
			paa: cached.paa,
			featuredSnippet: cached.featuredSnippet,
		};
	}

	const response = await apiRequest<DataForSeoResponse<SerpDataResult>>(
		"/serp/google/organic/live/regular",
		[
			{
				keyword,
				location_name: location,
				language_name: language,
				depth: 10,
			},
		],
	);

	const items = response?.tasks?.[0]?.result?.[0]?.items ?? [];

	// Filter by url presence only (not by type) to match original behavior
	const serp: SerpResult[] = items
		.filter((item) => item.url && item.type !== "featured_snippet")
		.map((item) => ({
			position: item.rank_group ?? 0,
			url: item.url ?? "",
			title: item.title ?? "",
			description: item.description ?? "",
		}));

	const paa: string[] = [];
	let featuredSnippet: FeaturedSnippet | null = null;

	for (const item of items) {
		if (item.type === "people_also_ask" && item.items) {
			for (const subItem of item.items) {
				if (subItem.title) {
					paa.push(subItem.title);
				}
			}
		}

		if (item.type === "featured_snippet" && item.url) {
			const snippetType = item.featured_snippet?.type ?? "paragraph";
			featuredSnippet = {
				type: snippetType as "paragraph" | "list" | "table" | "video",
				url: item.url,
				title: item.title ?? "",
				content: item.description ?? "",
			};
		}
	}

	const entry: CacheEntry = {
		serp,
		paa: paa.slice(0, 10),
		featuredSnippet,
		timestamp: Date.now(),
	};
	serpCache.set(keyword, location, language, entry);
	return { serp: entry.serp, paa: entry.paa, featuredSnippet };
}

export async function getSerpResults(
	keyword: string,
	location = "United States",
	language = "en",
): Promise<SerpResult[]> {
	if (env.TEST_MODE) {
		return mockDataforseo.getSerpResults(keyword, location, language);
	}

	const { serp } = await fetchSerpWithFeatures(keyword, location, language);
	return serp;
}

export async function getSerpWithPaa(
	keyword: string,
	location = "United States",
	language = "en",
): Promise<SerpWithPaa> {
	if (env.TEST_MODE) {
		return mockDataforseo.getSerpWithPaa(keyword, location, language);
	}

	const { serp, paa } = await fetchSerpWithFeatures(
		keyword,
		location,
		language,
	);
	return { serp, paa };
}

export async function getSerpWithFeatures(
	keyword: string,
	location = "United States",
	language = "en",
): Promise<SerpWithFeatures> {
	if (env.TEST_MODE) {
		return mockDataforseo.getSerpWithFeatures(keyword, location, language);
	}

	return fetchSerpWithFeatures(keyword, location, language);
}

export async function getRelatedKeywords(
	keyword: string,
	location = "United States",
	language = "en",
): Promise<RelatedKeyword[]> {
	if (env.TEST_MODE) {
		return mockDataforseo.getRelatedKeywords(keyword, location, language);
	}

	const response = await apiRequest<DataForSeoResponse<RelatedKeywordResult>>(
		"/keywords_data/google_ads/keywords_for_keywords/live",
		[
			{
				keywords: [keyword],
				location_name: location,
				language_name: language,
			},
		],
	);

	if (!response?.tasks?.[0]?.result?.[0]?.items) return [];

	return response.tasks[0].result[0].items
		.filter((item) => item.keyword)
		.map((item) => ({
			keyword: item.keyword ?? "",
			searchVolume: item.keyword_info?.search_volume ?? 0,
			difficulty: item.keyword_info?.keyword_difficulty ?? 0,
		}))
		.slice(0, 20);
}

export async function getPeopleAlsoAsk(
	keyword: string,
	location = "United States",
	language = "en",
): Promise<string[]> {
	if (env.TEST_MODE) {
		return mockDataforseo.getPeopleAlsoAsk(keyword, location, language);
	}

	const { paa } = await fetchSerpWithFeatures(keyword, location, language);
	return paa;
}

export type DomainKeyword = {
	keyword: string;
	position: number;
	url: string;
	searchVolume: number;
	difficulty: number;
};

export type DiscoveredCompetitor = {
	domain: string;
	intersections: number;
	avgPosition: number;
	etv: number;
};

type RankedKeywordResult = {
	items?: Array<{
		keyword_data?: {
			keyword?: string;
			keyword_info?: {
				search_volume?: number;
				keyword_difficulty?: number;
			};
		};
		ranked_serp_element?: {
			serp_item?: {
				rank_group?: number;
				url?: string;
			};
		};
	}>;
	items_count?: number;
};

export type DomainKeywordOptions = {
	location?: string;
	language?: string;
	limit?: number;
	maxPosition?: number;
	minVolume?: number;
	maxDifficulty?: number;
};

export async function getDomainRankedKeywords(
	domain: string,
	options: DomainKeywordOptions = {},
): Promise<DomainKeyword[]> {
	if (env.TEST_MODE) {
		return mockDataforseo.getDomainRankedKeywords(domain, options);
	}

	const {
		location = "United States",
		language = "en",
		limit = 200,
		maxPosition = 50,
		minVolume = 10,
		maxDifficulty,
	} = options;

	log.debug({ domain, limit, maxPosition }, "Getting ranked keywords");

	// Build filters array
	const filters: unknown[] = [
		["ranked_serp_element.serp_item.rank_group", "<", maxPosition],
		"and",
		["keyword_data.keyword_info.search_volume", ">", minVolume],
	];

	if (maxDifficulty !== undefined) {
		filters.push("and", [
			"keyword_data.keyword_info.keyword_difficulty",
			"<",
			maxDifficulty,
		]);
	}

	const response = await apiRequest<DataForSeoResponse<RankedKeywordResult>>(
		"/dataforseo_labs/google/ranked_keywords/live",
		[
			{
				target: domain,
				location_name: location,
				language_name: language,
				limit,
				order_by: ["keyword_data.keyword_info.search_volume,desc"],
				filters,
			},
		],
	);

	if (!response?.tasks?.[0]?.result?.[0]?.items) {
		log.debug({ domain }, "No ranked keywords found");
		return [];
	}

	const items = response.tasks[0].result[0].items;
	log.debug({ domain, count: items.length }, "Found ranked keywords");

	return items
		.filter((item) => item.keyword_data?.keyword)
		.map((item) => ({
			keyword: item.keyword_data?.keyword ?? "",
			position: item.ranked_serp_element?.serp_item?.rank_group ?? 0,
			url: item.ranked_serp_element?.serp_item?.url ?? "",
			searchVolume: item.keyword_data?.keyword_info?.search_volume ?? 0,
			difficulty: item.keyword_data?.keyword_info?.keyword_difficulty ?? 0,
		}));
}

type CompetitorDomainResult = {
	items?: Array<{
		domain?: string;
		avg_position?: number;
		intersections?: number;
		full_domain_metrics?: {
			organic?: {
				etv?: number;
				count?: number;
			};
		};
	}>;
};

export type DiscoverCompetitorsOptions = {
	location?: string;
	language?: string;
	limit?: number;
};

export async function discoverCompetitors(
	domain: string,
	options: DiscoverCompetitorsOptions = {},
): Promise<DiscoveredCompetitor[]> {
	if (env.TEST_MODE) {
		return mockDataforseo.discoverCompetitors(domain, options);
	}

	const { location = "United States", language = "en", limit = 10 } = options;

	log.debug({ domain }, "Discovering competitors");

	const response = await apiRequest<DataForSeoResponse<CompetitorDomainResult>>(
		"/dataforseo_labs/google/competitors_domain/live",
		[
			{
				target: domain,
				location_name: location,
				language_name: language,
				limit,
				exclude_top_domains: true,
				filters: [["intersections", ">", 10]],
				order_by: ["intersections,desc"],
			},
		],
	);

	if (!response?.tasks?.[0]?.result?.[0]?.items) {
		log.debug({ domain }, "No competitors found");
		return [];
	}

	const items = response.tasks[0].result[0].items;
	log.debug({ domain, count: items.length }, "Found competitors");

	return items
		.filter((item) => item.domain && item.domain !== domain)
		.map((item) => ({
			domain: item.domain ?? "",
			intersections: item.intersections ?? 0,
			avgPosition: item.avg_position ?? 0,
			etv: item.full_domain_metrics?.organic?.etv ?? 0,
		}));
}
