"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
	ArrowUpRight,
	BarChart3,
	Clock,
	Compass,
	FileSearch,
	Rocket,
	Search,
	Sparkles,
	Target,
	TrendingUp,
	Zap,
} from "lucide-react";

type EmptyStateProps = {
	title: string;
	description: string;
	icon?: React.ReactNode;
	isNewSite?: boolean;
	className?: string;
};

export function EmptyState({
	title,
	description,
	icon,
	isNewSite,
	className,
}: EmptyStateProps) {
	return (
		<Card className={cn("border-border border-dashed", className)}>
			<CardContent className="py-8 text-center">
				{icon && (
					<div className="mb-4 flex justify-center text-text-tertiary">
						{icon}
					</div>
				)}
				<h3 className="font-medium text-text-primary mb-2">{title}</h3>
				<p className="text-sm text-text-secondary max-w-md mx-auto">
					{description}
				</p>
				{isNewSite && (
					<div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 text-accent text-xs rounded-full mt-4">
						<Rocket className="w-3 h-3" />
						<span>New Site</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

/**
 * Distinctive locked state for features that require rankings.
 * Used for Quick Wins on new sites.
 */
type LockedFeatureStateProps = {
	feature: "quickWins";
	className?: string;
};

const lockedFeatureContent = {
	quickWins: {
		icon: Zap,
		title: "Quick Wins",
		subtitle: "Unlocks when you have rankings",
		description:
			"Quick Wins identifies pages ranking #10-30 and suggests optimizations to reach page one. Once your content starts ranking, this becomes one of the most actionable sections of the audit.",
		whatItDoes: [
			"Find pages close to page one",
			"AI-powered optimization suggestions",
			"Estimated position improvements",
		],
	},
};

export function LockedFeatureState({
	feature,
	className,
}: LockedFeatureStateProps) {
	const content = lockedFeatureContent[feature];
	const Icon = content.icon;

	return (
		<Card
			className={cn(
				"border-border bg-gradient-to-b from-surface to-subtle/50 overflow-hidden",
				className,
			)}
		>
			<CardContent className="py-10 px-8">
				<div className="max-w-lg mx-auto text-center">
					{/* Icon with lock badge */}
					<div className="relative inline-flex mb-5">
						<div className="p-4 rounded-xl bg-muted/50 border border-border">
							<Icon className="w-8 h-8 text-text-tertiary" />
						</div>
						<div className="absolute -bottom-1 -right-1 p-1 bg-surface rounded-full border border-border">
							<Clock className="w-3.5 h-3.5 text-text-tertiary" />
						</div>
					</div>

					{/* Title and subtitle */}
					<h3 className="font-display font-semibold text-lg text-text-primary mb-1">
						{content.title}
					</h3>
					<p className="text-sm text-accent font-medium mb-4">
						{content.subtitle}
					</p>

					{/* Description */}
					<p className="text-sm text-text-secondary mb-6 leading-relaxed">
						{content.description}
					</p>

					{/* What it does preview */}
					<div className="bg-surface/80 border border-border rounded-lg p-4 text-left">
						<p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">
							What you'll see
						</p>
						<ul className="space-y-2">
							{content.whatItDoes.map((item) => (
								<li
									key={item}
									className="flex items-center gap-2 text-sm text-text-secondary"
								>
									<ArrowUpRight className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
									{item}
								</li>
							))}
						</ul>
					</div>

					{/* Footer note */}
					<p className="text-xs text-text-tertiary mt-5">
						Run another audit once your site has search rankings
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

// Pre-configured empty states for specific sections

export function RankingsEmptyState({ isNewSite }: { isNewSite?: boolean }) {
	return (
		<EmptyState
			icon={<BarChart3 className="w-8 h-8" />}
			title={isNewSite ? "No rankings yet" : "No rankings found"}
			description={
				isNewSite
					? "That's normal for new sites! Focus on creating quality content first, and rankings will follow."
					: "Your site doesn't appear in the top 100 results for any tracked keywords yet."
			}
			isNewSite={isNewSite}
		/>
	);
}

export function OpportunitiesEmptyState({
	isNewSite,
}: { isNewSite?: boolean }) {
	return (
		<EmptyState
			icon={<Target className="w-8 h-8" />}
			title={
				isNewSite ? "Building your opportunity list" : "No opportunities found"
			}
			description={
				isNewSite
					? "For new sites, add target keywords when creating the audit, or let us analyze your competitors' keywords."
					: "No keyword opportunities were identified. Try adding competitors to find gap opportunities."
			}
			isNewSite={isNewSite}
		/>
	);
}

export function QuickWinsEmptyState({ isNewSite }: { isNewSite?: boolean }) {
	return (
		<EmptyState
			icon={<Zap className="w-8 h-8" />}
			title={
				isNewSite ? "Quick wins require rankings" : "No quick wins identified"
			}
			description={
				isNewSite
					? "Quick wins are keywords where you rank 10-30 and can move up easily. Build your content foundation first!"
					: "No keywords found in positions 10-30 that could quickly improve with small optimizations."
			}
			isNewSite={isNewSite}
		/>
	);
}

export function CompetitorGapEmptyState({
	isNewSite,
}: { isNewSite?: boolean }) {
	return (
		<EmptyState
			icon={<Search className="w-8 h-8" />}
			title={
				isNewSite ? "Competitor analysis pending" : "No competitor gaps found"
			}
			description={
				isNewSite
					? "Add competitors when creating your audit to see what keywords they rank for that you could target."
					: "No keywords found where competitors rank but you don't. Try adding more competitors."
			}
			isNewSite={isNewSite}
		/>
	);
}

export function SnippetsEmptyState({ isNewSite }: { isNewSite?: boolean }) {
	return (
		<EmptyState
			icon={<Sparkles className="w-8 h-8" />}
			title={
				isNewSite
					? "Snippet opportunities require rankings"
					: "No snippet opportunities"
			}
			description={
				isNewSite
					? "Featured snippets are for keywords where you already rank well. Build your content first!"
					: "No featured snippet opportunities identified based on your current rankings and competitor analysis."
			}
			isNewSite={isNewSite}
		/>
	);
}

export function ClustersEmptyState({ isNewSite }: { isNewSite?: boolean }) {
	return (
		<EmptyState
			icon={<Compass className="w-8 h-8" />}
			title="No topic clusters"
			description={
				isNewSite
					? "Topic clusters are generated from your keyword opportunities. Add target keywords to see clusters."
					: "Not enough related keywords found to form meaningful topic clusters."
			}
			isNewSite={isNewSite}
		/>
	);
}

export function BriefsEmptyState({ isNewSite }: { isNewSite?: boolean }) {
	return (
		<EmptyState
			icon={<FileSearch className="w-8 h-8" />}
			title="No briefs generated"
			description={
				isNewSite
					? "Content briefs will be generated based on your keyword opportunities. Add target keywords first."
					: "No content briefs have been generated yet. Select keywords from your opportunities to create briefs."
			}
			isNewSite={isNewSite}
		/>
	);
}

export function ActionPlanEmptyState({ isNewSite }: { isNewSite?: boolean }) {
	return (
		<EmptyState
			icon={<TrendingUp className="w-8 h-8" />}
			title="Action plan pending"
			description={
				isNewSite
					? "Your action plan will focus on foundation-building: technical SEO and content opportunities."
					: "The action plan is generated after analysis is complete."
			}
			isNewSite={isNewSite}
		/>
	);
}
