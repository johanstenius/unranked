"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type {
	BriefData,
	BriefRecommendation,
	ComponentState,
} from "@/lib/types";
import { motion } from "framer-motion";
import { BriefCard } from "./brief-card";
import { RecommendationSelection } from "./recommendation-selection";

type BriefsTabProps = {
	briefs: ComponentState<BriefData[]>;
	auditToken: string;
	briefsLimit: number;
	recommendations?: BriefRecommendation[];
	onGenerateBriefs?: (keywords: string[]) => void;
	isGenerating?: boolean;
};

function NoRecommendationsState({ briefsLimit }: { briefsLimit: number }) {
	return (
		<div className="py-12 px-6 text-center">
			<div className="flex justify-center mb-6">
				<div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-teal/20 to-accent-indigo/20 flex items-center justify-center">
					<svg
						className="w-8 h-8 text-accent-teal"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={1.5}
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
						/>
					</svg>
				</div>
			</div>
			<h3 className="font-display text-xl font-semibold text-text-primary mb-2">
				AI Content Briefs
			</h3>
			<p className="text-text-secondary text-sm max-w-md mx-auto mb-4">
				Generate detailed content briefs with AI-powered outlines, key questions
				to answer, and internal linking suggestions.
			</p>
			<p className="text-xs text-text-tertiary">
				Recommendations will appear here after analysis completes.
				<br />
				You can generate up to{" "}
				<span className="font-medium text-text-secondary">
					{briefsLimit} brief{briefsLimit !== 1 ? "s" : ""}
				</span>{" "}
				with your plan.
			</p>
		</div>
	);
}

export function BriefsTab({
	briefs,
	auditToken,
	briefsLimit,
	recommendations = [],
	onGenerateBriefs,
	isGenerating = false,
}: BriefsTabProps) {
	// Loading state
	if (briefs.status === "pending" || briefs.status === "running") {
		return (
			<Card>
				<div className="p-6">
					<h2 className="font-display text-lg font-semibold text-text-primary mb-1">
						Content Briefs
					</h2>
					<p className="text-sm text-text-secondary mb-4">Loading briefs...</p>
					<div className="space-y-3">
						<Skeleton className="h-20 w-full rounded-xl" />
						<Skeleton className="h-20 w-full rounded-xl" />
						<Skeleton className="h-20 w-3/4 rounded-xl" />
					</div>
				</div>
			</Card>
		);
	}

	// Error state
	if (briefs.status === "failed") {
		return (
			<Card>
				<div className="p-6">
					<h2 className="font-display text-lg font-semibold text-text-primary mb-1">
						Content Briefs
					</h2>
					<p className="text-sm text-status-crit">{briefs.error}</p>
				</div>
			</Card>
		);
	}

	const briefsList = briefs.data;
	const briefsRemaining = briefsLimit - briefsList.length;
	const hasRecommendations = recommendations.length > 0;
	const canGenerateMore =
		briefsRemaining > 0 && hasRecommendations && onGenerateBriefs;

	// No briefs yet - show recommendations or waiting state
	if (briefsList.length === 0) {
		if (canGenerateMore) {
			return (
				<Card>
					<CardContent className="pt-6">
						<RecommendationSelection
							recommendations={recommendations}
							briefsRemaining={briefsRemaining}
							onGenerateBriefs={onGenerateBriefs}
							isGenerating={isGenerating}
						/>
					</CardContent>
				</Card>
			);
		}
		return (
			<Card>
				<NoRecommendationsState briefsLimit={briefsLimit} />
			</Card>
		);
	}

	// Has briefs - show them with option to generate more
	return (
		<div className="space-y-6">
			{/* Existing briefs */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="font-display font-semibold text-lg text-text-primary">
							Content Briefs
						</h2>
						<p className="text-sm text-text-secondary">
							{briefsList.length} brief{briefsList.length !== 1 ? "s" : ""}{" "}
							generated
							{briefsRemaining > 0 && (
								<span className="text-text-tertiary">
									{" "}
									• {briefsRemaining} remaining
								</span>
							)}
						</p>
					</div>
				</div>

				<div className="space-y-3">
					{briefsList.map((brief, index) => (
						<motion.div
							key={brief.id}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.05 }}
						>
							<BriefCard brief={brief} auditToken={auditToken} />
						</motion.div>
					))}
				</div>
			</div>

			{/* Generate more section */}
			{canGenerateMore && (
				<Card>
					<CardContent className="pt-6">
						<RecommendationSelection
							recommendations={recommendations}
							briefsRemaining={briefsRemaining}
							onGenerateBriefs={onGenerateBriefs}
							isGenerating={isGenerating}
						/>
					</CardContent>
				</Card>
			)}

			{/* Limit reached */}
			{briefsRemaining <= 0 && (
				<div className="p-4 rounded-xl border border-dashed border-border bg-subtle/30 text-center">
					<p className="text-sm text-text-secondary">
						You've reached your brief limit ({briefsLimit}).
					</p>
				</div>
			)}
		</div>
	);
}
