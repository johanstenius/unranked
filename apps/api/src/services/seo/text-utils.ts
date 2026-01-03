/**
 * Count whole-word matches of a keyword in text.
 * Avoids partial matches (e.g., "python" won't match "pythonic").
 */
export function countWholeWordMatches(text: string, keyword: string): number {
	const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const regex = new RegExp(`\\b${escaped}\\b`, "gi");
	return (text.match(regex) || []).length;
}

/**
 * Check if text contains a whole-word match of keyword.
 */
export function hasWholeWordMatch(text: string, keyword: string): boolean {
	return countWholeWordMatches(text, keyword) > 0;
}
