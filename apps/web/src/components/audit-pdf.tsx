"use client";

import type {
	AuditState,
	AuditTier,
	BriefData,
	CannibalizationIssue,
	CompetitorGap,
	HealthScore,
	HealthScoreBreakdown,
	InternalLinkingIssues,
	Opportunity,
	PrioritizedAction,
	QuickWin,
	TechnicalIssue,
} from "@/lib/types";
import { extractHostname, getPathname } from "@/lib/utils";
import {
	Document,
	Page,
	StyleSheet,
	Text,
	View,
	pdf,
} from "@react-pdf/renderer";

// =============================================================================
// Design System
// =============================================================================

const colors = {
	// Primary palette
	navy: "#0A1628",
	slate: "#475569",
	muted: "#94A3B8",

	// Accent colors
	teal: "#14B8A6",
	tealLight: "#CCFBF1",
	amber: "#F59E0B",
	amberLight: "#FEF3C7",
	coral: "#EF4444",
	coralLight: "#FEE2E2",
	indigo: "#6366F1",
	indigoLight: "#E0E7FF",

	// Backgrounds
	white: "#FFFFFF",
	cream: "#FAFAF9",
	surface: "#F1F5F9",
	border: "#E2E8F0",
};

const styles = StyleSheet.create({
	// Page layout
	page: {
		padding: 40,
		paddingBottom: 60,
		fontFamily: "Helvetica",
		fontSize: 10,
		color: colors.navy,
		backgroundColor: colors.white,
	},

	// Header
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 24,
		paddingBottom: 16,
		borderBottomWidth: 2,
		borderBottomColor: colors.navy,
	},
	logo: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	logoBox: {
		width: 12,
		height: 12,
		backgroundColor: colors.navy,
		borderRadius: 2,
	},
	logoText: {
		fontSize: 14,
		fontFamily: "Helvetica-Bold",
		letterSpacing: 1,
	},
	headerRight: {
		textAlign: "right",
	},
	siteUrl: {
		fontSize: 12,
		fontFamily: "Helvetica-Bold",
		color: colors.navy,
	},
	date: {
		fontSize: 9,
		color: colors.muted,
		marginTop: 2,
	},

	// Footer
	footer: {
		position: "absolute",
		bottom: 24,
		left: 40,
		right: 40,
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: colors.border,
	},
	footerText: {
		fontSize: 8,
		color: colors.muted,
	},
	pageNumber: {
		fontSize: 8,
		color: colors.slate,
		fontFamily: "Helvetica-Bold",
	},

	// Typography
	h1: {
		fontSize: 24,
		fontFamily: "Helvetica-Bold",
		color: colors.navy,
		marginBottom: 8,
	},
	h2: {
		fontSize: 16,
		fontFamily: "Helvetica-Bold",
		color: colors.navy,
		marginBottom: 12,
		marginTop: 20,
	},
	h3: {
		fontSize: 12,
		fontFamily: "Helvetica-Bold",
		color: colors.navy,
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 10,
		color: colors.slate,
		marginBottom: 16,
	},
	body: {
		fontSize: 10,
		color: colors.navy,
		lineHeight: 1.4,
	},
	caption: {
		fontSize: 8,
		color: colors.muted,
	},
	label: {
		fontSize: 7,
		fontFamily: "Helvetica-Bold",
		color: colors.muted,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},

	// Health Score
	scoreSection: {
		alignItems: "center",
		marginVertical: 24,
		padding: 32,
		backgroundColor: colors.surface,
		borderRadius: 8,
	},
	scoreNumber: {
		fontSize: 56,
		fontFamily: "Helvetica-Bold",
	},
	scoreLabel: {
		fontSize: 11,
		color: colors.slate,
		marginTop: 4,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	gradeBadge: {
		marginTop: 12,
		paddingHorizontal: 16,
		paddingVertical: 6,
		borderRadius: 16,
	},
	gradeText: {
		fontSize: 11,
		fontFamily: "Helvetica-Bold",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},

	// Stats grid
	statsGrid: {
		flexDirection: "row",
		gap: 12,
		marginBottom: 24,
	},
	statBox: {
		flex: 1,
		padding: 16,
		backgroundColor: colors.surface,
		borderRadius: 6,
		alignItems: "center",
	},
	statNumber: {
		fontSize: 28,
		fontFamily: "Helvetica-Bold",
		color: colors.navy,
	},
	statLabel: {
		fontSize: 8,
		color: colors.muted,
		marginTop: 4,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},

	// Key findings
	keyFindings: {
		marginTop: 20,
		padding: 16,
		backgroundColor: colors.surface,
		borderRadius: 6,
	},
	keyFindingsTitle: {
		fontSize: 10,
		fontFamily: "Helvetica-Bold",
		color: colors.navy,
		marginBottom: 8,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	findingItem: {
		flexDirection: "row",
		alignItems: "flex-start",
		marginBottom: 4,
	},
	findingBullet: {
		width: 16,
		fontSize: 10,
		color: colors.teal,
	},
	findingText: {
		flex: 1,
		fontSize: 10,
		color: colors.slate,
	},

	// Health breakdown
	breakdownItem: {
		marginBottom: 16,
	},
	breakdownHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: 4,
	},
	breakdownLabel: {
		fontSize: 10,
		fontFamily: "Helvetica-Bold",
		color: colors.navy,
	},
	breakdownScore: {
		fontSize: 10,
		fontFamily: "Helvetica-Bold",
		color: colors.slate,
	},
	progressBar: {
		height: 8,
		backgroundColor: colors.border,
		borderRadius: 4,
		marginBottom: 4,
	},
	progressFill: {
		height: 8,
		borderRadius: 4,
	},
	breakdownDetail: {
		fontSize: 8,
		color: colors.muted,
	},

	// Action plan
	actionItem: {
		marginBottom: 16,
		padding: 12,
		backgroundColor: colors.surface,
		borderRadius: 6,
		borderLeftWidth: 3,
	},
	actionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 6,
	},
	actionRank: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: colors.navy,
		alignItems: "center",
		justifyContent: "center",
	},
	actionRankText: {
		fontSize: 10,
		fontFamily: "Helvetica-Bold",
		color: colors.white,
	},
	actionTitle: {
		flex: 1,
		fontSize: 11,
		fontFamily: "Helvetica-Bold",
		color: colors.navy,
		marginLeft: 10,
	},
	actionMeta: {
		flexDirection: "row",
		gap: 8,
		marginTop: 6,
	},
	actionDescription: {
		fontSize: 9,
		color: colors.slate,
		marginTop: 4,
	},

	// Badges
	badge: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		fontSize: 7,
		fontFamily: "Helvetica-Bold",
		textTransform: "uppercase",
	},
	badgeTeal: {
		backgroundColor: colors.tealLight,
		color: "#0D9488",
	},
	badgeAmber: {
		backgroundColor: colors.amberLight,
		color: "#B45309",
	},
	badgeCoral: {
		backgroundColor: colors.coralLight,
		color: "#DC2626",
	},
	badgeIndigo: {
		backgroundColor: colors.indigoLight,
		color: "#4F46E5",
	},
	badgeSlate: {
		backgroundColor: colors.surface,
		color: colors.slate,
	},

	// Tables
	table: {
		marginBottom: 16,
	},
	tableHeader: {
		flexDirection: "row",
		backgroundColor: colors.navy,
		padding: 8,
		borderTopLeftRadius: 4,
		borderTopRightRadius: 4,
	},
	tableHeaderCell: {
		fontSize: 8,
		fontFamily: "Helvetica-Bold",
		color: colors.white,
		textTransform: "uppercase",
		letterSpacing: 0.3,
	},
	tableRow: {
		flexDirection: "row",
		padding: 8,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	tableRowAlt: {
		backgroundColor: colors.surface,
	},
	tableCell: {
		fontSize: 9,
		color: colors.navy,
	},
	tableCellMuted: {
		fontSize: 9,
		color: colors.slate,
	},

	// Quick wins
	quickWinCard: {
		marginBottom: 14,
		padding: 12,
		backgroundColor: colors.surface,
		borderRadius: 6,
		borderLeftWidth: 3,
		borderLeftColor: colors.teal,
	},
	quickWinUrl: {
		fontSize: 10,
		fontFamily: "Helvetica-Bold",
		color: colors.navy,
		marginBottom: 4,
	},
	quickWinKeyword: {
		fontSize: 9,
		color: colors.slate,
		marginBottom: 8,
	},
	quickWinSuggestions: {
		marginTop: 8,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: colors.border,
	},
	suggestionItem: {
		flexDirection: "row",
		marginBottom: 3,
	},
	suggestionBullet: {
		width: 12,
		fontSize: 9,
		color: colors.teal,
	},
	suggestionText: {
		flex: 1,
		fontSize: 9,
		color: colors.slate,
	},

	// Competitor analysis
	competitorCard: {
		marginBottom: 16,
		padding: 12,
		backgroundColor: colors.surface,
		borderRadius: 6,
	},
	competitorHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	competitorDomain: {
		fontSize: 11,
		fontFamily: "Helvetica-Bold",
		color: colors.navy,
	},
	competitorCount: {
		fontSize: 9,
		color: colors.slate,
	},
	competitorBar: {
		height: 6,
		backgroundColor: colors.border,
		borderRadius: 3,
		marginBottom: 10,
	},
	competitorBarFill: {
		height: 6,
		backgroundColor: colors.coral,
		borderRadius: 3,
	},

	// Issue sections
	issueSectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
		marginTop: 16,
	},
	issueCount: {
		marginLeft: 8,
		fontSize: 9,
		color: colors.slate,
	},
	issueItem: {
		flexDirection: "row",
		padding: 6,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	issueUrl: {
		width: "45%",
		fontSize: 8,
		color: colors.slate,
	},
	issueText: {
		flex: 1,
		fontSize: 9,
		color: colors.navy,
	},

	// Linking issues
	linkingSection: {
		marginBottom: 16,
	},
	linkingTitle: {
		fontSize: 10,
		fontFamily: "Helvetica-Bold",
		color: colors.navy,
		marginBottom: 6,
	},
	linkingItem: {
		flexDirection: "row",
		paddingVertical: 3,
	},
	linkingBullet: {
		width: 12,
		fontSize: 9,
		color: colors.coral,
	},
	linkingUrl: {
		flex: 1,
		fontSize: 9,
		color: colors.slate,
	},
	linkingCount: {
		fontSize: 9,
		color: colors.muted,
	},

	// Cannibalization
	cannibalizationCard: {
		marginBottom: 12,
		padding: 12,
		backgroundColor: colors.surface,
		borderRadius: 6,
	},
	cannibalizationKeyword: {
		fontSize: 10,
		fontFamily: "Helvetica-Bold",
		color: colors.navy,
	},
	cannibalizationMeta: {
		flexDirection: "row",
		gap: 8,
		marginTop: 4,
		marginBottom: 8,
	},
	cannibalizationPage: {
		flexDirection: "row",
		paddingVertical: 2,
	},
	cannibalizationUrl: {
		flex: 1,
		fontSize: 9,
		color: colors.slate,
	},
	cannibalizationPosition: {
		fontSize: 9,
		color: colors.muted,
	},

	// Section stats
	sectionStatsTable: {
		marginTop: 8,
	},

	// Upgrade CTA
	upgradeCta: {
		marginTop: 24,
		padding: 20,
		backgroundColor: colors.surface,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: colors.teal,
	},
	upgradeTitle: {
		fontSize: 12,
		fontFamily: "Helvetica-Bold",
		color: colors.navy,
		marginBottom: 8,
	},
	upgradeText: {
		fontSize: 9,
		color: colors.slate,
		marginBottom: 12,
	},
	upgradeList: {
		marginBottom: 12,
	},
	upgradeItem: {
		flexDirection: "row",
		marginBottom: 4,
	},
	upgradeCheck: {
		width: 14,
		fontSize: 10,
		color: colors.teal,
	},
	upgradeItemText: {
		fontSize: 9,
		color: colors.navy,
	},
	upgradeLink: {
		fontSize: 9,
		fontFamily: "Helvetica-Bold",
		color: colors.teal,
	},

	// Briefs
	briefRow: {
		flexDirection: "row",
		padding: 10,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	briefKeyword: {
		width: "25%",
		fontSize: 9,
		fontFamily: "Helvetica-Bold",
		color: colors.navy,
	},
	briefTitle: {
		width: "35%",
		fontSize: 9,
		color: colors.slate,
	},
	briefVolume: {
		width: "15%",
		fontSize: 9,
		color: colors.navy,
		textAlign: "right",
	},
	briefDifficulty: {
		width: "10%",
		fontSize: 9,
		color: colors.slate,
		textAlign: "right",
	},
	briefEffort: {
		width: "15%",
		textAlign: "right",
	},

	// Divider
	divider: {
		height: 1,
		backgroundColor: colors.border,
		marginVertical: 16,
	},
});

