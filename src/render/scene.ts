const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Create the blank scene SVG and attach it to `mount`.
 * Phase 1: just an empty dark viewport. Orbits, planets, labels, tooltips,
 * and the Sun are added in Phases 3–5.
 */
export function createScene(mount: HTMLElement): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.id = "scene";
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  mount.appendChild(svg);
  return svg;
}
