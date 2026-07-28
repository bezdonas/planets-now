import { getHeliocentricPositions } from "../astro/positions.ts";
import { PLANETS } from "../data/planets.ts";
import { type LayoutInput, type PlacedBody, stylizedLayout, stylizedOrbitRadius, SUN_CAP_R, VIEW } from "./scale.ts";

const SVG_NS = "http://www.w3.org/2000/svg";

function el<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

interface PlanetNodes {
  disc: SVGCircleElement;
  label: SVGTextElement;
}

export interface SceneController {
  svg: SVGSVGElement;
  /** Recompute positions for `date` and reposition planet discs + labels. */
  render(date: Date): void;
}

/**
 * Create the scene SVG and attach it to `mount`. Static elements (orbit rings,
 * Sun) are built once; planet discs/labels are repositioned by `render()`.
 * Phase 3: stylized mode only.
 */
export function createScene(mount: HTMLElement): SceneController {
  const svg = el("svg", {
    id: "scene",
    viewBox: `${-VIEW} ${-VIEW} ${2 * VIEW} ${2 * VIEW}`,
    preserveAspectRatio: "xMidYMid meet",
  });

  // Static: evenly-spaced orbit rings (stylized mode).
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

  // Planet discs + labels (repositioned each render).
  const bodies = el("g", { class: "bodies" });
  const nodes = new Map<string, PlanetNodes>();
  for (const p of PLANETS) {
    const disc = el("circle", { cx: 0, cy: 0, r: 0, fill: p.color, class: "planet" });
    const label = el("text", { x: 0, y: 0, class: "label planet-label" });
    label.textContent = p.name;
    bodies.appendChild(disc);
    bodies.appendChild(label);
    nodes.set(p.name, { disc, label });
  }
  svg.appendChild(bodies);
  mount.appendChild(svg);

  function place(name: string, placed: PlacedBody): void {
    const n = nodes.get(name)!;
    n.disc.setAttribute("cx", String(placed.cx));
    n.disc.setAttribute("cy", String(placed.cy));
    n.disc.setAttribute("r", String(placed.r));
    n.label.setAttribute("x", String(placed.cx + placed.r + 5));
    n.label.setAttribute("y", String(placed.cy + 4));
  }

  function render(date: Date): void {
    const positions = getHeliocentricPositions(date);
    const byBody = new Map(positions.map((pos) => [pos.body, pos]));
    for (const p of PLANETS) {
      const pos = byBody.get(p.body)!;
      const input: LayoutInput = {
        angleRad: pos.angleRad,
        distanceAU: pos.distanceAU,
        diameterKm: p.diameterKm,
        orbitRank: p.orbitRank,
      };
      place(p.name, stylizedLayout(input));
    }
  }

  return { svg, render };
}
