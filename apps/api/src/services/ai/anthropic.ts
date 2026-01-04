import Anthropic from "@anthropic-ai/sdk";
import { z } from "@hono/zod-openapi";
import { env } from "../../config/env.js";
import { createLogger } from "../../lib/logger.js";
import { type ApiUsage, trackClaudeUsage } from "../../types/api-usage.js";
import * as mockAi from "./anthropic.mock.js";

const log = createLogger("ai");

const client = env.TEST_MODE
	? null
	: new Anthropic({
			apiKey: env.ANTHROPIC_API_KEY,
		});

// ============================================================================
// ERROR TYPES AND TYPED RESULTS
// ============================================================================

export type AiErrorType =
	| "rate_limit"
	| "overloaded"
	| "auth_error"
	| "timeout"
	| "circuit_open"
	| "unknown";

export type AiResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: AiErrorType; message: string };

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

const CIRCUIT_BREAKER = {
	threshold: 5,
	resetMs: 60_000,
} as const;

let circuitState: "closed" | "open" = "closed";
let consecutiveFailures = 0;
let circuitOpenedAt: number | null = null;

function checkCircuitBreaker(): AiResult<never> | null {
	if (circuitState === "open") {
		const elapsed = Date.now() - (circuitOpenedAt ?? 0);
		if (elapsed < CIRCUIT_BREAKER.resetMs) {
			return {
				ok: false,
				error: "circuit_open",
				message: `Circuit breaker open, retry in ${Math.ceil((CIRCUIT_BREAKER.resetMs - elapsed) / 1000)}s`,
			};
		}
		circuitState = "closed";
		consecutiveFailures = 0;
		circuitOpenedAt = null;
		log.info("AI circuit breaker reset");
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
			"AI circuit breaker opened due to consecutive failures",
		);
	}
}

export function isAiAvailable(): boolean {
	return checkCircuitBreaker() === null;
}

function categorizeError(error: unknown): AiErrorType {
	if (error instanceof Anthropic.RateLimitError) {
		return "rate_limit";
	}
	if (error instanceof Anthropic.AuthenticationError) {
		return "auth_error";
	}
	if (error instanceof Anthropic.PermissionDeniedError) {
		return "auth_error";
	}
	if (error instanceof Anthropic.InternalServerError) {
		return "overloaded";
	}
	if (error instanceof Anthropic.APIConnectionError) {
		return "timeout";
	}
	if (error instanceof Anthropic.APIError) {
		// Check status for 529 (overloaded)
		if (error.status === 529) return "overloaded";
	}
	return "unknown";
}

function getModel(type: "fast" | "quality"): string {
	return type === "fast" ? env.AI_MODEL_FAST : env.AI_MODEL_QUALITY;
}

function getClient(): Anthropic {
	if (!client) {
		throw new Error("Anthropic client not initialized (TEST_MODE is enabled)");
	}
	return client;
}

export type BriefStructure = {
	h2s: Array<{
		title: string;
		h3s?: string[];
		keyPoints?: string[];
	}>;
	metaDescription?: string;
	wordCount?: number;
	primaryKeywords?: string[];
	secondaryKeywords?: string[];
};

type GenerateStructureInput = {
	keyword: string;
	productDesc: string | null;
	existingPages: Array<{ title: string | null | undefined; url: string }>;
	topResults: Array<{ position: number; title: string; url: string }>;
	questions: string[];
};

