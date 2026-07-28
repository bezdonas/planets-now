import "./style.css";
import { createScene } from "./render/scene.ts";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app mount point missing");

createScene(app);
