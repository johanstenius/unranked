import { ImageResponse } from "next/og";

export const runtime = "edge";

// Image metadata
export const alt = "Unranked - SEO for Founders & Agencies";
export const size = {
	width: 1200,
	height: 630,
};

export const contentType = "image/png";

export default async function Image() {
	// We can load custom fonts here if needed, but for now we'll use system fonts
	// or a standard fetch if sticking to the robust "minimal" look.
	// Using standard sans-serif for speed and reliability in this first pass.

	return new ImageResponse(
		<div
			style={{
				background: "white",
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: 80,
			}}
		>
			{/* Brand Header */}
			<div style={{ display: "flex", alignItems: "center", gap: 20 }}>
				<div
					style={{
						width: 50,
						height: 50,
						background: "black",
						color: "white",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: 30,
						fontWeight: 800,
						borderRadius: 8,
					}}
				>
					U
				</div>
				<div
					style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}
				>
					UNRANKED
				</div>
			</div>

			{/* Main Title */}
			<div style={{ display: "flex", flexDirection: "column" }}>
				<div
					style={{
						fontSize: 90,
						fontWeight: 800,
						letterSpacing: "-0.04em",
						lineHeight: 0.9,
					}}
				>
					Identify gaps.
				</div>
				<div
					style={{
						fontSize: 90,
						fontWeight: 800,
						letterSpacing: "-0.04em",
						lineHeight: 0.9,
						color: "#999",
					}}
				>
					Outrank them.
				</div>
			</div>

			{/* Footer Stats */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					borderTop: "2px solid black",
					paddingTop: 40,
					alignItems: "flex-end",
				}}
			>
				{/* Stat 1 */}
				<div style={{ display: "flex", flexDirection: "column" }}>
					<div
						style={{
							fontSize: 16,
							color: "#666",
							fontWeight: 600,
							textTransform: "uppercase",
							marginBottom: 4,
						}}
					>
						Built For
					</div>
					<div
						style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em" }}
					>
						Founders & Agencies
					</div>
				</div>

				{/* Stat 2 */}
				<div style={{ display: "flex", flexDirection: "column" }}>
					<div
						style={{
							fontSize: 16,
							color: "#666",
							fontWeight: 600,
							textTransform: "uppercase",
							marginBottom: 4,
						}}
					>
						Pricing
					</div>
					<div
						style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em" }}
					>
						One-Time Payment
					</div>
				</div>
			</div>
		</div>,
		{
			...size,
		},
	);
}
