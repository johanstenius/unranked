/**
 * API Usage Tracking Types
 *
 * Tracks DataForSEO and Claude API usage per audit for cost monitoring.
 */

export type ApiUsage = {
	dataforseo: {
		requests: number;
		cacheHits: number;
		endpoints: Record<string, number>;
	};
	claude: {
		requests: number;
		inputTokens: number;
		outputTokens: number;
	};
};

// DataForSEO pricing (USD per request)
const DATAFORSEO_COSTS: Record<string, number> = {
	"/keywords_data/google_ads/search_volume/live": 0.0001,
	"/serp/google/organic/live/regular": 0.002,
	"/keywords_data/google_ads/keywords_for_keywords/live": 0.0002,
	"/dataforseo_labs/google/ranked_keywords/live": 0.01,
	"/dataforseo_labs/google/competitors_domain/live": 0.01,
};

// Claude pricing (USD per 1M tokens)
const CLAUDE_INPUT_COST_PER_M = 3.0; // Sonnet
const CLAUDE_OUTPUT_COST_PER_M = 15.0; // Sonnet

export function createEmptyUsage(): ApiUsage {
	return {
		dataforseo: {
			requests: 0,
			cacheHits: 0,
			endpoints: {},
		},
		claude: {
			requests: 0,
			inputTokens: 0,
			outputTokens: 0,
		},
	};
}

export type CostBreakdown = {
	dataforseo: number;
	claude: number;
	total: number;
};

export function calculateCost(usage: ApiUsage): CostBreakdown {
	// DataForSEO: sum by endpoint
	let dataforseoCost = 0;
	for (const [endpoint, count] of Object.entries(usage.dataforseo.endpoints)) {
		const costPerRequest = DATAFORSEO_COSTS[endpoint] ?? 0.001; // fallback
		dataforseoCost += count * costPerRequest;
	}

	// Claude: tokens to cost
	const claudeCost =
		(usage.claude.inputTokens / 1_000_000) * CLAUDE_INPUT_COST_PER_M +
		(usage.claude.outputTokens / 1_000_000) * CLAUDE_OUTPUT_COST_PER_M;

	return {
		dataforseo: Math.round(dataforseoCost * 10000) / 10000, // 4 decimal places
		claude: Math.round(claudeCost * 10000) / 10000,
		total: Math.round((dataforseoCost + claudeCost) * 10000) / 10000,
	};
}

// Helper to track a DataForSEO request
export function trackDataforseoRequest(
	usage: ApiUsage,
	endpoint: string,
): void {
	usage.dataforseo.requests++;
	usage.dataforseo.endpoints[endpoint] =
		(usage.dataforseo.endpoints[endpoint] ?? 0) + 1;
}

// Helper to track a DataForSEO cache hit
export function trackDataforseoCacheHit(usage: ApiUsage): void {
	usage.dataforseo.cacheHits++;
}

// Helper to track Claude usage
export function trackClaudeUsage(
	usage: ApiUsage,
	inputTokens: number,
	outputTokens: number,
): void {
	usage.claude.requests++;
	usage.claude.inputTokens += inputTokens;
	usage.claude.outputTokens += outputTokens;
}