// =============================================================================
// Helper Functions
// =============================================================================

function getGradeColor(grade: HealthScore["grade"]): string {
	switch (grade) {
		case "excellent":
			return colors.teal;
		case "good":
			return colors.teal;
		case "needs_work":
			return colors.amber;
		case "poor":
			return colors.coral;
	}
}

function getGradeLabel(grade: HealthScore["grade"]): string {
	switch (grade) {
		case "excellent":
			return "Excellent";
		case "good":
			return "Good";
		case "needs_work":
			return "Needs Work";
		case "poor":
			return "Poor";
	}
}

function getGradeBgColor(grade: HealthScore["grade"]): string {
	switch (grade) {
		case "excellent":
			return colors.tealLight;
		case "good":
			return colors.tealLight;
		case "needs_work":
			return colors.amberLight;
		case "poor":
			return colors.coralLight;
	}
}

function getPriorityColor(priority: number): string {
	if (priority >= 80) return colors.coral;
	if (priority >= 50) return colors.amber;
	return colors.teal;
}

function getEffortBadgeStyle(effort: "low" | "medium" | "high") {
	switch (effort) {
		case "low":
			return styles.badgeTeal;
		case "medium":
			return styles.badgeAmber;
		case "high":
			return styles.badgeCoral;
	}
}

