import { cn } from "@/lib/utils";

type SpinnerProps = {
	size?: "sm" | "md" | "lg";
	className?: string;
};

const sizeClasses = {
	sm: "w-4 h-4 border-2",
	md: "w-6 h-6 border-2",
	lg: "w-8 h-8 border-3",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
	return (
		<div
			className={cn(
				"rounded-full border-border border-t-accent animate-spin",
				sizeClasses[size],
				className,
			)}
		/>
	);
}

type LoadingScreenProps = {
	message?: string;
};

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
	return (
		<div className="min-h-screen bg-canvas flex items-center justify-center">
			<div className="flex flex-col items-center gap-4">
				<Spinner size="lg" />
				<p className="text-text-secondary text-sm">{message}</p>
			</div>
		</div>
	);
}
