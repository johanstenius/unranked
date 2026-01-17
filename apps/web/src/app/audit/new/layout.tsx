import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Free SEO Audit Tool - Find Keyword Gaps",
	description:
		"Run a free SEO audit on your website. Find keyword gaps, technical issues, and get AI content briefs. No subscription required.",
	openGraph: {
		title: "Free SEO Audit Tool - Unranked",
		description:
			"Run a free SEO audit on your website. Find keyword gaps, technical issues, and get AI content briefs. No subscription required.",
	},
};

export default function AuditNewLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