function formatNumber(n: number): string {
	if (n >= 1000) {
		return `${(n / 1000).toFixed(1)}K`;
	}
	return n.toLocaleString();
}

function truncate(str: string, len: number): string {
	if (str.length <= len) return str;
	return `${str.slice(0, len - 1)}…`;
}

function getSourceIcon(source?: string): string {
	switch (source) {
		case "competitor_gap":
			return "●";
		case "seed_expansion":
			return "◆";
		case "content_extraction":
			return "■";
		default:
			return "○";
	}
}

function getBreakdownLabel(key: string): string {
	switch (key) {
		case "opportunityDiscovery":
			return "Opportunity Discovery";
		case "rankingCoverage":
			return "Ranking Coverage";
		case "positionQuality":
			return "Position Quality";
		case "technicalHealth":
			return "Technical Health";
		case "internalLinking":
			return "Internal Linking";
		case "contentOpportunity":
			return "Content Opportunity";
		default:
			return key;
	}
}

// =============================================================================
// Reusable Components
// =============================================================================

function PageHeader({ hostname }: { hostname: string }) {
	return (
		<View style={styles.header}>
			<View style={styles.logo}>
				<View style={styles.logoBox} />
				<Text style={styles.logoText}>UNRANKED</Text>
			</View>
			<View style={styles.headerRight}>
				<Text style={styles.siteUrl}>{hostname}</Text>
				<Text style={styles.date}>
					{new Date().toLocaleDateString("en-US", {
						year: "numeric",
						month: "long",
						day: "numeric",
					})}
				</Text>
			</View>
		</View>
	);
}

function PageFooter() {
	return (
		<View style={styles.footer} fixed>
			<Text style={styles.footerText}>Generated by Unranked</Text>
			<Text
				style={styles.pageNumber}
				render={({ pageNumber, totalPages }) =>
					`Page ${pageNumber} of ${totalPages}`
				}
			/>
		</View>
	);
}

function Badge({
	children,
	variant,
}: {
	children: string;
	variant: "teal" | "amber" | "coral" | "indigo" | "slate";
}) {
	const variantStyle = {
		teal: styles.badgeTeal,
		amber: styles.badgeAmber,
		coral: styles.badgeCoral,
		indigo: styles.badgeIndigo,
		slate: styles.badgeSlate,
	}[variant];

	return <Text style={[styles.badge, variantStyle]}>{children}</Text>;
}

function ProgressBar({
	value,
	max,
	color,
}: { value: number; max: number; color: string }) {
	const percentage = Math.min((value / max) * 100, 100);
	return (
		<View style={styles.progressBar}>
			<View
				style={[
					styles.progressFill,
					{ width: `${percentage}%`, backgroundColor: color },
				]}
			/>
		</View>
	);
}

// =============================================================================
// PDF Data Types
// =============================================================================

type PdfAuditData = {
	siteUrl: string;
	accessToken: string;
	tier: AuditTier;
	pagesFound: number;
};

type PdfAnalysisData = {
	healthScore: HealthScore | null;
	currentRankings: { keyword: string }[];
	opportunities: Opportunity[];
	quickWins: QuickWin[];
	technicalIssues: TechnicalIssue[];
	internalLinkingIssues: InternalLinkingIssues;
	cannibalizationIssues: CannibalizationIssue[];
	competitorGaps: CompetitorGap[];
	actionPlan: PrioritizedAction[];
};

// =============================================================================
// Page Components
// =============================================================================

