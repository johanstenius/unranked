import type {
	Analysis,
	Audit,
	Brief,
	CheckoutResponse,
	CreateAuditInput,
	DiscoverEvent,
	DiscoverResponse,
	ReportData,
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

export async function getAudit(id: string): Promise<Audit> {
	return fetchApi<Audit>(`/audits/${id}`);
}

export async function getAuditAnalysis(auditId: string): Promise<Analysis> {
	return fetchApi<Analysis>(`/audits/${auditId}/analysis`);
}

export async function getAuditBriefs(auditId: string): Promise<Brief[]> {
	return fetchApi<Brief[]>(`/audits/${auditId}/briefs`);
}

export async function getBrief(briefId: string): Promise<Brief> {
	return fetchApi<Brief>(`/briefs/${briefId}`);
}

export async function devStartAudit(
	input: CreateAuditInput,
): Promise<{ auditId: string }> {
	return fetchApi<{ auditId: string }>("/dev/start-audit", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function getReportByToken(token: string): Promise<ReportData> {
	return fetchApi<ReportData>(`/report/${token}`);
}

export async function resendReportEmail(
	auditId: string,
): Promise<{ success: boolean }> {
	return fetchApi<{ success: boolean }>(`/audits/${auditId}/resend-email`, {
		method: "POST",
	});
}

export async function createUpgradeCheckout(
	auditId: string,
	toTier: "SCAN" | "AUDIT" | "DEEP_DIVE",
): Promise<{ checkoutUrl: string }> {
	return fetchApi<{ checkoutUrl: string }>(`/audits/${auditId}/upgrade`, {
		method: "POST",
		body: JSON.stringify({ toTier }),
	});
}
