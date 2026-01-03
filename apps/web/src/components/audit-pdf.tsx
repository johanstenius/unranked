"use client";

import type { Analysis, Audit, Brief, HealthScore } from "@/lib/types";
import { extractHostname, getPathname } from "@/lib/utils";
import {
	Document,
	Page,
	StyleSheet,
	Text,
	View,
	pdf,
} from "@react-pdf/renderer";

// Colors matching Unranked brand
const colors = {
	primary: "#0f172a",
	secondary: "#64748b",
	accent: "#0f172a",
	good: "#2dd4bf",
	warning: "#f59e0b",
	bad: "#f87171",
	background: "#f8fafc",
	border: "#e2e8f0",
	white: "#ffffff",
};

const styles = StyleSheet.create({
	page: {
		padding: 40,
		fontFamily: "Helvetica",
		fontSize: 10,
		color: colors.primary,
	},
	// Header
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 30,
		paddingBottom: 15,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	logo: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	logoBox: {
		width: 14,
		height: 14,
		backgroundColor: colors.primary,
		borderRadius: 2,
	},
	logoText: {
		fontSize: 16,
		fontFamily: "Helvetica-Bold",
	},
	headerRight: {
		textAlign: "right",
	},
	siteUrl: {
		fontSize: 12,
		fontFamily: "Helvetica-Bold",
	},
	date: {
		fontSize: 9,
		color: colors.secondary,
		marginTop: 2,
	},
	// Health Score
	scoreSection: {
		alignItems: "center",
		marginBottom: 30,
		padding: 25,
		backgroundColor: colors.background,
		borderRadius: 8,
	},
	scoreNumber: {
		fontSize: 48,
		fontFamily: "Helvetica-Bold",
	},
	scoreLabel: {
		fontSize: 12,
		color: colors.secondary,
		marginTop: 4,
	},
	gradeBadge: {
		marginTop: 8,
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 12,
	},
	gradeText: {
		fontSize: 10,
		fontFamily: "Helvetica-Bold",
		textTransform: "uppercase",
	},
	// Stats grid
	statsGrid: {
		flexDirection: "row",
		gap: 12,
		marginBottom: 30,
	},
	statBox: {
		flex: 1,
		padding: 15,
		backgroundColor: colors.background,
		borderRadius: 6,
		alignItems: "center",
	},
	statNumber: {
		fontSize: 24,
		fontFamily: "Helvetica-Bold",
	},
	statLabel: {
		fontSize: 8,
		color: colors.secondary,
		marginTop: 4,
		textTransform: "uppercase",
	},
	// Section headers
	sectionTitle: {
		fontSize: 14,
		fontFamily: "Helvetica-Bold",
		marginBottom: 12,
		marginTop: 20,
	},
	// Tables
	table: {
		marginBottom: 20,
	},
	tableHeader: {
		flexDirection: "row",
		backgroundColor: colors.background,
		padding: 8,
		borderTopLeftRadius: 4,
		borderTopRightRadius: 4,
	},
	tableHeaderCell: {
		fontSize: 8,
		fontFamily: "Helvetica-Bold",
		color: colors.secondary,
		textTransform: "uppercase",
	},
	tableRow: {
		flexDirection: "row",
		padding: 8,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
	},
	tableRowAlt: {
		backgroundColor: colors.background,
	},
	tableCell: {
		fontSize: 9,
	},
	// Column widths
	colKeyword: { width: "35%" },
	colVolume: { width: "15%", textAlign: "right" },
	colDifficulty: { width: "15%", textAlign: "right" },
	colImpact: { width: "15%", textAlign: "right" },
	colBadge: { width: "20%", textAlign: "right" },
	// Badges
	badge: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		fontSize: 7,
		fontFamily: "Helvetica-Bold",
	},
	badgeQuickWin: {
		backgroundColor: "#dcfce7",
		color: "#166534",
	},
	badgeHigh: {
		backgroundColor: "#fef2f2",
		color: "#991b1b",
	},
	badgeMedium: {
		backgroundColor: "#fefce8",
		color: "#854d0e",
	},
	// Issue section header
	issueSectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
		marginTop: 10,
	},
	issueSectionHeaderMedium: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
		marginTop: 15,
	},
	issueCount: {
		marginLeft: 8,
		fontSize: 10,
		color: "#64748b",
	},
	// Issues
	issueItem: {
		flexDirection: "row",
		padding: 8,
		borderBottomWidth: 1,
		borderBottomColor: colors.border,
		gap: 10,
	},
	issueUrl: {
		fontSize: 8,
		color: colors.secondary,
		width: "40%",
	},
	issueText: {
		fontSize: 9,
		flex: 1,
	},
	// Footer
	footer: {
		position: "absolute",
		bottom: 30,
		left: 40,
		right: 40,
		flexDirection: "row",
		justifyContent: "space-between",
		fontSize: 8,
		color: colors.secondary,
	},
	pageNumber: {
		fontSize: 8,
		color: colors.secondary,
	},
});

