import { AUDIT_STATUS, AUDIT_TIER } from "@/lib/admin-types";

const STATUS_COLORS: Record<string, string> = {
	[AUDIT_STATUS.PENDING]: "bg-yellow-500/20 text-yellow-400",
	[AUDIT_STATUS.CRAWLING]: "bg-blue-500/20 text-blue-400",
	[AUDIT_STATUS.ANALYZING]: "bg-blue-500/20 text-blue-400",
	[AUDIT_STATUS.GENERATING_BRIEFS]: "bg-blue-500/20 text-blue-400",
	[AUDIT_STATUS.RETRYING]: "bg-orange-500/20 text-orange-400",
	[AUDIT_STATUS.COMPLETED]: "bg-green-500/20 text-green-400",
	[AUDIT_STATUS.FAILED]: "bg-red-500/20 text-red-400",
};

const TIER_COLORS: Record<string, string> = {
	[AUDIT_TIER.FREE]: "bg-gray-500/20 text-gray-400",
	[AUDIT_TIER.SCAN]: "bg-purple-500/20 text-purple-400",
	[AUDIT_TIER.AUDIT]: "bg-indigo-500/20 text-indigo-400",
	[AUDIT_TIER.DEEP_DIVE]: "bg-pink-500/20 text-pink-400",
};

export function StatusBadge({ status }: { status: string }) {
	return (
		<span
			className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[status] ?? "bg-gray-500/20 text-gray-400"}`}
		>
			{status}
		</span>
	);
}

export function TierBadge({ tier }: { tier: string }) {
	return (
		<span
			className={`px-2 py-1 rounded text-xs font-medium ${TIER_COLORS[tier] ?? "bg-gray-500/20 text-gray-400"}`}
		>
			{tier}
		</span>
	);
}
