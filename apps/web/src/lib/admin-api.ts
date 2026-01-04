const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type CostBreakdown = {
	dataforseo: number;
	claude: number;
	total: number;
};

export type AdminAuditListItem = {
	id: string;
	email: string;
	siteUrl: string;
	tier: string;
	status: string;
	cost: CostBreakdown;
	createdAt: string;
	completedAt: string | null;
	briefsCount: number;
	pagesCount: number;
};

export type AdminAuditListResponse = {
	audits: AdminAuditListItem[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};

export type AdminAuditDetail = {
	id: string;
	email: string;
	siteUrl: string;
	productDesc: string | null;
	competitors: string[];
	tier: string;
	status: string;
	accessToken: string;
	lsOrderId: string | null;
	cost: CostBreakdown;
	apiUsage: Record<string, unknown> | null;
	progress: Record<string, unknown> | null;
	healthScore: Record<string, unknown> | null;
	createdAt: string;
	startedAt: string | null;
	completedAt: string | null;
	expiresAt: string;
	briefsCount: number;
	pagesCount: number;
	pagesFound: number | null;
};

export type AdminStats = {
	auditsByStatus: Record<string, number>;
	auditsByTier: Record<string, number>;
	totalCosts: CostBreakdown;
	totalAudits: number;
};

export type ListAuditsParams = {
	page?: number;
	limit?: number;
	status?: string;
	tier?: string;
	email?: string;
	dateFrom?: string;
	dateTo?: string;
};

async function fetchAdmin<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${API_URL}${path}`, {
		...options,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
	});

	if (!res.ok) {
		const errorText = await res.text().catch(() => "Unknown error");
		throw new Error(`Admin API error: ${res.status} ${errorText}`);
	}

	return res.json();
}

export async function listAudits(
	params: ListAuditsParams = {},
): Promise<AdminAuditListResponse> {
	const searchParams = new URLSearchParams();
	if (params.page) searchParams.set("page", String(params.page));
	if (params.limit) searchParams.set("limit", String(params.limit));
	if (params.status) searchParams.set("status", params.status);
	if (params.tier) searchParams.set("tier", params.tier);
	if (params.email) searchParams.set("email", params.email);
	if (params.dateFrom) searchParams.set("dateFrom", params.dateFrom);
	if (params.dateTo) searchParams.set("dateTo", params.dateTo);

	const query = searchParams.toString();
	return fetchAdmin(`/admin/audits${query ? `?${query}` : ""}`);
}

export async function getAuditDetail(id: string): Promise<AdminAuditDetail> {
	return fetchAdmin(`/admin/audits/${id}`);
}

export async function getStats(): Promise<AdminStats> {
	return fetchAdmin("/admin/stats");
}

export type RetryResponse = {
	success: boolean;
	message: string;
	componentsRun?: string[];
	componentsFailed?: string[];
};

export async function retryAudit(id: string): Promise<RetryResponse> {
	return fetchAdmin(`/admin/audits/${id}/retry`, { method: "POST" });
}

export type RefundResponse = {
	success: boolean;
	message: string;
	refundedAmount?: number;
};

export async function refundAudit(id: string): Promise<RefundResponse> {
	return fetchAdmin(`/admin/audits/${id}/refund`, { method: "POST" });
}
