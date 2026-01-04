import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: ["/audit/"],
		},
		sitemap: "https://unranked.io/sitemap.xml",
	};
}