type CoverPageProps = {
	audit: PdfAuditData;
	analysis: PdfAnalysisData;
	isFreeTier: boolean;
};

function CoverPage({ audit, analysis, isFreeTier }: CoverPageProps) {
	const hostname = extractHostname(audit.siteUrl);
	const healthScore = analysis.healthScore;

	const totalVolume = analysis.opportunities.reduce(
		(sum, o) => sum + o.searchVolume,
		0,
	);

	return (
		<Page size="A4" style={styles.page}>
			<PageHeader hostname={hostname} />

			{healthScore && (
				<View style={styles.scoreSection}>
					<Text
						style={[
							styles.scoreNumber,
							{ color: getGradeColor(healthScore.grade) },
						]}
					>
						{healthScore.score}
					</Text>
					<Text style={styles.scoreLabel}>SEO Health Score</Text>
					<View
						style={[
							styles.gradeBadge,
							{ backgroundColor: getGradeBgColor(healthScore.grade) },
						]}
					>
						<Text
							style={[
								styles.gradeText,
								{ color: getGradeColor(healthScore.grade) },
							]}
						>
							{getGradeLabel(healthScore.grade)}
						</Text>
					</View>
				</View>
			)}

			<View style={styles.statsGrid}>
				<View style={styles.statBox}>
					<Text style={styles.statNumber}>{audit.pagesFound ?? 0}</Text>
					<Text style={styles.statLabel}>Pages</Text>
				</View>
				{!isFreeTier && (
					<>
						<View style={styles.statBox}>
							<Text style={styles.statNumber}>
								{analysis.currentRankings.length}
							</Text>
							<Text style={styles.statLabel}>Rankings</Text>
						</View>
						<View style={styles.statBox}>
							<Text style={[styles.statNumber, { color: colors.teal }]}>
								{analysis.opportunities.length}
							</Text>
							<Text style={styles.statLabel}>Opportunities</Text>
						</View>
					</>
				)}
				<View style={styles.statBox}>
					<Text style={[styles.statNumber, { color: colors.coral }]}>
						{analysis.technicalIssues.length}
					</Text>
					<Text style={styles.statLabel}>Issues</Text>
				</View>
			</View>

			{!isFreeTier && (
				<View style={styles.keyFindings}>
					<Text style={styles.keyFindingsTitle}>Key Findings</Text>
					{analysis.opportunities.length > 0 && (
						<View style={styles.findingItem}>
							<Text style={styles.findingBullet}>•</Text>
							<Text style={styles.findingText}>
								{analysis.opportunities.length} keyword opportunities worth{" "}
								{formatNumber(totalVolume)} searches/mo
							</Text>
						</View>
					)}
					{analysis.quickWins.length > 0 && (
						<View style={styles.findingItem}>
							<Text style={styles.findingBullet}>•</Text>
							<Text style={styles.findingText}>
								{analysis.quickWins.length} quick wins to reach page 1
							</Text>
						</View>
					)}
					{analysis.technicalIssues.length > 0 && (
						<View style={styles.findingItem}>
							<Text style={styles.findingBullet}>•</Text>
							<Text style={styles.findingText}>
								{analysis.technicalIssues.length} technical issues need
								attention
							</Text>
						</View>
					)}
					{analysis.competitorGaps.length > 0 && (
						<View style={styles.findingItem}>
							<Text style={styles.findingBullet}>•</Text>
							<Text style={styles.findingText}>
								{analysis.competitorGaps.reduce(
									(sum, c) => sum + c.gapKeywords.length,
									0,
								)}{" "}
								competitor gap keywords discovered
							</Text>
						</View>
					)}
				</View>
			)}

			{isFreeTier && (
				<View style={styles.upgradeCta}>
					<Text style={styles.upgradeTitle}>Unlock Full Analysis</Text>
					<Text style={styles.upgradeText}>
						Your free report includes technical issues only. Upgrade to see:
					</Text>
					<View style={styles.upgradeList}>
						{analysis.opportunities.length > 0 && (
							<View style={styles.upgradeItem}>
								<Text style={styles.upgradeCheck}>✓</Text>
								<Text style={styles.upgradeItemText}>
									{analysis.opportunities.length} keyword opportunities
								</Text>
							</View>
						)}
						{analysis.quickWins.length > 0 && (
							<View style={styles.upgradeItem}>
								<Text style={styles.upgradeCheck}>✓</Text>
								<Text style={styles.upgradeItemText}>
									{analysis.quickWins.length} quick wins to reach page 1
								</Text>
							</View>
						)}
						<View style={styles.upgradeItem}>
							<Text style={styles.upgradeCheck}>✓</Text>
							<Text style={styles.upgradeItemText}>
								AI-generated content briefs
							</Text>
						</View>
						<View style={styles.upgradeItem}>
							<Text style={styles.upgradeCheck}>✓</Text>
							<Text style={styles.upgradeItemText}>
								Competitor gap analysis
							</Text>
						</View>
						<View style={styles.upgradeItem}>
							<Text style={styles.upgradeCheck}>✓</Text>
							<Text style={styles.upgradeItemText}>Priority action plan</Text>
						</View>
					</View>
					<Text style={styles.upgradeLink}>
						→ Upgrade at unranked.com/audit/{audit.accessToken}
					</Text>
				</View>
			)}

			<PageFooter />
		</Page>
	);
}

type HealthBreakdownPageProps = {
	hostname: string;
	healthScore: HealthScore;
	isFreeTier: boolean;
};

