"use client";

import { type AdminStats, getStats } from "@/lib/admin-api";
import { STATUS_LABELS, TIER_LABELS, formatCurrency } from "@/lib/admin-types";
import { useEffect, useState } from "react";

function StatCard({
	label,
	value,
	subValue,
}: {
	label: string;
	value: string | number;
	subValue?: string;
}) {
	return (
		<div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
			<div className="text-sm font-medium text-text-secondary">{label}</div>
			<div className="mt-2 text-3xl font-bold text-text-primary">{value}</div>
			{subValue && (
				<div className="mt-1 text-sm text-text-secondary">{subValue}</div>
			)}
		</div>
	);
}

export default function AdminDashboardPage() {
	const [stats, setStats] = useState<AdminStats | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		async function loadStats() {
			try {
				const data = await getStats();
				setStats(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load stats");
			} finally {
				setIsLoading(false);
			}
		}
		loadStats();
	}, []);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-text-secondary">Loading stats...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-500/10 text-status-error px-4 py-3 rounded-md">
				{error}
			</div>
		);
	}

	if (!stats) {
		return null;
	}

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
				<p className="text-text-secondary mt-1">
					Overview of audit activity and costs
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard label="Total Audits" value={stats.totalAudits} />
				<StatCard
					label="Total Cost"
					value={formatCurrency(stats.totalCosts.total)}
					subValue={`DataForSEO: ${formatCurrency(stats.totalCosts.dataforseo)} | Claude: ${formatCurrency(stats.totalCosts.claude)}`}
				/>
				<StatCard
					label="Completed"
					value={stats.auditsByStatus.COMPLETED ?? 0}
				/>
				<StatCard label="Failed" value={stats.auditsByStatus.FAILED ?? 0} />
			</div>

			<div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
				<h2 className="text-lg font-semibold text-text-primary mb-4">
					Audits by Status
				</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{Object.entries(STATUS_LABELS).map(([key, label]) => (
						<div key={key} className="text-center">
							<div className="text-2xl font-bold text-text-primary">
								{stats.auditsByStatus[key] ?? 0}
							</div>
							<div className="text-sm text-text-secondary">{label}</div>
						</div>
					))}
				</div>
			</div>

			<div className="bg-bg-secondary border border-border-subtle rounded-lg p-6">
				<h2 className="text-lg font-semibold text-text-primary mb-4">
					Audits by Tier
				</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{Object.entries(TIER_LABELS).map(([key, label]) => (
						<div key={key} className="text-center">
							<div className="text-2xl font-bold text-text-primary">
								{stats.auditsByTier[key] ?? 0}
							</div>
							<div className="text-sm text-text-secondary">{label}</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
