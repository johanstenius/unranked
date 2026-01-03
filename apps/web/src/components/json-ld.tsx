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
			urlTemplate: `${BASE_URL}/analyze?site={search_term_string}`,
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
	aggregateRating: {
		"@type": "AggregateRating",
		ratingValue: "4.8",
		ratingCount: "12",
	},
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
		</>
	);
}
