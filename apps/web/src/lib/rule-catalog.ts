/**
 * SEO Rule Catalog
 *
 * Provides explanations and sources for technical SEO issues.
 * Only includes non-obvious rules that benefit from explanation.
 */

type RuleInfo = {
	description: string;
	source?: { label: string; url: string };
};

/**
 * Catalog of rule explanations keyed by issue text prefix.
 * Match is done via startsWith() for flexibility with dynamic values.
 */
const RULE_CATALOG: Record<string, RuleInfo> = {
	// Title issues
	"Title too long": {
		description:
			"Google typically displays 50-60 characters of a title in search results. Longer titles get truncated with ellipsis, potentially cutting off important information.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/appearance/title-link",
		},
	},
	"Title may be truncated": {
		description:
			"Titles in this range may be partially cut off in search results depending on pixel width. Consider keeping key information near the beginning.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/appearance/title-link",
		},
	},
	"Duplicate title": {
		description:
			"Multiple pages with identical titles make it harder for Google to understand which page is most relevant for a query, and confuse users in search results.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/appearance/title-link#page-titles",
		},
	},

	// Meta description issues
	"Meta description too long": {
		description:
			"Google typically shows ~155-160 characters of meta descriptions. Longer descriptions get truncated, though Google may choose different snippets based on the query.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/appearance/snippet",
		},
	},
	"Meta description may be truncated": {
		description:
			"Descriptions in this range may be partially cut off. The visible length varies by device and Google may rewrite snippets entirely based on the search query.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/appearance/snippet",
		},
	},
	"Missing meta description": {
		description:
			"Without a meta description, Google generates a snippet from page content. You lose control over how your page appears in search results.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/appearance/snippet#meta-descriptions",
		},
	},

	// Content issues
	"Thin content": {
		description:
			"Pages with little substantive content may be seen as low-quality by Google. Consider whether the page provides enough value to warrant indexing.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
		},
	},
	"Very thin content": {
		description:
			"Extremely short pages often provide insufficient value for searchers. Consider consolidating with related content or expanding significantly.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
		},
	},
	"Short content": {
		description:
			"While word count isn't a ranking factor, comprehensive content often performs better. Ensure the page fully addresses the topic.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
		},
	},
	"Content too complex": {
		description:
			"High reading level can reduce accessibility. Consider simpler language, shorter sentences, and clearer structure for broader audience reach.",
	},

	// Structured data
	"No structured data": {
		description:
			"Structured data (JSON-LD) helps Google understand page content and can enable rich results like FAQ snippets, breadcrumbs, and article info.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
		},
	},
	"Missing BreadcrumbList": {
		description:
			"BreadcrumbList schema helps Google understand site hierarchy and can display breadcrumb navigation in search results for better click-through.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/appearance/structured-data/breadcrumb",
		},
	},

	// Technical SEO
	"Missing canonical": {
		description:
			"Without a canonical URL, Google chooses which version to index if duplicate content exists. Self-referencing canonicals are a best practice.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/crawling-indexing/canonicalization",
		},
	},
	"Missing viewport": {
		description:
			"The viewport meta tag is essential for mobile-friendly pages. Google uses mobile-first indexing, so this affects how your site is crawled and ranked.",
		source: {
			label: "web.dev",
			url: "https://web.dev/articles/responsive-web-design-basics#viewport",
		},
	},
	"Missing robots.txt": {
		description:
			"While not required, robots.txt helps manage crawler access and crawl budget. It's a standard practice for production sites.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/crawling-indexing/robots/intro",
		},
	},
	"Missing XML sitemap": {
		description:
			"Sitemaps help Google discover pages, especially for large sites or pages with few internal links. Recommended for most sites.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview",
		},
	},

	// Heading issues
	"Multiple H1": {
		description:
			"While HTML5 allows multiple H1s, a single H1 per page is clearer for users and search engines. Google can handle multiple H1s but recommends a logical structure.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide#use-headings",
		},
	},
	"No H2 headings": {
		description:
			"H2 subheadings help organize content and improve scanability. They also help Google understand page structure and topic coverage.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide#use-headings",
		},
	},
	"Skipped heading level": {
		description:
			"Skipping from H1 to H3 breaks the logical document outline. While not a ranking factor, proper hierarchy aids accessibility and comprehension.",
	},

	// Internal linking
	"Orphan page": {
		description:
			"Pages with no internal links pointing to them are harder for Google to discover and may be seen as less important in your site hierarchy.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/crawling-indexing/links-crawlable",
		},
	},
	"Underlinked page": {
		description:
			"Pages with few internal links receive less 'link equity' and may be harder for users and crawlers to discover. Consider adding relevant internal links.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide#use-links-wisely",
		},
	},

	// Duplicate content
	"Near duplicate content": {
		description:
			"Very similar content across pages can dilute ranking signals. Consider consolidating pages or using canonical tags to indicate the primary version.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/crawling-indexing/canonicalization",
		},
	},
	"Exact duplicate content": {
		description:
			"Identical content on multiple URLs wastes crawl budget and splits ranking signals. Use canonical tags or 301 redirects to consolidate.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/crawling-indexing/canonicalization",
		},
	},

	// Redirects
	"Redirect chain": {
		description:
			"Multiple redirects in sequence slow page loading and may cause Googlebot to stop following after several hops. Link directly to final URLs.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/crawling-indexing/http-network-errors#redirect-errors",
		},
	},

	// Images
	"image(s) missing alt": {
		description:
			"Alt text helps Google understand image content and improves accessibility for screen reader users. Describe the image concisely.",
		source: {
			label: "Google Search Central",
			url: "https://developers.google.com/search/docs/appearance/google-images#descriptive-alt-text",
		},
	},
	"No images": {
		description:
			"Visual content can improve engagement and help explain concepts. Consider adding relevant images, diagrams, or screenshots.",
	},
};

/**
 * Find rule info by matching issue text against catalog keys.
 * Uses prefix matching for flexibility with dynamic values in issue text.
 */
export function getRuleInfo(issue: string): RuleInfo | null {
	// Direct prefix match
	for (const [prefix, info] of Object.entries(RULE_CATALOG)) {
		if (issue.startsWith(prefix)) {
			return info;
		}
	}

	// Lowercase fallback for case variations
	const lowerIssue = issue.toLowerCase();
	for (const [prefix, info] of Object.entries(RULE_CATALOG)) {
		if (lowerIssue.startsWith(prefix.toLowerCase())) {
			return info;
		}
	}

	return null;
}
