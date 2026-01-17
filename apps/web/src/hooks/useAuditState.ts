/**
 * useAuditState - Single source of truth for audit data
 *
 * Design principles:
 * 1. REST for initial hydration - fetch current state on mount
 * 2. Polling for live updates - poll every 3s while in progress
 * 3. Single state object - no fragmented state variables
 */

import { getAuditState } from "@/lib/api";
import type { AuditState } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL = 3000;

type UseAuditStateReturn = {
	state: AuditState | null;
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
};

function isAuditComplete(status: string): boolean {
	return status === "COMPLETED" || status === "FAILED";
}

/**
 * Hook to manage unified audit state
 */
export function useAuditState(token: string): UseAuditStateReturn {
	const [state, setState] = useState<AuditState | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const pollingRef = useRef<NodeJS.Timeout | null>(null);

	const fetchState = useCallback(async () => {
		try {
			const freshState = await getAuditState(token);
			setState(freshState);
			return freshState;
		} catch (err) {
			console.error("[useAuditState] Fetch failed:", err);
			setError(err instanceof Error ? err.message : "Failed to load audit");
			return null;
		}
	}, [token]);

	const refetch = useCallback(async () => {
		await fetchState();
	}, [fetchState]);

	useEffect(() => {
		let mounted = true;

		async function init() {
			setLoading(true);
			const initialState = await fetchState();
			if (!mounted) return;
			setLoading(false);

			// Start polling if audit is in progress
			if (initialState && !isAuditComplete(initialState.status)) {
				pollingRef.current = setInterval(async () => {
					if (!mounted) return;
					const newState = await fetchState();

					// Stop polling when complete
					if (newState && isAuditComplete(newState.status)) {
						if (pollingRef.current) {
							clearInterval(pollingRef.current);
							pollingRef.current = null;
						}
					}
				}, POLL_INTERVAL);
			}
		}

		init();

		return () => {
			mounted = false;
			if (pollingRef.current) {
				clearInterval(pollingRef.current);
			}
		};
	}, [fetchState]);

	return { state, loading, error, refetch };
}
