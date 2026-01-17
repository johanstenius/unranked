import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { DIFFICULTY_THRESHOLDS, SCORE_THRESHOLDS } from "./config";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// URL helpers
export function getHostname(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return url;
	}
}

export function extractHostname(url: string): string {
	return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function getPathname(url: string): string {
	try {
		return new URL(url).pathname;
	} catch {
		return url;
	}
}

export function stripOrigin(url: string): string {
	const path = url.replace(/^https?:\/\/[^/]+/, "");
	return path || "/";
}

// Score helpers
export function getBarColor(percentage: number): string {
	if (percentage >= SCORE_THRESHOLDS.good) return "bg-[#2dd4bf]";
	if (percentage >= SCORE_THRESHOLDS.warning) return "bg-[#f59e0b]";
	return "bg-[#f87171]";
}

export function getDifficultyLabel(difficulty: number): string {
	if (difficulty < DIFFICULTY_THRESHOLDS.low) return "Low";
	if (difficulty < DIFFICULTY_THRESHOLDS.medium) return "Medium";
	return "High";
}

export function getDifficultyColor(difficulty: number): string {
	if (difficulty < DIFFICULTY_THRESHOLDS.low) return "text-status-good";
	if (difficulty < DIFFICULTY_THRESHOLDS.medium) return "text-status-warn";
	return "text-status-crit";
}

export function getIntentBadgeClass(
	intent: "informational" | "transactional" | "commercial" | "navigational",
): string {
	switch (intent) {
		case "informational":
			return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
		case "transactional":
			return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
		case "commercial":
			return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
		default:
			return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
	}
}
