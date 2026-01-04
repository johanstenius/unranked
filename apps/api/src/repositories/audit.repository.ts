import { randomBytes } from "node:crypto";
import { type AuditStatus, type AuditTier, Prisma } from "@prisma/client";
import { db } from "../lib/db.js";

const ACCESS_TOKEN_EXPIRY_DAYS = 30;

function generateAccessToken(): string {
	return randomBytes(32).toString("hex");
}

function getAccessTokenExpiry(): Date {
	const expiry = new Date();
	expiry.setDate(expiry.getDate() + ACCESS_TOKEN_EXPIRY_DAYS);
	return expiry;
}

export type CreateAuditInput = {
	siteUrl: string;
	productDesc?: string;
	competitors: string[];
	sections?: string[];
	tier: AuditTier;
	email: string;
	stripeSessionId?: string;
};

export type UpdateAuditInput = {
	status?: AuditStatus;
	tier?: AuditTier;
	pagesFound?: number;
	sitemapUrlCount?: number;
	hasRobotsTxt?: boolean;
	hasSitemap?: boolean;
	opportunities?: object;
	detectedSections?: Prisma.InputJsonValue;
	healthScore?: Prisma.InputJsonValue;
	redirectChains?: Prisma.InputJsonValue;
	progress?: Prisma.InputJsonValue;
	apiUsage?: Prisma.InputJsonValue;
	retryAfter?: Date | null;
	delayEmailSentAt?: Date | null;
	startedAt?: Date;
	completedAt?: Date;
	reportEmailSentAt?: Date | null;
	supportAlertSentAt?: Date | null;
};

export function createAudit(input: CreateAuditInput) {
	return db.audit.create({
		data: {
			...input,
			accessToken: generateAccessToken(),
			expiresAt: getAccessTokenExpiry(),
		},
	});
}

export function getAuditById(id: string) {
	return db.audit.findUnique({
		where: { id },
		include: {
			briefs: true,
			crawledPages: true,
		},
	});
}

export function getAuditByStripeSession(stripeSessionId: string) {
	return db.audit.findUnique({
		where: { stripeSessionId },
	});
}

export function updateAudit(id: string, input: UpdateAuditInput) {
	return db.audit.update({
		where: { id },
		data: input,
	});
}

export function updateAuditStatus(id: string, status: AuditStatus) {
	return db.audit.update({
		where: { id },
		data: { status },
	});
}

export function getAuditByAccessToken(accessToken: string) {
	return db.audit.findUnique({
		where: { accessToken },
		include: {
			briefs: true,
			crawledPages: true,
		},
	});
}

export function countRecentFreeAuditsByEmail(
	email: string,
	windowHours = 24,
): Promise<number> {
	const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
	return db.audit.count({
		where: {
			email,
			tier: "FREE",
			createdAt: { gte: since },
		},
	});
}

/**
 * Get audits in RETRYING status that are ready for retry attempt.
 * Returns audits where retryAfter is in the past (or null).
 */
export function getAuditsNeedingRetry() {
	return db.audit.findMany({
		where: {
			status: "RETRYING",
			OR: [{ retryAfter: null }, { retryAfter: { lte: new Date() } }],
		},
		include: {
			crawledPages: true,
		},
	});
}

/**
 * Get audits in RETRYING status that have exceeded the 24h retry window.
 */
export function getExpiredRetryingAudits(maxAgeHours = 24) {
	const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
	return db.audit.findMany({
		where: {
			status: "RETRYING",
			createdAt: { lt: cutoff },
		},
	});
}

/**
 * Get audits stuck in processing states (ANALYZING, GENERATING_BRIEFS)
 * for longer than the specified threshold. These likely crashed mid-process.
 */
export function getStaleProcessingAudits(staleMinutes = 30) {
	const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);
	return db.audit.findMany({
		where: {
			status: { in: ["ANALYZING", "GENERATING_BRIEFS"] },
			updatedAt: { lt: cutoff },
		},
		include: {
			crawledPages: true,
		},
	});
}

/**
 * Get audits that need report email sent (completed but email not sent).
 */
export function getAuditsMissingReportEmail() {
	return db.audit.findMany({
		where: {
			status: "COMPLETED",
			reportEmailSentAt: null,
		},
		include: {
			briefs: true,
		},
	});
}

// Admin repository functions

export type ListAuditsFilters = {
	status?: AuditStatus;
	tier?: AuditTier;
	email?: string;
	dateFrom?: Date;
	dateTo?: Date;
};

export type ListAuditsOptions = {
	page: number;
	limit: number;
	filters?: ListAuditsFilters;
};

function buildAuditWhereClause(
	filters?: ListAuditsFilters,
): Prisma.AuditWhereInput {
	if (!filters) return {};

	const where: Prisma.AuditWhereInput = {};

	if (filters.status) {
		where.status = filters.status;
	}
	if (filters.tier) {
		where.tier = filters.tier;
	}
	if (filters.email) {
		where.email = { contains: filters.email, mode: "insensitive" };
	}
	if (filters.dateFrom || filters.dateTo) {
		where.createdAt = {};
		if (filters.dateFrom) {
			where.createdAt.gte = filters.dateFrom;
		}
		if (filters.dateTo) {
			where.createdAt.lte = filters.dateTo;
		}
	}

	return where;
}

export async function listAudits(options: ListAuditsOptions) {
	const { page, limit, filters } = options;
	const skip = (page - 1) * limit;
	const where = buildAuditWhereClause(filters);

	const [audits, total] = await Promise.all([
		db.audit.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
			include: {
				_count: {
					select: { briefs: true, crawledPages: true },
				},
			},
		}),
		db.audit.count({ where }),
	]);

	return {
		audits,
		total,
		page,
		limit,
		totalPages: Math.ceil(total / limit),
	};
}

export function countAuditsByStatus() {
	return db.audit.groupBy({
		by: ["status"],
		_count: { _all: true },
	});
}

export function countAuditsByTier() {
	return db.audit.groupBy({
		by: ["tier"],
		_count: { _all: true },
	});
}

export function getAllAuditApiUsage() {
	return db.audit.findMany({
		where: {
			NOT: { apiUsage: { equals: Prisma.DbNull } },
		},
		select: {
			id: true,
			tier: true,
			apiUsage: true,
			createdAt: true,
		},
	});
}

export function updateAuditLsOrderId(id: string, lsOrderId: string) {
	return db.audit.update({
		where: { id },
		data: { lsOrderId },
	});
}
