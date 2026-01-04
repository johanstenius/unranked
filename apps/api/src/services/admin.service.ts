/**
 * Admin Service
 *
 * Business logic for admin operations: audit listing, stats, retry, refund.
 */

import * as auditRepo from "../repositories/audit.repository.js";
import type { ApiUsage, CostBreakdown } from "../types/api-usage.js";
import { calculateCost } from "../types/api-usage.js";
import {
	completeAudit,
	runPendingComponents,
} from "./audit-pipeline.service.js";
import {
	type RefundResult,
	issueRefund as lsIssueRefund,
} from "./payments/lemonsqueezy.js";

export type AdminAuditListItem = {
	id: string;
	email: string;
	siteUrl: string;
	tier: string;
	status: string;
	cost: CostBreakdown;
	createdAt: Date;
	completedAt: Date | null;
	briefsCount: number;
	pagesCount: number;
};

export type AdminAuditListResult = {
	audits: AdminAuditListItem[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
};

export async function listAudits(
	options: auditRepo.ListAuditsOptions,
): Promise<AdminAuditListResult> {
	const result = await auditRepo.listAudits(options);

	const audits = result.audits.map((audit) => {
		const apiUsage = audit.apiUsage as ApiUsage | null;
		const cost = apiUsage
			? calculateCost(apiUsage)
			: { dataforseo: 0, claude: 0, total: 0 };

		return {
			id: audit.id,
			email: audit.email,
			siteUrl: audit.siteUrl,
			tier: audit.tier,
			status: audit.status,
			cost,
			createdAt: audit.createdAt,
			completedAt: audit.completedAt,
			briefsCount: audit._count.briefs,
			pagesCount: audit._count.crawledPages,
		};
	});

	return {
		audits,
		total: result.total,
		page: result.page,
		limit: result.limit,
		totalPages: result.totalPages,
	};
}

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
	apiUsage: ApiUsage | null;
	progress: unknown;
	healthScore: unknown;
	createdAt: Date;
	startedAt: Date | null;
	completedAt: Date | null;
	expiresAt: Date;
	briefsCount: number;
	pagesCount: number;
	pagesFound: number | null;
};

export async function getAuditDetail(
	auditId: string,
): Promise<AdminAuditDetail | null> {
	const audit = await auditRepo.getAuditById(auditId);
	if (!audit) return null;

	const apiUsage = audit.apiUsage as ApiUsage | null;
	const cost = apiUsage
		? calculateCost(apiUsage)
		: { dataforseo: 0, claude: 0, total: 0 };

	return {
		id: audit.id,
		email: audit.email,
		siteUrl: audit.siteUrl,
		productDesc: audit.productDesc,
		competitors: audit.competitors,
		tier: audit.tier,
		status: audit.status,
		accessToken: audit.accessToken,
		lsOrderId: audit.lsOrderId,
		cost,
		apiUsage,
		progress: audit.progress,
		healthScore: audit.healthScore,
		createdAt: audit.createdAt,
		startedAt: audit.startedAt,
		completedAt: audit.completedAt,
		expiresAt: audit.expiresAt,
		briefsCount: audit.briefs.length,
		pagesCount: audit.crawledPages.length,
		pagesFound: audit.pagesFound,
	};
}

export type AdminStats = {
	auditsByStatus: Record<string, number>;
	auditsByTier: Record<string, number>;
	totalCosts: CostBreakdown;
	totalAudits: number;
};

export async function getStats(): Promise<AdminStats> {
	const [byStatus, byTier, allUsage] = await Promise.all([
		auditRepo.countAuditsByStatus(),
		auditRepo.countAuditsByTier(),
		auditRepo.getAllAuditApiUsage(),
	]);

	const auditsByStatus: Record<string, number> = {};
	for (const row of byStatus) {
		auditsByStatus[row.status] = row._count._all;
	}

	const auditsByTier: Record<string, number> = {};
	for (const row of byTier) {
		auditsByTier[row.tier] = row._count._all;
	}

	// Calculate total costs
	let totalDataforseo = 0;
	let totalClaude = 0;
	for (const audit of allUsage) {
		if (audit.apiUsage) {
			const cost = calculateCost(audit.apiUsage as ApiUsage);
			totalDataforseo += cost.dataforseo;
			totalClaude += cost.claude;
		}
	}

	const totalCosts: CostBreakdown = {
		dataforseo: Math.round(totalDataforseo * 10000) / 10000,
		claude: Math.round(totalClaude * 10000) / 10000,
		total: Math.round((totalDataforseo + totalClaude) * 10000) / 10000,
	};

	const totalAudits = Object.values(auditsByStatus).reduce((a, b) => a + b, 0);

	return {
		auditsByStatus,
		auditsByTier,
		totalCosts,
		totalAudits,
	};
}

export type RetryResult = {
	success: boolean;
	message: string;
	componentsRun?: string[];
	componentsFailed?: string[];
};

export async function retryAudit(auditId: string): Promise<RetryResult> {
	const audit = await auditRepo.getAuditById(auditId);
	if (!audit) {
		return { success: false, message: "Audit not found" };
	}

	if (audit.status === "COMPLETED") {
		return { success: false, message: "Audit already completed" };
	}

	if (audit.status === "PENDING" || audit.status === "CRAWLING") {
		return { success: false, message: "Audit is still in initial processing" };
	}

	// Set status to RETRYING if not already
	if (audit.status !== "RETRYING") {
		await auditRepo.updateAuditStatus(auditId, "RETRYING");
	}

	const result = await runPendingComponents({
		id: audit.id,
		siteUrl: audit.siteUrl,
		competitors: audit.competitors,
		tier: audit.tier,
		productDesc: audit.productDesc,
		email: audit.email,
		progress: audit.progress,
		opportunities: audit.opportunities,
	});

	if (result.allDone) {
		await completeAudit(auditId);
		return {
			success: true,
			message: "Audit completed successfully",
			componentsRun: result.componentsRun,
			componentsFailed: [],
		};
	}

	if (result.componentsFailed.length > 0) {
		return {
			success: false,
			message: `Some components failed: ${result.componentsFailed.join(", ")}`,
			componentsRun: result.componentsRun,
			componentsFailed: result.componentsFailed,
		};
	}

	return {
		success: true,
		message: `Retry in progress. Ran: ${result.componentsRun.join(", ")}`,
		componentsRun: result.componentsRun,
		componentsFailed: result.componentsFailed,
	};
}

export async function refundAudit(auditId: string): Promise<RefundResult> {
	const audit = await auditRepo.getAuditById(auditId);
	if (!audit) {
		return { success: false, message: "Audit not found" };
	}

	if (audit.tier === "FREE") {
		return { success: false, message: "Cannot refund FREE tier audit" };
	}

	if (!audit.lsOrderId) {
		return { success: false, message: "No order ID found for this audit" };
	}

	return lsIssueRefund(audit.lsOrderId);
}