function HealthBreakdownPage({
	hostname,
	healthScore,
	isFreeTier,
}: HealthBreakdownPageProps) {
	const breakdownKeys = isFreeTier
		? (["technicalHealth", "internalLinking"] as const)
		: (Object.keys(healthScore.breakdown) as (keyof HealthScoreBreakdown)[]);

	return (
		<Page size="A4" style={styles.page}>
			<PageHeader hostname={hostname} />

			<Text style={styles.h2}>Health Score Breakdown</Text>
			<Text style={styles.subtitle}>
				{isFreeTier
					? "Free tier includes technical metrics only"
					: "Detailed analysis of your SEO health across 6 key areas"}
			</Text>

			{breakdownKeys.map((key) => {
				const component = healthScore.breakdown[key];
				const percentage = (component.score / component.max) * 100;
				const barColor =
					percentage >= 70
						? colors.teal
						: percentage >= 40
							? colors.amber
							: colors.coral;

				return (
					<View key={key} style={styles.breakdownItem}>
						<View style={styles.breakdownHeader}>
							<Text style={styles.breakdownLabel}>
								{getBreakdownLabel(key)}
							</Text>
							<Text style={styles.breakdownScore}>
								{component.score}/{component.max}
							</Text>
						</View>
						<ProgressBar
							value={component.score}
							max={component.max}
							color={barColor}
						/>
						<Text style={styles.breakdownDetail}>{component.detail}</Text>
					</View>
				);
			})}

			<PageFooter />
		</Page>
	);
}

type ActionPlanPageProps = {
	hostname: string;
	actions: PrioritizedAction[];
};

function ActionPlanPage({ hostname, actions }: ActionPlanPageProps) {
	const displayActions = actions.slice(0, 10);

	return (
		<Page size="A4" style={styles.page}>
			<PageHeader hostname={hostname} />

			<Text style={styles.h2}>Priority Action Plan</Text>
			<Text style={styles.subtitle}>
				{actions.length} recommendations sorted by impact
			</Text>

			{displayActions.map((action, index) => (
				<View
					key={action.id}
					style={[
						styles.actionItem,
						{ borderLeftColor: getPriorityColor(action.priority) },
					]}
				>
					<View style={styles.actionHeader}>
						<View style={styles.actionRank}>
							<Text style={styles.actionRankText}>{index + 1}</Text>
						</View>
						<Text style={styles.actionTitle}>{truncate(action.title, 50)}</Text>
					</View>
					<View style={styles.actionMeta}>
						<Badge variant="slate">{action.category.toUpperCase()}</Badge>
						<Badge
							variant={
								action.effort === "low"
									? "teal"
									: action.effort === "medium"
										? "amber"
										: "coral"
							}
						>
							{action.effort === "low"
								? "Quick Win"
								: action.effort === "medium"
									? "Medium"
									: "High Effort"}
						</Badge>
						{action.estimatedImpact.searchVolume && (
							<Text style={styles.caption}>
								{formatNumber(action.estimatedImpact.searchVolume)} searches
							</Text>
						)}
						{action.estimatedImpact.trafficGain && (
							<Text style={[styles.caption, { color: colors.teal }]}>
								+{formatNumber(action.estimatedImpact.trafficGain)} visits
							</Text>
						)}
					</View>
					<Text style={styles.actionDescription}>
						{truncate(action.description, 100)}
					</Text>
				</View>
			))}

			<PageFooter />
		</Page>
	);
}

type OpportunitiesPageProps = {
	hostname: string;
	opportunities: Opportunity[];
	pageNumber: number;
};

function OpportunitiesPage({
	hostname,
	opportunities,
	pageNumber,
}: OpportunitiesPageProps) {
	const itemsPerPage = 20;
	const start = (pageNumber - 1) * itemsPerPage;
	const pageOpps = opportunities.slice(start, start + itemsPerPage);
	const totalVolume = opportunities.reduce((sum, o) => sum + o.searchVolume, 0);

	return (
		<Page size="A4" style={styles.page}>
			<PageHeader hostname={hostname} />

			<Text style={styles.h2}>Keyword Opportunities</Text>
			<Text style={styles.subtitle}>
				{opportunities.length} opportunities · {formatNumber(totalVolume)} total
				volume
			</Text>

			<View style={styles.table}>
				<View style={styles.tableHeader}>
					<Text style={[styles.tableHeaderCell, { width: "35%" }]}>
						Keyword
					</Text>
					<Text
						style={[
							styles.tableHeaderCell,
							{ width: "12%", textAlign: "right" },
						]}
					>
						Volume
					</Text>
					<Text
						style={[
							styles.tableHeaderCell,
							{ width: "10%", textAlign: "right" },
						]}
					>
						Diff
					</Text>
					<Text
						style={[
							styles.tableHeaderCell,
							{ width: "12%", textAlign: "right" },
						]}
					>
						Impact
					</Text>
					<Text style={[styles.tableHeaderCell, { width: "15%" }]}>Intent</Text>
					<Text
						style={[
							styles.tableHeaderCell,
							{ width: "8%", textAlign: "center" },
						]}
					>
						Src
					</Text>
					<Text
						style={[
							styles.tableHeaderCell,
							{ width: "8%", textAlign: "center" },
						]}
					>
						QW
					</Text>
				</View>
				{pageOpps.map((opp, i) => (
					<View
						key={`${opp.keyword}-${i}`}
						style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
					>
						<Text style={[styles.tableCell, { width: "35%" }]}>
							{truncate(opp.keyword, 30)}
						</Text>
						<Text
							style={[styles.tableCell, { width: "12%", textAlign: "right" }]}
						>
							{formatNumber(opp.searchVolume)}
						</Text>
						<Text
							style={[
								styles.tableCellMuted,
								{ width: "10%", textAlign: "right" },
							]}
						>
							{opp.difficulty}
						</Text>
						<Text
							style={[
								styles.tableCell,
								{ width: "12%", textAlign: "right", color: colors.teal },
							]}
						>
							{opp.impactScore.toFixed(1)}
						</Text>
						<Text style={[styles.tableCellMuted, { width: "15%" }]}>
							{opp.intent || "-"}
						</Text>
						<Text
							style={[
								styles.tableCell,
								{
									width: "8%",
									textAlign: "center",
									color:
										opp.source === "competitor_gap"
											? colors.coral
											: opp.source === "seed_expansion"
												? colors.teal
												: colors.indigo,
								},
							]}
						>
							{getSourceIcon(opp.source)}
						</Text>
						<Text
							style={[
								styles.tableCell,
								{ width: "8%", textAlign: "center", color: colors.teal },
							]}
						>
							{opp.isQuickWin ? "✓" : ""}
						</Text>
					</View>
				))}
			</View>

			{pageNumber === 1 && (
				<View style={{ marginTop: 8, flexDirection: "row", gap: 16 }}>
					<Text style={styles.caption}>
						<Text style={{ color: colors.coral }}>●</Text> Competitor Gap
					</Text>
					<Text style={styles.caption}>
						<Text style={{ color: colors.teal }}>◆</Text> Seed Expansion
					</Text>
					<Text style={styles.caption}>
						<Text style={{ color: colors.indigo }}>■</Text> Content Extraction
					</Text>
				</View>
			)}

			<PageFooter />
		</Page>
	);
}

