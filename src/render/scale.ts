/** Scale-mode selector. Toggle changes ONLY radial scale + body sizes. */
export type ScaleMode = "stylized" | "realistic";

/** A body placed in SVG viewport coordinates. */
export interface PlacedBody {
  /** SVG center x */
  cx: number;
  /** SVG center y */
  cy: number;
  /** SVG disc radius */
  r: number;
}

/**
 * Layout transforms live here (`stylizedLayout`, `realisticLayout`).
 * Correctness-critical module — unit-tested in Phases 3/4.
 * Both layouts MUST preserve the input angle exactly (toggle invariant).
 * Implemented starting Phase 3.
 */
