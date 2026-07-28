import { PLANETS } from "../data/planets.ts";

/** Scale-mode selector. Toggle changes ONLY radial scale + body sizes. */
export type ScaleMode = "stylized" | "realistic";

/** A body placed in the scene's logical (viewBox) coordinate space. */
export interface PlacedBody {
  /** center x (viewBox units) */
  cx: number;
  /** center y (viewBox units) */
  cy: number;
  /** disc radius (viewBox units) */
  r: number;
}

/** Per-body inputs a layout needs. */
export interface LayoutInput {
  /** heliocentric ecliptic longitude (rad) — preserved by BOTH modes */
  angleRad: number;
  /** true Sun–body distance (AU) — used by realistic mode */
  distanceAU: number;
  /** real equatorial diameter (km) — drives disc size */
  diameterKm: number;
  /** 1-based orbit index from the Sun — drives stylized orbit radius */
  orbitRank: number;
}

/**
 * Logical viewBox is [-VIEW, -VIEW, 2·VIEW, 2·VIEW] with the Sun at (0,0).
 * The SVG scales this square to the viewport via preserveAspectRatio.
 */
export const VIEW = 500;

/** Sun disc radius — capped, NOT to scale (see plan decision #5). */
export const SUN_CAP_R = 24;

// Stylized-mode tuning: even concentric orbits, graded (not real) disc sizes.
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

/** Even-spaced stylized orbit radius for a 1-based orbit rank. Strictly increasing. */
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
 * Angle is preserved exactly — atan2(-cy, cx) === angleRad (toggle invariant).
 */
export function stylizedLayout(input: LayoutInput): PlacedBody {
  const radius = stylizedOrbitRadius(input.orbitRank);
  const { cx, cy } = polar(input.angleRad, radius);
  return { cx, cy, r: planetDisplayRadius(input.diameterKm) };
}
