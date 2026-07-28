import { Body } from "astronomy-engine";

/**
 * Static, vendored per-planet constants (NOT fetched — see plan Gotchas).
 * Diameters use the EQUATORIAL basis (Jupiter/Earth ≈ 11.2) so the
 * realistic-mode size-ratio test isn't brittle vs the ~11.0 mean value.
 * Sources: NASA planetary fact sheets (equatorial diameters, km).
 */
export interface PlanetDatum {
  /** astronomy-engine body id */
  body: Body;
  /** Display name */
  name: string;
  /** Flat disc color */
  color: string;
  /** Real equatorial diameter (km) */
  diameterKm: number;
  /** 1-based orbit index from the Sun, used by stylized layout */
  orbitRank: number;
}

export const PLANETS: readonly PlanetDatum[] = [
  { body: Body.Mercury, name: "Mercury", color: "#9c9188", diameterKm: 4879, orbitRank: 1 },
  { body: Body.Venus, name: "Venus", color: "#e6c37a", diameterKm: 12104, orbitRank: 2 },
  { body: Body.Earth, name: "Earth", color: "#4a90d9", diameterKm: 12756, orbitRank: 3 },
  { body: Body.Mars, name: "Mars", color: "#d1502e", diameterKm: 6792, orbitRank: 4 },
  { body: Body.Jupiter, name: "Jupiter", color: "#d8b48c", diameterKm: 142984, orbitRank: 5 },
  { body: Body.Saturn, name: "Saturn", color: "#e3d3a3", diameterKm: 120536, orbitRank: 6 },
  { body: Body.Uranus, name: "Uranus", color: "#9fd8e0", diameterKm: 51118, orbitRank: 7 },
  { body: Body.Neptune, name: "Neptune", color: "#4b6fd6", diameterKm: 49528, orbitRank: 8 },
];

/** The Sun's real equatorial diameter (km). Rendered size-capped (see plan). */
export const SUN_DIAMETER_KM = 1_392_700;
