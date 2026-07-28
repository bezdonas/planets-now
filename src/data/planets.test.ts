import { describe, expect, it } from "vitest";
import { PLANETS } from "./planets.ts";

describe("PLANETS", () => {
  it("has the 8 IAU planets", () => {
    expect(PLANETS).toHaveLength(8);
    expect(PLANETS.map((p) => p.name)).toEqual([
      "Mercury",
      "Venus",
      "Earth",
      "Mars",
      "Jupiter",
      "Saturn",
      "Uranus",
      "Neptune",
    ]);
  });

  it("has unique, contiguous orbit ranks 1..8", () => {
    expect(PLANETS.map((p) => p.orbitRank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("uses equatorial diameters (Jupiter/Earth ≈ 11.2, not the ~11.0 mean basis)", () => {
    const jupiter = PLANETS.find((p) => p.name === "Jupiter")!;
    const earth = PLANETS.find((p) => p.name === "Earth")!;
    expect(jupiter.diameterKm / earth.diameterKm).toBeCloseTo(11.2, 1);
  });
});
