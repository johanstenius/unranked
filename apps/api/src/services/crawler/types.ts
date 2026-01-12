export type CrawledPage = {
	url: string;
	title: string | null | undefined;
	h1: string | null | undefined;
	content: string | null | undefined;
	wordCount: number;
	section: string;
	outboundLinks: string[];
	readabilityScore: number | null;
	codeBlockCount: number;
	imageCount: number;
	codeBlocks: string[];
	// Enhanced SEO signals
	metaDescription?: string | null;
	canonicalUrl?: string | null;
	ogTitle?: string | null;
	ogDescription?: string | null;
	ogImage?: string | null;
	h1Count?: number;
	h2s?: string[];
	h3s?: string[];
	imagesWithoutAlt?: number;
	hasSchemaOrg?: boolean;
	schemaTypes?: string[];
	hasViewport?: boolean;
};

export type SectionInfo = {
	path: string;
	pageCount: number;
	contentScore: number;
};

export type DiscoverEvent =
	| { type: "sitemap"; totalUrls: number }
	| { type: "sections"; sections: Array<{ path: string; pageCount: number }> }
	| { type: "scored"; section: SectionInfo }
	| { type: "done" };

export type BrokenLink = {
	sourceUrl: string;
	targetUrl: string;
	statusCode?: number;
};

export type RedirectChain = {
	originalUrl: string;
	finalUrl: string;
	hops: number;
	chain: string[];
};

export type CrawlResult = {
	pages: CrawledPage[];
	sections: SectionInfo[];
	errors: Array<{ url: string; error: string }>;
	brokenLinks: BrokenLink[];
	redirectChains: RedirectChain[];
	sitemapUrlCount: number;
	hasRobotsTxt: boolean;
	hasSitemap: boolean;
	robotsTxtContent: string | null;
	hasLlmsTxt: boolean;
};

export type DiscoverResult = {
	sections: SectionInfo[];
	totalUrls: number;
};
