import { describe, expect, it } from "vitest";
import { TIERS } from "./audit.schema";

describe("audit schema", () => {
	it("should have 4 tiers", () => {
		expect(Object.keys(TIERS)).toHaveLength(4);
	});

	it("should have correct FREE limits", () => {
		expect(TIERS.FREE.limits.pages).toBe(25);
		expect(TIERS.FREE.limits.briefs).toBe(0);
		expect(TIERS.FREE.limits.competitors).toBe(0);
		expect(TIERS.FREE.limits.pdfExport).toBe(false);
	});

	it("should have correct SCAN limits", () => {
		expect(TIERS.SCAN.limits.pages).toBe(50);
		expect(TIERS.SCAN.limits.briefs).toBe(1);
		expect(TIERS.SCAN.limits.competitors).toBe(1);
		expect(TIERS.SCAN.limits.pdfExport).toBe(true);
	});

	it("should have correct AUDIT limits", () => {
		expect(TIERS.AUDIT.limits.pages).toBe(200);
		expect(TIERS.AUDIT.limits.briefs).toBe(5);
		expect(TIERS.AUDIT.limits.competitors).toBe(3);
	});

	it("should have correct DEEP_DIVE limits", () => {
		expect(TIERS.DEEP_DIVE.limits.pages).toBe(500);
		expect(TIERS.DEEP_DIVE.limits.briefs).toBe(15);
		expect(TIERS.DEEP_DIVE.limits.competitors).toBe(5);
	});
});
