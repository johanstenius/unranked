import { describe, expect, it } from "vitest";
import { tierInfo } from "./api";

describe("tierInfo", () => {
	it("should have 4 tiers", () => {
		expect(Object.keys(tierInfo)).toHaveLength(4);
	});

	it("should have FREE tier", () => {
		expect(tierInfo.FREE.name).toBe("Free");
		expect(tierInfo.FREE.price).toBe(0);
	});

	it("should have SCAN tier", () => {
		expect(tierInfo.SCAN.name).toBe("Scan");
		expect(tierInfo.SCAN.price).toBe(9);
	});
});
