"use client";

import type { Analysis, Audit } from "@/lib/types";
import {
	AnimatePresence,
	motion,
	useSpring,
	useTransform,
} from "framer-motion";
import { useEffect } from "react";

type ProgressiveStatsProps = {
	audit: Audit;
	analysis: Analysis | null;
	isProcessing: boolean;
	isFreeTier: boolean;
};

function AnimatedNumber({
	value,
	prefix = "",
	suffix = "",
	className = "",
}: {
	value: number;
	prefix?: string;
	suffix?: string;
	className?: string;
}) {
	const spring = useSpring(0, { stiffness: 50, damping: 20 });
	const display = useTransform(spring, (v) => Math.round(v).toLocaleString());

	useEffect(() => {
		spring.set(value);
	}, [spring, value]);

	return (
		<motion.span className={className}>
			{prefix}
			<motion.span>{display}</motion.span>
			{suffix}
		</motion.span>
	);
}

function StatCard({
	value,
	label,
	isLoading,
	color = "text-text-primary",
	prefix = "",
}: {
	value: number | null;
	label: string;
	isLoading: boolean;
	color?: string;
	prefix?: string;
}) {
	const hasValue = value !== null && value !== 0;

	return (
		<div className="bg-surface border border-border rounded-xl p-5">
			<AnimatePresence mode="wait">
				{isLoading && !hasValue ? (
					<motion.div
						key="skeleton"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="h-9 w-16 rounded bg-border/30 animate-shimmer"
					/>
				) : (
					<motion.p
						key="value"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						className={`font-display text-3xl tracking-tight font-bold ${color}`}
					>
						{hasValue ? (
							<AnimatedNumber value={value ?? 0} prefix={prefix} />
						) : (
							<span className="text-text-tertiary">—</span>
						)}
					</motion.p>
				)}
			</AnimatePresence>
			<p className="text-sm text-text-secondary mt-2">{label}</p>
		</div>
	);
}

export function ProgressiveStats({
	audit,
	analysis,
	isProcessing,
	isFreeTier,
}: ProgressiveStatsProps) {
	const pagesFound = audit.pagesFound ?? 0;
	const keywordsRanking = analysis?.currentRankings.length ?? 0;
	const opportunities = analysis?.opportunities.length ?? 0;
	const totalEstTraffic =
		analysis?.currentRankings.reduce((sum, r) => sum + r.estimatedTraffic, 0) ??
		0;
	const totalOpportunityVolume =
		analysis?.opportunities.reduce((sum, o) => sum + o.searchVolume, 0) ?? 0;

	if (isFreeTier) {
		return (
			<div className="grid grid-cols-2 gap-4 mb-10">
				<StatCard
					value={pagesFound}
					label="Pages crawled"
					isLoading={isProcessing}
				/>
				<StatCard
					value={analysis?.technicalIssues.length ?? null}
					label="Technical issues"
					isLoading={isProcessing}
				/>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-5 gap-4 mb-10">
			<StatCard
				value={pagesFound}
				label="Pages crawled"
				isLoading={isProcessing && pagesFound === 0}
			/>
			<StatCard
				value={keywordsRanking > 0 ? keywordsRanking : null}
				label="Keywords ranking"
				isLoading={isProcessing}
			/>
			<StatCard
				value={totalEstTraffic > 0 ? totalEstTraffic : null}
				label="Est. monthly traffic"
				isLoading={isProcessing}
				color="text-accent-teal"
				prefix="~"
			/>
			<StatCard
				value={opportunities > 0 ? opportunities : null}
				label="Opportunities"
				isLoading={isProcessing}
				color="text-accent-indigo"
			/>
			<StatCard
				value={totalOpportunityVolume > 0 ? totalOpportunityVolume : null}
				label="Potential traffic"
				isLoading={isProcessing}
				prefix="~"
			/>
		</div>
	);
}