export async function generateBriefStructure(
	input: GenerateStructureInput,
): Promise<{ title: string; structure: BriefStructure }> {
	if (env.TEST_MODE) {
		return mockAi.generateBriefStructure(input);
	}

	const existingPagesList = input.existingPages
		.slice(0, 10)
		.map((p) => `- ${p.title}: ${p.url}`)
		.join("\n");

	const topResults = input.topResults
		.slice(0, 5)
		.map((r) => `${r.position}. ${r.title} - ${r.url}`)
		.join("\n");

	const prompt = `You are an SEO expert creating a content brief to outrank competitors.

Target keyword: "${input.keyword}"
Website/product: ${input.productDesc || "A product or service"}

Existing pages on this website:
${existingPagesList}

Top ranking pages for this keyword (competitors to beat):
${topResults}

Common questions people ask:
${input.questions.map((q) => `- ${q}`).join("\n")}

Create a comprehensive content brief with:
1. A compelling page title (include the keyword naturally, under 60 chars)
2. A meta description (compelling, 150-160 chars, include keyword)
3. Recommended word count based on what's ranking
4. H2/H3 structure that covers the topic better than competitors
5. Primary and secondary keywords to target

Respond in JSON format:
{
  "title": "Page title here",
  "structure": {
    "metaDescription": "Compelling meta description under 160 chars",
    "wordCount": 1500,
    "primaryKeywords": ["main keyword", "close variant"],
    "secondaryKeywords": ["related term 1", "related term 2"],
    "h2s": [
      {
        "title": "H2 heading",
        "h3s": ["H3 subheading 1", "H3 subheading 2"],
        "keyPoints": ["Key point to cover", "What competitors miss"]
      }
    ]
  }
}`;

	const response = await getClient().messages.create({
		model: getModel("quality"),
		max_tokens: 1024,
		messages: [{ role: "user", content: prompt }],
	});

	const textContent = response.content.find((c) => c.type === "text");
	if (!textContent || textContent.type !== "text") {
		throw new Error("No text response from AI");
	}

	const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		throw new Error("No JSON found in AI response");
	}

	return JSON.parse(jsonMatch[0]) as {
		title: string;
		structure: BriefStructure;
	};
}

export type QuickWinSuggestions = {
	contentGaps: string[];
	questionsToAnswer: string[];
	internalLinksToAdd: Array<{ fromPage: string; suggestedAnchor: string }>;
	estimatedNewPosition: number;
};

type QuickWinInput = {
	pageUrl: string;
	pageTitle: string | null | undefined;
	pageContent: string | null | undefined;
	keyword: string;
	currentPosition: number;
	topCompetitors: Array<{ title: string; url: string; description: string }>;
	relatedQuestions: string[];
	existingPages: Array<{ title: string | null | undefined; url: string }>;
};

export async function generateQuickWinSuggestions(
	input: QuickWinInput,
	usage?: ApiUsage,
): Promise<QuickWinSuggestions> {
	if (env.TEST_MODE) {
		return mockAi.generateQuickWinSuggestions(input);
	}

	const competitorsList = input.topCompetitors
		.slice(0, 3)
		.map((c) => `- ${c.title}: ${c.description.slice(0, 200)}`)
		.join("\n");

	const existingPagesList = input.existingPages
		.filter((p) => p.url !== input.pageUrl)
		.slice(0, 10)
		.map((p) => `- ${p.title}: ${p.url}`)
		.join("\n");

	const contentPreview = (input.pageContent ?? "").slice(0, 2000);

	const prompt = `You are an SEO expert analyzing a page that ranks #${input.currentPosition} for "${input.keyword}".

PAGE BEING ANALYZED:
URL: ${input.pageUrl}
Title: ${input.pageTitle || "Unknown"}
Content preview: ${contentPreview}

PAGES RANKING ABOVE (competitors):
${competitorsList}

RELATED QUESTIONS PEOPLE ASK:
${input.relatedQuestions.map((q) => `- ${q}`).join("\n")}

OTHER PAGES ON THIS SITE (for internal linking):
${existingPagesList}

Analyze why this page ranks #${input.currentPosition} instead of higher, and provide specific, actionable suggestions to improve rankings.

Respond in JSON format:
{
  "contentGaps": ["Specific section or topic to add based on what competitors cover"],
  "questionsToAnswer": ["Specific questions from the PAA list that should be answered"],
  "internalLinksToAdd": [{"fromPage": "URL of page that should link to this", "suggestedAnchor": "anchor text to use"}],
  "estimatedNewPosition": 5
}

Be specific. Don't give generic advice like "add more content" - instead say exactly what content to add based on what competitors cover.`;

	const response = await getClient().messages.create({
		model: getModel("quality"),
		max_tokens: 1024,
		messages: [{ role: "user", content: prompt }],
	});

	if (usage) {
		trackClaudeUsage(
			usage,
			response.usage.input_tokens,
			response.usage.output_tokens,
		);
	}

	const textContent = response.content.find((c) => c.type === "text");
	if (!textContent || textContent.type !== "text") {
		throw new Error("No text response from AI");
	}

	const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		throw new Error("No JSON found in AI response");
	}

	return JSON.parse(jsonMatch[0]) as QuickWinSuggestions;
}

