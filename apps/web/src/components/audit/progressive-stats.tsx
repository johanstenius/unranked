"use client";

import type {
	ComponentState,
	CurrentRanking,
	Opportunity,
	TechnicalIssue,
} from "@/lib/types";
import {
	AnimatePresence,
	motion,
	useSpring,
	useTransform,
} from "framer-motion";
import { useEffect } from "react";

type ProgressiveStatsProps = {
	pagesFound: number | null;
	rankings: ComponentState<CurrentRanking[]>;
	opportunities: ComponentState<Opportunity[]>;
	technical: ComponentState<TechnicalIssue[]>;
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
		<div className="bg-surface rounded-xl p-5 shadow-card">
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
	pagesFound,
	rankings,
	opportunities,
	technical,
	isProcessing,
	isFreeTier,
}: ProgressiveStatsProps) {
	const pages = pagesFound ?? 0;

	// Extract data from component states
	const rankingsData = rankings.status === "completed" ? rankings.data : [];
	const opportunitiesData =
		opportunities.status === "completed" ? opportunities.data : [];
	const technicalData = technical.status === "completed" ? technical.data : [];

	const keywordsRanking = rankingsData.length;
	const opportunitiesCount = opportunitiesData.length;
	const totalEstTraffic = rankingsData.reduce(
		(sum, r) => sum + r.estimatedTraffic,
		0,
	);
	const totalOpportunityVolume = opportunitiesData.reduce(
		(sum, o) => sum + o.searchVolume,
		0,
	);

	// Loading states based on component status
	const isRankingsLoading = rankings.status !== "completed";
	const isOpportunitiesLoading = opportunities.status !== "completed";
	const isTechnicalLoading = technical.status !== "completed";

	if (isFreeTier) {
		return (
			<div className="grid grid-cols-2 gap-4 mb-10">
				<StatCard
					value={pages}
					label="Pages crawled"
					isLoading={isProcessing && pages === 0}
				/>
				<StatCard
					value={technicalData.length > 0 ? technicalData.length : null}
					label="Technical issues"
					isLoading={isTechnicalLoading}
				/>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-5 gap-4 mb-10">
			<StatCard
				value={pages}
				label="Pages crawled"
				isLoading={isProcessing && pages === 0}
			/>
			<StatCard
				value={keywordsRanking > 0 ? keywordsRanking : null}
				label="Keywords ranking"
				isLoading={isRankingsLoading}
			/>
			<StatCard
				value={totalEstTraffic > 0 ? totalEstTraffic : null}
				label="Est. monthly traffic"
				isLoading={isRankingsLoading}
				color="text-accent-teal"
				prefix="~"
			/>
			<StatCard
				value={opportunitiesCount > 0 ? opportunitiesCount : null}
				label="Opportunities"
				isLoading={isOpportunitiesLoading}
				color="text-accent-indigo"
			/>
			<StatCard
				value={totalOpportunityVolume > 0 ? totalOpportunityVolume : null}
				label="Potential traffic"
				isLoading={isOpportunitiesLoading}
				prefix="~"
			/>
		</div>
	);
}
