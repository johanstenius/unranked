import { ImageResponse } from "next/og";

// Image metadata - Google requires at least 48x48
export const size = {
	width: 48,
	height: 48,
};
export const contentType = "image/png";

// Generate the image
export default function Icon() {
	return new ImageResponse(
		// ImageResponse JSX element
		<div
			style={{
				fontSize: 24,
				background: "black",
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				color: "white",
				borderRadius: 6, // 20% radius approx
			}}
		>
			<div
				style={{
					marginTop: -2, // Optical alignment
					fontWeight: 800,
					fontFamily: "sans-serif",
				}}
			>
				U
			</div>
		</div>,
		// ImageResponse options
		{
			// For convenience, we can re-use the exported icons size metadata
			// config to also set the ImageResponse's width and height.
			...size,
		},
	);
}
