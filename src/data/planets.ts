import { Body } from "astronomy-engine";

/**
 * Static, vendored per-planet constants (NOT fetched — see plan Gotchas).
 * Diameters use the EQUATORIAL basis (Jupiter/Earth ≈ 11.2) so the
 * realistic-mode size-ratio test isn't brittle vs the ~11.0 mean value.
 *
 * Populated in Phase 2/3. Phase 1 only establishes the shape.
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

export const PLANETS: readonly PlanetDatum[] = [];
