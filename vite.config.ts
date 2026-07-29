import { defineConfig } from "vite";

// GitHub Pages serves a project page under /<repo>/. Use that base only for the
// production build; keep dev + preview at "/" so localhost paths stay clean.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/planets-now/" : "/",
}));
