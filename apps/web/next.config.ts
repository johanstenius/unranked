import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactStrictMode: true,
	async redirects() {
		return [
			{
				source: "/check",
				destination: "/audit/new?tier=FREE",
				permanent: true,
			},
			{
				source: "/analyze",
				destination: "/audit/new",
				permanent: true,
			},
		];
	},
};

export default nextConfig;