type QuickWinsPageProps = {
	hostname: string;
	quickWins: QuickWin[];
};

function QuickWinsPage({ hostname, quickWins }: QuickWinsPageProps) {
	const displayWins = quickWins.slice(0, 6);

	return (
		<Page size="A4" style={styles.page}>
			<PageHeader hostname={hostname} />

			<Text style={styles.h2}>Quick Wins</Text>
			<Text style={styles.subtitle}>Pages ranking 10-30 ready for page 1</Text>

			{displayWins.map((qw) => (
				<View key={`${qw.url}-${qw.keyword}`} style={styles.quickWinCard}>
					<Text style={styles.quickWinUrl}>{getPathname(qw.url)}</Text>
					<Text style={styles.quickWinKeyword}>
						"{qw.keyword}" · Position #{qw.currentPosition} → Top 10
					</Text>

					{qw.aiSuggestions && (
						<View style={styles.quickWinSuggestions}>
							<Text style={[styles.label, { marginBottom: 4 }]}>
								AI Recommendations
							</Text>
							{qw.aiSuggestions.contentGaps.slice(0, 2).map((gap) => (
								<View key={gap} style={styles.suggestionItem}>
									<Text style={styles.suggestionBullet}>•</Text>
									<Text style={styles.suggestionText}>{truncate(gap, 60)}</Text>
								</View>
							))}
							{qw.aiSuggestions.questionsToAnswer.slice(0, 2).map((q) => (
								<View key={q} style={styles.suggestionItem}>
									<Text style={styles.suggestionBullet}>?</Text>
									<Text style={styles.suggestionText}>{truncate(q, 60)}</Text>
								</View>
							))}
							{qw.aiSuggestions.estimatedNewPosition && (
								<Text
									style={[styles.caption, { color: colors.teal, marginTop: 4 }]}
								>
									Estimated new position: #
									{qw.aiSuggestions.estimatedNewPosition}
								</Text>
							)}
						</View>
					)}

					{!qw.aiSuggestions && qw.suggestions.length > 0 && (
						<View style={styles.quickWinSuggestions}>
							{qw.suggestions.slice(0, 3).map((s) => (
								<View key={s} style={styles.suggestionItem}>
									<Text style={styles.suggestionBullet}>•</Text>
									<Text style={styles.suggestionText}>{truncate(s, 60)}</Text>
								</View>
							))}
						</View>
					)}
				</View>
			))}

			<PageFooter />
		</Page>
	);
}

type CompetitorPageProps = {
	hostname: string;
	competitorGaps: CompetitorGap[];
};

function CompetitorPage({ hostname, competitorGaps }: CompetitorPageProps) {
	const maxGaps = Math.max(
		...competitorGaps.map((c) => c.gapKeywords.length),
		1,
	);

	return (
		<Page size="A4" style={styles.page}>
			<PageHeader hostname={hostname} />

			<Text style={styles.h2}>Competitor Analysis</Text>
			<Text style={styles.subtitle}>Keywords they rank for that you don't</Text>

			{competitorGaps.map((comp) => (
				<View key={comp.competitor} style={styles.competitorCard}>
					<View style={styles.competitorHeader}>
						<Text style={styles.competitorDomain}>{comp.competitor}</Text>
						<Text style={styles.competitorCount}>
							{comp.gapKeywords.length} gap keywords
						</Text>
					</View>
					<View style={styles.competitorBar}>
						<View
							style={[
								styles.competitorBarFill,
								{ width: `${(comp.gapKeywords.length / maxGaps) * 100}%` },
							]}
						/>
					</View>
					<Text style={[styles.label, { marginBottom: 6 }]}>Top Gaps</Text>
					{comp.gapKeywords.slice(0, 5).map((kw, i) => (
						<View key={`${kw.keyword}-${i}`} style={styles.suggestionItem}>
							<Text style={styles.suggestionBullet}>•</Text>
							<Text style={styles.suggestionText}>
								{kw.keyword} ({formatNumber(kw.searchVolume)}/mo)
							</Text>
						</View>
					))}
				</View>
			))}

			<PageFooter />
		</Page>
	);
}

type TechnicalIssuesPageProps = {
	hostname: string;
	issues: TechnicalIssue[];
};

