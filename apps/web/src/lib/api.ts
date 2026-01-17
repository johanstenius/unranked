import type {
	Analysis,
	Audit,
	AuditState,
	Brief,
	CheckoutResponse,
	CreateAuditInput,
	DiscoverEvent,
	DiscoverResponse,
} from "./types";

// Re-export all types for backward compatibility
export * from "./types";
export { TIERS } from "./config";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
	});

	if (!res.ok) {
		throw new Error(`API error: ${res.status}`);
	}

	return res.json();
}

export async function discoverSections(
	siteUrl: string,
): Promise<DiscoverResponse> {
	return fetchApi<DiscoverResponse>("/audits/discover", {
		method: "POST",
		body: JSON.stringify({ siteUrl }),
	});
}

export async function discoverSectionsStream(
	siteUrl: string,
	onEvent: (event: DiscoverEvent) => void,
): Promise<void> {
	const response = await fetch(`${API_URL}/audits/discover/stream`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ siteUrl }),
	});

	if (!response.ok) {
		throw new Error(`API error: ${response.status}`);
	}

	const reader = response.body?.getReader();
	if (!reader) throw new Error("No response body");

	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() || "";

		for (const line of lines) {
			if (line.startsWith("data: ")) {
				const data = line.slice(6);
				try {
					const event = JSON.parse(data) as DiscoverEvent;
					onEvent(event);
				} catch {
					// Skip invalid JSON
				}
			}
		}
	}
}

export type ValidateUrlResponse = {
	valid: boolean;
	error?: string;
	productDescription?: string;
	seedKeywords?: string[];
};

export async function validateUrl(url: string): Promise<ValidateUrlResponse> {
	return fetchApi<ValidateUrlResponse>("/validate-url", {
		method: "POST",
		body: JSON.stringify({ url }),
	});
}

export async function createCheckout(
	input: CreateAuditInput,
): Promise<CheckoutResponse> {
	return fetchApi<CheckoutResponse>("/checkout", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function getAudit(token: string): Promise<Audit> {
	return fetchApi<Audit>(`/audits/${token}`);
}

export async function getAuditAnalysis(token: string): Promise<Analysis> {
	return fetchApi<Analysis>(`/audits/${token}/analysis`);
}

export async function getAuditBriefs(token: string): Promise<Brief[]> {
	return fetchApi<Brief[]>(`/audits/${token}/briefs`);
}

export async function getBrief(briefId: string): Promise<Brief> {
	return fetchApi<Brief>(`/briefs/${briefId}`);
}

export async function createUpgradeCheckout(
	token: string,
	toTier: "SCAN" | "AUDIT" | "DEEP_DIVE",
): Promise<{ checkoutUrl: string }> {
	return fetchApi<{ checkoutUrl: string }>(`/audits/${token}/upgrade`, {
		method: "POST",
		body: JSON.stringify({ toTier }),
	});
}

/**
 * Get unified audit state (hydration)
 */
export async function getAuditState(token: string): Promise<AuditState> {
	return fetchApi<AuditState>(`/audits/${token}`);
}

// ============================================================================
// Brief Generation (On-Demand)
// ============================================================================

export type BriefGenerationEvent =
	| { type: "progress"; current: number; total: number; topic: string }
	| { type: "brief"; brief: Brief }
	| { type: "error"; topic: string; error: string }
	| { type: "done"; generated: number; failed: number };

/**
 * Generate briefs for selected clusters.
 * Streams progress and briefs as they are generated.
 */
export async function generateBriefs(
	token: string,
	clusterTopics: string[],
	onEvent: (event: BriefGenerationEvent) => void,
): Promise<void> {
	const response = await fetch(`${API_URL}/audits/${token}/briefs/generate`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ keywords: clusterTopics }),
	});

	if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ error: "Unknown error" }));
		throw new Error(error.error || `API error: ${response.status}`);
	}

	const reader = response.body?.getReader();
	if (!reader) throw new Error("No response body");

	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() || "";

		for (const line of lines) {
			if (line.startsWith("data: ")) {
				const data = line.slice(6);
				try {
					const parsed = JSON.parse(data);
					// Map SSE event names to our event types
					if ("current" in parsed) {
						onEvent({ type: "progress", ...parsed });
					} else if ("keyword" in parsed) {
						onEvent({ type: "brief", brief: parsed as Brief });
					} else if ("topic" in parsed && "error" in parsed) {
						onEvent({ type: "error", ...parsed });
					} else if ("generated" in parsed) {
						onEvent({ type: "done", ...parsed });
					}
				} catch {
					// Skip invalid JSON
				}
			} else if (line.startsWith("event: ")) {
				// Handle event type prefix (SSE format)
				// The data will come in the next line
			}
		}
	}
}

// ============================================================================
// Interactive Flow Selection
// ============================================================================

/**
 * Submit competitor selection for interactive flow
 */
export async function selectCompetitors(
	token: string,
	competitors: string[],
): Promise<{ success: boolean }> {
	return fetchApi<{ success: boolean }>(`/audits/${token}/competitors/select`, {
		method: "POST",
		body: JSON.stringify({ competitors }),
	});
}
