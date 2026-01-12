import { describe, expect, it } from "vitest";
import { TIERS } from "./api";

describe("TIERS", () => {
	it("should have 4 tiers", () => {
		expect(Object.keys(TIERS)).toHaveLength(4);
	});

	it("should have FREE tier", () => {
		expect(TIERS.FREE.name).toBe("Technical");
		expect(TIERS.FREE.price).toBe(0);
	});

	it("should have SCAN tier", () => {
		expect(TIERS.SCAN.name).toBe("Scan");
		expect(TIERS.SCAN.price).toBe(9);
	});
});
