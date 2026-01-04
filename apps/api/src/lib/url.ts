const BLOCKED_HOSTS = new Set([
	"localhost",
	"127.0.0.1",
	"0.0.0.0",
	"[::1]",
	"::1",
	"metadata.google.internal",
	"169.254.169.254",
]);

export function isPrivateHost(hostname: string): boolean {
	if (BLOCKED_HOSTS.has(hostname)) return true;
	const parts = hostname.split(".").map(Number);
	if (parts.length !== 4) return false;
	const [a, b] = parts as [number, number, number, number];
	if (a === 10) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	return false;
}

export function validateUrlSecurity(url: string): void {
	const parsed = new URL(url);
	if (!["http:", "https:"].includes(parsed.protocol)) {
		throw new Error(`Invalid protocol: ${parsed.protocol}`);
	}
	if (isPrivateHost(parsed.hostname)) {
		throw new Error(`Blocked host: ${parsed.hostname}`);
	}
}
