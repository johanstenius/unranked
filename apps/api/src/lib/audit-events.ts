/**
 * Audit Event System
 *
 * Simple in-memory pub/sub for streaming audit progress via SSE.
 * Events carry actual data payloads - frontend updates state directly.
 */

import type { AuditStatus } from "@prisma/client";
import type {
	OpportunityCluster,
	PrioritizedAction,
} from "../services/seo/analysis.js";
import type { CWVPageResult } from "../services/seo/components/types.js";
import type { HealthScore } from "../services/seo/health-score.js";
import type { AuditSSEEvent, StateComponentKey } from "../types/audit-state.js";

export type { AuditSSEEvent };

type EventCallback = (event: AuditSSEEvent) => void;

// Map of auditId -> Set of listener callbacks
const listeners = new Map<string, Set<EventCallback>>();

/**
 * Subscribe to events for a specific audit.
 * Returns an unsubscribe function.
 */
export function subscribe(
	auditId: string,
	callback: EventCallback,
): () => void {
	if (!listeners.has(auditId)) {
		listeners.set(auditId, new Set());
	}
	listeners.get(auditId)?.add(callback);

	return () => {
		const auditListeners = listeners.get(auditId);
		if (auditListeners) {
			auditListeners.delete(callback);
			if (auditListeners.size === 0) {
				listeners.delete(auditId);
			}
		}
	};
}

/**
 * Emit an event to all listeners for a specific audit.
 */
export function emit(auditId: string, event: AuditSSEEvent): void {
	const auditListeners = listeners.get(auditId);
	const count = auditListeners?.size ?? 0;

	if (event.type === "cwv:page") {
		console.log(
			`[audit-events] emit ${event.type} for ${auditId}, listeners: ${count}`,
		);
	} else if (
		event.type === "component:start" ||
		event.type === "component:complete"
	) {
		console.log(
			`[audit-events] emit ${event.type} for ${auditId}, listeners: ${count}`,
			{ key: event.key },
		);
	}

	if (auditListeners) {
		for (const callback of auditListeners) {
			try {
				callback(event);
			} catch (e) {
				console.error(`[audit-events] Error in listener for ${auditId}:`, e);
			}
		}
	}
}

/**
 * Check if there are any active listeners for an audit.
 */
export function hasListeners(auditId: string): boolean {
	const auditListeners = listeners.get(auditId);
	return auditListeners != null && auditListeners.size > 0;
}

/**
 * Get the number of active listeners for an audit.
 */
export function listenerCount(auditId: string): number {
	return listeners.get(auditId)?.size ?? 0;
}

// ============================================================================
// Event emitters
// ============================================================================

export function emitAuditStatus(auditId: string, status: AuditStatus): void {
	emit(auditId, { type: "audit:status", status });
}

export function emitComponentStart(
	auditId: string,
	key: StateComponentKey,
): void {
	emit(auditId, { type: "component:start", key });
}

export function emitComponentComplete<T>(
	auditId: string,
	key: StateComponentKey,
	data: T,
): void {
	emit(auditId, { type: "component:complete", key, data });
}

export function emitComponentFail(
	auditId: string,
	key: StateComponentKey,
	error: string,
): void {
	emit(auditId, { type: "component:fail", key, error });
}

export function emitCrawlPages(
	auditId: string,
	count: number,
	sitemapCount?: number,
): void {
	emit(auditId, { type: "crawl:pages", count, sitemapCount });
}

export function emitCWVPage(auditId: string, page: CWVPageResult): void {
	emit(auditId, { type: "cwv:page", page });
}

export function emitHealthScore(auditId: string, score: HealthScore): void {
	emit(auditId, { type: "health:score", score });
}

export function emitClusters(
	auditId: string,
	data: OpportunityCluster[],
): void {
	emit(auditId, { type: "clusters", data });
}

export function emitActionPlan(
	auditId: string,
	data: PrioritizedAction[],
): void {
	emit(auditId, { type: "action-plan", data });
}

export function emitAuditComplete(auditId: string): void {
	emit(auditId, { type: "audit:complete" });
}

export function emitAuditError(auditId: string, message: string): void {
	emit(auditId, { type: "audit:error", message });
}
