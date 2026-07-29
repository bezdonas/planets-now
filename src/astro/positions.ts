import { Body, Ecliptic, HelioVector, MakeTime } from "astronomy-engine";
import { PLANETS } from "../data/planets.ts";

const DEG2RAD = Math.PI / 180;

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

/**
 * Current heliocentric positions of all tracked planets at `date`.
 *
 * Angle comes from `Ecliptic(HelioVector(...)).elon` — raw `HelioVector` is
 * J2000 EQUATORIAL, not ecliptic (see plan Gotchas), so it must be converted.
 * Distance is the frame-invariant vector length in AU.
 */
export function getHeliocentricPositions(date: Date): HelioPosition[] {
  return PLANETS.map(({ body }) => {
    const eq = HelioVector(body, MakeTime(date));
    const ecl = Ecliptic(eq);
    return { body, angleRad: ecl.elon * DEG2RAD, distanceAU: eq.Length() };
  });
}
