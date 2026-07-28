import { describe, expect, it } from "vitest";
import {
  PLANET_R_MAX,
  planetDisplayRadius,
  stylizedLayout,
  stylizedOrbitRadius,
  VIEW,
} from "./scale.ts";

const maxPlanetR = PLANET_R_MAX;

describe("stylizedOrbitRadius", () => {
  it("is strictly increasing with orbit rank", () => {
    const radii = [1, 2, 3, 4, 5, 6, 7, 8].map(stylizedOrbitRadius);
    for (let i = 1; i < radii.length; i++) {
      expect(radii[i]).toBeGreaterThan(radii[i - 1]);
    }
  });

  it("keeps every ring (plus its disc) inside the viewBox", () => {
    const outer = stylizedOrbitRadius(8);
    expect(outer + maxPlanetR).toBeLessThan(VIEW);
  });

  it("spaces adjacent rings wider than a disc diameter (no overlap)", () => {
    for (let rank = 1; rank < 8; rank++) {
      const gap = stylizedOrbitRadius(rank + 1) - stylizedOrbitRadius(rank);
      expect(gap).toBeGreaterThan(2 * maxPlanetR);
    }
  });
});

describe("planetDisplayRadius", () => {
  it("is monotonic in diameter and within bounds", () => {
    const small = planetDisplayRadius(4879); // Mercury
    const big = planetDisplayRadius(142984); // Jupiter
    expect(big).toBeGreaterThan(small);
    expect(small).toBeGreaterThanOrEqual(6);
    expect(big).toBeLessThanOrEqual(maxPlanetR);
  });
});

describe("stylizedLayout — toggle invariant", () => {
  it("preserves the input angle exactly (atan2(-cy, cx) === angleRad)", () => {
    for (const angleRad of [0, 0.5, 1.7, Math.PI, 4.2, 6.0]) {
      const { cx, cy } = stylizedLayout({ angleRad, distanceAU: 1, diameterKm: 12756, orbitRank: 3 });
      const recovered = Math.atan2(-cy, cx);
      const norm = (recovered + 2 * Math.PI) % (2 * Math.PI);
      expect(norm).toBeCloseTo(angleRad, 6);
    }
  });

  it("places the body on its rank's orbit ring", () => {
    const placed = stylizedLayout({ angleRad: 1.0, distanceAU: 5, diameterKm: 142984, orbitRank: 5 });
    const r = Math.hypot(placed.cx, placed.cy);
    expect(r).toBeCloseTo(stylizedOrbitRadius(5), 6);
  });
});
