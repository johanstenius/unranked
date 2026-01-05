/**
 * Audit Event System
 *
 * Simple in-memory pub/sub for streaming audit progress via SSE.
 * Listeners subscribe to audit events and receive updates in real-time.
 */

import type { AuditStatus } from "@prisma/client";
import type {
	CWVPageResult,
	CoreWebVitalsData,
} from "../services/seo/components/types.js";
import type { HealthScore } from "../services/seo/health-score.js";
import type { ComponentKey } from "../types/audit-progress.js";

export type AuditSSEEvent =
	| { type: "status"; status: AuditStatus }
	| {
			type: "component";
			key: ComponentKey;
			status: "running" | "completed" | "failed";
			error?: string;
	  }
	| { type: "cwv"; page: CWVPageResult }
	| { type: "cwv-complete"; data: CoreWebVitalsData }
	| { type: "health"; score: HealthScore }
	| { type: "partial-ready" }
	| { type: "complete" }
	| { type: "error"; message: string };

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

	if (event.type === "cwv" || event.type === "cwv-complete") {
		console.log(
			`[audit-events] emit ${event.type} for ${auditId}, listeners: ${count}`,
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

// Convenience emit functions
export const emitStatus = (auditId: string, status: AuditStatus) =>
	emit(auditId, { type: "status", status });

export const emitComponentRunning = (auditId: string, key: ComponentKey) =>
	emit(auditId, { type: "component", key, status: "running" });

export const emitComponentCompleted = (auditId: string, key: ComponentKey) =>
	emit(auditId, { type: "component", key, status: "completed" });

export const emitComponentFailed = (
	auditId: string,
	key: ComponentKey,
	error: string,
) => emit(auditId, { type: "component", key, status: "failed", error });

export const emitCWVPage = (auditId: string, page: CWVPageResult) =>
	emit(auditId, { type: "cwv", page });

export const emitCWVComplete = (auditId: string, data: CoreWebVitalsData) =>
	emit(auditId, { type: "cwv-complete", data });

export const emitHealth = (auditId: string, score: HealthScore) =>
	emit(auditId, { type: "health", score });

export const emitComplete = (auditId: string) =>
	emit(auditId, { type: "complete" });

export const emitError = (auditId: string, message: string) =>
	emit(auditId, { type: "error", message });
