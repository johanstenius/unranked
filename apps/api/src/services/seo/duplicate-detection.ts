import type { CrawledPage } from "../crawler/types.js";

export type DuplicateGroup = {
	urls: string[];
	similarity: number;
	type: "exact" | "near";
};

/**
 * Simple hash function for content comparison.
 * Uses a basic string hash - good enough for exact match detection.
 */
function hashContent(content: string): string {
	let hash = 0;
	const normalized = content.toLowerCase().replace(/\s+/g, " ").trim();
	for (let i = 0; i < normalized.length; i++) {
		const char = normalized.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return hash.toString(16);
}

/**
 * Calculate similarity between two strings using Jaccard similarity of word sets.
 * Returns a value between 0 (completely different) and 1 (identical).
 */
function calculateSimilarity(content1: string, content2: string): number {
	const words1 = new Set(
		content1
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => w.length > 3),
	);
	const words2 = new Set(
		content2
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => w.length > 3),
	);

	if (words1.size === 0 || words2.size === 0) return 0;

	let intersection = 0;
	for (const word of words1) {
		if (words2.has(word)) intersection++;
	}

	const union = words1.size + words2.size - intersection;
	return intersection / union;
}

/**
 * Detect duplicate and near-duplicate content across pages.
 * Returns groups of pages with similar content.
 */
export function detectDuplicateContent(
	pages: CrawledPage[],
	similarityThreshold = 0.8,
): DuplicateGroup[] {
	const groups: DuplicateGroup[] = [];
	const processed = new Set<string>();

	// First pass: find exact duplicates using hash
	const contentHashes = new Map<string, string[]>();
	for (const page of pages) {
		if (!page.content || page.content.length < 100) continue;

		const hash = hashContent(page.content);
		const existing = contentHashes.get(hash) ?? [];
		existing.push(page.url);
		contentHashes.set(hash, existing);
	}

	// Add exact duplicate groups
	for (const [, urls] of contentHashes) {
		if (urls.length >= 2) {
			groups.push({
				urls,
				similarity: 1.0,
				type: "exact",
			});
			for (const url of urls) {
				processed.add(url);
			}
		}
	}

	// Second pass: find near-duplicates using similarity
	// Only check pages not already in exact duplicate groups
	const pagesForSimilarity = pages.filter(
		(p) => !processed.has(p.url) && p.content && p.content.length >= 100,
	);

	// Limit comparisons to avoid O(n²) explosion on large sites
	const maxComparisons = 500;
	let comparisons = 0;

	for (
		let i = 0;
		i < pagesForSimilarity.length && comparisons < maxComparisons;
		i++
	) {
		const page1 = pagesForSimilarity[i];
		if (!page1?.content || processed.has(page1.url)) continue;

		const similarPages: string[] = [page1.url];
		let maxSimilarity = 0;

		for (
			let j = i + 1;
			j < pagesForSimilarity.length && comparisons < maxComparisons;
			j++
		) {
			const page2 = pagesForSimilarity[j];
			if (!page2?.content || processed.has(page2.url)) continue;

			comparisons++;
			const similarity = calculateSimilarity(page1.content, page2.content);

			if (similarity >= similarityThreshold) {
				similarPages.push(page2.url);
				maxSimilarity = Math.max(maxSimilarity, similarity);
				processed.add(page2.url);
			}
		}

		if (similarPages.length >= 2) {
			processed.add(page1.url);
			groups.push({
				urls: similarPages,
				similarity: maxSimilarity,
				type: "near",
			});
		}
	}

	return groups.sort((a, b) => b.urls.length - a.urls.length);
}
