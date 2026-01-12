import { env } from "../../config/env.js";
import { createLogger } from "../../lib/logger.js";
import {
	type ApiUsage,
	trackDataforseoCacheHit,
	trackDataforseoRequest,
} from "../../types/api-usage.js";
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

// Related keywords cache (same pattern as serpCache)
type RelatedKwCacheEntry = {
	keywords: RelatedKeyword[];
	timestamp: number;
};

const relatedKeywordsCache = createRelatedKeywordsCache();

function createRelatedKeywordsCache() {
	const entries = new Map<string, RelatedKwCacheEntry>();
	let hits = 0;
	let misses = 0;

	function getKey(keyword: string, location: string, language: string): string {
		return JSON.stringify({
			keyword: keyword.toLowerCase(),
			location,
			language,
		});
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
		): RelatedKeyword[] | undefined {
			const cached = entries.get(getKey(keyword, location, language));
			if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.ttlMs) {
				hits++;
				return cached.keywords;
			}
			misses++;
			return undefined;
		},

		set(
			keyword: string,
			location: string,
			language: string,
			keywords: RelatedKeyword[],
		): void {
			prune();
			entries.set(getKey(keyword, location, language), {
				keywords,
				timestamp: Date.now(),
			});
		},

		clear(): void {
			log.debug(
				{ hits, misses, entries: entries.size },
				"Clearing related keywords cache",
			);
			entries.clear();
			hits = 0;
			misses = 0;
		},
	};
}

export function clearRelatedKeywordsCache(): void {
	if (env.TEST_MODE) {
		mockDataforseo.clearRelatedKeywordsCache();
		return;
	}
	relatedKeywordsCache.clear();
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
	jitterMs: 200,
} as const;

const CIRCUIT_BREAKER = {
	threshold: 5, // Open after 5 consecutive failures
	resetMs: 60_000, // Reset after 1 minute
} as const;

// Circuit breaker state
let circuitState: "closed" | "open" = "closed";
let consecutiveFailures = 0;
let circuitOpenedAt: number | null = null;

/**
 * Error types for typed API responses
 */
export type ApiErrorType =
	| "rate_limit"
	| "server_error"
	| "timeout"
	| "auth_error"
	| "circuit_open"
	| "unknown";

/**
 * Typed result for API calls - enables graceful degradation
 */
export type ApiResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: ApiErrorType; message: string };

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkCircuitBreaker(): ApiResult<never> | null {
	if (circuitState === "open") {
		const elapsed = Date.now() - (circuitOpenedAt ?? 0);
		if (elapsed < CIRCUIT_BREAKER.resetMs) {
			log.warn(
				{ elapsed, resetMs: CIRCUIT_BREAKER.resetMs },
				"Circuit breaker OPEN - blocking request",
			);
			return {
				ok: false,
				error: "circuit_open",
				message: `Circuit breaker open, retry in ${Math.ceil((CIRCUIT_BREAKER.resetMs - elapsed) / 1000)}s`,
			};
		}
		// Reset circuit breaker
		circuitState = "closed";
		consecutiveFailures = 0;
		circuitOpenedAt = null;
		log.info("Circuit breaker reset");
	}
	return null;
}

function recordSuccess(): void {
	consecutiveFailures = 0;
}

function recordFailure(): void {
	consecutiveFailures++;
	if (
		consecutiveFailures >= CIRCUIT_BREAKER.threshold &&
		circuitState === "closed"
	) {
		circuitState = "open";
		circuitOpenedAt = Date.now();
		log.warn(
			{ failures: consecutiveFailures },
			"Circuit breaker opened due to consecutive failures",
		);
	}
}

/**
 * Check if DataForSEO API is available (circuit not open)
 */
export function isApiAvailable(): boolean {
	return checkCircuitBreaker() === null;
}

