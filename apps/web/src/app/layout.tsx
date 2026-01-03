import type { Metadata } from "next";
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
	icons: {
		icon: [
			{ url: "/favicon.ico", sizes: "any" },
			{ url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
			{ url: "/favicon-64x64.png", sizes: "64x64", type: "image/png" },
		],
		apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
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
		images: [
			{
				url: "/og-image.png",
				width: 1200,
				height: 630,
				alt: "Unranked - SEO Audit Tool",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Unranked - SEO Audit Tool",
		description:
			"Find keyword gaps, get AI content briefs, and improve your rankings. Full SEO audit with prioritized opportunities.",
		images: ["/og-image.png"],
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
			</body>
		</html>
	);
}
