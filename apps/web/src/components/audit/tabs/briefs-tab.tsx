"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { BriefData, ComponentState } from "@/lib/types";
import { getDifficultyColor, getDifficultyLabel } from "@/lib/utils";
import Link from "next/link";

type BriefsTabProps = {
	briefs: ComponentState<BriefData[]>;
	auditToken: string;
};

export function BriefsTab({ briefs, auditToken }: BriefsTabProps) {
	if (briefs.status === "pending" || briefs.status === "running") {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="font-display text-lg">Content Briefs</CardTitle>
					<CardDescription>Generating content briefs...</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (briefs.status === "failed") {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="font-display text-lg">Content Briefs</CardTitle>
					<CardDescription className="text-status-crit">
						{briefs.error}
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const briefsList = briefs.data;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-lg">Content Briefs</CardTitle>
				<CardDescription>Detailed instructions for new content</CardDescription>
			</CardHeader>
			<CardContent>
				{briefsList.length === 0 ? (
					<p className="text-muted-foreground">No briefs generated</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Keyword</TableHead>
								<TableHead>Volume</TableHead>
								<TableHead>Difficulty</TableHead>
								<TableHead>Effort</TableHead>
								<TableHead />
							</TableRow>
						</TableHeader>
						<TableBody>
							{briefsList.map((brief) => (
								<TableRow key={brief.id}>
									<TableCell className="font-medium">{brief.keyword}</TableCell>
									<TableCell>{brief.searchVolume.toLocaleString()}</TableCell>
									<TableCell>
										<span className={getDifficultyColor(brief.difficulty)}>
											{getDifficultyLabel(brief.difficulty)}
										</span>
									</TableCell>
									<TableCell className="text-muted-foreground">
										{brief.estimatedEffort ?? "—"}
									</TableCell>
									<TableCell className="text-right">
										<Link
											href={`/audit/${auditToken}/brief/${brief.id}`}
											className="text-accent hover:underline"
										>
											View Brief →
										</Link>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
