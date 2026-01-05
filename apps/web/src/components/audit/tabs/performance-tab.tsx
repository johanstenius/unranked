"use client";

import type { CWVPageResult, CoreWebVitalsData } from "@/lib/types";
import { CWVCard } from "../cwv-card";

type PerformanceTabProps = {
	data: CoreWebVitalsData | null;
	streamingPages: CWVPageResult[];
	isAnalyzing: boolean;
};

export function PerformanceTab({
	data,
	streamingPages,
	isAnalyzing,
}: PerformanceTabProps) {
	return (
		<CWVCard
			data={data}
			streamingPages={streamingPages}
			isAnalyzing={isAnalyzing}
		/>
	);
}
