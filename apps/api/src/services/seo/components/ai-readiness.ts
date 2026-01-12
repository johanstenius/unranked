/**
 * AI Readiness Component
 *
 * Analyzes robots.txt for AI bot rules and checks for llms.txt presence.
 */

import type { CrawledPage } from "../../crawler/types.js";
import type {
	AIBotStatus,
	AIReadinessData,
	ComponentContext,
	ComponentEntry,
	ComponentResult,
	ComponentResults,
	ContentStructureAnalysis,
	LlmsTxtInfo,
	RobotsTxtAnalysis,
} from "./types.js";

// ============================================================================
// AI Bot Definitions
// ============================================================================

type AIBotDefinition = {
	name: string;
	provider: string;
	purpose: "training" | "search" | "live" | "indexing";
};

const AI_BOTS: AIBotDefinition[] = [
	// OpenAI
	{ name: "GPTBot", provider: "OpenAI", purpose: "training" },
	{ name: "OAI-SearchBot", provider: "OpenAI", purpose: "search" },
	{ name: "ChatGPT-User", provider: "OpenAI", purpose: "live" },
	// Anthropic
	{ name: "ClaudeBot", provider: "Anthropic", purpose: "training" },
	{ name: "Claude-SearchBot", provider: "Anthropic", purpose: "search" },
	{ name: "Claude-User", provider: "Anthropic", purpose: "live" },
	// Perplexity
	{ name: "PerplexityBot", provider: "Perplexity", purpose: "indexing" },
	{ name: "Perplexity-User", provider: "Perplexity", purpose: "live" },
	// Google
	{ name: "Google-Extended", provider: "Google", purpose: "training" },
	// Others
	{ name: "Amazonbot", provider: "Amazon", purpose: "indexing" },
	{ name: "Bytespider", provider: "ByteDance", purpose: "training" },
	{ name: "cohere-ai", provider: "Cohere", purpose: "training" },
];

// ============================================================================
// Robots.txt Parsing
// ============================================================================

type RobotsTxtRule = {
	userAgent: string;
	disallow: string[];
	allow: string[];
};

function parseRobotsTxt(content: string): RobotsTxtRule[] {
	const rules: RobotsTxtRule[] = [];
	let currentRule: RobotsTxtRule | null = null;

	const lines = content.split("\n");

	for (const line of lines) {
		const trimmed = line.trim();

		// Skip comments and empty lines
		if (trimmed.startsWith("#") || trimmed === "") {
			continue;
		}

		const colonIndex = trimmed.indexOf(":");
		if (colonIndex === -1) continue;

		const directive = trimmed.slice(0, colonIndex).toLowerCase().trim();
		const value = trimmed.slice(colonIndex + 1).trim();

		if (directive === "user-agent") {
			// Save previous rule if exists
			if (currentRule) {
				rules.push(currentRule);
			}
			currentRule = {
				userAgent: value,
				disallow: [],
				allow: [],
			};
		} else if (currentRule) {
			if (directive === "disallow" && value) {
				currentRule.disallow.push(value);
			} else if (directive === "allow" && value) {
				currentRule.allow.push(value);
			}
		}
	}

	// Push last rule
	if (currentRule) {
		rules.push(currentRule);
	}

	return rules;
}

function getBotStatus(
	botName: string,
	rules: RobotsTxtRule[],
): { status: "allowed" | "blocked" | "not_specified"; rule?: string } {
	const botNameLower = botName.toLowerCase();

	// Find rules that apply to this bot (exact match or wildcard)
	const specificRule = rules.find(
		(r) => r.userAgent.toLowerCase() === botNameLower,
	);
	const wildcardRule = rules.find((r) => r.userAgent === "*");

	// Prefer specific rule over wildcard
	const ruleToCheck = specificRule ?? wildcardRule;

	if (!ruleToCheck) {
		return { status: "not_specified" };
	}

	// Check if bot is blocked (disallow all)
	const hasDisallowAll = ruleToCheck.disallow.some(
		(d) => d === "/" || d === "/*",
	);
	const hasAllowAll = ruleToCheck.allow.some((a) => a === "/" || a === "/*");

	if (hasDisallowAll && !hasAllowAll) {
		const ruleStr = `User-agent: ${ruleToCheck.userAgent}\nDisallow: /`;
		return { status: "blocked", rule: ruleStr };
	}

	// No disallow rules or explicit allow all = allowed
	if (ruleToCheck.disallow.length === 0 || hasAllowAll) {
		return { status: "allowed" };
	}

	// Has partial disallow rules (e.g., /admin) but not blocking crawlers entirely
	// For AI visibility purposes, this still counts as "allowed"
	return { status: "allowed" };
}

