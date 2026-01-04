export const AUDIT_STATUS = {
	PENDING: "PENDING",
	CRAWLING: "CRAWLING",
	ANALYZING: "ANALYZING",
	GENERATING_BRIEFS: "GENERATING_BRIEFS",
	RETRYING: "RETRYING",
	COMPLETED: "COMPLETED",
	FAILED: "FAILED",
} as const;

export const AUDIT_TIER = {
	FREE: "FREE",
	SCAN: "SCAN",
	AUDIT: "AUDIT",
	DEEP_DIVE: "DEEP_DIVE",
} as const;

export const USER_ROLE = {
	ADMIN: "admin",
	USER: "user",
} as const;

export type AuditStatus = (typeof AUDIT_STATUS)[keyof typeof AUDIT_STATUS];
export type AuditTier = (typeof AUDIT_TIER)[keyof typeof AUDIT_TIER];
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export type AdminUser = {
	id: string;
	email: string;
	name: string;
	role: string;
};

export function getAdminUser(user: unknown): AdminUser | null {
	if (
		user &&
		typeof user === "object" &&
		"role" in user &&
		"id" in user &&
		"email" in user
	) {
		const u = user as AdminUser;
		if (u.role === USER_ROLE.ADMIN) {
			return u;
		}
	}
	return null;
}

export function isAdmin(user: unknown): boolean {
	return getAdminUser(user) !== null;
}

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 4,
	}).format(amount);
}

export function formatDate(
	dateString: string | null,
	options?: { includeSeconds?: boolean },
): string {
	if (!dateString) return "—";
	return new Date(dateString).toLocaleString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		...(options?.includeSeconds && { second: "2-digit", year: "numeric" }),
	});
}

export const STATUS_OPTIONS = [
	{ value: "", label: "All Statuses" },
	{ value: AUDIT_STATUS.PENDING, label: "Pending" },
	{ value: AUDIT_STATUS.CRAWLING, label: "Crawling" },
	{ value: AUDIT_STATUS.ANALYZING, label: "Analyzing" },
	{ value: AUDIT_STATUS.GENERATING_BRIEFS, label: "Generating Briefs" },
	{ value: AUDIT_STATUS.RETRYING, label: "Retrying" },
	{ value: AUDIT_STATUS.COMPLETED, label: "Completed" },
	{ value: AUDIT_STATUS.FAILED, label: "Failed" },
] as const;

export const TIER_OPTIONS = [
	{ value: "", label: "All Tiers" },
	{ value: AUDIT_TIER.FREE, label: "Free" },
	{ value: AUDIT_TIER.SCAN, label: "Scan ($9)" },
	{ value: AUDIT_TIER.AUDIT, label: "Audit ($29)" },
	{ value: AUDIT_TIER.DEEP_DIVE, label: "Deep Dive ($49)" },
] as const;

export const STATUS_LABELS: Record<string, string> = {
	[AUDIT_STATUS.PENDING]: "Pending",
	[AUDIT_STATUS.CRAWLING]: "Crawling",
	[AUDIT_STATUS.ANALYZING]: "Analyzing",
	[AUDIT_STATUS.GENERATING_BRIEFS]: "Generating Briefs",
	[AUDIT_STATUS.RETRYING]: "Retrying",
	[AUDIT_STATUS.COMPLETED]: "Completed",
	[AUDIT_STATUS.FAILED]: "Failed",
};

export const TIER_LABELS: Record<string, string> = {
	[AUDIT_TIER.FREE]: "Free",
	[AUDIT_TIER.SCAN]: "Scan ($9)",
	[AUDIT_TIER.AUDIT]: "Audit ($29)",
	[AUDIT_TIER.DEEP_DIVE]: "Deep Dive ($49)",
};
