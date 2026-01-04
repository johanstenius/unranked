import type {
	BriefStructure,
	QuickWinSuggestions,
	SearchIntent,
	SemanticCluster,
} from "./anthropic.js";

type GenerateStructureInput = {
	keyword: string;
	productDesc: string | null;
	existingPages: Array<{ title: string | null | undefined; url: string }>;
	topResults: Array<{ position: number; title: string; url: string }>;
	questions: string[];
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

type KeywordWithVolume = {
	keyword: string;
	searchVolume: number;
};

export async function generateBriefStructure(
	input: GenerateStructureInput,
): Promise<{ title: string; structure: BriefStructure }> {
	console.log(`[mock-ai] generateBriefStructure for "${input.keyword}"`);
	await simulateDelay(100);

	return {
		title: `Complete Guide to ${capitalize(input.keyword)} | Your Site`,
		structure: {
			metaDescription: `Learn everything about ${input.keyword}. Comprehensive guide with tips, best practices, and expert insights.`,
			wordCount: 1500,
			primaryKeywords: [input.keyword, `${input.keyword} guide`],
			secondaryKeywords: [`best ${input.keyword}`, `how to ${input.keyword}`],
			h2s: [
				{
					title: `What is ${capitalize(input.keyword)}?`,
					h3s: ["Definition and Overview", "Why It Matters"],
					keyPoints: [
						"Clear definition for beginners",
						"Key benefits explained",
					],
				},
				{
					title: `How to Get Started with ${capitalize(input.keyword)}`,
					h3s: ["Step 1: Setup", "Step 2: Configuration", "Step 3: Launch"],
					keyPoints: ["Actionable steps", "Common pitfalls to avoid"],
				},
				{
					title: "Best Practices and Tips",
					h3s: ["Expert Recommendations", "Common Mistakes"],
					keyPoints: ["Data-backed advice", "Real examples"],
				},
				{
					title: "Frequently Asked Questions",
					keyPoints: input.questions.slice(0, 3),
				},
			],
		},
	};
}

export async function generateQuickWinSuggestions(
	input: QuickWinInput,
): Promise<QuickWinSuggestions> {
	console.log(
		`[mock-ai] generateQuickWinSuggestions for "${input.keyword}" (pos ${input.currentPosition})`,
	);
	await simulateDelay(80);

	const internalLinks = input.existingPages.slice(0, 2).map((page) => ({
		fromPage: page.url,
		suggestedAnchor: input.keyword,
	}));

	return {
		contentGaps: [
			`Add a section comparing ${input.keyword} alternatives`,
			"Include pricing information or cost breakdown",
			"Add recent statistics and data from 2024",
		],
		questionsToAnswer: input.relatedQuestions.slice(0, 3),
		internalLinksToAdd: internalLinks,
		estimatedNewPosition: Math.max(1, input.currentPosition - 3),
	};
}

export async function clusterKeywordsSemantic(
	keywords: KeywordWithVolume[],
): Promise<SemanticCluster[]> {
	console.log(
		`[mock-ai] clusterKeywordsSemantic for ${keywords.length} keywords`,
	);
	await simulateDelay(50);

	if (keywords.length === 0) return [];

	return clusterByCommonWords(keywords);
}

export async function classifyKeywordIntents(
	keywords: string[],
): Promise<Map<string, SearchIntent>> {
	console.log(
		`[mock-ai] classifyKeywordIntents for ${keywords.length} keywords`,
	);
	await simulateDelay(30);

	const result = new Map<string, SearchIntent>();

	for (const keyword of keywords) {
		const lower = keyword.toLowerCase();
		let intent: SearchIntent = "informational";

		if (
			lower.includes("buy") ||
			lower.includes("price") ||
			lower.includes("cost") ||
			lower.includes("download") ||
			lower.includes("sign up")
		) {
			intent = "transactional";
		} else if (
			lower.includes("best") ||
			lower.includes("vs") ||
			lower.includes("alternative") ||
			lower.includes("review") ||
			lower.includes("comparison")
		) {
			intent = "commercial";
		} else if (
			lower.includes("login") ||
			lower.includes("support") ||
			lower.includes("docs")
		) {
			intent = "navigational";
		}

		result.set(lower, intent);
	}

	return result;
}

function simulateDelay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function capitalize(str: string): string {
	return str
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function clusterByCommonWords(
	keywords: KeywordWithVolume[],
): SemanticCluster[] {
	const clusters = new Map<string, string[]>();

	for (const kw of keywords) {
		const words = kw.keyword.toLowerCase().split(/\s+/).sort();
		const key = words.slice(0, 2).join(" ");
		const existing = clusters.get(key) || [];
		existing.push(kw.keyword);
		clusters.set(key, existing);
	}

	return Array.from(clusters.entries()).map(([key, kws]) => ({
		topic: capitalize(key),
		keywords: kws,
	}));
}
