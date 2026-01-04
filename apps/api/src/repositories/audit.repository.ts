import type { AuditStatus, AuditTier, Prisma } from "@prisma/client";
import { db } from "../lib/db.js";

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
	completedAt?: Date;
	reportToken?: string;
	reportTokenExpiresAt?: Date;
	reportEmailSentAt?: Date | null;
	supportAlertSentAt?: Date | null;
};

export function createAudit(input: CreateAuditInput) {
	return db.audit.create({
		data: input,
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

export function getAuditByReportToken(reportToken: string) {
	return db.audit.findUnique({
		where: { reportToken },
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
 * Get audits that need report email sent (completed with token but email not sent).
 */
export function getAuditsMissingReportEmail() {
	return db.audit.findMany({
		where: {
			status: "COMPLETED",
			reportToken: { not: null },
			reportEmailSentAt: null,
		},
		include: {
			briefs: true,
		},
	});
}
