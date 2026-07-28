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

/** A single ecliptic-plane sample point (AU), for drawing orbit paths. */
export interface OrbitPoint {
  x: number;
  y: number;
}

/**
 * Heliocentric ecliptic longitude (degrees, 0..360) of `body` at `date`.
 *
 * MUST go through `Ecliptic(HelioVector(...))` — raw `HelioVector` is J2000
 * EQUATORIAL, not ecliptic (see plan Gotchas). `.elon` is the ecliptic
 * longitude in degrees.
 */
function eclipticLongitudeDeg(body: Body, date: Date | number): number {
  const eq = HelioVector(body, MakeTime(date));
  return Ecliptic(eq).elon;
}

/** Ecliptic-plane cartesian (AU) + distance (AU) of `body` at `date`. */
function eclipticState(body: Body, date: Date | number): { x: number; y: number; distanceAU: number } {
  const eq = HelioVector(body, MakeTime(date));
  const ecl = Ecliptic(eq);
  return { x: ecl.vec.x, y: ecl.vec.y, distanceAU: eq.Length() };
}

/**
 * Current heliocentric positions of all tracked planets at `date`.
 * Angle = true heliocentric ecliptic longitude; distance = frame-invariant
 * Sun–body distance in AU.
 */
export function getHeliocentricPositions(date: Date): HelioPosition[] {
  return PLANETS.map(({ body }) => ({
    body,
    angleRad: eclipticLongitudeDeg(body, date) * DEG2RAD,
    distanceAU: eclipticState(body, date).distanceAU,
  }));
}

/** Signed smallest difference a→b in degrees, in (-180, 180]. */
function angleDeltaDeg(a: number, b: number): number {
  let d = ((b - a + 180) % 360) - 180;
  if (d <= -180) d += 360;
  return d;
}

/**
 * Sample one full orbit of `body` as ecliptic-plane points (AU).
 *
 * Steps forward in time accumulating ecliptic longitude until it wraps a full
 * 360° (see plan: elon-wrap approach — needs no orbital-period constant). The
 * step is adaptive to the body's local (Keplerian) angular speed so eccentric
 * orbits (Mercury, Mars) stay evenly sampled. Orbit shape is effectively
 * static, so a fixed reference epoch is used.
 */
export function sampleOrbit(body: Body, samples = 256): OrbitPoint[] {
  const targetStepDeg = 360 / samples;
  let t = MakeTime(new Date("2000-01-01T12:00:00Z"));

  const first = eclipticState(body, t.date);
  const points: OrbitPoint[] = [{ x: first.x, y: first.y }];

  let lonPrev = eclipticLongitudeDeg(body, t.date);
  // Seed angular speed (deg/day) with a 1-day probe.
  let omega = Math.max(1e-6, Math.abs(angleDeltaDeg(lonPrev, eclipticLongitudeDeg(body, t.AddDays(1).date))));

  let unwrapped = 0;
  let guard = 0;
  while (unwrapped < 360 && guard++ < 100_000) {
    const dtDays = targetStepDeg / omega;
    t = t.AddDays(dtDays);
    const lon = eclipticLongitudeDeg(body, t.date);
    const d = angleDeltaDeg(lonPrev, lon);
    unwrapped += Math.abs(d);
    omega = Math.max(1e-6, Math.abs(d) / dtDays);
    lonPrev = lon;

    const s = eclipticState(body, t.date);
    points.push({ x: s.x, y: s.y });
  }
  return points;
}
