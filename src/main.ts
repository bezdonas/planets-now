import "./style.css";
import { createScene } from "./render/scene.ts";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app mount point missing");

const scene = createScene(app);

// What's true vs. simplified in this view. Kept honest — the only physically
// accurate quantity is each planet's direction (angle) around the Sun.
const NOTES: string[] = [
  "Real: each planet's direction from the Sun (heliocentric ecliptic longitude), computed live from ephemerides.",
  "Not to scale: orbit spacing is evenly spread for legibility — real distances span ~0.4 AU (Mercury) to ~30 AU (Neptune).",
  "Not to scale: planet sizes are exaggerated and only roughly graded — and unrelated to the distance scale.",
  "Not to scale: the Sun (a capped disc; the real Sun is ~109× Earth's width).",
  "Simplified shape: orbits drawn as circles — real orbits are ellipses.",
  "Flat 2D: everything is projected onto the ecliptic plane; orbital tilt (inclination) is ignored.",
  "Scope: the 8 planets only — no moons, no dwarf planets (e.g. Pluto).",
];

// HUD: clock + a toggle that reveals the accuracy notes.
const hud = document.createElement("div");
hud.id = "hud";

const clock = document.createElement("div");
clock.className = "hud-clock";

const notesToggle = document.createElement("button");
notesToggle.className = "hud-toggle";
notesToggle.type = "button";
notesToggle.textContent = "What's simplified?";

const notes = document.createElement("div");
notes.className = "hud-notes";
notes.hidden = true;
const notesList = document.createElement("ul");
for (const text of NOTES) {
  const li = document.createElement("li");
  li.textContent = text;
  notesList.appendChild(li);
}
notes.appendChild(notesList);

notesToggle.addEventListener("click", () => {
  notes.hidden = !notes.hidden;
  notesToggle.textContent = notes.hidden ? "What's simplified?" : "Hide notes";
});

hud.append(clock, notesToggle, notes);
app.appendChild(hud);

function renderPositions(): void {
  scene.render(new Date());
}

function renderClock(): void {
  clock.textContent = `as of ${new Date().toLocaleString()}`;
}

renderPositions();
renderClock();

// Positions creep imperceptibly per minute; the clock ticks every second.
const positionTimer = setInterval(renderPositions, 60_000);
const clockTimer = setInterval(renderClock, 1_000);

// Vite HMR: clear timers on dispose so reloads don't stack duplicates.
import.meta.hot?.dispose(() => {
  clearInterval(positionTimer);
  clearInterval(clockTimer);
});
