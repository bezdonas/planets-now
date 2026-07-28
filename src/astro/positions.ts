import type { Body } from "astronomy-engine";

/**
 * A body's heliocentric position, projected onto the ecliptic plane.
 * `angleRad` is the heliocentric ecliptic longitude (0..2π).
 * `distanceAU` is the true Sun–body distance in AU.
 */
export interface HelioPosition {
  body: Body;
  angleRad: number;
  distanceAU: number;
}

/** A single ecliptic-plane sample point (AU), for drawing orbit paths. */
export interface OrbitPoint {
  x: number;
  y: number;
}

/**
 * Current heliocentric positions of all tracked bodies at `date`.
 *
 * MUST use `Ecliptic(HelioVector(body, date))` — raw HelioVector is J2000
 * EQUATORIAL, not ecliptic (see plan Gotchas). Implemented in Phase 2.
 */
export function getHeliocentricPositions(_date: Date): HelioPosition[] {
  throw new Error("not implemented — Phase 2");
}

/**
 * Sample one full orbit of `body` as ecliptic-plane points (AU) by stepping
 * forward until the ecliptic longitude wraps 360°. Implemented in Phase 2.
 */
export function sampleOrbit(_body: Body): OrbitPoint[] {
  throw new Error("not implemented — Phase 2");
}