function analyzeRobotsTxt(content: string | null): RobotsTxtAnalysis {
	if (!content) {
		return {
			exists: false,
			aiBots: AI_BOTS.map((bot) => ({
				bot: bot.name,
				provider: bot.provider,
				purpose: bot.purpose,
				status: "not_specified" as const,
			})),
			summary: {
				allowed: 0,
				blocked: 0,
				unspecified: AI_BOTS.length,
			},
		};
	}

	const rules = parseRobotsTxt(content);
	const aiBots: AIBotStatus[] = [];

	let allowed = 0;
	let blocked = 0;
	let unspecified = 0;

	for (const bot of AI_BOTS) {
		const { status, rule } = getBotStatus(bot.name, rules);

		aiBots.push({
			bot: bot.name,
			provider: bot.provider,
			purpose: bot.purpose,
			status,
			rule,
		});

		if (status === "allowed") allowed++;
		else if (status === "blocked") blocked++;
		else unspecified++;
	}

	return {
		exists: true,
		aiBots,
		summary: { allowed, blocked, unspecified },
	};
}

// ============================================================================
// llms.txt Info (fetched during crawl phase)
// ============================================================================

function getLlmsTxtInfo(hasLlmsTxt: boolean, siteUrl: string): LlmsTxtInfo {
	return hasLlmsTxt
		? { exists: true, url: `${siteUrl}/llms.txt` }
		: { exists: false, url: null };
}

// ============================================================================
// Content Structure Analysis
// ============================================================================

const THIN_CONTENT_THRESHOLD = 300;

function analyzeContentStructure(
	pages: CrawledPage[],
): ContentStructureAnalysis {
	if (pages.length === 0) {
		return {
			headingHierarchy: {
				score: 0,
				pagesWithProperH1: 0,
				pagesWithMultipleH1: 0,
				pagesWithNoH1: 0,
				avgHeadingsPerPage: 0,
			},
			structuredData: {
				pagesWithSchema: 0,
				schemaTypes: [],
				hasFAQSchema: false,
				hasArticleSchema: false,
				hasProductSchema: false,
			},
			contentQuality: {
				avgWordCount: 0,
				avgReadabilityScore: null,
				pagesWithThinContent: 0,
			},
		};
	}

	// Heading analysis
	let pagesWithProperH1 = 0;
	let pagesWithMultipleH1 = 0;
	let pagesWithNoH1 = 0;
	let totalHeadings = 0;

	for (const page of pages) {
		const h1Count = page.h1Count ?? (page.h1 ? 1 : 0);
		const h2Count = page.h2s?.length ?? 0;
		const h3Count = page.h3s?.length ?? 0;

		totalHeadings += h1Count + h2Count + h3Count;

		if (h1Count === 1) {
			pagesWithProperH1++;
		} else if (h1Count > 1) {
			pagesWithMultipleH1++;
		} else {
			pagesWithNoH1++;
		}
	}

	// Heading score: penalize missing/multiple H1s
	const properH1Ratio = pagesWithProperH1 / pages.length;
	const headingScore = Math.round(properH1Ratio * 100);

	// Structured data analysis
	const allSchemaTypes = new Set<string>();
	let pagesWithSchema = 0;

	for (const page of pages) {
		if (page.hasSchemaOrg && page.schemaTypes) {
			pagesWithSchema++;
			for (const type of page.schemaTypes) {
				allSchemaTypes.add(type);
			}
		}
	}

	const schemaTypesArray = Array.from(allSchemaTypes);
	const hasFAQSchema = schemaTypesArray.some(
		(t) =>
			t.toLowerCase().includes("faq") || t.toLowerCase().includes("question"),
	);
	const hasArticleSchema = schemaTypesArray.some(
		(t) =>
			t.toLowerCase().includes("article") ||
			t.toLowerCase().includes("blogpost"),
	);
	const hasProductSchema = schemaTypesArray.some((t) =>
		t.toLowerCase().includes("product"),
	);

	// Content quality analysis
	let totalWordCount = 0;
	let totalReadability = 0;
	let readabilityCount = 0;
	let pagesWithThinContent = 0;

	for (const page of pages) {
		totalWordCount += page.wordCount;

		if (page.wordCount < THIN_CONTENT_THRESHOLD) {
			pagesWithThinContent++;
		}

		if (page.readabilityScore != null) {
			totalReadability += page.readabilityScore;
			readabilityCount++;
		}
	}

	return {
		headingHierarchy: {
			score: headingScore,
			pagesWithProperH1,
			pagesWithMultipleH1,
			pagesWithNoH1,
			avgHeadingsPerPage: Math.round(totalHeadings / pages.length),
		},
		structuredData: {
			pagesWithSchema,
			schemaTypes: schemaTypesArray,
			hasFAQSchema,
			hasArticleSchema,
			hasProductSchema,
		},
		contentQuality: {
			avgWordCount: Math.round(totalWordCount / pages.length),
			avgReadabilityScore:
				readabilityCount > 0
					? Math.round(totalReadability / readabilityCount)
					: null,
			pagesWithThinContent,
		},
	};
}

