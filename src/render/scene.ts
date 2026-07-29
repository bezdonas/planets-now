import { getHeliocentricPositions } from "../astro/positions.ts";
import { PLANETS, type PlanetDatum } from "../data/planets.ts";
import { type LayoutInput, type PlacedBody, stylizedLayout, stylizedOrbitRadius, SUN_CAP_R, VIEW } from "./scale.ts";

const SVG_NS = "http://www.w3.org/2000/svg";
const AU_TO_KM = 149_597_870.7;
/** Minimum pointer target radius (viewBox units) for reliable hovering. */
const HIT_R = 11;

function el<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

interface PlanetNodes {
  disc: SVGCircleElement;
  label: SVGTextElement;
  hit: SVGCircleElement;
}

export interface SceneController {
  svg: SVGSVGElement;
  /** Recompute positions for `date` and reposition planet discs + labels. */
  render(date: Date): void;
}

function formatKm(km: number): string {
  if (km >= 1e9) return `${(km / 1e9).toFixed(2)} billion km`;
  if (km >= 1e6) return `${(km / 1e6).toFixed(1)}M km`;
  return `${Math.round(km).toLocaleString()} km`;
}

/**
 * Create the scene SVG and attach it to `mount`. Static elements (orbit rings,
 * Sun) are built once; planet discs/labels/hit-areas are repositioned by
 * `render()`. Scroll wheel zooms the camera toward the cursor.
 */
export function createScene(mount: HTMLElement): SceneController {
  const svg = el("svg", {
    id: "scene",
    viewBox: `${-VIEW} ${-VIEW} ${2 * VIEW} ${2 * VIEW}`,
    preserveAspectRatio: "xMidYMid meet",
  });

  // Static: evenly-spaced orbit rings.
  const orbits = el("g", { class: "orbits" });
  for (const { orbitRank } of PLANETS) {
    orbits.appendChild(el("circle", { cx: 0, cy: 0, r: stylizedOrbitRadius(orbitRank), class: "orbit" }));
  }
  svg.appendChild(orbits);

  // Static: the Sun (capped size, not to scale).
  const sunGroup = el("g", { class: "sun" });
  sunGroup.appendChild(el("circle", { cx: 0, cy: 0, r: SUN_CAP_R, class: "sun-disc" }));
  const sunLabel = el("text", { x: 0, y: SUN_CAP_R + 20, class: "label sun-label", "text-anchor": "middle" });
  sunLabel.textContent = "Sun";
  sunGroup.appendChild(sunLabel);
  svg.appendChild(sunGroup);

  // Planet discs + labels; hit-areas layered on top for reliable hovering.
  const bodies = el("g", { class: "bodies" });
  const hits = el("g", { class: "hits" });
  const nodes = new Map<string, PlanetNodes>();
  const currentDistanceAU = new Map<string, number>();
  for (const p of PLANETS) {
    const disc = el("circle", { cx: 0, cy: 0, r: 0, fill: p.color, class: "planet" });
    const label = el("text", { x: 0, y: 0, class: "label planet-label" });
    label.textContent = p.name;
    const hit = el("circle", { cx: 0, cy: 0, r: HIT_R, class: "hit" });
    bodies.appendChild(disc);
    bodies.appendChild(label);
    hits.appendChild(hit);
    nodes.set(p.name, { disc, label, hit });
  }
  svg.appendChild(bodies);
  svg.appendChild(hits);
  mount.appendChild(svg);

  // HTML tooltip overlay.
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  tooltip.hidden = true;
  mount.appendChild(tooltip);

  function showTooltip(p: PlanetDatum, clientX: number, clientY: number): void {
    const dist = currentDistanceAU.get(p.name) ?? 0;
    tooltip.innerHTML =
      `<strong>${p.name}</strong>` +
      `<span>Diameter: ${p.diameterKm.toLocaleString()} km</span>` +
      `<span>From Sun: ${dist.toFixed(2)} AU · ${formatKm(dist * AU_TO_KM)}</span>`;
    tooltip.style.left = `${clientX + 14}px`;
    tooltip.style.top = `${clientY + 14}px`;
    tooltip.hidden = false;
  }

  for (const p of PLANETS) {
    const { hit } = nodes.get(p.name)!;
    hit.addEventListener("mouseenter", (e) => showTooltip(p, e.clientX, e.clientY));
    hit.addEventListener("mousemove", (e) => showTooltip(p, e.clientX, e.clientY));
    hit.addEventListener("mouseleave", () => {
      tooltip.hidden = true;
    });
  }

  function place(name: string, placed: PlacedBody): void {
    const n = nodes.get(name)!;
    n.disc.setAttribute("cx", String(placed.cx));
    n.disc.setAttribute("cy", String(placed.cy));
    n.disc.setAttribute("r", String(placed.r));
    n.label.setAttribute("x", String(placed.cx + placed.r + 5));
    n.label.setAttribute("y", String(placed.cy + 4));
    n.hit.setAttribute("cx", String(placed.cx));
    n.hit.setAttribute("cy", String(placed.cy));
    n.hit.setAttribute("r", String(Math.max(placed.r, HIT_R)));
  }

  function render(date: Date): void {
    const positions = getHeliocentricPositions(date);
    const byBody = new Map(positions.map((pos) => [pos.body, pos]));
    for (const p of PLANETS) {
      const pos = byBody.get(p.body)!;
      currentDistanceAU.set(p.name, pos.distanceAU);
      const input: LayoutInput = { angleRad: pos.angleRad, diameterKm: p.diameterKm, orbitRank: p.orbitRank };
      place(p.name, stylizedLayout(input));
    }
  }

  // --- Scroll-to-zoom camera (square viewBox, zoom toward the cursor) ---
  const MIN_SIZE = 40; // deepest zoom-in
  const MAX_SIZE = 4000; // furthest zoom-out
  let vb = { x: -VIEW, y: -VIEW, size: 2 * VIEW };

  svg.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      e.preventDefault();
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      // Cursor in SVG user coordinates (respects preserveAspectRatio).
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      const f = Math.exp(e.deltaY * 0.0015); // >1 zoom out, <1 zoom in
      const newSize = Math.min(MAX_SIZE, Math.max(MIN_SIZE, vb.size * f));
      const realF = newSize / vb.size;
      vb = {
        x: pt.x - (pt.x - vb.x) * realF,
        y: pt.y - (pt.y - vb.y) * realF,
        size: newSize,
      };
      svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.size} ${vb.size}`);
    },
    { passive: false },
  );

  return { svg, render };
}
