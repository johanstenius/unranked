"use client";

import { motion } from "framer-motion";
import { ArrowRight, BarChart3, CheckCircle2, Search } from "lucide-react";

type NewSiteBannerProps = {
	hostname: string;
	/** Boosted brief count for this tier (from API/state) */
	briefCount?: number;
	/** Boosted competitor count for this tier (from API/state) */
	competitorCount?: number;
};

function formatBriefs(count: number | undefined): string {
	if (count === undefined) return "Content briefs";
	if (count >= 100) return "Unlimited briefs";
	return `${count} content brief${count !== 1 ? "s" : ""}`;
}

function formatCompetitors(count: number | undefined): string {
	if (count === undefined) return "Competitor analysis";
	return `${count} competitor${count !== 1 ? "s" : ""} analyzed`;
}

// TODO: Add "Re-audit in 3 months" reminder button with email scheduling
export function NewSiteBanner({
	hostname,
	briefCount,
	competitorCount,
}: NewSiteBannerProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
			className="relative overflow-hidden rounded-xl border border-border bg-surface mb-8"
		>
			{/* Subtle top accent line */}
			<div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

			<div className="p-6">
				{/* Header row */}
				<div className="mb-5">
					<p className="text-sm text-text-secondary mb-1">
						<span className="font-medium text-text-primary">{hostname}</span> is
						new to search
					</p>
					<h3 className="font-display text-lg font-semibold text-text-primary">
						Here's what we focused on
					</h3>
				</div>

				{/* Two columns: What you got / What unlocks later */}
				<div className="grid md:grid-cols-2 gap-6">
					{/* What you got - emphasized */}
					<div className="space-y-3">
						<p className="text-xs font-medium text-accent uppercase tracking-wider">
							Included in your audit
						</p>
						<div className="space-y-2">
							<div className="flex items-start gap-2.5">
								<CheckCircle2 className="w-4 h-4 text-status-good mt-0.5 flex-shrink-0" />
								<span className="text-sm text-text-primary">
									{formatBriefs(briefCount)}{" "}
									<span className="text-text-secondary">
										(boosted for new sites)
									</span>
								</span>
							</div>
							<div className="flex items-start gap-2.5">
								<CheckCircle2 className="w-4 h-4 text-status-good mt-0.5 flex-shrink-0" />
								<span className="text-sm text-text-primary">
									{formatCompetitors(competitorCount)}{" "}
									<span className="text-text-secondary">with gap analysis</span>
								</span>
							</div>
							<div className="flex items-start gap-2.5">
								<CheckCircle2 className="w-4 h-4 text-status-good mt-0.5 flex-shrink-0" />
								<span className="text-sm text-text-primary">
									Full technical audit{" "}
									<span className="text-text-secondary">
										(speed, errors, structure)
									</span>
								</span>
							</div>
							<div className="flex items-start gap-2.5">
								<CheckCircle2 className="w-4 h-4 text-status-good mt-0.5 flex-shrink-0" />
								<span className="text-sm text-text-primary">
									Internal linking analysis
								</span>
							</div>
						</div>
					</div>

					{/* What unlocks later - muted but informative */}
					<div className="space-y-3">
						<p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
							Unlocks with rankings
						</p>
						<div className="space-y-2 opacity-75">
							<div className="flex items-start gap-2.5">
								<BarChart3 className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" />
								<span className="text-sm text-text-secondary">
									Quick Wins{" "}
									<span className="text-text-tertiary">
										— optimize pages ranking 10-30
									</span>
								</span>
							</div>
							<div className="flex items-start gap-2.5">
								<Search className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" />
								<span className="text-sm text-text-secondary">
									Seed Expansion{" "}
									<span className="text-text-tertiary">
										— related keywords from rankings
									</span>
								</span>
							</div>
						</div>
						<p className="text-xs text-text-tertiary pt-1 flex items-center gap-1">
							<ArrowRight className="w-3 h-3" />
							These features analyze existing rankings
						</p>
					</div>
				</div>
			</div>
		</motion.div>
	);
}
