import { createLogger } from "../../lib/logger.js";
import { clusterKeywordsWithAI } from "../ai/anthropic.js";
import type { Opportunity } from "./analysis.js";

const log = createLogger("clustering");

const MAX_KEYWORDS_PER_CLUSTER = 10;

export type KeywordCluster = {
	primaryKeyword: string;
	keywords: string[];
	totalVolume: number;
	opportunities: Opportunity[];
};

export async function clusterKeywords(
	opportunities: Opportunity[],
): Promise<KeywordCluster[]> {
	if (opportunities.length === 0) {
		return [];
	}

	if (opportunities.length === 1) {
		const single = opportunities[0];
		if (single) return [createSingleKeywordCluster(single)];
		return [];
	}

	try {
		const keywordsWithVolume = opportunities.map((o) => ({
			keyword: o.keyword,
			searchVolume: o.searchVolume,
		}));

		const clusterAssignments = await clusterKeywordsWithAI(keywordsWithVolume);

		return buildClustersFromAssignments(opportunities, clusterAssignments);
	} catch (error) {
		log.error({ error }, "AI clustering failed, using fallback");
		return opportunities.map(createSingleKeywordCluster);
	}
}

function createSingleKeywordCluster(opp: Opportunity): KeywordCluster {
	return {
		primaryKeyword: opp.keyword,
		keywords: [opp.keyword],
		totalVolume: opp.searchVolume,
		opportunities: [opp],
	};
}

function buildClustersFromAssignments(
	opportunities: Opportunity[],
	assignments: Array<{ keywords: string[] }>,
): KeywordCluster[] {
	const oppByKeyword = new Map(opportunities.map((o) => [o.keyword, o]));
	const clusters: KeywordCluster[] = [];

	for (const assignment of assignments) {
		const clusterOpps = assignment.keywords
			.slice(0, MAX_KEYWORDS_PER_CLUSTER)
			.map((kw) => oppByKeyword.get(kw))
			.filter((o): o is Opportunity => o !== undefined);

		if (clusterOpps.length === 0) continue;

		const primary = clusterOpps.reduce((max, o) =>
			o.searchVolume > max.searchVolume ? o : max,
		);

		const totalVolume = clusterOpps.reduce((sum, o) => sum + o.searchVolume, 0);

		clusters.push({
			primaryKeyword: primary.keyword,
			keywords: clusterOpps.map((o) => o.keyword),
			totalVolume,
			opportunities: clusterOpps,
		});
	}

	const assignedKeywords = new Set(assignments.flatMap((a) => a.keywords));
	const unassigned = opportunities.filter(
		(o) => !assignedKeywords.has(o.keyword),
	);

	for (const opp of unassigned) {
		clusters.push(createSingleKeywordCluster(opp));
	}

	return clusters.sort((a, b) => b.totalVolume - a.totalVolume);
}
