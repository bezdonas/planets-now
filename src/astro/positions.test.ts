import { Body, Ecliptic, EclipticLongitude, HelioVector, MakeTime } from "astronomy-engine";
import { describe, expect, it } from "vitest";
import { getHeliocentricPositions, sampleOrbit } from "./positions.ts";

const RAD2DEG = 180 / Math.PI;
const J2000 = new Date("2000-01-01T12:00:00Z");

/** Expected Sun–planet distance ranges (AU): [perihelion, aphelion] with margin. */
const DISTANCE_RANGES: Record<string, [number, number]> = {
  Mercury: [0.30, 0.47],
  Venus: [0.71, 0.73],
  Earth: [0.98, 1.02],
  Mars: [1.38, 1.67],
  Jupiter: [4.95, 5.46],
  Saturn: [9.0, 10.1],
  Uranus: [18.2, 20.2],
  Neptune: [29.7, 30.4],
};

function deg(rad: number): number {
  return ((rad * RAD2DEG) % 360 + 360) % 360;
}

describe("getHeliocentricPositions", () => {
  const positions = getHeliocentricPositions(J2000);

  it("returns all 8 planets with sane distances", () => {
    expect(positions).toHaveLength(8);
    for (const p of positions) {
      const [min, max] = DISTANCE_RANGES[p.body];
      expect(p.distanceAU, `${p.body} distance`).toBeGreaterThanOrEqual(min);
      expect(p.distanceAU, `${p.body} distance`).toBeLessThanOrEqual(max);
      expect(p.angleRad).toBeGreaterThanOrEqual(0);
      expect(p.angleRad).toBeLessThan(2 * Math.PI);
    }
  });

  it("matches astronomy-engine's own heliocentric EclipticLongitude (independent code path)", () => {
    // getHeliocentricPositions uses Ecliptic(HelioVector()).elon; EclipticLongitude
    // is a separate heliocentric-longitude routine — agreement cross-checks both.
    for (const p of positions) {
      const expected = EclipticLongitude(p.body, J2000); // heliocentric, degrees
      expect(deg(p.angleRad), `${p.body} longitude`).toBeCloseTo(expected, 1);
    }
  });

  it("uses the ECLIPTIC frame, not raw (equatorial) HelioVector — frame-bug regression guard", () => {
    const eq = HelioVector(Body.Earth, MakeTime(J2000));
    const equatorialLon = deg(Math.atan2(eq.y, eq.x)); // WRONG frame
    const eclipticLon = Ecliptic(eq).elon; // correct frame
    const produced = deg(getHeliocentricPositions(J2000).find((p) => p.body === Body.Earth)!.angleRad);

    // The two frames genuinely differ (obliquity rotation) — proves the guard is
    // meaningful. For Earth at J2000 the gap is ~0.9°: small but a clearly visible
    // rotation if raw HelioVector were used by mistake.
    const frameGap = Math.abs(((equatorialLon - eclipticLon + 180) % 360) - 180);
    expect(frameGap).toBeGreaterThan(0.5);

    // Our output matches the ecliptic frame, NOT the equatorial one.
    expect(produced).toBeCloseTo(eclipticLon, 1);
  });
});

describe("sampleOrbit", () => {
  it("returns a closed loop of ~samples points for each planet", () => {
    for (const body of [Body.Mercury, Body.Earth, Body.Mars, Body.Neptune]) {
      const pts = sampleOrbit(body, 128);
      expect(pts.length).toBeGreaterThan(100);
      expect(pts.length).toBeLessThan(200);

      const first = pts[0];
      const last = pts[pts.length - 1];
      const gap = Math.hypot(last.x - first.x, last.y - first.y);
      const radius = Math.hypot(first.x, first.y);
      // Loop closes: end returns near the start (within 5% of orbital radius).
      expect(gap, `${body} loop closure`).toBeLessThan(radius * 0.05);
    }
  });

  it("samples Mercury's orbit within its known distance band", () => {
    for (const { x, y } of sampleOrbit(Body.Mercury, 64)) {
      const r = Math.hypot(x, y);
      expect(r).toBeGreaterThan(0.30);
      expect(r).toBeLessThan(0.47);
    }
  });
});
