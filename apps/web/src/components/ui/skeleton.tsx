import { cn } from "@/lib/utils";

type SkeletonProps = {
	className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
	return (
		<div
			className={cn(
				"rounded bg-gradient-to-r from-subtle via-border to-subtle bg-[length:200%_100%] animate-shimmer",
				className,
			)}
		/>
	);
}

export function SkeletonText({ className }: SkeletonProps) {
	return <Skeleton className={cn("h-4 w-full", className)} />;
}

export function SkeletonCard({ className }: SkeletonProps) {
	return (
		<div
			className={cn("border border-border rounded-lg p-6 space-y-4", className)}
		>
			<Skeleton className="h-6 w-1/3" />
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-4 w-2/3" />
		</div>
	);
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
	return (
		<div className="space-y-3">
			<div className="flex gap-4 pb-3 border-b border-border">
				<Skeleton className="h-4 w-1/4" />
				<Skeleton className="h-4 w-1/6" />
				<Skeleton className="h-4 w-1/6" />
				<Skeleton className="h-4 w-1/6" />
			</div>
			{Array.from({ length: rows }).map((_, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton rows never reorder
					key={i}
					className="flex gap-4 py-3"
				>
					<Skeleton className="h-4 w-1/4" />
					<Skeleton className="h-4 w-1/6" />
					<Skeleton className="h-4 w-1/6" />
					<Skeleton className="h-4 w-1/6" />
				</div>
			))}
		</div>
	);
}
