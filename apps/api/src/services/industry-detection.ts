/**
 * Industry Detection Service
 *
 * Auto-detects industry from crawled page content.
 * Prompt generation uses productDesc for accuracy.
 */

import type { CrawledPage } from "./crawler/types.js";

// ============================================================================
// Types
// ============================================================================

export type IndustryCategory =
	| "saas"
	| "ecommerce"
	| "fintech"
	| "healthcare"
	| "education"
	| "marketing"
	| "developer_tools"
	| "ai_ml"
	| "cybersecurity"
	| "hr_recruiting"
	| "real_estate"
	| "travel"
	| "food_delivery"
	| "media"
	| "general";

export type DetectedIndustry = {
	primary: IndustryCategory;
	confidence: number; // 0-1
	keywords: string[]; // Industry-specific terms found
};

// ============================================================================
// Industry Keywords
// ============================================================================

const INDUSTRY_KEYWORDS: Record<IndustryCategory, string[]> = {
	saas: [
		"software",
		"platform",
		"cloud",
		"subscription",
		"api",
		"dashboard",
		"integration",
		"workflow",
		"automation",
		"enterprise",
		"b2b",
		"crm",
		"erp",
	],
	ecommerce: [
		"shop",
		"cart",
		"checkout",
		"product",
		"store",
		"buy",
		"price",
		"shipping",
		"order",
		"catalog",
		"inventory",
		"marketplace",
	],
	fintech: [
		"payment",
		"banking",
		"finance",
		"investment",
		"trading",
		"crypto",
		"wallet",
		"transaction",
		"loan",
		"insurance",
		"fintech",
	],
	healthcare: [
		"health",
		"medical",
		"patient",
		"clinic",
		"hospital",
		"doctor",
		"treatment",
		"diagnosis",
		"telehealth",
		"wellness",
		"pharma",
	],
	education: [
		"course",
		"learning",
		"student",
		"teacher",
		"education",
		"training",
		"curriculum",
		"certification",
		"e-learning",
		"tutorial",
	],
	marketing: [
		"marketing",
		"advertising",
		"campaign",
		"seo",
		"content",
		"social media",
		"analytics",
		"conversion",
		"lead",
		"brand",
		"email marketing",
	],
	developer_tools: [
		"developer",
		"code",
		"programming",
		"sdk",
		"framework",
		"library",
		"git",
		"deploy",
		"debug",
		"ide",
		"devops",
	],
	ai_ml: [
		"artificial intelligence",
		"machine learning",
		"ai",
		"ml",
		"neural",
		"deep learning",
		"nlp",
		"model",
		"training",
		"inference",
		"llm",
	],
	cybersecurity: [
		"security",
		"cyber",
		"encryption",
		"firewall",
		"threat",
		"vulnerability",
		"penetration",
		"compliance",
		"soc",
		"siem",
	],
	hr_recruiting: [
		"hiring",
		"recruitment",
		"hr",
		"talent",
		"candidate",
		"interview",
		"onboarding",
		"employee",
		"payroll",
		"benefits",
	],
	real_estate: [
		"property",
		"real estate",
		"listing",
		"rental",
		"mortgage",
		"agent",
		"home",
		"apartment",
		"commercial",
		"lease",
	],
	travel: [
		"travel",
		"booking",
		"hotel",
		"flight",
		"vacation",
		"destination",
		"tourism",
		"itinerary",
		"reservation",
	],
	food_delivery: [
		"food",
		"delivery",
		"restaurant",
		"order",
		"menu",
		"cuisine",
		"takeout",
		"dining",
	],
	media: [
		"news",
		"media",
		"content",
		"publishing",
		"journalism",
		"video",
		"streaming",
		"podcast",
		"entertainment",
	],
	general: [], // Fallback
};

// ============================================================================
// Detection Logic
// ============================================================================

/**
 * Detect industry from crawled pages
 */
export function detectIndustry(pages: CrawledPage[]): DetectedIndustry {
	// Combine all page content for analysis
	const allContent = pages
		.map((p) => `${p.title ?? ""} ${p.h1 ?? ""} ${p.content ?? ""}`)
		.join(" ")
		.toLowerCase();

	const scores: Record<IndustryCategory, { score: number; matches: string[] }> =
		{} as Record<IndustryCategory, { score: number; matches: string[] }>;

	// Score each industry
	for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
		const matches: string[] = [];
		let score = 0;

		for (const keyword of keywords) {
			const regex = new RegExp(`\\b${keyword}\\b`, "gi");
			const matchCount = (allContent.match(regex) || []).length;
			if (matchCount > 0) {
				score += Math.min(matchCount, 10); // Cap at 10 per keyword
				matches.push(keyword);
			}
		}

		scores[industry as IndustryCategory] = { score, matches };
	}

	// Find top industry
	let topIndustry: IndustryCategory = "general";
	let topScore = 0;
	let topMatches: string[] = [];

	for (const [industry, data] of Object.entries(scores)) {
		if (data.score > topScore) {
			topScore = data.score;
			topIndustry = industry as IndustryCategory;
			topMatches = data.matches;
		}
	}

	// Calculate confidence (0-1)
	const maxPossibleScore = 100; // Rough estimate
	const confidence = Math.min(1, topScore / maxPossibleScore);

	return {
		primary: topIndustry,
		confidence,
		keywords: topMatches.slice(0, 5), // Top 5 matched keywords
	};
}

// ============================================================================
// Prompt Generation (uses productDesc)
// ============================================================================

/**
 * Generate prompts for AI visibility testing based on product description.
 * Uses the user-provided productDesc for accuracy instead of generic industry templates.
 */
export function generatePrompts(
	brand: string,
	productDesc: string | null,
	competitors: string[],
	maxPrompts = 5,
): string[] {
	const prompts: string[] = [];
	const year = new Date().getFullYear().toString();

	// If no product description, fall back to basic brand prompts
	if (!productDesc) {
		return [
			`What is ${brand}?`,
			`${brand} alternatives`,
			`${brand} reviews ${year}`,
			`Is ${brand} any good?`,
			`${brand} vs competitors`,
		].slice(0, maxPrompts);
	}

	// 1. Direct product query - what users actually search for
	prompts.push(`Best ${productDesc}`);

	// 2. Brand + product context (avoids confusion with similarly named products)
	prompts.push(`${brand} ${productDesc}`);

	// 3. Comparison with top competitor if available
	if (competitors.length > 0) {
		prompts.push(`${brand} vs ${competitors[0]}`);
	} else {
		prompts.push(`Best ${productDesc} ${year}`);
	}

	// 4. Use case / recommendation query
	prompts.push(`What ${productDesc} should I use?`);

	// 5. Alternatives query (important for visibility)
	prompts.push(`${productDesc} alternatives`);

	return prompts.slice(0, maxPrompts);
}

/**
 * Legacy function for backwards compatibility - redirects to new implementation
 * @deprecated Use generatePrompts with productDesc instead
 */
export function generatePromptsFromIndustry(
	brand: string,
	industry: DetectedIndustry,
	maxPrompts = 5,
): string[] {
	// Fall back to basic brand queries
	return generatePrompts(brand, null, [], maxPrompts);
}
