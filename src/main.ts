import "./style.css";
import { createScene } from "./render/scene.ts";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app mount point missing");

const scene = createScene(app);

const hud = document.createElement("div");
hud.id = "hud";
app.appendChild(hud);

function renderPositions(): void {
  scene.render(new Date());
}

function renderClock(): void {
  hud.textContent = `as of ${new Date().toLocaleString()}`;
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
