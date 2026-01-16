import type { AuditTier } from "../schemas/audit.js";

// ============================================================================
// Component Definitions
// ============================================================================

export const COMPONENTS = {
	crawl: { phase: "Crawl", phaseRunning: "Discovering pages" },
	technical: { phase: "Technical", phaseRunning: "Checking technical SEO" },
	internalLinking: { phase: null, phaseRunning: null },
	duplicateContent: { phase: null, phaseRunning: null },
	redirectChains: { phase: null, phaseRunning: null },
	aiReadiness: {
		phase: "AI Readiness",
		phaseRunning: "Analyzing AI readiness",
	},
	rankings: { phase: "Rankings", phaseRunning: "Analyzing rankings" },
	opportunities: {
		phase: "Opportunities",
		phaseRunning: "Finding opportunities",
	},
	quickWins: { phase: null, phaseRunning: null },
	competitors: { phase: null, phaseRunning: null },
	snippets: { phase: null, phaseRunning: null },
	briefs: { phase: null, phaseRunning: null }, // On-demand, not part of pipeline
} as const;

export type ComponentId = keyof typeof COMPONENTS;

// ============================================================================
// Tier Configuration
// ============================================================================

export type TierLimits = {
	pages: number;
	competitors: number;
	briefs: number; // Max briefs user can generate (on-demand)
	seeds: number;
	pdfExport: boolean;
};

export type TierConfig = {
	name: string;
	price: number;
	components: ComponentId[];
	limits: TierLimits;
	features: string[];
};

export const UNLIMITED = -1;

export const TIERS: Record<AuditTier, TierConfig> = {
	FREE: {
		name: "Technical",
		price: 0,
		components: [
			"crawl",
			"technical",
			"internalLinking",
			"duplicateContent",
			"redirectChains",
			"aiReadiness",
		],
		limits: {
			pages: 25,
			competitors: 0,
			briefs: 0,
			seeds: 0,
			pdfExport: false,
		},
		features: [
			"25 pages crawled",
			"Technical issues only",
			"Internal linking audit",
			"AI readiness check",
		],
	},
	SCAN: {
		name: "Scan",
		price: 9,
		components: [
			"crawl",
			"technical",
			"internalLinking",
			"duplicateContent",
			"redirectChains",
			"aiReadiness",
			"rankings",
			"opportunities",
			"quickWins",
			"competitors",
			"snippets",
			"briefs",
		],
		limits: { pages: 50, competitors: 1, briefs: 1, seeds: 3, pdfExport: true },
		features: [
			"50 pages crawled",
			"All keyword opportunities",
			"1 competitor analysis",
			"1 AI content brief",
			"PDF export",
		],
	},
	AUDIT: {
		name: "Audit",
		price: 29,
		components: [
			"crawl",
			"technical",
			"internalLinking",
			"duplicateContent",
			"redirectChains",
			"aiReadiness",
			"rankings",
			"opportunities",
			"quickWins",
			"competitors",
			"snippets",
			"briefs",
		],
		limits: {
			pages: 200,
			competitors: 3,
			briefs: 5,
			seeds: 5,
			pdfExport: true,
		},
		features: [
			"200 pages crawled",
			"All keyword opportunities",
			"5 AI content briefs",
			"3 competitor analysis",
			"PDF export",
		],
	},
	DEEP_DIVE: {
		name: "Deep Dive",
		price: 49,
		components: [
			"crawl",
			"technical",
			"internalLinking",
			"duplicateContent",
			"redirectChains",
			"aiReadiness",
			"rankings",
			"opportunities",
			"quickWins",
			"competitors",
			"snippets",
			"briefs",
		],
		limits: {
			pages: 500,
			competitors: 5,
			briefs: 15,
			seeds: 10,
			pdfExport: true,
		},
		features: [
			"500 pages crawled",
			"All keyword opportunities",
			"15 AI content briefs",
			"5 competitor analysis",
			"PDF export",
		],
	},
};

// ============================================================================
// New Site Boosts
// ============================================================================

const NEW_SITE_BOOSTS: Record<AuditTier, Partial<TierLimits>> = {
	FREE: {}, // No boosts for FREE
	SCAN: { briefs: 2, seeds: 0 },
	AUDIT: { briefs: 8, seeds: 0 },
	DEEP_DIVE: { seeds: 0 },
};

// ============================================================================
// Derived Helpers
// ============================================================================

export type PhaseInfo = {
	id: ComponentId;
	label: string;
	runningLabel: string;
};

/**
 * Get components for a tier, optionally adjusted for new sites.
 * New sites skip quickWins (requires existing rankings to optimize).
 */
export function getComponents(
	tier: AuditTier,
	isNewSite = false,
): ComponentId[] {
	const components = TIERS[tier].components;
	return isNewSite ? components.filter((c) => c !== "quickWins") : components;
}

/**
 * Get displayable phases for a tier (components with phase labels).
 */
export function getPhases(tier: AuditTier): PhaseInfo[] {
	const phases: PhaseInfo[] = [];
	for (const c of TIERS[tier].components) {
		const comp = COMPONENTS[c];
		if (comp.phase !== null && comp.phaseRunning !== null) {
			phases.push({
				id: c,
				label: comp.phase,
				runningLabel: comp.phaseRunning,
			});
		}
	}
	return phases;
}

/**
 * Get effective limits for a tier, adjusted for new sites.
 * New sites get boosted briefs/competitors since seeds/quickWins are wasted.
 */
export function getLimits(tier: AuditTier, isNewSite = false): TierLimits {
	const base = TIERS[tier].limits;
	if (!isNewSite) return base;
	return { ...base, ...NEW_SITE_BOOSTS[tier] };
}

/**
 * Check if a component is included in a tier.
 */
export function hasComponent(
	tier: AuditTier,
	component: ComponentId,
	isNewSite = false,
): boolean {
	return getComponents(tier, isNewSite).includes(component);
}
