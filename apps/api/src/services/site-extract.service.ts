import Anthropic from "@anthropic-ai/sdk";
import { z } from "@hono/zod-openapi";
import { env } from "../config/env.js";
import { createLogger } from "../lib/logger.js";

const log = createLogger("site-extract");

const FETCH_TIMEOUT_MS = 8000;
const MAX_CONTENT_LENGTH = 15000;

export type SiteExtraction = {
	productDescription: string;
	seedKeywords: string[];
};

const extractionSchema = z.object({
	productDescription: z.string(),
	seedKeywords: z.array(z.string()),
});

const client = env.TEST_MODE
	? null
	: new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

function getClient(): Anthropic {
	if (!client) {
		throw new Error("Anthropic client not initialized");
	}
	return client;
}

async function fetchPageContent(url: string): Promise<string | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

	try {
		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				"User-Agent":
					"Mozilla/5.0 (compatible; DocRankBot/1.0; +https://docrank.io)",
				Accept: "text/html",
			},
		});

		clearTimeout(timeout);

		if (!response.ok) {
			return null;
		}

		const html = await response.text();
		return html.slice(0, MAX_CONTENT_LENGTH);
	} catch {
		clearTimeout(timeout);
		return null;
	}
}

function extractTextFromHtml(html: string): string {
	// Remove scripts, styles, and HTML tags
	const text = html
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
		.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
		.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/\s+/g, " ")
		.trim();

	// Extract title if present
	const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	const title = titleMatch?.[1]?.trim() ?? "";

	// Extract meta description
	const metaMatch = html.match(
		/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i,
	);
	const metaDesc = metaMatch?.[1]?.trim() ?? "";

	// Combine with priority
	const combined = [title, metaDesc, text.slice(0, 5000)]
		.filter(Boolean)
		.join("\n\n");

	return combined.slice(0, 8000);
}

export async function extractSiteInfo(
	siteUrl: string,
): Promise<SiteExtraction | null> {
	const baseUrl = new URL(siteUrl);

	// Fetch homepage and /about in parallel
	const pagesToFetch = [
		baseUrl.href,
		new URL("/about", baseUrl).href,
		new URL("/about-us", baseUrl).href,
	];

	log.debug({ url: siteUrl, pages: pagesToFetch }, "Fetching site pages");

	const results = await Promise.all(pagesToFetch.map(fetchPageContent));

	const contents = results
		.filter((r): r is string => r !== null)
		.map(extractTextFromHtml)
		.filter((t) => t.length > 100);

	if (contents.length === 0) {
		log.warn({ url: siteUrl }, "No content fetched from site");
		return null;
	}

	const combinedContent = contents.join("\n\n---\n\n").slice(0, 10000);

	// Use AI to extract structured info
	if (env.TEST_MODE) {
		return {
			productDescription: "A software product",
			seedKeywords: ["software", "product", "tool"],
		};
	}

	try {
		const prompt = `Analyze this website content and extract:
1. A concise product/service description (1-2 sentences max, what does this company/product do?)
2. 5-10 seed keywords that represent what they do and what they'd want to rank for

Website content:
${combinedContent}

Respond ONLY with JSON:
{
  "productDescription": "Short description of what this product/company does",
  "seedKeywords": ["keyword1", "keyword2", "keyword3", ...]
}

Rules:
- Description should be factual, not marketing fluff
- Keywords should be what potential customers would search for
- Include both broad and specific keywords
- Focus on the core product/service, not generic terms`;

		const response = await getClient().messages.create({
			model: env.AI_MODEL_FAST,
			max_tokens: 512,
			messages: [{ role: "user", content: prompt }],
		});

		const textContent = response.content.find((c) => c.type === "text");
		if (!textContent || textContent.type !== "text") {
			log.error("No text in AI response");
			return null;
		}

		const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			log.error("No JSON in AI response");
			return null;
		}

		const parsed = extractionSchema.parse(JSON.parse(jsonMatch[0]));
		log.info(
			{
				url: siteUrl,
				description: parsed.productDescription.slice(0, 50),
				keywords: parsed.seedKeywords.length,
			},
			"Extracted site info",
		);

		return parsed;
	} catch (error) {
		log.error({ error, url: siteUrl }, "AI extraction failed");
		return null;
	}
}