type KeywordWithVolume = {
	keyword: string;
	searchVolume: number;
};

// Semantic clustering with topic names
export type SemanticCluster = {
	topic: string;
	keywords: string[];
};

const semanticClusterSchema = z.object({
	clusters: z.array(
		z.object({
			topic: z.string(),
			keywords: z.array(z.string()),
		}),
	),
});

export async function clusterKeywordsSemantic(
	keywords: KeywordWithVolume[],
	usage?: ApiUsage,
): Promise<SemanticCluster[]> {
	if (keywords.length === 0) return [];

	if (env.TEST_MODE) {
		return mockAi.clusterKeywordsSemantic(keywords);
	}

	const keywordList = keywords
		.map((k) => `- "${k.keyword}" (vol: ${k.searchVolume})`)
		.join("\n");

	const prompt = `You are an SEO expert grouping keywords into topical clusters for content planning.

Group these keywords by topic/intent. Each cluster = ONE content piece.

Keywords:
${keywordList}

Rules:
- Group semantically related keywords that can be targeted with a single page
- Give each cluster a descriptive topic name (2-5 words, like "Email API Integration" or "SMTP Configuration Guide")
- Max 8 keywords per cluster
- Include ALL keywords exactly as written
- Topic name should reflect the search intent, not just repeat keywords

Respond ONLY with JSON:
{
  "clusters": [
    { "topic": "Email API Integration", "keywords": ["email api", "send email api"] },
    { "topic": "SMTP Setup Guide", "keywords": ["smtp setup", "configure smtp"] }
  ]
}`;

	try {
		const response = await getClient().messages.create({
			model: getModel("fast"),
			max_tokens: 2048,
			messages: [{ role: "user", content: prompt }],
		});

		if (usage) {
			trackClaudeUsage(
				usage,
				response.usage.input_tokens,
				response.usage.output_tokens,
			);
		}

		const textContent = response.content.find((c) => c.type === "text");
		if (!textContent || textContent.type !== "text") {
			log.error("No text response from AI");
			return fallbackClustering(keywords);
		}

		const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			log.error("No JSON found in AI response");
			return fallbackClustering(keywords);
		}

		const parsed = semanticClusterSchema.parse(JSON.parse(jsonMatch[0]));
		log.debug(
			{ keywords: keywords.length, clusters: parsed.clusters.length },
			"AI grouped keywords into clusters",
		);
		return parsed.clusters;
	} catch (error) {
		log.error({ error }, "AI clustering failed");
		return fallbackClustering(keywords);
	}
}

// Fallback: naive word-based clustering
function fallbackClustering(keywords: KeywordWithVolume[]): SemanticCluster[] {
	const clusters = new Map<string, string[]>();

	for (const kw of keywords) {
		const words = kw.keyword.toLowerCase().split(/\s+/).sort();
		const key = words.slice(0, 2).join(" ");
		const existing = clusters.get(key) || [];
		existing.push(kw.keyword);
		clusters.set(key, existing);
	}

	return Array.from(clusters.entries()).map(([key, kws]) => ({
		topic: key.charAt(0).toUpperCase() + key.slice(1),
		keywords: kws,
	}));
}

const SEARCH_INTENTS = {
	informational:
		"how-to guides, tutorials, explanations, what is, understanding concepts",
	transactional: "buy, purchase, sign up, download, get started, pricing",
	navigational:
		"brand searches, specific product/service lookup, login, support",
	commercial: "comparison, reviews, best, vs, alternatives, top",
} as const;

export type SearchIntent = keyof typeof SEARCH_INTENTS;

const intentResponseSchema = z.record(z.string(), z.string());
const INTENT_BATCH_SIZE = 50;

