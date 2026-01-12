/**
 * useAuditState - Single source of truth for audit data
 *
 * Design principles:
 * 1. REST for initial hydration - fetch current state on mount
 * 2. SSE for live updates - events carry data directly
 * 3. Idempotent updates - same event applied twice = same result
 * 4. Single state object - no fragmented state variables
 */

import { getAuditState, subscribeToAudit } from "@/lib/api";
import type { AuditSSEEvent, AuditState } from "@/lib/types";
import { useEffect, useState } from "react";

type UseAuditStateReturn = {
	state: AuditState | null;
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
};

/**
 * Apply an SSE event to the audit state (idempotent)
 */
function applyEvent(state: AuditState, event: AuditSSEEvent): AuditState {
	switch (event.type) {
		case "audit:status":
			return { ...state, status: event.status };

		case "component:start":
			return {
				...state,
				components: {
					...state.components,
					[event.key]: { status: "running" },
				},
			};

		case "component:complete": {
			const newState = {
				...state,
				components: {
					...state.components,
					[event.key]: { status: "completed", data: event.data },
				},
			};
			// Derive isNewSite when rankings complete
			if (event.key === "rankings" && Array.isArray(event.data)) {
				newState.isNewSite = event.data.length === 0;
			}
			return newState;
		}

		case "component:fail":
			return {
				...state,
				components: {
					...state.components,
					[event.key]: { status: "failed", error: event.error },
				},
			};

		case "crawl:pages":
			return {
				...state,
				pagesFound: event.count,
				sitemapUrlCount: event.sitemapCount ?? state.sitemapUrlCount,
			};

		case "health:score":
			return { ...state, healthScore: event.score };

		case "clusters":
			return { ...state, opportunityClusters: event.data };

		case "action-plan":
			return { ...state, actionPlan: event.data };

		// Interactive flow events
		case "interactive:phase":
			return { ...state, interactivePhase: event.phase };

		case "interactive:competitor_suggestions":
			return {
				...state,
				suggestedCompetitors: event.suggestions,
				interactivePhase: "competitor_selection",
			};

		case "interactive:cluster_suggestions":
			return {
				...state,
				suggestedClusters: event.clusters,
				interactivePhase: "cluster_selection",
			};

		case "interactive:crawl_complete":
			return { ...state, crawlComplete: true };

		case "interactive:waiting_for_crawl":
			return { ...state, interactivePhase: "generating" };

		case "audit:complete":
			return { ...state, status: "COMPLETED" };

		case "audit:error":
			return { ...state, status: "FAILED" };

		default:
			return state;
	}
}

/**
 * Hook to manage unified audit state
 */
export function useAuditState(token: string): UseAuditStateReturn {
	const [state, setState] = useState<AuditState | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	async function refetch() {
		try {
			const freshState = await getAuditState(token);
			setState(freshState);
		} catch (err) {
			console.error("[useAuditState] Refetch failed:", err);
		}
	}

	useEffect(() => {
		let unsubscribe: (() => void) | null = null;

		async function init() {
			try {
				// 1. Fetch initial state (hydration)
				const initialState = await getAuditState(token);
				setState(initialState);
				setLoading(false);

				// 2. If not complete, subscribe to updates
				if (
					initialState.status !== "COMPLETED" &&
					initialState.status !== "FAILED"
				) {
					unsubscribe = subscribeToAudit(
						token,
						(event) => {
							setState((prev) => (prev ? applyEvent(prev, event) : prev));
						},
						(err) => {
							console.error("[useAuditState] SSE error:", err);
						},
					);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load audit");
				setLoading(false);
			}
		}

		init();

		return () => {
			unsubscribe?.();
		};
	}, [token]);

	return { state, loading, error, refetch };
}