function getGradeColor(grade: HealthScore["grade"]): string {
	switch (grade) {
		case "excellent":
			return colors.good;
		case "good":
			return colors.warning;
		case "needs_work":
			return colors.warning;
		case "poor":
			return colors.bad;
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

type AuditPdfDocumentProps = {
	audit: Audit;
	analysis: Analysis;
	briefs: Brief[];
};

function AuditPdfDocument({ audit, analysis, briefs }: AuditPdfDocumentProps) {
	const hostname = extractHostname(audit.siteUrl);
	const healthScore = analysis.healthScore;
	const topOpportunities = analysis.opportunities.slice(0, 10);
	const topQuickWins = analysis.quickWins.slice(0, 5);
	const highIssues = analysis.technicalIssues.filter(
		(i) => i.severity === "high",
	);
	const mediumIssues = analysis.technicalIssues.filter(
		(i) => i.severity === "medium",
	);

	return (
		<Document>
			{/* Page 1: Summary */}
			<Page size="A4" style={styles.page}>
				<View style={styles.header}>
					<View style={styles.logo}>
						<View style={styles.logoBox} />
						<Text style={styles.logoText}>Unranked</Text>
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
						<Text style={styles.scoreLabel}>Health Score</Text>
						<View
							style={[
								styles.gradeBadge,
								{ backgroundColor: `${getGradeColor(healthScore.grade)}20` },
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
					<View style={styles.statBox}>
						<Text style={styles.statNumber}>
							{analysis.currentRankings.length}
						</Text>
						<Text style={styles.statLabel}>Rankings</Text>
					</View>
					<View style={styles.statBox}>
						<Text style={[styles.statNumber, { color: colors.good }]}>
							{analysis.opportunities.length}
						</Text>
						<Text style={styles.statLabel}>Opportunities</Text>
					</View>
					<View style={styles.statBox}>
						<Text style={[styles.statNumber, { color: colors.bad }]}>
							{analysis.technicalIssues.length}
						</Text>
						<Text style={styles.statLabel}>Issues</Text>
					</View>
				</View>

				{briefs.length > 0 && (
					<>
						<Text style={styles.sectionTitle}>Content Briefs Generated</Text>
						<View style={styles.table}>
							<View style={styles.tableHeader}>
								<Text style={[styles.tableHeaderCell, { width: "50%" }]}>
									Keyword
								</Text>
								<Text
									style={[
										styles.tableHeaderCell,
										{ width: "25%", textAlign: "right" },
									]}
								>
									Volume
								</Text>
								<Text
									style={[
										styles.tableHeaderCell,
										{ width: "25%", textAlign: "right" },
									]}
								>
									Effort
								</Text>
							</View>
							{briefs.slice(0, 5).map((brief, i) => (
								<View
									key={brief.id}
									style={
										i % 2 === 1
											? [styles.tableRow, styles.tableRowAlt]
											: styles.tableRow
									}
								>
									<Text style={[styles.tableCell, { width: "50%" }]}>
										{brief.keyword}
									</Text>
									<Text
										style={[
											styles.tableCell,
											{ width: "25%", textAlign: "right" },
										]}
									>
										{brief.searchVolume.toLocaleString()}
									</Text>
									<Text
										style={[
											styles.tableCell,
											{ width: "25%", textAlign: "right" },
										]}
									>
										{brief.estimatedEffort || "-"}
									</Text>
								</View>
							))}
						</View>
					</>
				)}

				<View style={styles.footer}>
					<Text>Generated by Unranked</Text>
					<Text style={styles.pageNumber}>1</Text>
				</View>
			</Page>

			{/* Page 2: Opportunities */}
			{topOpportunities.length > 0 && (
				<Page size="A4" style={styles.page}>
					<Text style={styles.sectionTitle}>Top Opportunities</Text>
					<View style={styles.table}>
						<View style={styles.tableHeader}>
							<Text style={[styles.tableHeaderCell, styles.colKeyword]}>
								Keyword
							</Text>
							<Text style={[styles.tableHeaderCell, styles.colVolume]}>
								Volume
							</Text>
							<Text style={[styles.tableHeaderCell, styles.colDifficulty]}>
								Difficulty
							</Text>
							<Text style={[styles.tableHeaderCell, styles.colImpact]}>
								Impact
							</Text>
							<Text style={[styles.tableHeaderCell, styles.colBadge]} />
						</View>
						{topOpportunities.map((opp, i) => (
							<View
								key={opp.keyword}
								style={
									i % 2 === 1
										? [styles.tableRow, styles.tableRowAlt]
										: styles.tableRow
								}
							>
								<Text style={[styles.tableCell, styles.colKeyword]}>
									{opp.keyword}
								</Text>
								<Text style={[styles.tableCell, styles.colVolume]}>
									{opp.searchVolume.toLocaleString()}
								</Text>
								<Text style={[styles.tableCell, styles.colDifficulty]}>
									{opp.difficulty}
								</Text>
								<Text style={[styles.tableCell, styles.colImpact]}>
									{opp.impactScore.toFixed(1)}
								</Text>
								<View style={styles.colBadge}>
									{opp.isQuickWin && (
										<Text style={[styles.badge, styles.badgeQuickWin]}>
											Quick Win
										</Text>
									)}
								</View>
							</View>
						))}
					</View>

					{topQuickWins.length > 0 && (
						<>
							<Text style={styles.sectionTitle}>Quick Wins</Text>
							<View style={styles.table}>
								<View style={styles.tableHeader}>
									<Text style={[styles.tableHeaderCell, { width: "40%" }]}>
										Page
									</Text>
									<Text style={[styles.tableHeaderCell, { width: "30%" }]}>
										Keyword
									</Text>
									<Text
										style={[
											styles.tableHeaderCell,
											{ width: "15%", textAlign: "right" },
										]}
									>
										Position
									</Text>
									<Text
										style={[
											styles.tableHeaderCell,
											{ width: "15%", textAlign: "right" },
										]}
									>
										Target
									</Text>
								</View>
								{topQuickWins.map((qw, i) => (
									<View
										key={`${qw.url}-${qw.keyword}`}
										style={
											i % 2 === 1
												? [styles.tableRow, styles.tableRowAlt]
												: styles.tableRow
										}
									>
										<Text style={[styles.tableCell, { width: "40%" }]}>
											{getPathname(qw.url)}
										</Text>
										<Text style={[styles.tableCell, { width: "30%" }]}>
											{qw.keyword}
										</Text>
										<Text
											style={[
												styles.tableCell,
												{ width: "15%", textAlign: "right" },
											]}
										>
											#{qw.currentPosition}
										</Text>
										<Text
											style={[
												styles.tableCell,
												{
													width: "15%",
													textAlign: "right",
													color: colors.good,
												},
											]}
										>
											Top 10
										</Text>
									</View>
								))}
							</View>
						</>
					)}

					<View style={styles.footer}>
						<Text>Generated by Unranked</Text>
						<Text style={styles.pageNumber}>2</Text>
					</View>
				</Page>
			)}

			{/* Page 3: Technical Issues */}
			{analysis.technicalIssues.length > 0 && (
				<Page size="A4" style={styles.page}>
					<Text style={styles.sectionTitle}>Technical Issues</Text>

					{highIssues.length > 0 && (
						<>
							<View style={styles.issueSectionHeader}>
								<Text style={[styles.badge, styles.badgeHigh]}>HIGH</Text>
								<Text style={styles.issueCount}>
									{highIssues.length} issues
								</Text>
							</View>
							{highIssues.slice(0, 10).map((issue) => (
								<View
									key={`high-${issue.url}-${issue.issue}`}
									style={styles.issueItem}
								>
									<Text style={styles.issueUrl}>{getPathname(issue.url)}</Text>
									<Text style={styles.issueText}>{issue.issue}</Text>
								</View>
							))}
						</>
					)}

					{mediumIssues.length > 0 && (
						<>
							<View style={styles.issueSectionHeaderMedium}>
								<Text style={[styles.badge, styles.badgeMedium]}>MEDIUM</Text>
								<Text style={styles.issueCount}>
									{mediumIssues.length} issues
								</Text>
							</View>
							{mediumIssues.slice(0, 10).map((issue) => (
								<View
									key={`medium-${issue.url}-${issue.issue}`}
									style={styles.issueItem}
								>
									<Text style={styles.issueUrl}>{getPathname(issue.url)}</Text>
									<Text style={styles.issueText}>{issue.issue}</Text>
								</View>
							))}
						</>
					)}

					<View style={styles.footer}>
						<Text>Generated by Unranked</Text>
						<Text style={styles.pageNumber}>3</Text>
					</View>
				</Page>
			)}
		</Document>
	);
}

export async function downloadAuditPdf(
	audit: Audit,
	analysis: Analysis,
	briefs: Brief[],
): Promise<void> {
	const blob = await pdf(
		<AuditPdfDocument audit={audit} analysis={analysis} briefs={briefs} />,
	).toBlob();

	const hostname = extractHostname(audit.siteUrl);
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `rankaudit-${hostname}-${Date.now()}.pdf`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
