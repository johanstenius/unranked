import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Start SEO Audit",
	description:
		"Enter your website URL to get a full SEO audit with keyword opportunities, competitor analysis, and AI content briefs.",
	openGraph: {
		title: "Start Your SEO Audit - Unranked",
		description:
			"Enter your website URL to get a full SEO audit with keyword opportunities, competitor analysis, and AI content briefs.",
	},
};

export default function AnalyzeLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
