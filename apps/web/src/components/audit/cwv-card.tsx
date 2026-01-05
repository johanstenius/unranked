"use client";

import type { CWVPageResult, CoreWebVitalsData } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";

type CWVCardProps = {
	data: CoreWebVitalsData | null;
	streamingPages: CWVPageResult[];
	isAnalyzing: boolean;
};

// CWV thresholds for display status coloring (source of truth is backend)
const CWV_THRESHOLDS = {
	lcp: { good: 2500, needsImprovement: 4000 }, // ms
	cls: { good: 0.1, needsImprovement: 0.25 },
	inp: { good: 200, needsImprovement: 500 }, // ms
	performance: { good: 90, needsImprovement: 50 },
} as const;

type MetricStatus = "good" | "needs-improvement" | "poor";

function getMetricStatus(
	value: number | null,
	metric: keyof typeof CWV_THRESHOLDS,
): MetricStatus {
	if (value === null) return "poor";
	const threshold = CWV_THRESHOLDS[metric];
	if (metric === "performance") {
		if (value >= threshold.good) return "good";
		if (value >= threshold.needsImprovement) return "needs-improvement";
		return "poor";
	}
	// For LCP, CLS, INP - lower is better
	if (value <= threshold.good) return "good";
	if (value <= threshold.needsImprovement) return "needs-improvement";
	return "poor";
}

const STATUS_CONFIG: Record<
	MetricStatus,
	{ color: string; bg: string; dot: string }
> = {
	good: {
		color: "text-status-good",
		bg: "bg-status-good/10",
		dot: "bg-status-good",
	},
	"needs-improvement": {
		color: "text-status-warn",
		bg: "bg-status-warn/10",
		dot: "bg-status-warn",
	},
	poor: {
		color: "text-status-crit",
		bg: "bg-status-crit/10",
		dot: "bg-status-crit",
	},
};

function formatLCP(ms: number | null): string {
	if (ms === null) return "—";
	return `${(ms / 1000).toFixed(1)}s`;
}

function formatCLS(value: number | null): string {
	if (value === null) return "—";
	return value.toFixed(3);
}

function formatINP(ms: number | null): string {
	if (ms === null) return "—";
	return `${Math.round(ms)}ms`;
}

function MetricCell({
	value,
	format,
	metric,
}: {
	value: number | null;
	format: (v: number | null) => string;
	metric: keyof typeof CWV_THRESHOLDS;
}) {
	const status = getMetricStatus(value, metric);
	const config = STATUS_CONFIG[status];

	return (
		<td className="px-3 py-3 text-right">
			<span className={`font-mono text-sm ${config.color}`}>
				{format(value)}
			</span>
		</td>
	);
}

