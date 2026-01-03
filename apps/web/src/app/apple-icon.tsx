import { ImageResponse } from "next/og";

export const size = {
	width: 180,
	height: 180,
};
export const contentType = "image/png";

export default function Icon() {
	return new ImageResponse(
		<div
			style={{
				fontSize: 120,
				background: "black",
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				color: "white",
				// Apple adds its own rounding, but we can provide a square or slightly rounded base
			}}
		>
			<div
				style={{
					marginTop: -10,
					fontWeight: 900,
					fontFamily: "sans-serif",
					letterSpacing: "-0.05em",
				}}
			>
				U
			</div>
		</div>,
		{
			...size,
		},
	);
}
