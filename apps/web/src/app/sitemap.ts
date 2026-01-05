import { competitorSlugs } from "@/content/comparisons/competitors";
import type { MetadataRoute } from "next";

const BASE_URL = "https://unranked.io";

export default function sitemap(): MetadataRoute.Sitemap {
	const comparisonPages = competitorSlugs.map((slug) => ({
		url: `${BASE_URL}/vs/${slug}`,
		lastModified: new Date(),
		changeFrequency: "monthly" as const,
		priority: 0.8,
	}));

	return [
		{
			url: BASE_URL,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 1,
		},
		{
			url: `${BASE_URL}/audit/new`,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.9,
		},
		...comparisonPages,
		{
			url: `${BASE_URL}/privacy`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.3,
		},
		{
			url: `${BASE_URL}/terms`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.3,
		},
	];
}
