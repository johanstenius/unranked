import Anthropic from "@anthropic-ai/sdk";
import { z } from "@hono/zod-openapi";
import { env } from "../config/env.js";
import { createLogger } from "../lib/logger.js";
import { type ApiUsage, trackClaudeUsage } from "../types/api-usage.js";
import type { CompetitorSuggestion } from "../types/audit-state.js";

const log = createLogger("competitor-suggestions");

const client = env.TEST_MODE
	? null
	: new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

function getClient(): Anthropic {
	if (!client) {
		throw new Error("Anthropic client not initialized (TEST_MODE is enabled)");
	}
	return client;
}

const competitorSuggestionsSchema = z.object({
	competitors: z.array(
		z.object({
			domain: z.string(),
			reason: z.string(),
			confidence: z.number().min(0).max(1),
		}),
	),
});

type SuggestCompetitorsInput = {
	productDesc: string;
	seedKeywords: string[];
	siteUrl: string;
};

/**
 * Use AI to suggest competitors based on product description and seed keywords.
 * Returns 5-8 competitor domains with reasons and confidence scores.
 */
export async function suggestCompetitors(
	input: SuggestCompetitorsInput,
	usage?: ApiUsage,
): Promise<CompetitorSuggestion[]> {
	if (env.TEST_MODE) {
		return getMockCompetitors(input);
	}

	const keywordsList = input.seedKeywords
		.slice(0, 10)
		.map((k) => `- ${k}`)
		.join("\n");

	const prompt = `You are a competitive analysis expert. Given a product/service description and target keywords, identify direct competitors.

PRODUCT/SERVICE:
${input.productDesc}

TARGET KEYWORDS:
${keywordsList}

CURRENT SITE: ${input.siteUrl}

Identify 5-8 direct competitors (NOT the current site). For each competitor:
1. Provide the root domain (e.g., "resend.com", not "https://resend.com/docs")
2. Explain why they compete (1 sentence)
3. Rate confidence 0-1 (1 = definitely competes, 0.5 = possibly competes)

Focus on:
- Companies offering similar products/services
- Sites ranking for similar keywords
- Both direct competitors (same solution) and indirect (alternative solutions)

Respond ONLY with JSON:
{
  "competitors": [
    { "domain": "resend.com", "reason": "Email API for developers", "confidence": 0.95 },
    { "domain": "sendgrid.com", "reason": "Transactional email service", "confidence": 0.9 }
  ]
}

Rules:
- Use root domain only (no paths, no protocol)
- Exclude the current site: ${new URL(input.siteUrl).hostname}
- Focus on quality over quantity`;

	try {
		const response = await getClient().messages.create({
			model: env.AI_MODEL_FAST,
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
			log.error("No text response from AI for competitor suggestions");
			return [];
		}

		const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			log.error("No JSON found in AI response");
			return [];
		}

		const parsed = competitorSuggestionsSchema.parse(JSON.parse(jsonMatch[0]));
		const currentDomain = new URL(input.siteUrl).hostname.replace("www.", "");

		// Filter out current site and normalize domains
		const filtered = parsed.competitors
			.filter((c) => {
				const normalized = c.domain.replace("www.", "").toLowerCase();
				return normalized !== currentDomain;
			})
			.map((c) => ({
				domain: c.domain.replace("www.", "").toLowerCase(),
				reason: c.reason,
				confidence: c.confidence,
			}));

		log.info(
			{ count: filtered.length, siteUrl: input.siteUrl },
			"AI suggested competitors",
		);

		return filtered;
	} catch (error) {
		log.error(
			{ error, siteUrl: input.siteUrl },
			"AI competitor suggestion failed",
		);
		return [];
	}
}

function getMockCompetitors(
	_input: SuggestCompetitorsInput,
): CompetitorSuggestion[] {
	return [
		{
			domain: "resend.com",
			reason: "Email API for developers",
			confidence: 0.95,
		},
		{
			domain: "sendgrid.com",
			reason: "Transactional email platform",
			confidence: 0.9,
		},
		{
			domain: "postmark.com",
			reason: "Developer-focused email delivery",
			confidence: 0.85,
		},
		{ domain: "mailgun.com", reason: "Email API service", confidence: 0.8 },
		{
			domain: "ses.amazonaws.com",
			reason: "AWS email service",
			confidence: 0.75,
		},
	];
}