function PerformanceGauge({ score }: { score: number | null }) {
	if (score === null) {
		return (
			<div className="flex items-center gap-2">
				<div className="w-8 h-8 rounded-full bg-border/50 flex items-center justify-center">
					<span className="text-xs text-text-tertiary">—</span>
				</div>
			</div>
		);
	}

	const status = getMetricStatus(score, "performance");
	const config = STATUS_CONFIG[status];
	const circumference = 2 * Math.PI * 12;
	const strokeDashoffset = circumference - (score / 100) * circumference;

	return (
		<div className="flex items-center gap-2">
			<div className="relative w-8 h-8">
				<svg
					className="w-8 h-8 -rotate-90"
					viewBox="0 0 32 32"
					aria-hidden="true"
				>
					<circle
						cx="16"
						cy="16"
						r="12"
						fill="none"
						stroke="currentColor"
						strokeWidth="3"
						className="text-border/30"
					/>
					<motion.circle
						cx="16"
						cy="16"
						r="12"
						fill="none"
						stroke="currentColor"
						strokeWidth="3"
						strokeLinecap="round"
						className={config.color}
						initial={{ strokeDashoffset: circumference }}
						animate={{ strokeDashoffset }}
						transition={{ duration: 0.8, ease: "easeOut" }}
						style={{ strokeDasharray: circumference }}
					/>
				</svg>
				<span
					className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${config.color}`}
				>
					{Math.round(score)}
				</span>
			</div>
		</div>
	);
}

function SummaryCard({
	label,
	count,
	total,
	status,
}: {
	label: string;
	count: number;
	total: number;
	status: MetricStatus;
}) {
	const config = STATUS_CONFIG[status];
	const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

	return (
		<div className={`rounded-lg p-3 ${config.bg} border border-transparent`}>
			<div className="flex items-center gap-2 mb-1">
				<div className={`w-2 h-2 rounded-full ${config.dot}`} />
				<span className="text-xs font-medium text-text-secondary">{label}</span>
			</div>
			<div className="flex items-baseline gap-1">
				<span className={`text-2xl font-bold font-display ${config.color}`}>
					{count}
				</span>
				<span className="text-xs text-text-tertiary">
					/ {total} ({percentage}%)
				</span>
			</div>
		</div>
	);
}

function getPathname(url: string): string {
	try {
		return new URL(url).pathname;
	} catch {
		return url;
	}
}

function PageRow({ page, index }: { page: CWVPageResult; index: number }) {
	const pathname = getPathname(page.url);

	return (
		<motion.tr
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.3, delay: index * 0.05 }}
			className="border-b border-border/50 last:border-0 hover:bg-subtle/50 transition-colors"
		>
			<td className="px-3 py-3">
				<div className="flex items-center gap-3">
					<PerformanceGauge score={page.performance} />
					<div className="min-w-0 flex-1">
						<p
							className="text-sm text-text-primary truncate max-w-[280px]"
							title={page.url}
						>
							{pathname}
						</p>
						{page.status === "failed" && (
							<p className="text-xs text-status-crit">{page.error}</p>
						)}
					</div>
				</div>
			</td>
			<MetricCell value={page.lcp} format={formatLCP} metric="lcp" />
			<MetricCell value={page.cls} format={formatCLS} metric="cls" />
			<MetricCell value={page.inp} format={formatINP} metric="inp" />
		</motion.tr>
	);
}

function LoadingRow() {
	return (
		<tr className="border-b border-border/50">
			<td className="px-3 py-3" colSpan={4}>
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-full bg-border/30 animate-pulse" />
					<div className="flex-1 space-y-2">
						<div className="h-3 w-48 bg-border/30 rounded animate-pulse" />
						<div className="h-2 w-24 bg-border/20 rounded animate-pulse" />
					</div>
				</div>
			</td>
		</tr>
	);
}

// Fallback summary for streaming state (backend is source of truth)
// Only counts successful pages - failed pages are filtered out
function calculateStreamingSummary(pages: CWVPageResult[]) {
	const { good, needsImprovement } = CWV_THRESHOLDS.performance;
	let goodCount = 0;
	let needsWorkCount = 0;
	let poorCount = 0;
	let totalPerf = 0;
	let validCount = 0;

	for (const p of pages) {
		// Skip failed pages entirely
		if (p.status === "failed" || p.performance === null) continue;

		if (p.performance >= good) {
			goodCount++;
		} else if (p.performance >= needsImprovement) {
			needsWorkCount++;
		} else {
			poorCount++;
		}
		totalPerf += p.performance;
		validCount++;
	}

	return {
		good: goodCount,
		needsImprovement: needsWorkCount,
		poor: poorCount,
		avgPerformance: validCount > 0 ? totalPerf / validCount : null,
	};
}

export function CWVCard({ data, streamingPages, isAnalyzing }: CWVCardProps) {
	const allPages = data?.pages ?? streamingPages;
	// Filter out failed pages (e.g., 400/401/403 errors from auth pages)
	const pages = allPages.filter((p) => p.status === "success");
	// Use backend summary when available, fallback for streaming
	const summary = data?.summary ?? calculateStreamingSummary(allPages);
	const totalPages = pages.length;
	const avgPerfStatus = getMetricStatus(summary.avgPerformance, "performance");

	// Show placeholder if no successful pages and not analyzing
	if (pages.length === 0 && !isAnalyzing) {
		return null;
	}

	return (
		<div className="bg-surface border border-border rounded-xl overflow-hidden">
			{/* Header */}
			<div className="px-6 py-4 border-b border-border">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
							<svg
								className="w-5 h-5 text-accent"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
							</svg>
						</div>
						<div>
							<h3 className="font-display font-semibold text-text-primary">
								Core Web Vitals
							</h3>
							<p className="text-xs text-text-tertiary">
								PageSpeed performance metrics
							</p>
						</div>
					</div>
					{isAnalyzing && (
						<div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-status-good-bg border border-status-good/30">
							<motion.div
								className="w-1.5 h-1.5 rounded-full bg-status-good"
								animate={{ opacity: [0.4, 1, 0.4] }}
								transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
							/>
							<span className="text-xs font-medium text-status-good">
								Analyzing...
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Summary Stats */}
			<div className="px-6 py-4 bg-subtle/30 border-b border-border">
				<div className="grid grid-cols-4 gap-3">
					<SummaryCard
						label="Good"
						count={summary.good}
						total={totalPages}
						status="good"
					/>
					<SummaryCard
						label="Needs Work"
						count={summary.needsImprovement}
						total={totalPages}
						status="needs-improvement"
					/>
					<SummaryCard
						label="Poor"
						count={summary.poor}
						total={totalPages}
						status="poor"
					/>
					<div className="rounded-lg p-3 bg-accent/5 border border-accent/10">
						<div className="flex items-center gap-2 mb-1">
							<div className="w-2 h-2 rounded-full bg-accent" />
							<span className="text-xs font-medium text-text-secondary">
								Average
							</span>
						</div>
						<div className="flex items-baseline gap-1">
							<span
								className={`text-2xl font-bold font-display ${STATUS_CONFIG[avgPerfStatus].color}`}
							>
								{summary.avgPerformance !== null
									? Math.round(summary.avgPerformance)
									: "—"}
							</span>
							<span className="text-xs text-text-tertiary">/ 100</span>
						</div>
					</div>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="border-b border-border bg-subtle/50">
							<th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider">
								Page
							</th>
							<th className="px-3 py-2 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">
								<span title="Largest Contentful Paint">LCP</span>
							</th>
							<th className="px-3 py-2 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">
								<span title="Cumulative Layout Shift">CLS</span>
							</th>
							<th className="px-3 py-2 text-right text-xs font-medium text-text-tertiary uppercase tracking-wider">
								<span title="Interaction to Next Paint">INP</span>
							</th>
						</tr>
					</thead>
					<tbody>
						<AnimatePresence mode="popLayout">
							{pages.map((page, idx) => (
								<PageRow key={`${page.url}-${idx}`} page={page} index={idx} />
							))}
						</AnimatePresence>
						{isAnalyzing && pages.length === 0 && (
							<>
								<LoadingRow />
								<LoadingRow />
								<LoadingRow />
							</>
						)}
					</tbody>
				</table>
			</div>

			{/* Footer Legend */}
			<div className="px-6 py-3 border-t border-border bg-subtle/30">
				<div className="flex items-center gap-6 text-xs text-text-tertiary">
					<div className="flex items-center gap-1.5">
						<div className="w-2 h-2 rounded-full bg-status-good" />
						<span>Good (&ge;90)</span>
					</div>
					<div className="flex items-center gap-1.5">
						<div className="w-2 h-2 rounded-full bg-status-warn" />
						<span>Needs Work (50-89)</span>
					</div>
					<div className="flex items-center gap-1.5">
						<div className="w-2 h-2 rounded-full bg-status-crit" />
						<span>Poor (&lt;50)</span>
					</div>
				</div>
			</div>
		</div>
	);
}