function TechnicalIssuesPage({ hostname, issues }: TechnicalIssuesPageProps) {
	const highIssues = issues.filter((i) => i.severity === "high");
	const mediumIssues = issues.filter((i) => i.severity === "medium");
	const lowIssues = issues.filter((i) => i.severity === "low");

	return (
		<Page size="A4" style={styles.page}>
			<PageHeader hostname={hostname} />

			<Text style={styles.h2}>Technical Issues</Text>
			<Text style={styles.subtitle}>
				{issues.length} issues affecting SEO performance
			</Text>

			{highIssues.length > 0 && (
				<>
					<View style={styles.issueSectionHeader}>
						<Badge variant="coral">HIGH</Badge>
						<Text style={styles.issueCount}>{highIssues.length} issues</Text>
					</View>
					{highIssues.slice(0, 15).map((issue) => (
						<View key={`${issue.url}-${issue.issue}`} style={styles.issueItem}>
							<Text style={styles.issueUrl}>{getPathname(issue.url)}</Text>
							<Text style={styles.issueText}>{issue.issue}</Text>
						</View>
					))}
				</>
			)}

			{mediumIssues.length > 0 && (
				<>
					<View style={styles.issueSectionHeader}>
						<Badge variant="amber">MEDIUM</Badge>
						<Text style={styles.issueCount}>{mediumIssues.length} issues</Text>
					</View>
					{mediumIssues.slice(0, 15).map((issue) => (
						<View key={`${issue.url}-${issue.issue}`} style={styles.issueItem}>
							<Text style={styles.issueUrl}>{getPathname(issue.url)}</Text>
							<Text style={styles.issueText}>{issue.issue}</Text>
						</View>
					))}
				</>
			)}

			{lowIssues.length > 0 && (
				<>
					<View style={styles.issueSectionHeader}>
						<Badge variant="slate">LOW</Badge>
						<Text style={styles.issueCount}>{lowIssues.length} issues</Text>
					</View>
					{lowIssues.slice(0, 10).map((issue) => (
						<View key={`${issue.url}-${issue.issue}`} style={styles.issueItem}>
							<Text style={styles.issueUrl}>{getPathname(issue.url)}</Text>
							<Text style={styles.issueText}>{issue.issue}</Text>
						</View>
					))}
				</>
			)}

			<PageFooter />
		</Page>
	);
}

type LinkingIssuesPageProps = {
	hostname: string;
	internalLinkingIssues: InternalLinkingIssues;
	cannibalizationIssues: CannibalizationIssue[];
};

function LinkingIssuesPage({
	hostname,
	internalLinkingIssues,
	cannibalizationIssues,
}: LinkingIssuesPageProps) {
	const hasLinkingIssues =
		internalLinkingIssues.orphanPages.length > 0 ||
		internalLinkingIssues.underlinkedPages.length > 0;
	const hasCannibalization = cannibalizationIssues.length > 0;

	if (!hasLinkingIssues && !hasCannibalization) return null;

	return (
		<Page size="A4" style={styles.page}>
			<PageHeader hostname={hostname} />

			{hasLinkingIssues && (
				<>
					<Text style={styles.h2}>Internal Linking Issues</Text>

					{internalLinkingIssues.orphanPages.length > 0 && (
						<View style={styles.linkingSection}>
							<Text style={styles.linkingTitle}>
								Orphan Pages (0 incoming links)
							</Text>
							{internalLinkingIssues.orphanPages.slice(0, 10).map((url) => (
								<View key={url} style={styles.linkingItem}>
									<Text style={styles.linkingBullet}>•</Text>
									<Text style={styles.linkingUrl}>{getPathname(url)}</Text>
								</View>
							))}
						</View>
					)}

					{internalLinkingIssues.underlinkedPages.length > 0 && (
						<View style={styles.linkingSection}>
							<Text style={styles.linkingTitle}>
								Underlinked Pages (&lt;2 links)
							</Text>
							{internalLinkingIssues.underlinkedPages
								.slice(0, 10)
								.map((page) => (
									<View key={page.url} style={styles.linkingItem}>
										<Text style={styles.linkingBullet}>•</Text>
										<Text style={styles.linkingUrl}>
											{getPathname(page.url)}
										</Text>
										<Text style={styles.linkingCount}>
											({page.incomingLinks} links)
										</Text>
									</View>
								))}
						</View>
					)}
				</>
			)}

			{hasCannibalization && (
				<>
					<View style={styles.divider} />
					<Text style={styles.h2}>Keyword Cannibalization</Text>
					<Text style={styles.subtitle}>
						Multiple pages competing for the same keywords
					</Text>

					{cannibalizationIssues.slice(0, 5).map((issue) => (
						<View key={issue.keyword} style={styles.cannibalizationCard}>
							<Text style={styles.cannibalizationKeyword}>
								"{issue.keyword}"
							</Text>
							<View style={styles.cannibalizationMeta}>
								<Text style={styles.caption}>
									{formatNumber(issue.searchVolume)}/mo
								</Text>
								<Badge variant={issue.severity === "high" ? "coral" : "amber"}>
									{issue.severity.toUpperCase()}
								</Badge>
							</View>
							{issue.pages.slice(0, 4).map((page) => (
								<View key={page.url} style={styles.cannibalizationPage}>
									<Text style={styles.cannibalizationUrl}>
										{getPathname(page.url)}
									</Text>
									<Text style={styles.cannibalizationPosition}>
										{page.position ? `#${page.position}` : "Not ranking"}
									</Text>
								</View>
							))}
						</View>
					))}
				</>
			)}

			<PageFooter />
		</Page>
	);
}

type BriefsPageProps = {
	hostname: string;
	briefs: BriefData[];
};

