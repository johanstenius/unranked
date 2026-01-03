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
	completedAt?: Date;
	reportToken?: string;
	reportTokenExpiresAt?: Date;
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
