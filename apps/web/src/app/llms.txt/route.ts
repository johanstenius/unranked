export function GET() {
	const content = `# Unranked - SEO Audit Tool
> One-time purchase SEO audits. No subscription.

Unranked crawls websites, finds keyword gaps vs competitors, and generates AI content briefs with prioritized opportunities.

## What Unranked Does
- Crawls your site (up to 500 pages)
- Analyzes technical SEO issues
- Finds keywords you're missing vs competitors
- Identifies quick wins (keywords you almost rank for)
- Generates AI-powered content briefs
- Checks AI bot accessibility (robots.txt analysis)

## Pricing (One-Time, No Subscription)
- Free Check: Technical audit, 10 pages
- Scan (€29): 50 pages, keyword gaps, 1 brief
- Audit (€79): 200 pages, competitor analysis, 5 briefs
- Deep Dive (€149): 500 pages, full analysis, unlimited briefs

## Key Pages
- /audit/new - Start a new SEO audit
- /vs/semrush - Comparison with Semrush
- /vs/ahrefs - Comparison with Ahrefs
- /vs/screaming-frog - Comparison with Screaming Frog

## Contact
Website: https://unranked.io
`;

	return new Response(content, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, max-age=86400",
		},
	});
}