async function classifyIntentBatch(
	keywords: string[],
	usage?: ApiUsage,
): Promise<Map<string, SearchIntent>> {
	const keywordList = keywords.map((k, i) => `${i + 1}. ${k}`).join("\n");
	const intentDefs = Object.entries(SEARCH_INTENTS)
		.map(([k, v]) => `- ${k}: ${v}`)
		.join("\n");

	const prompt = `Classify each keyword by search intent:
${intentDefs}

Keywords:
${keywordList}

Respond ONLY with JSON mapping number to intent:
{"1": "informational", "2": "commercial", ...}`;

	const response = await getClient().messages.create({
		model: getModel("fast"),
		max_tokens: 1024,
		messages: [{ role: "user", content: prompt }],
	});

	if (usage) {
		trackClaudeUsage(
			usage,
			response.usage.input_tokens,
			response.usage.output_tokens,
		);
	}

	const textContent = response.content.find((c) => c.type === "text");
	if (!textContent || textContent.type !== "text") {
		log.error("No text response from AI for intent classification");
		return new Map();
	}

	const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		log.error("No JSON found in AI response for intent classification");
		return new Map();
	}

	const parsed = intentResponseSchema.parse(JSON.parse(jsonMatch[0]));
	const result = new Map<string, SearchIntent>();
	const validIntents = Object.keys(SEARCH_INTENTS);

	for (const [idx, intent] of Object.entries(parsed)) {
		const keyword = keywords[Number.parseInt(idx) - 1];
		if (keyword && validIntents.includes(intent)) {
			result.set(keyword.toLowerCase(), intent as SearchIntent);
		}
	}

	return result;
}

export async function classifyKeywordIntents(
	keywords: string[],
	usage?: ApiUsage,
): Promise<Map<string, SearchIntent>> {
	if (keywords.length === 0) {
		return new Map();
	}

	if (env.TEST_MODE) {
		return mockAi.classifyKeywordIntents(keywords);
	}

	const result = new Map<string, SearchIntent>();

	for (let i = 0; i < keywords.length; i += INTENT_BATCH_SIZE) {
		const batch = keywords.slice(i, i + INTENT_BATCH_SIZE);
		try {
			const batchResult = await classifyIntentBatch(batch, usage);
			for (const [k, v] of batchResult) {
				result.set(k, v);
			}
		} catch (error) {
			log.error(
				{ batch: Math.floor(i / INTENT_BATCH_SIZE) + 1, error },
				"Intent classification batch failed",
			);
		}
	}

	return result;
}

// ============================================================================
// TYPED RESULT FUNCTIONS - For resilient pipeline with graceful degradation
// ============================================================================

/**
 * Classify keyword intents with typed result
 */
export async function classifyKeywordIntentsTyped(
	keywords: string[],
	usage?: ApiUsage,
): Promise<AiResult<Map<string, SearchIntent>>> {
	if (keywords.length === 0) {
		return { ok: true, data: new Map() };
	}

	const circuitCheck = checkCircuitBreaker();
	if (circuitCheck) return circuitCheck;

	if (env.TEST_MODE) {
		const data = await mockAi.classifyKeywordIntents(keywords);
		return { ok: true, data };
	}

	const result = new Map<string, SearchIntent>();

	try {
		for (let i = 0; i < keywords.length; i += INTENT_BATCH_SIZE) {
			const batch = keywords.slice(i, i + INTENT_BATCH_SIZE);
			const batchResult = await classifyIntentBatch(batch, usage);
			for (const [k, v] of batchResult) {
				result.set(k, v);
			}
		}
		recordSuccess();
		return { ok: true, data: result };
	} catch (error) {
		recordFailure();
		const errorType = categorizeError(error);
		const message = error instanceof Error ? error.message : "Unknown error";
		log.error({ error: message }, "Intent classification failed");
		return { ok: false, error: errorType, message };
	}
}

/**
 * Cluster keywords with typed result
 */
