import Script from "next/script";

const BASE_URL = "https://unranked.io";

const organizationSchema = {
	"@context": "https://schema.org",
	"@type": "Organization",
	name: "Unranked",
	url: BASE_URL,
	logo: `${BASE_URL}/logo.png`,
	description:
		"SEO audit tool that finds what you're not ranking for. Keyword gaps, AI content briefs, and prioritized opportunities.",
	sameAs: [],
};

const websiteSchema = {
	"@context": "https://schema.org",
	"@type": "WebSite",
	name: "Unranked",
	url: BASE_URL,
	description:
		"Find keyword gaps, get AI content briefs, and improve your rankings.",
	potentialAction: {
		"@type": "SearchAction",
		target: {
			"@type": "EntryPoint",
			urlTemplate: `${BASE_URL}/audit/new?site={search_term_string}`,
		},
		"query-input": "required name=search_term_string",
	},
};

const productSchema = {
	"@context": "https://schema.org",
	"@type": "SoftwareApplication",
	name: "Unranked",
	applicationCategory: "BusinessApplication",
	operatingSystem: "Web",
	description:
		"SEO audit tool with keyword gap analysis, AI content briefs, and prioritized opportunities.",
	offers: {
		"@type": "AggregateOffer",
		priceCurrency: "EUR",
		lowPrice: "29",
		highPrice: "149",
		offerCount: "3",
	},
};

const howToSchema = {
	"@context": "https://schema.org",
	"@type": "HowTo",
	name: "How to Run an SEO Audit with Unranked",
	description:
		"Find keyword gaps and SEO opportunities for your website in minutes.",
	totalTime: "PT5M",
	tool: {
		"@type": "HowToTool",
		name: "Unranked SEO Audit Tool",
	},
	step: [
		{
			"@type": "HowToStep",
			name: "Enter your website URL",
			text: "Go to unranked.io/audit/new and enter the URL of the website you want to audit.",
			url: `${BASE_URL}/audit/new`,
		},
		{
			"@type": "HowToStep",
			name: "Choose your audit plan",
			text: "Select from Free (technical check), Scan (€29), Audit (€79), or Deep Dive (€149) based on your needs.",
		},
		{
			"@type": "HowToStep",
			name: "Add your email",
			text: "Enter your email address to receive the audit report when it's ready.",
		},
		{
			"@type": "HowToStep",
			name: "Review your SEO opportunities",
			text: "Get a full report with keyword gaps, technical issues, quick wins, and AI-generated content briefs.",
		},
	],
};

const faqSchema = {
	"@context": "https://schema.org",
	"@type": "FAQPage",
	mainEntity: [
		{
			"@type": "Question",
			name: "What is Unranked?",
			acceptedAnswer: {
				"@type": "Answer",
				text: "Unranked is an SEO audit tool that crawls your website, finds keyword gaps compared to competitors, and generates AI-powered content briefs. It's a one-time purchase with no subscription required.",
			},
		},
		{
			"@type": "Question",
			name: "How does Unranked find keyword opportunities?",
			acceptedAnswer: {
				"@type": "Answer",
				text: "Unranked crawls your site, analyzes your existing content, and compares it against competitor rankings to find keywords you're missing. It also identifies 'quick wins' - keywords where you're close to ranking on page one.",
			},
		},
		{
			"@type": "Question",
			name: "Is Unranked a subscription service?",
			acceptedAnswer: {
				"@type": "Answer",
				text: "No. Unranked is a one-time purchase. You pay once per audit and get lifetime access to your report. No recurring fees or subscriptions.",
			},
		},
		{
			"@type": "Question",
			name: "What's included in the free SEO check?",
			acceptedAnswer: {
				"@type": "Answer",
				text: "The free check includes a technical audit of up to 10 pages, covering issues like missing meta tags, broken links, redirect chains, and AI bot accessibility analysis.",
			},
		},
	],
};

export function JsonLd() {
	return (
		<>
			<Script
				id="org-schema"
				type="application/ld+json"
				strategy="beforeInteractive"
			>
				{JSON.stringify(organizationSchema)}
			</Script>
			<Script
				id="website-schema"
				type="application/ld+json"
				strategy="beforeInteractive"
			>
				{JSON.stringify(websiteSchema)}
			</Script>
			<Script
				id="product-schema"
				type="application/ld+json"
				strategy="beforeInteractive"
			>
				{JSON.stringify(productSchema)}
			</Script>
			<Script
				id="faq-schema"
				type="application/ld+json"
				strategy="beforeInteractive"
			>
				{JSON.stringify(faqSchema)}
			</Script>
			<Script
				id="howto-schema"
				type="application/ld+json"
				strategy="beforeInteractive"
			>
				{JSON.stringify(howToSchema)}
			</Script>
		</>
	);
}
