import { createLogger } from "../lib/logger.js";
import { isPrivateHost } from "../lib/url.js";
import type { ValidateUrlResponse } from "../schemas/audit.schema.js";

const log = createLogger("url-validation");
const TIMEOUT_MS = 3000;

export async function validateSiteUrl(
	url: string,
): Promise<ValidateUrlResponse> {
	try {
		const parsedUrl = new URL(url);

		if (isPrivateHost(parsedUrl.hostname.toLowerCase())) {
			return { valid: false, error: "Private/local addresses not allowed" };
		}

		// Try HEAD first, fallback to GET (some servers block HEAD)
		const headResult = await fetchWithTimeout(url, "HEAD");
		if (headResult.ok) return { valid: true };
		if (headResult.error === "timeout") {
			return { valid: false, error: "Site unreachable (timeout)" };
		}

		// HEAD failed, try GET
		const getResult = await fetchWithTimeout(url, "GET");
		if (getResult.ok) return { valid: true };

		return {
			valid: false,
			error: getResult.error ?? "Site unreachable",
		};
	} catch (err) {
		log.warn({ url, error: err }, "URL validation failed");
		return { valid: false, error: "Invalid URL or site unreachable" };
	}
}

type FetchWithTimeoutResult =
	| { ok: true }
	| { ok: false; error: string | null };

async function fetchWithTimeout(
	url: string,
	method: "HEAD" | "GET",
): Promise<FetchWithTimeoutResult> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const response = await fetch(url, {
			method,
			signal: controller.signal,
			redirect: "follow",
		});

		clearTimeout(timeout);

		if (response.ok || response.status < 500) {
			return { ok: true };
		}

		return { ok: false, error: `Site returned error (${response.status})` };
	} catch (err) {
		clearTimeout(timeout);

		if (err instanceof Error) {
			if (err.name === "AbortError") {
				return { ok: false, error: "timeout" };
			}
			if (
				err.message.includes("ENOTFOUND") ||
				err.message.includes("getaddrinfo")
			) {
				return { ok: false, error: "Domain does not exist" };
			}
			if (err.message.includes("ECONNREFUSED")) {
				return { ok: false, error: "Connection refused" };
			}
		}

		return { ok: false, error: null };
	}
}
