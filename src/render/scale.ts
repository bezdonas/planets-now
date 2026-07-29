import { PLANETS } from "../data/planets.ts";

/** A body placed in the scene's logical (viewBox) coordinate space. */
export interface PlacedBody {
  /** center x (viewBox units) */
  cx: number;
  /** center y (viewBox units) */
  cy: number;
  /** disc radius (viewBox units) */
  r: number;
}

/** Per-body inputs the layout needs. */
export interface LayoutInput {
  /** heliocentric ecliptic longitude (rad) — the one true quantity */
  angleRad: number;
  /** real equatorial diameter (km) — drives disc size */
  diameterKm: number;
  /** 1-based orbit index from the Sun — drives orbit radius */
  orbitRank: number;
}

/**
 * Logical viewBox is [-VIEW, -VIEW, 2·VIEW, 2·VIEW] with the Sun at (0,0).
 * The SVG scales this square to the viewport via preserveAspectRatio.
 */
export const VIEW = 500;

/** Sun disc radius — capped, NOT to scale (the real Sun is ~109× Earth). */
export const SUN_CAP_R = 24;

// Stylized tuning: even concentric orbits, graded (not real) disc sizes.
const STYLIZED_R_INNER = 90; // Mercury ring
const STYLIZED_R_OUTER = 430; // Neptune ring (leaves margin for labels < VIEW)
export const PLANET_R_MIN = 6;
export const PLANET_R_MAX = 15;

const RANK_COUNT = PLANETS.length; // 8
const DIAM_MIN = Math.min(...PLANETS.map((p) => p.diameterKm));
const DIAM_MAX = Math.max(...PLANETS.map((p) => p.diameterKm));

/** Map heliocentric longitude θ to a viewBox point at radius R (prograde = CCW). */
function polar(angleRad: number, radius: number): { cx: number; cy: number } {
  return { cx: radius * Math.cos(angleRad), cy: -radius * Math.sin(angleRad) };
}

/** Even-spaced orbit radius for a 1-based orbit rank. Strictly increasing. */
export function stylizedOrbitRadius(orbitRank: number): number {
  const t = (orbitRank - 1) / (RANK_COUNT - 1);
  return STYLIZED_R_INNER + t * (STYLIZED_R_OUTER - STYLIZED_R_INNER);
}

/** Graded disc radius (log of diameter → [PLANET_R_MIN, PLANET_R_MAX]). */
export function planetDisplayRadius(diameterKm: number): number {
  const t = (Math.log10(diameterKm) - Math.log10(DIAM_MIN)) / (Math.log10(DIAM_MAX) - Math.log10(DIAM_MIN));
  return PLANET_R_MIN + t * (PLANET_R_MAX - PLANET_R_MIN);
}

/**
 * Stylized layout: real angle, evenly-spaced orbit radius by rank, graded disc.
 * The angle is the one thing kept true — atan2(-cy, cx) === angleRad. Orbit
 * spacing and disc sizes are deliberately not to scale (see the in-app notes).
 */
export function stylizedLayout(input: LayoutInput): PlacedBody {
  const radius = stylizedOrbitRadius(input.orbitRank);
  const { cx, cy } = polar(input.angleRad, radius);
  return { cx, cy, r: planetDisplayRadius(input.diameterKm) };
}
