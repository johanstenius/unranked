import type {
	AuditTier,
	HealthScoreBreakdown,
	HealthScoreGrade,
} from "./types";

// Tier/pricing configuration
export type TierInfo = {
	name: string;
	price: number;
	pages: number;
	opportunities: number | "all";
	briefs: number | "unlimited";
	competitors: number;
	pdfExport: boolean;
	features: string[];
};

export const tierInfo: Record<AuditTier, TierInfo> = {
	FREE: {
		name: "Free",
		price: 0,
		pages: 50,
		opportunities: 0,
		briefs: 0,
		competitors: 0,
		pdfExport: false,
		features: [
			"50 pages crawled",
			"Technical SEO audit",
			"Internal linking audit",
			"Content quality checks",
		],
	},
	SCAN: {
		name: "Scan",
		price: 9,
		pages: 50,
		opportunities: "all",
		briefs: 1,
		competitors: 0,
		pdfExport: true,
		features: [
			"50 pages crawled",
			"All keyword opportunities",
			"1 AI content brief",
			"PDF export",
		],
	},
	AUDIT: {
		name: "Audit",
		price: 29,
		pages: 200,
		opportunities: "all",
		briefs: 5,
		competitors: 1,
		pdfExport: true,
		features: [
			"200 pages crawled",
			"All keyword opportunities",
			"5 AI content briefs",
			"1 competitor analysis",
			"PDF export",
		],
	},
	DEEP_DIVE: {
		name: "Deep Dive",
		price: 49,
		pages: 500,
		opportunities: "all",
		briefs: "unlimited",
		competitors: 3,
		pdfExport: true,
		features: [
			"500 pages crawled",
			"All keyword opportunities",
			"Unlimited AI briefs",
			"3 competitor analysis",
			"PDF export",
		],
	},
};

// Health score grade configuration
export type GradeConfig = {
	label: string;
	color: string;
	bgColor: string;
	barColor: string;
};

export const GRADE_CONFIG: Record<HealthScoreGrade, GradeConfig> = {
	excellent: {
		label: "Excellent",
		color: "text-[#2dd4bf]",
		bgColor: "bg-[#2dd4bf]/15",
		barColor: "bg-[#2dd4bf]",
	},
	good: {
		label: "Good",
		color: "text-[#f59e0b]",
		bgColor: "bg-[#f59e0b]/15",
		barColor: "bg-[#f59e0b]",
	},
	needs_work: {
		label: "Needs Work",
		color: "text-[#f59e0b]",
		bgColor: "bg-[#f59e0b]/15",
		barColor: "bg-[#f59e0b]",
	},
	poor: {
		label: "Poor",
		color: "text-[#f87171]",
		bgColor: "bg-[#f87171]/15",
		barColor: "bg-[#f87171]",
	},
};

// Health score breakdown labels
export const BREAKDOWN_LABELS: Record<keyof HealthScoreBreakdown, string> = {
	opportunityDiscovery: "Opportunities Found",
	rankingCoverage: "Ranking Coverage",
	positionQuality: "Position Quality",
	technicalHealth: "Technical Health",
	internalLinking: "Internal Linking",
	contentOpportunity: "Content Opportunity",
};

// Snippet type configuration
export type SnippetTypeConfig = {
	icon: string;
	label: string;
	bg: string;
	text: string;
	border: string;
};

export const SNIPPET_TYPE_CONFIG: Record<
	"paragraph" | "list" | "table" | "video",
	SnippetTypeConfig
> = {
	paragraph: {
		icon: "¶",
		label: "Paragraph",
		bg: "bg-blue-500/10 dark:bg-blue-400/15",
		text: "text-blue-600 dark:text-blue-400",
		border: "border-blue-200 dark:border-blue-500/30",
	},
	list: {
		icon: "☰",
		label: "List",
		bg: "bg-emerald-500/10 dark:bg-emerald-400/15",
		text: "text-emerald-600 dark:text-emerald-400",
		border: "border-emerald-200 dark:border-emerald-500/30",
	},
	table: {
		icon: "⊞",
		label: "Table",
		bg: "bg-violet-500/10 dark:bg-violet-400/15",
		text: "text-violet-600 dark:text-violet-400",
		border: "border-violet-200 dark:border-violet-500/30",
	},
	video: {
		icon: "▶",
		label: "Video",
		bg: "bg-rose-500/10 dark:bg-rose-400/15",
		text: "text-rose-600 dark:text-rose-400",
		border: "border-rose-200 dark:border-rose-500/30",
	},
};

// Score thresholds
export const SCORE_THRESHOLDS = {
	good: 70,
	warning: 40,
} as const;

export const DIFFICULTY_THRESHOLDS = {
	low: 30,
	medium: 60,
} as const;

// Billing disabled in prod until LemonSqueezy approved
export const billingEnabled = process.env.NODE_ENV !== "production";