export async function clusterKeywordsSemanticTyped(
	keywords: KeywordWithVolume[],
	usage?: ApiUsage,
): Promise<AiResult<SemanticCluster[]>> {
	if (keywords.length === 0) {
		return { ok: true, data: [] };
	}

	const circuitCheck = checkCircuitBreaker();
	if (circuitCheck) return circuitCheck;

	if (env.TEST_MODE) {
		const data = await mockAi.clusterKeywordsSemantic(keywords);
		return { ok: true, data };
	}

	const keywordList = keywords
		.map((k) => `- "${k.keyword}" (vol: ${k.searchVolume})`)
		.join("\n");

	const prompt = `You are an SEO expert grouping keywords into topical clusters for content planning.

Group these keywords by topic/intent. Each cluster = ONE content piece.

Keywords:
${keywordList}

Rules:
- Group semantically related keywords that can be targeted with a single page
- Give each cluster a descriptive topic name (2-5 words, like "Email API Integration" or "SMTP Configuration Guide")
- Max 8 keywords per cluster
- Include ALL keywords exactly as written
- Topic name should reflect the search intent, not just repeat keywords

Respond ONLY with JSON:
{
  "clusters": [
    { "topic": "Email API Integration", "keywords": ["email api", "send email api"] },
    { "topic": "SMTP Setup Guide", "keywords": ["smtp setup", "configure smtp"] }
  ]
}`;

	try {
		const response = await getClient().messages.create({
			model: getModel("fast"),
			max_tokens: 2048,
			messages: [{ role: "user", content: prompt }],
		});

		if (usage) {
			trackClaudeUsage(
				usage,
				response.usage.input_tokens,
				response.usage.output_tokens,
			);
		}

		const textContent = response.content.find((c) => c.type === "text");
		if (!textContent || textContent.type !== "text") {
			recordFailure();
			return {
				ok: false,
				error: "unknown",
				message: "No text response from AI",
			};
		}

		const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			recordFailure();
			return { ok: false, error: "unknown", message: "No JSON in AI response" };
		}

		const parsed = semanticClusterSchema.parse(JSON.parse(jsonMatch[0]));
		recordSuccess();
		return { ok: true, data: parsed.clusters };
	} catch (error) {
		recordFailure();
		const errorType = categorizeError(error);
		const message = error instanceof Error ? error.message : "Unknown error";
		log.error({ error: message }, "AI clustering failed");
		return { ok: false, error: errorType, message };
	}
}

/**
 * Generate quick win suggestions with typed result
 */
export async function generateQuickWinSuggestionsTyped(
	input: QuickWinInput,
	usage?: ApiUsage,
): Promise<AiResult<QuickWinSuggestions>> {
	const circuitCheck = checkCircuitBreaker();
	if (circuitCheck) return circuitCheck;

	if (env.TEST_MODE) {
		const data = await mockAi.generateQuickWinSuggestions(input);
		return { ok: true, data };
	}

	const competitorsList = input.topCompetitors
		.slice(0, 3)
		.map((c) => `- ${c.title}: ${c.description.slice(0, 200)}`)
		.join("\n");

	const existingPagesList = input.existingPages
		.filter((p) => p.url !== input.pageUrl)
		.slice(0, 10)
		.map((p) => `- ${p.title}: ${p.url}`)
		.join("\n");

	const contentPreview = (input.pageContent ?? "").slice(0, 2000);

	const prompt = `You are an SEO expert analyzing a page that ranks #${input.currentPosition} for "${input.keyword}".

PAGE BEING ANALYZED:
URL: ${input.pageUrl}
Title: ${input.pageTitle || "Unknown"}
Content preview: ${contentPreview}

PAGES RANKING ABOVE (competitors):
${competitorsList}

RELATED QUESTIONS PEOPLE ASK:
${input.relatedQuestions.map((q) => `- ${q}`).join("\n")}

OTHER PAGES ON THIS SITE (for internal linking):
${existingPagesList}

Analyze why this page ranks #${input.currentPosition} instead of higher, and provide specific, actionable suggestions to improve rankings.

Respond in JSON format:
{
  "contentGaps": ["Specific section or topic to add based on what competitors cover"],
  "questionsToAnswer": ["Specific questions from the PAA list that should be answered"],
  "internalLinksToAdd": [{"fromPage": "URL of page that should link to this", "suggestedAnchor": "anchor text to use"}],
  "estimatedNewPosition": 5
}

Be specific. Don't give generic advice like "add more content" - instead say exactly what content to add based on what competitors cover.`;

	try {
		const response = await getClient().messages.create({
			model: getModel("quality"),
			max_tokens: 1024,
			messages: [{ role: "user", content: prompt }],
		});

		if (usage) {
			trackClaudeUsage(
				usage,
				response.usage.input_tokens,
				response.usage.output_tokens,
			);
		}

		const textContent = response.content.find((c) => c.type === "text");
		if (!textContent || textContent.type !== "text") {
			recordFailure();
			return {
				ok: false,
				error: "unknown",
				message: "No text response from AI",
			};
		}

		const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			recordFailure();
			return { ok: false, error: "unknown", message: "No JSON in AI response" };
		}

		recordSuccess();
		return { ok: true, data: JSON.parse(jsonMatch[0]) as QuickWinSuggestions };
	} catch (error) {
		recordFailure();
		const errorType = categorizeError(error);
		const message = error instanceof Error ? error.message : "Unknown error";
		log.error({ error: message }, "Quick win generation failed");
		return { ok: false, error: errorType, message };
	}
}

