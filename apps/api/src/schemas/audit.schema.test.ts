import { describe, expect, it } from "vitest";
import { UNLIMITED, tierLimits } from "./audit.schema";

describe("audit schema", () => {
	it("should have 4 tiers", () => {
		expect(Object.keys(tierLimits)).toHaveLength(4);
	});

	it("should have correct FREE limits", () => {
		expect(tierLimits.FREE.pages).toBe(25);
		expect(tierLimits.FREE.briefs).toBe(0);
		expect(tierLimits.FREE.competitors).toBe(0);
		expect(tierLimits.FREE.pdfExport).toBe(false);
	});

	it("should have correct SCAN limits", () => {
		expect(tierLimits.SCAN.pages).toBe(50);
		expect(tierLimits.SCAN.briefs).toBe(1);
		expect(tierLimits.SCAN.competitors).toBe(0);
		expect(tierLimits.SCAN.pdfExport).toBe(true);
	});

	it("should have correct AUDIT limits", () => {
		expect(tierLimits.AUDIT.pages).toBe(200);
		expect(tierLimits.AUDIT.briefs).toBe(5);
		expect(tierLimits.AUDIT.competitors).toBe(1);
	});

	it("should have correct DEEP_DIVE limits", () => {
		expect(tierLimits.DEEP_DIVE.pages).toBe(500);
		expect(tierLimits.DEEP_DIVE.briefs).toBe(UNLIMITED);
		expect(tierLimits.DEEP_DIVE.competitors).toBe(3);
	});
});