// ============================================================================
// Score Calculation
// ============================================================================

function calculateAIReadinessScore(
	robotsAnalysis: RobotsTxtAnalysis,
	llmsTxt: LlmsTxtInfo,
	_contentStructure: ContentStructureAnalysis, // kept for data storage, not scoring
): number {
	// Score 0-100
	// Robots.txt AI access: 70 points max
	// llms.txt presence: 30 points

	let score = 0;

	// Robots.txt scoring (70 pts)
	// This is the most important factor - can AI bots access your content?
	if (robotsAnalysis.exists) {
		const totalBots = robotsAnalysis.aiBots.length;
		const allowedOrUnspecified =
			robotsAnalysis.summary.allowed + robotsAnalysis.summary.unspecified;

		// Most sites don't explicitly allow/block AI bots
		// Unspecified = default allow (good)
		// Blocked = bad
		const accessRatio = allowedOrUnspecified / totalBots;
		score += Math.round(accessRatio * 70);
	} else {
		// No robots.txt = all bots allowed by default
		score += 70;
	}

	// llms.txt presence (30 pts)
	// Having llms.txt shows intentional AI optimization
	if (llmsTxt.exists) {
		score += 30;
	}

	return Math.min(100, score);
}

// ============================================================================
// Component Implementation
// ============================================================================

async function runAIReadiness(
	ctx: ComponentContext,
	_results: ComponentResults,
): Promise<ComponentResult<AIReadinessData>> {
	// Analyze robots.txt from crawl metadata
	const robotsTxtAnalysis = analyzeRobotsTxt(
		ctx.crawlMetadata.robotsTxtContent,
	);

	// Get llms.txt info (already fetched during crawl)
	const llmsTxt = getLlmsTxtInfo(ctx.crawlMetadata.hasLlmsTxt, ctx.siteUrl);

	// Analyze content structure from crawled pages
	const contentStructure = analyzeContentStructure(ctx.pages);

	// Calculate score
	const score = calculateAIReadinessScore(
		robotsTxtAnalysis,
		llmsTxt,
		contentStructure,
	);

	return {
		ok: true,
		data: {
			robotsTxtAnalysis,
			llmsTxt,
			contentStructure,
			score,
		},
	};
}

export const aiReadinessComponent: ComponentEntry<AIReadinessData> = {
	key: "aiReadiness",
	dependencies: [],
	run: runAIReadiness,
	store: (results, data) => ({ ...results, aiReadiness: data }),
	sseKey: "aiReadiness",
	getSSEData: (results) =>
		results.aiReadiness ?? {
			robotsTxtAnalysis: {
				exists: false,
				aiBots: [],
				summary: { allowed: 0, blocked: 0, unspecified: 0 },
			},
			llmsTxt: { exists: false, url: null },
			score: 0,
		},
};