async function apiRequest<T>(
	endpoint: string,
	body: unknown,
	usage?: ApiUsage,
): Promise<ApiResult<T>> {
	// Check circuit breaker first
	const circuitCheck = checkCircuitBreaker();
	if (circuitCheck) {
		return circuitCheck;
	}

	let lastError: unknown;
	let lastErrorType: ApiErrorType = "unknown";

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
				recordSuccess();
				if (usage) {
					trackDataforseoRequest(usage, endpoint);
				}
				const data = (await response.json()) as T;
				// Debug: log raw response structure for ranked_keywords
				if (endpoint.includes("ranked_keywords")) {
					const d = data as Record<string, unknown>;
					const tasks = d.tasks as Array<Record<string, unknown>> | undefined;
					const task = tasks?.[0];
					log.info(
						{
							endpoint,
							statusCode: task?.status_code,
							statusMessage: task?.status_message,
							resultCount: (task?.result as unknown[])?.length ?? 0,
							itemsCount:
								(
									(task?.result as Array<Record<string, unknown>>)?.[0]
										?.items as unknown[]
								)?.length ?? 0,
						},
						"DataForSEO ranked_keywords raw response",
					);
				}
				return { ok: true, data };
			}

			// Determine error type
			if (response.status === 429) {
				lastErrorType = "rate_limit";
			} else if (response.status === 401 || response.status === 403) {
				lastErrorType = "auth_error";
				recordFailure();
				return {
					ok: false,
					error: "auth_error",
					message: "Authentication failed",
				};
			} else if (response.status >= 500) {
				lastErrorType = "server_error";
			} else if (response.status >= 400) {
				// Other 4xx - don't retry
				recordFailure();
				return {
					ok: false,
					error: "unknown",
					message: `HTTP ${response.status}`,
				};
			}

			lastError = new Error(`HTTP ${response.status}`);
		} catch (error) {
			lastError = error;
			if (error instanceof Error && error.message.includes("timeout")) {
				lastErrorType = "timeout";
			} else {
				lastErrorType = "server_error";
			}
		}

		if (attempt < RETRY_CONFIG.maxRetries) {
			// Exponential backoff with jitter
			const baseDelay = Math.min(
				RETRY_CONFIG.baseDelayMs * 2 ** attempt,
				RETRY_CONFIG.maxDelayMs,
			);
			const jitter = Math.random() * RETRY_CONFIG.jitterMs;
			const delay = baseDelay + jitter;
			log.debug(
				{ attempt: attempt + 1, maxRetries: RETRY_CONFIG.maxRetries, delay },
				"Retrying API request",
			);
			await sleep(delay);
		}
	}

	recordFailure();
	const message =
		lastError instanceof Error ? lastError.message : "Unknown error";
	log.error({ error: message }, "DataForSEO API request failed after retries");
	return { ok: false, error: lastErrorType, message };
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
		status_code?: number;
		status_message?: string;
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
	language = "English",
	usage?: ApiUsage,
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
		usage,
	);

	if (!response.ok || !response.data?.tasks?.[0]?.result) return [];

	return response.data.tasks[0].result.map((item) => ({
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
	usage?: ApiUsage,
): Promise<SerpWithFeatures> {
	const cached = serpCache.get(keyword, location, language);
	if (cached) {
		if (usage) {
			trackDataforseoCacheHit(usage);
		}
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
		usage,
	);

	if (!response.ok) {
		return { serp: [], paa: [], featuredSnippet: null };
	}

	const items = response.data?.tasks?.[0]?.result?.[0]?.items ?? [];

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
	language = "English",
	usage?: ApiUsage,
): Promise<SerpResult[]> {
	if (env.TEST_MODE) {
		return mockDataforseo.getSerpResults(keyword, location, language);
	}

	const { serp } = await fetchSerpWithFeatures(
		keyword,
		location,
		language,
		usage,
	);
	return serp;
}

export async function getSerpWithPaa(
	keyword: string,
	location = "United States",
	language = "English",
	usage?: ApiUsage,
): Promise<SerpWithPaa> {
	if (env.TEST_MODE) {
		return mockDataforseo.getSerpWithPaa(keyword, location, language);
	}

	const { serp, paa } = await fetchSerpWithFeatures(
		keyword,
		location,
		language,
		usage,
	);
	return { serp, paa };
}

export async function getSerpWithFeatures(
	keyword: string,
	location = "United States",
	language = "English",
	usage?: ApiUsage,
): Promise<SerpWithFeatures> {
	if (env.TEST_MODE) {
		return mockDataforseo.getSerpWithFeatures(keyword, location, language);
	}

	return fetchSerpWithFeatures(keyword, location, language, usage);
}

export async function getRelatedKeywords(
	keyword: string,
	location = "United States",
	language = "English",
	usage?: ApiUsage,
): Promise<RelatedKeyword[]> {
	if (env.TEST_MODE) {
		return mockDataforseo.getRelatedKeywords(keyword, location, language);
	}

	// Check cache first
	const cached = relatedKeywordsCache.get(keyword, location, language);
	if (cached) {
		if (usage) {
			trackDataforseoCacheHit(usage);
		}
		return cached;
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
		usage,
	);

	if (!response.ok || !response.data?.tasks?.[0]?.result?.[0]?.items) return [];

	const result = response.data.tasks[0].result[0].items
		.filter((item) => item.keyword)
		.map((item) => ({
			keyword: item.keyword ?? "",
			searchVolume: item.keyword_info?.search_volume ?? 0,
			difficulty: item.keyword_info?.keyword_difficulty ?? 0,
		}))
		.slice(0, 20);

	// Cache the result
	relatedKeywordsCache.set(keyword, location, language, result);

	return result;
}

export async function getPeopleAlsoAsk(
	keyword: string,
	location = "United States",
	language = "English",
	usage?: ApiUsage,
): Promise<string[]> {
	if (env.TEST_MODE) {
		return mockDataforseo.getPeopleAlsoAsk(keyword, location, language);
	}

	const { paa } = await fetchSerpWithFeatures(
		keyword,
		location,
		language,
		usage,
	);
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
	total_count?: number;
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
	usage?: ApiUsage,
): Promise<DomainKeyword[]> {
	if (env.TEST_MODE) {
		return mockDataforseo.getDomainRankedKeywords(domain, options);
	}

	const {
		location = "United States",
		language = "English",
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
		usage,
	);

	// Handle API errors
	if (!response.ok) {
		log.error(
			{
				domain,
				error: response.error,
				message: response.message,
			},
			"DataForSEO API error for ranked_keywords",
		);
		return [];
	}

	const task = response.data?.tasks?.[0];
	const result = task?.result?.[0];
	const items = result?.items;

	// Log API response status
	if (task?.status_code !== 20000) {
		log.warn(
			{
				domain,
				statusCode: task?.status_code,
				statusMessage: task?.status_message,
			},
			"DataForSEO task failed",
		);
		return [];
	}

	// Handle empty results (valid response, just no data)
	if (!items || items.length === 0) {
		log.info(
			{
				domain,
				totalCount: result?.total_count ?? 0,
				statusCode: task?.status_code,
			},
			"DataForSEO returned 0 keywords (domain may have no rankings)",
		);
		return [];
	}

	log.info({ domain, count: items.length }, "Found ranked keywords");

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
	usage?: ApiUsage,
): Promise<DiscoveredCompetitor[]> {
	if (env.TEST_MODE) {
		return mockDataforseo.discoverCompetitors(domain, options);
	}

	const {
		location = "United States",
		language = "English",
		limit = 10,
	} = options;

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
		usage,
	);

	if (!response.ok || !response.data?.tasks?.[0]?.result?.[0]?.items) {
		log.debug({ domain }, "No competitors found");
		return [];
	}

	const items = response.data.tasks[0].result[0].items;
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

// ============================================================================
// TYPED RESULT FUNCTIONS - For resilient pipeline with graceful degradation
// ============================================================================

/**
 * Get domain ranked keywords with typed result
 */
export async function getDomainRankedKeywordsTyped(
	domain: string,
	options: DomainKeywordOptions = {},
	usage?: ApiUsage,
): Promise<ApiResult<DomainKeyword[]>> {
	if (env.TEST_MODE) {
		const data = await mockDataforseo.getDomainRankedKeywords(domain, options);
		return { ok: true, data };
	}

	const {
		location = "United States",
		language = "English",
		limit = 200,
		maxPosition = 50,
		minVolume = 10,
		maxDifficulty,
	} = options;

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

	const result = await apiRequest<DataForSeoResponse<RankedKeywordResult>>(
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
		usage,
	);

	if (!result.ok) return result;

	const items = result.data?.tasks?.[0]?.result?.[0]?.items ?? [];
	return {
		ok: true,
		data: items
			.filter((item) => item.keyword_data?.keyword)
			.map((item) => ({
				keyword: item.keyword_data?.keyword ?? "",
				position: item.ranked_serp_element?.serp_item?.rank_group ?? 0,
				url: item.ranked_serp_element?.serp_item?.url ?? "",
				searchVolume: item.keyword_data?.keyword_info?.search_volume ?? 0,
				difficulty: item.keyword_data?.keyword_info?.keyword_difficulty ?? 0,
			})),
	};
}

/**
 * Discover competitors with typed result
 */
export async function discoverCompetitorsTyped(
	domain: string,
	options: DiscoverCompetitorsOptions = {},
	usage?: ApiUsage,
): Promise<ApiResult<DiscoveredCompetitor[]>> {
	if (env.TEST_MODE) {
		const data = await mockDataforseo.discoverCompetitors(domain, options);
		return { ok: true, data };
	}

	const {
		location = "United States",
		language = "English",
		limit = 10,
	} = options;

	const result = await apiRequest<DataForSeoResponse<CompetitorDomainResult>>(
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
		usage,
	);

	if (!result.ok) return result;

	const items = result.data?.tasks?.[0]?.result?.[0]?.items ?? [];
	return {
		ok: true,
		data: items
			.filter((item) => item.domain && item.domain !== domain)
			.map((item) => ({
				domain: item.domain ?? "",
				intersections: item.intersections ?? 0,
				avgPosition: item.avg_position ?? 0,
				etv: item.full_domain_metrics?.organic?.etv ?? 0,
			})),
	};
}

/**
 * Get keyword data with typed result
 */
export async function getKeywordDataTyped(
	keywords: string[],
	location = "United States",
	language = "English",
	usage?: ApiUsage,
): Promise<ApiResult<KeywordData[]>> {
	if (env.TEST_MODE) {
		const data = await mockDataforseo.getKeywordData(
			keywords,
			location,
			language,
		);
		return { ok: true, data };
	}

	const result = await apiRequest<DataForSeoResponse<KeywordDataResult>>(
		"/keywords_data/google_ads/search_volume/live",
		[
			{
				keywords,
				location_name: location,
				language_name: language,
			},
		],
		usage,
	);

	if (!result.ok) return result;

	const items = result.data?.tasks?.[0]?.result ?? [];
	return {
		ok: true,
		data: items.map((item) => ({
			keyword: item.keyword,
			searchVolume: item.keyword_info?.search_volume ?? 0,
			difficulty: item.keyword_info?.keyword_difficulty ?? 0,
			cpc: item.keyword_info?.cpc ?? 0,
			competition: item.keyword_info?.competition ?? 0,
		})),
	};
}

/**
 * Get SERP results with typed result
 */
export async function getSerpResultsTyped(
	keyword: string,
	location = "United States",
	language = "English",
	usage?: ApiUsage,
): Promise<ApiResult<SerpResult[]>> {
	if (env.TEST_MODE) {
		const data = await mockDataforseo.getSerpResults(
			keyword,
			location,
			language,
		);
		return { ok: true, data };
	}

	const cached = serpCache.get(keyword, location, language);
	if (cached) {
		if (usage) {
			trackDataforseoCacheHit(usage);
		}
		return { ok: true, data: cached.serp };
	}

	const result = await apiRequest<DataForSeoResponse<SerpDataResult>>(
		"/serp/google/organic/live/regular",
		[
			{
				keyword,
				location_name: location,
				language_name: language,
				depth: 10,
			},
		],
		usage,
	);

	if (!result.ok) return result;

	const items = result.data?.tasks?.[0]?.result?.[0]?.items ?? [];
	const serp: SerpResult[] = items
		.filter((item) => item.url && item.type !== "featured_snippet")
		.map((item) => ({
			position: item.rank_group ?? 0,
			url: item.url ?? "",
			title: item.title ?? "",
			description: item.description ?? "",
		}));

	return { ok: true, data: serp };
}

// ============================================================================
// Pre-flight Check
// ============================================================================

export type PreflightRanking = {
	url: string;
	keyword: string;
	position: number;
	searchVolume: number;
	estimatedTraffic: number;
};

export type PreflightResult = {
	isNewSite: boolean;
	rankings: PreflightRanking[];
};

/**
 * Pre-flight check: fetch rankings before pipeline starts.
 * Returns isNewSite flag and rankings data for reuse by rankings component.
 * Only call for paid tiers (FREE doesn't need rankings).
 */
export async function preflightRankingsCheck(
	siteUrl: string,
	limit: number,
): Promise<PreflightResult> {
	const domain = new URL(siteUrl).hostname.replace(/^www\./, "");

	log.info({ domain, limit }, "Running pre-flight rankings check");

	const keywords = await getDomainRankedKeywords(domain, {
		limit,
		maxPosition: 100,
		minVolume: 10,
	});

	// Transform to CurrentRanking format with estimated traffic
	const rankings: PreflightRanking[] = keywords.map((kw) => ({
		url: kw.url,
		keyword: kw.keyword,
		position: kw.position,
		searchVolume: kw.searchVolume,
		estimatedTraffic: estimateTraffic(kw.searchVolume, kw.position),
	}));

	const isNewSite = rankings.length === 0;

	log.info(
		{ domain, rankingsCount: rankings.length, isNewSite },
		"Pre-flight check complete",
	);

	return { isNewSite, rankings };
}

function estimateTraffic(searchVolume: number, position: number): number {
	// CTR estimates by position (rough industry averages)
	const ctrByPosition: Record<number, number> = {
		1: 0.3,
		2: 0.15,
		3: 0.1,
		4: 0.07,
		5: 0.05,
		6: 0.04,
		7: 0.03,
		8: 0.03,
		9: 0.02,
		10: 0.02,
	};

	const ctr = ctrByPosition[position] ?? (position <= 20 ? 0.01 : 0.005);
	return Math.round(searchVolume * ctr);
}
