/**
 * Competitor data for comparison pages
 *
 * IMPORTANT: Keep this data factually accurate and up-to-date.
 * Pricing and features should be verified periodically.
 * Last full review: January 2026
 */

export const PRICING_DISCLAIMER =
	"Competitor pricing shown may change. Visit their websites for current rates.";

export type CompetitorFeature = {
	name: string;
	unranked: string | boolean;
	competitor: string | boolean;
};

export type Competitor = {
	slug: string;
	name: string;
	website: string;
	tagline: string;
	description: string;
	pricingModel: "subscription" | "one-time" | "freemium";
	startingPrice: string;
	priceNote: string;
	bestFor: string[];
	features: CompetitorFeature[];
	differentiators: string[];
	lastVerified: string;
};

export const competitors: Record<string, Competitor> = {
	semrush: {
		slug: "semrush",
		name: "Semrush",
		website: "https://www.semrush.com",
		tagline: "All-in-one marketing toolkit",
		description:
			"Semrush is a comprehensive digital marketing platform offering SEO, PPC, content marketing, and competitive research tools. It's widely used by agencies and enterprise teams.",
		pricingModel: "subscription",
		startingPrice: "$139.95/month",
		priceNote:
			"Pro plan, billed monthly. Annual billing available at discount.",
		bestFor: [
			"Marketing agencies",
			"Enterprise SEO teams",
			"PPC management",
			"Comprehensive competitive analysis",
		],
		features: [
			{ name: "Site audit", unranked: true, competitor: true },
			{
				name: "Keyword research",
				unranked: "Via opportunities",
				competitor: true,
			},
			{ name: "Rank tracking", unranked: false, competitor: true },
			{ name: "Backlink analysis", unranked: false, competitor: true },
			{
				name: "Content briefs",
				unranked: "AI-generated",
				competitor: "SEO Writing Assistant",
			},
			{
				name: "Competitor analysis",
				unranked: "Gap analysis",
				competitor: "Comprehensive",
			},
			{ name: "PPC tools", unranked: false, competitor: true },
			{ name: "Social media tools", unranked: false, competitor: true },
			{ name: "One-time purchase", unranked: true, competitor: false },
		],
		differentiators: [
			"Unranked offers one-time pricing vs monthly subscription",
			"Unranked focuses specifically on actionable SEO opportunities",
			"Semrush provides broader marketing toolkit including PPC and social",
			"Unranked includes AI content briefs in all paid plans",
		],
		lastVerified: "2026-01",
	},

	ahrefs: {
		slug: "ahrefs",
		name: "Ahrefs",
		website: "https://ahrefs.com",
		tagline: "SEO tools and resources",
		description:
			"Ahrefs is known for its extensive backlink database and powerful SEO toolset. Popular among SEO professionals for link building and competitive research.",
		pricingModel: "subscription",
		startingPrice: "$108/month",
		priceNote: "Lite plan, billed annually. Monthly billing higher.",
		bestFor: [
			"Link building campaigns",
			"Backlink analysis",
			"SEO professionals",
			"Content gap analysis",
		],
		features: [
			{ name: "Site audit", unranked: true, competitor: true },
			{
				name: "Keyword research",
				unranked: "Via opportunities",
				competitor: true,
			},
			{ name: "Rank tracking", unranked: false, competitor: true },
			{
				name: "Backlink analysis",
				unranked: false,
				competitor: "Industry-leading",
			},
			{ name: "Content briefs", unranked: "AI-generated", competitor: false },
			{
				name: "Competitor analysis",
				unranked: "Gap analysis",
				competitor: true,
			},
			{ name: "Content explorer", unranked: false, competitor: true },
			{ name: "One-time purchase", unranked: true, competitor: false },
		],
		differentiators: [
			"Unranked offers one-time pricing vs monthly subscription",
			"Ahrefs has industry-leading backlink database",
			"Unranked provides AI-generated content briefs",
			"Ahrefs offers ongoing rank tracking",
		],
		lastVerified: "2026-01",
	},

	"screaming-frog": {
		slug: "screaming-frog",
		name: "Screaming Frog",
		website: "https://www.screamingfrog.co.uk/seo-spider/",
		tagline: "SEO Spider tool",
		description:
			"Screaming Frog SEO Spider is a desktop website crawler used for technical SEO audits. It's an industry standard for finding technical issues.",
		pricingModel: "freemium",
		startingPrice: "Free (500 URLs)",
		priceNote: "Paid license £199/€245/$279 per year for unlimited crawling.",
		bestFor: [
			"Technical SEO audits",
			"Large site crawling",
			"Custom extraction",
			"Technical SEO professionals",
		],
		features: [
			{
				name: "Site crawling",
				unranked: "Cloud-based",
				competitor: "Desktop app",
			},
			{ name: "Technical issues", unranked: true, competitor: true },
			{ name: "Custom extraction", unranked: false, competitor: true },
			{ name: "Keyword opportunities", unranked: true, competitor: false },
			{ name: "Content briefs", unranked: "AI-generated", competitor: false },
			{ name: "JavaScript rendering", unranked: true, competitor: true },
			{ name: "API integrations", unranked: false, competitor: true },
			{
				name: "One-time purchase",
				unranked: true,
				competitor: "Annual license",
			},
		],
		differentiators: [
			"Unranked is cloud-based, Screaming Frog is a desktop application",
			"Unranked includes keyword opportunity discovery",
			"Screaming Frog offers more advanced custom extraction",
			"Unranked provides AI content briefs for opportunities",
		],
		lastVerified: "2026-01",
	},

	ubersuggest: {
		slug: "ubersuggest",
		name: "Ubersuggest",
		website: "https://neilpatel.com/ubersuggest/",
		tagline: "SEO tool by Neil Patel",
		description:
			"Ubersuggest is an SEO tool offering keyword research, site audits, and competitor analysis. Known for its accessible pricing and beginner-friendly interface.",
		pricingModel: "subscription",
		startingPrice: "From $12/month",
		priceNote: "Individual plan. Lifetime deals available from $120.",
		bestFor: [
			"Beginners to SEO",
			"Small businesses",
			"Keyword research",
			"Budget-conscious users",
		],
		features: [
			{ name: "Site audit", unranked: true, competitor: true },
			{
				name: "Keyword research",
				unranked: "Via opportunities",
				competitor: true,
			},
			{ name: "Rank tracking", unranked: false, competitor: true },
			{ name: "Backlink data", unranked: false, competitor: true },
			{
				name: "Content briefs",
				unranked: "AI-generated",
				competitor: "AI Writer add-on",
			},
			{
				name: "Competitor analysis",
				unranked: "Gap analysis",
				competitor: true,
			},
			{ name: "Chrome extension", unranked: false, competitor: true },
			{
				name: "One-time purchase",
				unranked: true,
				competitor: "Lifetime deal sometimes",
			},
		],
		differentiators: [
			"Unranked offers guaranteed one-time pricing",
			"Ubersuggest includes rank tracking in subscription",
			"Unranked focuses on prioritized, actionable opportunities",
			"Ubersuggest offers broader ongoing SEO monitoring",
		],
		lastVerified: "2026-01",
	},

	seoptimer: {
		slug: "seoptimer",
		name: "SEOptimer",
		website: "https://www.seoptimer.com",
		tagline: "SEO audit and reporting tool",
		description:
			"SEOptimer provides SEO audits and white-label reporting. Popular with agencies for client reporting and quick site assessments.",
		pricingModel: "subscription",
		startingPrice: "$29/month",
		priceNote: "DIY SEO plan. White-label plans from $39/month.",
		bestFor: [
			"Quick SEO audits",
			"Agency reporting",
			"White-label reports",
			"Client presentations",
		],
		features: [
			{ name: "Site audit", unranked: true, competitor: true },
			{ name: "Keyword tracking", unranked: false, competitor: true },
			{ name: "White-label reports", unranked: false, competitor: true },
			{ name: "Keyword opportunities", unranked: true, competitor: "Limited" },
			{ name: "Content briefs", unranked: "AI-generated", competitor: false },
			{
				name: "Competitor analysis",
				unranked: "Gap analysis",
				competitor: "Basic",
			},
			{ name: "Embeddable widget", unranked: false, competitor: true },
			{ name: "One-time purchase", unranked: true, competitor: false },
		],
		differentiators: [
			"Unranked offers one-time pricing vs monthly subscription",
			"SEOptimer specializes in white-label agency reporting",
			"Unranked provides deeper keyword opportunity analysis",
			"Unranked includes AI content briefs",
		],
		lastVerified: "2026-01",
	},

	"surfer-seo": {
		slug: "surfer-seo",
		name: "Surfer SEO",
		website: "https://surferseo.com",
		tagline: "Content optimization platform",
		description:
			"Surfer SEO specializes in content optimization using NLP and SERP analysis. Popular for creating content that ranks based on top-performing pages.",
		pricingModel: "subscription",
		startingPrice: "$99/month",
		priceNote: "Essential plan, billed monthly. $79/month if billed annually.",
		bestFor: [
			"Content optimization",
			"On-page SEO",
			"Content writers",
			"SEO content strategy",
		],
		features: [
			{ name: "Site audit", unranked: true, competitor: "Limited" },
			{ name: "Content editor", unranked: false, competitor: true },
			{ name: "SERP analyzer", unranked: false, competitor: true },
			{
				name: "Keyword research",
				unranked: "Via opportunities",
				competitor: true,
			},
			{
				name: "Content briefs",
				unranked: "AI-generated",
				competitor: "AI-powered",
			},
			{ name: "Technical SEO", unranked: true, competitor: "Limited" },
			{ name: "NLP optimization", unranked: false, competitor: true },
			{ name: "One-time purchase", unranked: true, competitor: false },
		],
		differentiators: [
			"Unranked offers one-time pricing vs monthly subscription",
			"Surfer SEO specializes in real-time content optimization",
			"Unranked provides comprehensive technical SEO audit",
			"Surfer offers NLP-based content scoring",
		],
		lastVerified: "2026-01",
	},
};

export const competitorSlugs = Object.keys(competitors);

export function getCompetitor(slug: string): Competitor | undefined {
	return competitors[slug];
}