/**
 * Generate brief structure with typed result
 */
export async function generateBriefStructureTyped(
	input: GenerateStructureInput,
	usage?: ApiUsage,
): Promise<AiResult<{ title: string; structure: BriefStructure }>> {
	const circuitCheck = checkCircuitBreaker();
	if (circuitCheck) return circuitCheck;

	if (env.TEST_MODE) {
		const data = await mockAi.generateBriefStructure(input);
		return { ok: true, data };
	}

	const existingPagesList = input.existingPages
		.slice(0, 10)
		.map((p) => `- ${p.title}: ${p.url}`)
		.join("\n");

	const topResults = input.topResults
		.slice(0, 5)
		.map((r) => `${r.position}. ${r.title} - ${r.url}`)
		.join("\n");

	const prompt = `You are an SEO expert creating a content brief to outrank competitors.

Target keyword: "${input.keyword}"
Website/product: ${input.productDesc || "A product or service"}

Existing pages on this website:
${existingPagesList}

Top ranking pages for this keyword (competitors to beat):
${topResults}

Common questions people ask:
${input.questions.map((q) => `- ${q}`).join("\n")}

Create a comprehensive content brief with:
1. A compelling page title (include the keyword naturally, under 60 chars)
2. A meta description (compelling, 150-160 chars, include keyword)
3. Recommended word count based on what's ranking
4. H2/H3 structure that covers the topic better than competitors
5. Primary and secondary keywords to target

Respond in JSON format:
{
  "title": "Page title here",
  "structure": {
    "metaDescription": "Compelling meta description under 160 chars",
    "wordCount": 1500,
    "primaryKeywords": ["main keyword", "close variant"],
    "secondaryKeywords": ["related term 1", "related term 2"],
    "h2s": [
      {
        "title": "H2 heading",
        "h3s": ["H3 subheading 1", "H3 subheading 2"],
        "keyPoints": ["Key point to cover", "What competitors miss"]
      }
    ]
  }
}`;

	try {
		const response = await getClient().messages.create({
			model: getModel("quality"),
			max_tokens: 1024,
			messages: [{ role: "user", content: prompt }],
		});

		if (usage) {
			trackClaudeUsage(
				usage,
				response.usage.input_tokens,
				response.usage.output_tokens,
			);
		}

		const textContent = response.content.find((c) => c.type === "text");
		if (!textContent || textContent.type !== "text") {
			recordFailure();
			return {
				ok: false,
				error: "unknown",
				message: "No text response from AI",
			};
		}

		const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			recordFailure();
			return { ok: false, error: "unknown", message: "No JSON in AI response" };
		}

		recordSuccess();
		return { ok: true, data: JSON.parse(jsonMatch[0]) };
	} catch (error) {
		recordFailure();
		const errorType = categorizeError(error);
		const message = error instanceof Error ? error.message : "Unknown error";
		log.error({ error: message }, "Brief structure generation failed");
		return { ok: false, error: errorType, message };
	}
}
