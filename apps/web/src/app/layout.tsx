import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { JsonLd } from "@/components/json-ld";
import { ThemeProvider } from "@/components/theme-provider";

const BASE_URL = "https://unranked.io";

export const metadata: Metadata = {
	metadataBase: new URL(BASE_URL),
	title: {
		default: "Unranked - SEO Audit Tool",
		template: "%s | Unranked",
	},
	description:
		"Find keyword gaps, get AI content briefs, and improve your rankings. Full SEO audit with prioritized opportunities. One-time purchase, no subscription.",
	keywords: [
		"seo audit tool",
		"keyword gap analysis",
		"content audit",
		"ai content brief",
		"competitor seo analysis",
		"seo opportunities",
		"content strategy",
	],
	authors: [{ name: "Unranked" }],
	creator: "Unranked",
	publisher: "Unranked",
	openGraph: {
		type: "website",
		locale: "en_US",
		url: BASE_URL,
		siteName: "Unranked",
		title: "Unranked - SEO Audit Tool",
		description:
			"Find keyword gaps, get AI content briefs, and improve your rankings. Full SEO audit with prioritized opportunities.",
	},
	twitter: {
		card: "summary_large_image",
		title: "Unranked - SEO Audit Tool",
		description:
			"Find keyword gaps, get AI content briefs, and improve your rankings. Full SEO audit with prioritized opportunities.",
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<JsonLd />
			</head>
			<body className="antialiased">
				<ThemeProvider>{children}</ThemeProvider>
				<Analytics />
			</body>
		</html>
	);
}
