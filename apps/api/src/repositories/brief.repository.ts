import { db } from "../lib/db.js";

export type CreateBriefInput = {
	auditId: string;
	keyword: string;
	searchVolume: number;
	difficulty: number;
	title: string;
	structure: unknown;
	questions: string[];
	relatedKw: string[];
	competitors?: unknown;
	suggestedInternalLinks?: string[];
	clusteredKeywords: string[];
	totalClusterVolume: number;
	intent?: string;
};

export function createBrief(input: CreateBriefInput) {
	return db.brief.create({
		data: {
			auditId: input.auditId,
			keyword: input.keyword,
			searchVolume: input.searchVolume,
			difficulty: input.difficulty,
			title: input.title,
			structure: input.structure as object,
			questions: input.questions,
			relatedKw: input.relatedKw,
			competitors: input.competitors as object | undefined,
			suggestedInternalLinks: input.suggestedInternalLinks ?? [],
			clusteredKeywords: input.clusteredKeywords,
			totalClusterVolume: input.totalClusterVolume,
			intent: input.intent,
		},
	});
}

export function createManyBriefs(inputs: CreateBriefInput[]) {
	return db.brief.createMany({
		data: inputs.map((input) => ({
			auditId: input.auditId,
			keyword: input.keyword,
			searchVolume: input.searchVolume,
			difficulty: input.difficulty,
			title: input.title,
			structure: input.structure as object,
			questions: input.questions,
			relatedKw: input.relatedKw,
			competitors: input.competitors as object | undefined,
			suggestedInternalLinks: input.suggestedInternalLinks ?? [],
			clusteredKeywords: input.clusteredKeywords,
			totalClusterVolume: input.totalClusterVolume,
			intent: input.intent,
		})),
	});
}

export function getBriefById(id: string) {
	return db.brief.findUnique({
		where: { id },
	});
}

export function getBriefsByAuditId(auditId: string) {
	return db.brief.findMany({
		where: { auditId },
		orderBy: { searchVolume: "desc" },
	});
}
