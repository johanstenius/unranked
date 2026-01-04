"use client";

import { StatusBadge, TierBadge } from "@/components/admin/badges";
import {
	type AdminAuditDetail,
	getAuditDetail,
	refundAudit,
	retryAudit,
} from "@/lib/admin-api";
import {
	AUDIT_STATUS,
	AUDIT_TIER,
	formatCurrency,
	formatDate,
} from "@/lib/admin-types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function InfoRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex justify-between py-2 border-b border-border-subtle last:border-0">
			<span className="text-text-secondary">{label}</span>
			<span className="text-text-primary">{children}</span>
		</div>
	);
}

export default function AuditDetailPage() {
	const params = useParams();
	const id = params.id as string;

	const [audit, setAudit] = useState<AdminAuditDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState<string | null>(null);
	const [actionResult, setActionResult] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	const loadAudit = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await getAuditDetail(id);
			setAudit(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load audit");
		} finally {
			setIsLoading(false);
		}
	}, [id]);

	useEffect(() => {
		loadAudit();
	}, [loadAudit]);

	async function handleRetry() {
		setActionLoading("retry");
		setActionResult(null);
		try {
			const result = await retryAudit(id);
			setActionResult({
				type: result.success ? "success" : "error",
				message: result.message,
			});
			if (result.success) {
				loadAudit();
			}
		} catch (err) {
			setActionResult({
				type: "error",
				message: err instanceof Error ? err.message : "Retry failed",
			});
		} finally {
			setActionLoading(null);
		}
	}

	async function handleRefund() {
		if (!confirm("Are you sure you want to refund this audit?")) return;

		setActionLoading("refund");
		setActionResult(null);
		try {
			const result = await refundAudit(id);
			setActionResult({
				type: result.success ? "success" : "error",
				message: result.message,
			});
		} catch (err) {
			setActionResult({
				type: "error",
				message: err instanceof Error ? err.message : "Refund failed",
			});
		} finally {
			setActionLoading(null);
		}
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-text-secondary">Loading audit...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-4">
				<Link
					href="/admin/audits"
					className="text-brand-primary hover:underline"
				>
					&larr; Back to audits
				</Link>
				<div className="bg-red-500/10 text-status-error px-4 py-3 rounded-md">
					{error}
				</div>
			</div>
		);
	}

	if (!audit) {
		return null;
	}

	const canRetry = audit.status === AUDIT_STATUS.FAILED;
	const canRefund = audit.tier !== AUDIT_TIER.FREE && audit.lsOrderId;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<Link
						href="/admin/audits"
						className="text-sm text-brand-primary hover:underline"
					>
						&larr; Back to audits
					</Link>
					<h1 className="text-2xl font-bold text-text-primary mt-2">
						Audit Details
					</h1>
				</div>
				<div className="flex gap-2">
					{canRetry && (
						<button
							type="button"
							onClick={handleRetry}
							disabled={actionLoading !== null}
							className="px-4 py-2 bg-orange-500 text-white rounded-md font-medium hover:bg-orange-600 disabled:opacity-50"
						>
							{actionLoading === "retry" ? "Retrying..." : "Retry Failed"}
						</button>
					)}
					{canRefund && (
						<button
							type="button"
							onClick={handleRefund}
							disabled={actionLoading !== null}
							className="px-4 py-2 bg-red-500 text-white rounded-md font-medium hover:bg-red-600 disabled:opacity-50"
						>
							{actionLoading === "refund" ? "Refunding..." : "Issue Refund"}
						</button>
					)}
				</div>
			</div>

			{actionResult && (
				<div
					className={`px-4 py-3 rounded-md ${
						actionResult.type === "success"
							? "bg-green-500/10 text-green-400"
							: "bg-red-500/10 text-status-error"
					}`}
				>
					{actionResult.message}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
					<h2 className="text-lg font-semibold text-text-primary mb-4">
						Basic Info
					</h2>
					<div className="space-y-1">
						<InfoRow label="ID">
							<code className="text-xs bg-bg-tertiary px-2 py-1 rounded">
								{audit.id}
							</code>
						</InfoRow>
						<InfoRow label="Email">{audit.email}</InfoRow>
						<InfoRow label="Site URL">
							<a
								href={audit.siteUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-brand-primary hover:underline"
							>
								{audit.siteUrl}
							</a>
						</InfoRow>
						<InfoRow label="Tier">
							<TierBadge tier={audit.tier} />
						</InfoRow>
						<InfoRow label="Status">
							<StatusBadge status={audit.status} />
						</InfoRow>
						{audit.productDesc && (
							<InfoRow label="Product">{audit.productDesc}</InfoRow>
						)}
						{audit.competitors.length > 0 && (
							<InfoRow label="Competitors">
								{audit.competitors.join(", ")}
							</InfoRow>
						)}
					</div>
				</div>

				<div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
					<h2 className="text-lg font-semibold text-text-primary mb-4">
						Timing
					</h2>
					<div className="space-y-1">
						<InfoRow label="Created">
							{formatDate(audit.createdAt, { includeSeconds: true })}
						</InfoRow>
						<InfoRow label="Started">
							{formatDate(audit.startedAt, { includeSeconds: true })}
						</InfoRow>
						<InfoRow label="Completed">
							{formatDate(audit.completedAt, { includeSeconds: true })}
						</InfoRow>
						<InfoRow label="Expires">
							{formatDate(audit.expiresAt, { includeSeconds: true })}
						</InfoRow>
					</div>
				</div>

				<div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
					<h2 className="text-lg font-semibold text-text-primary mb-4">
						Costs
					</h2>
					<div className="space-y-1">
						<InfoRow label="Total">
							<span className="font-semibold">
								{formatCurrency(audit.cost.total)}
							</span>
						</InfoRow>
						<InfoRow label="DataForSEO">
							{formatCurrency(audit.cost.dataforseo)}
						</InfoRow>
						<InfoRow label="Claude">
							{formatCurrency(audit.cost.claude)}
						</InfoRow>
					</div>

					{audit.apiUsage && (
						<div className="mt-4 pt-4 border-t border-border-subtle">
							<h3 className="text-sm font-medium text-text-secondary mb-2">
								API Usage Details
							</h3>
							<pre className="text-xs bg-bg-tertiary p-3 rounded overflow-x-auto">
								{JSON.stringify(audit.apiUsage, null, 2)}
							</pre>
						</div>
					)}
				</div>

				<div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
					<h2 className="text-lg font-semibold text-text-primary mb-4">
						Stats
					</h2>
					<div className="space-y-1">
						<InfoRow label="Pages Found">{audit.pagesFound ?? "—"}</InfoRow>
						<InfoRow label="Pages Crawled">{audit.pagesCount}</InfoRow>
						<InfoRow label="Briefs Generated">{audit.briefsCount}</InfoRow>
						{audit.lsOrderId && (
							<InfoRow label="LemonSqueezy Order">
								<code className="text-xs bg-bg-tertiary px-2 py-1 rounded">
									{audit.lsOrderId}
								</code>
							</InfoRow>
						)}
					</div>
				</div>

				{audit.progress && (
					<div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 lg:col-span-2">
						<h2 className="text-lg font-semibold text-text-primary mb-4">
							Pipeline Progress
						</h2>
						<pre className="text-xs bg-bg-tertiary p-3 rounded overflow-x-auto">
							{JSON.stringify(audit.progress, null, 2)}
						</pre>
					</div>
				)}

				{audit.healthScore && (
					<div className="bg-bg-secondary border border-border-subtle rounded-lg p-6 lg:col-span-2">
						<h2 className="text-lg font-semibold text-text-primary mb-4">
							Health Score
						</h2>
						<pre className="text-xs bg-bg-tertiary p-3 rounded overflow-x-auto">
							{JSON.stringify(audit.healthScore, null, 2)}
						</pre>
					</div>
				)}
			</div>

			<div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
				<h2 className="text-lg font-semibold text-text-primary mb-4">
					Report Access
				</h2>
				<div className="flex items-center gap-4">
					<code className="flex-1 text-sm bg-bg-tertiary px-3 py-2 rounded">
						/report/{audit.accessToken}
					</code>
					<a
						href={`/report/${audit.accessToken}`}
						target="_blank"
						rel="noopener noreferrer"
						className="px-4 py-2 bg-brand-primary text-white rounded-md font-medium hover:bg-brand-primary/90"
					>
						View Report
					</a>
				</div>
			</div>
		</div>
	);
}
