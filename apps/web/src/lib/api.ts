import type {
	Analysis,
	Audit,
	AuditSSEEvent,
	AuditState,
	Brief,
	CheckoutResponse,
	CreateAuditInput,
	DiscoverEvent,
	DiscoverResponse,
	NewAuditSSEEvent,
} from "./types";

// Re-export all types for backward compatibility
export * from "./types";
export { tierInfo } from "./config";

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

export async function devStartAudit(
	input: CreateAuditInput,
): Promise<{ accessToken: string }> {
	return fetchApi<{ accessToken: string }>("/dev/start-audit", {
		method: "POST",
		body: JSON.stringify(input),
	});
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
 * Subscribe to audit progress via SSE.
 * Returns an EventSource and unsubscribe function.
 */
export function subscribeToAudit(
	token: string,
	onEvent: (event: AuditSSEEvent) => void,
	onError?: (error: Error) => void,
): { close: () => void } {
	const eventSource = new EventSource(`${API_URL}/audits/${token}/stream`);

	function handleMessage(e: MessageEvent) {
		try {
			const event = JSON.parse(e.data) as AuditSSEEvent;
			onEvent(event);
		} catch {
			// Skip invalid JSON
		}
	}

	// Listen to all event types we care about
	eventSource.addEventListener("status", handleMessage);
	eventSource.addEventListener("component", handleMessage);
	eventSource.addEventListener("cwv", handleMessage);
	eventSource.addEventListener("cwv-complete", handleMessage);
	eventSource.addEventListener("health", handleMessage);
	eventSource.addEventListener("partial-ready", handleMessage);
	eventSource.addEventListener("complete", handleMessage);
	eventSource.addEventListener("error", (e) => {
		try {
			const event = JSON.parse((e as MessageEvent).data) as AuditSSEEvent;
			onEvent(event);
		} catch {
			onError?.(new Error("SSE connection error"));
		}
	});
	eventSource.addEventListener("progress", handleMessage);

	eventSource.onerror = () => {
		onError?.(new Error("SSE connection error"));
	};

	return {
		close: () => {
			eventSource.close();
		},
	};
}

// =============================================================================
// Unified Audit State API
// =============================================================================

/**
 * Get unified audit state (hydration)
 */
export async function getAuditState(token: string): Promise<AuditState> {
	return fetchApi<AuditState>(`/audits/${token}`);
}

/**
 * Subscribe to new unified SSE events.
 * Returns an unsubscribe function.
 */
export function subscribeToAuditNew(
	token: string,
	onEvent: (event: NewAuditSSEEvent) => void,
	onError?: (error: Error) => void,
): () => void {
	const eventSource = new EventSource(`${API_URL}/audits/${token}/stream`);

	function handleMessage(e: MessageEvent) {
		try {
			const event = JSON.parse(e.data) as NewAuditSSEEvent;
			onEvent(event);
		} catch {
			// Skip invalid JSON
		}
	}

	// Listen to new event types
	eventSource.addEventListener("audit:status", handleMessage);
	eventSource.addEventListener("component:start", handleMessage);
	eventSource.addEventListener("component:complete", handleMessage);
	eventSource.addEventListener("component:fail", handleMessage);
	eventSource.addEventListener("cwv:page", handleMessage);
	eventSource.addEventListener("crawl:pages", handleMessage);
	eventSource.addEventListener("health:score", handleMessage);
	eventSource.addEventListener("clusters", handleMessage);
	eventSource.addEventListener("action-plan", handleMessage);
	eventSource.addEventListener("audit:complete", handleMessage);
	eventSource.addEventListener("audit:error", handleMessage);

	eventSource.onerror = () => {
		onError?.(new Error("SSE connection error"));
	};

	return () => {
		eventSource.close();
	};
}
