"use client";

import { StatusBadge, TierBadge } from "@/components/admin/badges";
import { type AdminAuditListResponse, listAudits } from "@/lib/admin-api";
import {
	STATUS_OPTIONS,
	TIER_OPTIONS,
	formatCurrency,
	formatDate,
} from "@/lib/admin-types";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function AuditListPage() {
	const [data, setData] = useState<AdminAuditListResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const [status, setStatus] = useState("");
	const [tier, setTier] = useState("");
	const [email, setEmail] = useState("");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [page, setPage] = useState(1);

	const loadAudits = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const result = await listAudits({
				page,
				limit: 20,
				status: status || undefined,
				tier: tier || undefined,
				email: email || undefined,
				dateFrom: dateFrom || undefined,
				dateTo: dateTo || undefined,
			});
			setData(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load audits");
		} finally {
			setIsLoading(false);
		}
	}, [page, status, tier, email, dateFrom, dateTo]);

	useEffect(() => {
		loadAudits();
	}, [loadAudits]);

	function handleSearch(e: React.FormEvent) {
		e.preventDefault();
		setPage(1);
	}

	function handleClearFilters() {
		setStatus("");
		setTier("");
		setEmail("");
		setDateFrom("");
		setDateTo("");
		setPage(1);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-text-primary">Audits</h1>
				<p className="text-text-secondary mt-1">View and manage all audits</p>
			</div>

			<form
				onSubmit={handleSearch}
				className="bg-bg-secondary border border-border-subtle rounded-lg p-4"
			>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
					<div>
						<label
							htmlFor="status"
							className="block text-sm font-medium text-text-secondary mb-1"
						>
							Status
						</label>
						<select
							id="status"
							value={status}
							onChange={(e) => setStatus(e.target.value)}
							className="w-full px-3 py-2 border border-border-subtle rounded-md bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
						>
							{STATUS_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>

					<div>
						<label
							htmlFor="tier"
							className="block text-sm font-medium text-text-secondary mb-1"
						>
							Tier
						</label>
						<select
							id="tier"
							value={tier}
							onChange={(e) => setTier(e.target.value)}
							className="w-full px-3 py-2 border border-border-subtle rounded-md bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
						>
							{TIER_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</div>

					<div>
						<label
							htmlFor="email"
							className="block text-sm font-medium text-text-secondary mb-1"
						>
							Email
						</label>
						<input
							id="email"
							type="text"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="Search by email"
							className="w-full px-3 py-2 border border-border-subtle rounded-md bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
						/>
					</div>

					<div>
						<label
							htmlFor="dateFrom"
							className="block text-sm font-medium text-text-secondary mb-1"
						>
							From
						</label>
						<input
							id="dateFrom"
							type="date"
							value={dateFrom}
							onChange={(e) => setDateFrom(e.target.value)}
							className="w-full px-3 py-2 border border-border-subtle rounded-md bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
						/>
					</div>

					<div>
						<label
							htmlFor="dateTo"
							className="block text-sm font-medium text-text-secondary mb-1"
						>
							To
						</label>
						<input
							id="dateTo"
							type="date"
							value={dateTo}
							onChange={(e) => setDateTo(e.target.value)}
							className="w-full px-3 py-2 border border-border-subtle rounded-md bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
						/>
					</div>
				</div>

				<div className="flex gap-2 mt-4">
					<button
						type="submit"
						className="px-4 py-2 bg-brand-primary text-white rounded-md font-medium hover:bg-brand-primary/90"
					>
						Search
					</button>
					<button
						type="button"
						onClick={handleClearFilters}
						className="px-4 py-2 border border-border-subtle text-text-secondary rounded-md font-medium hover:bg-bg-tertiary"
					>
						Clear
					</button>
				</div>
			</form>

			{error && (
				<div className="bg-red-500/10 text-status-error px-4 py-3 rounded-md">
					{error}
				</div>
			)}

			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<div className="text-text-secondary">Loading audits...</div>
				</div>
			)}

			{!isLoading && data && (
				<>
					<div className="bg-bg-secondary border border-border-subtle rounded-lg overflow-hidden">
						<div className="overflow-x-auto">
							<table className="w-full">
								<thead className="bg-bg-tertiary">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
											Email
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
											Site
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
											Tier
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
											Status
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
											Cost
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
											Pages
										</th>
										<th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
											Created
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border-subtle">
									{data.audits.map((audit) => (
										<tr
											key={audit.id}
											className="hover:bg-bg-tertiary/50 cursor-pointer"
										>
											<td className="px-4 py-3">
												<Link
													href={`/admin/audits/${audit.id}`}
													className="text-sm text-brand-primary hover:underline"
												>
													{audit.email}
												</Link>
											</td>
											<td className="px-4 py-3">
												<div
													className="text-sm text-text-primary truncate max-w-[200px]"
													title={audit.siteUrl}
												>
													{audit.siteUrl}
												</div>
											</td>
											<td className="px-4 py-3">
												<TierBadge tier={audit.tier} />
											</td>
											<td className="px-4 py-3">
												<StatusBadge status={audit.status} />
											</td>
											<td className="px-4 py-3">
												<div className="text-sm text-text-primary">
													{formatCurrency(audit.cost.total)}
												</div>
												<div className="text-xs text-text-secondary">
													D: {formatCurrency(audit.cost.dataforseo)} | C:{" "}
													{formatCurrency(audit.cost.claude)}
												</div>
											</td>
											<td className="px-4 py-3">
												<div className="text-sm text-text-primary">
													{audit.pagesCount}
												</div>
											</td>
											<td className="px-4 py-3">
												<div className="text-sm text-text-secondary">
													{formatDate(audit.createdAt)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{data.audits.length === 0 && (
							<div className="text-center py-12 text-text-secondary">
								No audits found
							</div>
						)}
					</div>

					{data.totalPages > 1 && (
						<div className="flex items-center justify-between">
							<div className="text-sm text-text-secondary">
								Showing {(data.page - 1) * data.limit + 1} to{" "}
								{Math.min(data.page * data.limit, data.total)} of {data.total}{" "}
								audits
							</div>
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
									className="px-3 py-1 border border-border-subtle rounded-md text-sm text-text-secondary hover:bg-bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Previous
								</button>
								<span className="px-3 py-1 text-sm text-text-primary">
									Page {data.page} of {data.totalPages}
								</span>
								<button
									type="button"
									onClick={() =>
										setPage((p) => Math.min(data.totalPages, p + 1))
									}
									disabled={page === data.totalPages}
									className="px-3 py-1 border border-border-subtle rounded-md text-sm text-text-secondary hover:bg-bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
								>
									Next
								</button>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