function BriefsPage({ hostname, briefs }: BriefsPageProps) {
	if (briefs.length === 0) return null;

	return (
		<Page size="A4" style={styles.page}>
			<PageHeader hostname={hostname} />

			<Text style={styles.h2}>Content Briefs</Text>
			<Text style={styles.subtitle}>
				AI-generated writing guides for {briefs.length} opportunities
			</Text>

			<View style={styles.table}>
				<View style={styles.tableHeader}>
					<Text style={[styles.tableHeaderCell, { width: "25%" }]}>
						Keyword
					</Text>
					<Text style={[styles.tableHeaderCell, { width: "35%" }]}>
						Suggested Title
					</Text>
					<Text
						style={[
							styles.tableHeaderCell,
							{ width: "15%", textAlign: "right" },
						]}
					>
						Volume
					</Text>
					<Text
						style={[
							styles.tableHeaderCell,
							{ width: "10%", textAlign: "right" },
						]}
					>
						Diff
					</Text>
					<Text
						style={[
							styles.tableHeaderCell,
							{ width: "15%", textAlign: "right" },
						]}
					>
						Effort
					</Text>
				</View>
				{briefs.slice(0, 15).map((brief, i) => (
					<View
						key={brief.id}
						style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
					>
						<Text style={[styles.tableCell, styles.briefKeyword]}>
							{truncate(brief.keyword, 20)}
						</Text>
						<Text style={[styles.tableCell, styles.briefTitle]}>
							{truncate(brief.title, 35)}
						</Text>
						<Text style={[styles.tableCell, styles.briefVolume]}>
							{formatNumber(brief.searchVolume)}
						</Text>
						<Text style={[styles.tableCell, styles.briefDifficulty]}>
							{brief.difficulty}
						</Text>
						<View style={styles.briefEffort}>
							<Badge
								variant={
									brief.estimatedEffort === "Low"
										? "teal"
										: brief.estimatedEffort === "Medium"
											? "amber"
											: "coral"
								}
							>
								{brief.estimatedEffort || "-"}
							</Badge>
						</View>
					</View>
				))}
			</View>

			<View
				style={{
					marginTop: 16,
					padding: 12,
					backgroundColor: colors.surface,
					borderRadius: 6,
				}}
			>
				<Text style={styles.body}>
					Full briefs with content structure, questions to answer, and
					competitor analysis are available in your online dashboard.
				</Text>
			</View>

			<PageFooter />
		</Page>
	);
}

// =============================================================================
// Data Extraction from AuditState
// =============================================================================

function extractPdfData(state: AuditState): {
	audit: PdfAuditData;
	analysis: PdfAnalysisData;
	briefs: BriefData[];
} {
	const { components } = state;

	return {
		audit: {
			siteUrl: state.siteUrl,
			accessToken: state.accessToken,
			tier: state.tier,
			pagesFound: state.pagesFound ?? 0,
		},
		analysis: {
			healthScore: state.healthScore,
			currentRankings:
				components.rankings.status === "completed"
					? components.rankings.data
					: [],
			opportunities:
				components.opportunities.status === "completed"
					? components.opportunities.data
					: [],
			quickWins:
				components.quickWins.status === "completed"
					? components.quickWins.data
					: [],
			technicalIssues:
				components.technical.status === "completed"
					? components.technical.data
					: [],
			internalLinkingIssues:
				components.internalLinking.status === "completed"
					? components.internalLinking.data
					: { orphanPages: [], underlinkedPages: [] },
			cannibalizationIssues:
				components.cannibalization.status === "completed"
					? components.cannibalization.data
					: [],
			competitorGaps:
				components.competitors.status === "completed"
					? components.competitors.data.gaps
					: [],
			actionPlan: state.actionPlan ?? [],
		},
		briefs:
			components.briefs.status === "completed" ? components.briefs.data : [],
	};
}

// =============================================================================
// Main Document
// =============================================================================

type AuditPdfDocumentProps = {
	audit: PdfAuditData;
	analysis: PdfAnalysisData;
	briefs: BriefData[];
};

function AuditPdfDocument({ audit, analysis, briefs }: AuditPdfDocumentProps) {
	const hostname = extractHostname(audit.siteUrl);
	const isFreeTier = audit.tier === "FREE";
	const isScanTier = audit.tier === "SCAN";
	const showCompetitors = !isFreeTier && !isScanTier;
	const showOpportunities = !isFreeTier;
	const showQuickWins = !isFreeTier && analysis.quickWins.length > 0;
	const showActionPlan =
		!isFreeTier && analysis.actionPlan && analysis.actionPlan.length > 0;
	const showBriefs = !isFreeTier && briefs.length > 0;

	// Calculate number of opportunity pages needed
	const oppPages = Math.ceil(analysis.opportunities.length / 20);

	return (
		<Document>
			{/* Page 1: Cover */}
			<CoverPage audit={audit} analysis={analysis} isFreeTier={isFreeTier} />

			{/* Page 2: Health Breakdown */}
			{analysis.healthScore && (
				<HealthBreakdownPage
					hostname={hostname}
					healthScore={analysis.healthScore}
					isFreeTier={isFreeTier}
				/>
			)}

			{/* Page 3: Action Plan */}
			{showActionPlan && analysis.actionPlan && (
				<ActionPlanPage hostname={hostname} actions={analysis.actionPlan} />
			)}

			{/* Pages 4+: Opportunities */}
			{showOpportunities &&
				analysis.opportunities.length > 0 &&
				Array.from({ length: Math.min(oppPages, 2) }, (_, i) => (
					<OpportunitiesPage
						key={`opp-page-${i + 1}`}
						hostname={hostname}
						opportunities={analysis.opportunities}
						pageNumber={i + 1}
					/>
				))}

			{/* Quick Wins */}
			{showQuickWins && (
				<QuickWinsPage hostname={hostname} quickWins={analysis.quickWins} />
			)}

			{/* Competitor Analysis */}
			{showCompetitors && analysis.competitorGaps.length > 0 && (
				<CompetitorPage
					hostname={hostname}
					competitorGaps={analysis.competitorGaps}
				/>
			)}

			{/* Technical Issues */}
			{analysis.technicalIssues.length > 0 && (
				<TechnicalIssuesPage
					hostname={hostname}
					issues={analysis.technicalIssues}
				/>
			)}

			{/* Linking & Cannibalization */}
			<LinkingIssuesPage
				hostname={hostname}
				internalLinkingIssues={analysis.internalLinkingIssues}
				cannibalizationIssues={analysis.cannibalizationIssues}
			/>

			{/* Briefs */}
			{showBriefs && <BriefsPage hostname={hostname} briefs={briefs} />}
		</Document>
	);
}

// =============================================================================
// Export Function
// =============================================================================

export async function downloadAuditPdf(state: AuditState): Promise<void> {
	const { audit, analysis, briefs } = extractPdfData(state);

	const blob = await pdf(
		<AuditPdfDocument audit={audit} analysis={analysis} briefs={briefs} />,
	).toBlob();

	const hostname = extractHostname(audit.siteUrl);
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `unranked-${hostname}-${Date.now()}.pdf`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
