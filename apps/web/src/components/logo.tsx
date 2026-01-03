type LogoProps = {
	size?: number;
	className?: string;
};

export function Logo({ size = 20, className = "" }: LogoProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 512 512"
			fill="none"
			className={className}
			aria-hidden="true"
		>
			{/* Rounded square background */}
			<rect
				x="16"
				y="16"
				width="480"
				height="480"
				rx="80"
				className="fill-text-primary"
			/>
			{/* Diagonal slash - uses mask to cut through */}
			<path d="M100 412 L144 412 L412 100 L368 100 Z" className="fill-canvas" />
		</svg>
	);
}
