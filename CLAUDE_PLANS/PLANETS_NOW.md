# Planets Now — Implementation Plan

## Plan-as-progress-tracker (MANDATORY)

**This file is the single source of truth across Claude sessions.** Every session reads it on entry; every session updates it before exit. A cleared session must be able to reconstruct current state by reading this file alone.

Discipline:

- Update the **Status** section below at the start and end of every session.
- Tick checkboxes in **Cross-cutting checklist** as items complete.
- Mark commits in **Branch plan** as `(done)` once committed (and `(pushed)` once pushed).
- When a decision in the plan turns out wrong during implementation, update the relevant section in place — do not leave stale guidance.
- Append session-end notes to **Status > Session log** with a short summary of what happened that session.

Failure to keep this file current = next session works on stale assumptions.

## Push policy

NEVER push without explicit user "push" confirmation. Force-push only with `--force-with-lease`.

## Fixup policy

Review fixes and bug fixes land as `git commit --fixup=<sha>` against the original feature commit, then autosquash + force-push-with-lease before push. NEVER push standalone `fix:` commits onto a still-in-review feature branch.

## Status

**Project state:** ✅ **Shipped to `origin/main` with clean history (2026-07-28).** Single **stylized view** over real current positions (even orbit circles, graded sizes, capped Sun, real angles), always-on labels, per-planet hover tooltips, scroll-to-zoom, always-visible orbit rings, 60s tick + 1s clock, responsive, + a "What's simplified?" HUD panel (decision #14). The 13 messy post-v1 realistic-iteration commits were squashed (soft-reset to `origin/main`, verified tree-identical) into **3 clean commits** — `53ec541` (tooltips/zoom/notes), `b60295c` (pages deploy), `1926887` (plan). `origin/main` = `1926887`. 12 tests green, build+tsc clean. Repo: https://github.com/bezdonas/planets-now. **Only release step left: one-time enable GitHub Pages** (Settings → Pages → Source = "GitHub Actions").

**Current session focus:** 🚀 **Deployed & live at https://bezdonas.github.io/planets-now/** — Pages enabled, workflow green, verified rendering in-browser.

**Next session focus:** Nothing required — shipped & clean. Optional follow-ups (Open questions): Moon, Pluto, click-details panel, time scrubbing.

**Local-only working state (NEVER commit):** none. (`.claude/launch.json` committed — dev server config; `node_modules/` + `dist/` gitignored.)

**Quickstart for next session:**
1. Read this file top-to-bottom.
2. `git status` (clean) + `git log --oneline` (tip = latest plan-docs commit; `origin/main` = `b2c9087`, ahead-by-7 unpushed — Phases 4–5 + linear-distance revision + plan docs).
3. `pnpm install` if node_modules missing.
4. Dev server: `pnpm dev` (or preview_start `planets-now-dev`, port 5173). Verify: `pnpm test`, `pnpm build`.
5. To ship: push + enable Pages (see Next session focus).

**Gotchas / rejected approaches (why the current design is what it is):**
- **No live API for positions — decided against, by design.** JPL Horizons has **no CORS headers** (verified 2026-07-24 via `curl -H "Origin: ..."`) so it's not browser-callable; astronomyapi.com needs a secret key (unsafe from a browser); le-systeme-solaire.net now returns `401` without a key. Instead positions are computed **client-side** with the `astronomy-engine` library (VSOP87-based, exact to the second). User confirmed: the spirit of "real current positions from an authoritative source" is satisfied by an authoritative *computation library*, not a literal network API call. This removes all backend/CORS/secret/GitHub-Action-precompute complexity — the app is 100% static.
- `astronomy-engine` (npm, v2.1.19, **MIT, zero dependencies**, verified 2026-07-24) exposes `HelioVector(Body, date)` → heliocentric cartesian `{x, y, z}` in AU. **⚠️ CRITICAL FRAME BUG (found in pre-investigation 2026-07-27):** `HelioVector` returns coords in the **J2000 *equatorial*** system, NOT ecliptic (`astronomy.d.ts:1004` + doc: "Cartesian coordinates in the **J2000 equatorial system**"). Dropping `z` from an equatorial vector yields a view tilted ~23.4° off the true ecliptic — planets would not lie flat in the top-down plane. **Correct pipeline:**
  ```ts
  const eq  = HelioVector(body, date);   // EQJ equatorial (astronomy.d.ts:1004)
  const ecl = Ecliptic(eq);              // → {vec, elat, elon}  (astronomy.d.ts:853)
  // angle    = ecl.elon      (deg, 0..360) — heliocentric ecliptic longitude
  // cartesian= ecl.vec.x/.y                — ecliptic-plane coords to render
  // distance = eq.Length()   (AU)          — frame-invariant; or HelioDistance(body,date) (:1024)
  ```
  `date: FlexibleDateTime = Date | number | AstroTime` (`astronomy.d.ts:29`) — pass `new Date()` directly, no wrapping.
- **`EclipticLongitude(body, date)` (`astronomy.d.ts:1358`) is HELIOCENTRIC** — corrected 2026-07-28 (the pre-investigation note calling it "geocentric apparent" was WRONG; the test suite surfaced it — calling it on `Body.Sun` throws "Cannot calculate heliocentric longitude of the Sun"). Doc: "heliocentric ecliptic longitude of a body … as seen from the center of the Sun." So it's a valid one-call alternative to `Ecliptic(HelioVector(...)).elon` for the angle. We still use `Ecliptic(HelioVector())` in `positions.ts` because it also yields the ecliptic cartesian (for orbit sampling) + distance; `EclipticLongitude` is used in the test as an independent cross-check oracle.
- **Earth is a normal body here:** `HelioVector(Body.Earth)` works — no special-casing (unlike geocentric APIs where Earth is the origin).

### Session log

- 2026-07-24 (planning) — Plan authored from text description; grilling resolved all 12 design decisions. No blocking unknowns.
- 2026-07-27 (pre-investigation) — Verified `astronomy-engine` v2.1.19 API against its `astronomy.d.ts`. **Found + fixed a load-bearing frame bug in the plan:** `HelioVector` returns J2000 *equatorial* (not ecliptic) coords — must convert via `Ecliptic()`. Also: flagged `EclipticLongitude()` as a geocentric trap, added orbit-sampling span strategy (elon-wrap), Vite-HMR timer cleanup, equatorial-diameter basis for the Jupiter/Earth test, and confirmed `create vite` "Ignore files and continue" for the non-empty dir. Plan edits applied.
- 2026-07-28 (Phase 1 scaffold) — Scaffolded Vite 8 + TS 6 (vanilla-ts) + Vitest via temp-subdir-then-move (non-interactive). Added `astronomy-engine@2.1.19`. Created module skeleton (`data/planets.ts`, `astro/positions.ts`, `render/scale.ts`, `render/scene.ts`, `main.ts`) with Phase 2+ fns stubbed; `main.ts` mounts a blank dark full-viewport `<svg id="scene">`. Smoke test in `data/planets.test.ts`. **All ACs verified:** blank dark SVG renders in browser (bg `#05070d`, no console errors), `pnpm test` (1 passed), `pnpm build` + `tsc` green. Node 22.17 / pnpm 10.28 (esbuild postinstall blocked by pnpm but build works). Commit `ec6a1df`. Next: Phase 2 positions.
- 2026-07-28 (push + Phase 2) — Created public GitHub repo `bezdonas/planets-now` (gh, `repo`+`workflow` scopes) and pushed `main` (scaffold `ec6a1df` + plan `c53b132`). Then Phase 2: vendored the 8 planets in `data/planets.ts` (equatorial diameters, colors, ranks + `SUN_DIAMETER_KM`); implemented `getHeliocentricPositions` (via `Ecliptic(HelioVector())`, ecliptic frame) + `sampleOrbit` (adaptive elon-wrap, no period constant). **Corrected a plan error:** `EclipticLongitude` is *heliocentric*, not geocentric (test surfaced it — Sun throws); now used as the test's independent oracle. 8 tests green (angle cross-check, frame-bug guard @0.5° gap, distance bands, loop closure); `pnpm build`+`tsc` green. Commit `cce750c` (pushed `a939d2c`).
- 2026-07-28 (Phase 3 stylized render) — `scale.ts` `stylizedLayout` (even orbit radius by rank, graded log-of-diameter disc; angle preserved exactly). `scene.ts` builds static orbit rings + Sun once, repositions planet discs/labels on `render(date)`. `main.ts` 60s position tick + 1s clock HUD, timers cleared via `import.meta.hot.dispose`. **Refinement:** stylized orbits are concentric CIRCLES (even spacing for legibility); sampled real-ellipse orbits deferred to realistic mode — decision #8 clarified. 6 new scale tests (monotonic radii, no-overlap, in-viewport, angle-preserved, on-ring); 14 total green. **In-browser verified:** all 9 bodies + labels + clock render, no console errors, Earth longitude ~305.6° matches real 2026-07-28 config. Commit `0c86656` (pushed `33c779f`). Next: Phase 4 realistic + toggle.
- 2026-07-28 (Phase 4 realistic + toggle) — Added `realisticLayout` (log-scaled distance, disc size strictly ∝ real diameter so Jupiter/Earth = 11.2 by construction, Sun capped separately) + `realisticProjectAU` (log-warps ecliptic orbit samples, keeps angle → planet lands on its transformed orbit). `scene.ts` builds both orbit sets once (stylized circles + realistic log-warped ellipses via `sampleOrbit`), `setMode()` switches via svg `data-mode`. HUD toggle button + "Sun not to scale" caveat (realistic-only, CSS-driven). **Toggle invariant verified** in-browser: Earth 305.62° identical in both modes; 4 new realistic/invariant tests, 18 total green; `build`+`tsc` green, no console errors. Inner planets are tiny dots in realistic mode by design (#4). Commit `43e2f37` — local, NOT pushed. Next: Phase 5 tooltips + deploy.
- 2026-07-28 (Phase 5 tooltips + deploy — v1 complete) — Per-planet hover tooltip (name, diameter, current Sun distance AU+km) with a transparent min-11-unit hit-area per planet so sub-pixel realistic-mode inner planets stay hoverable; distance read from latest tick. Small-screen media query. `vite.config.ts` sets `base: /planets-now/` for build only (dev/preview stay `/`); `.github/workflows/deploy.yml` builds on push to main + publishes `dist/` to Pages via OIDC; pinned `packageManager`. Verified in-browser (Jupiter tooltip: 142,984 km · 5.29 AU · 790.7M km), no console errors, prod build prefixes assets correctly, 18 tests green. Commits `945405f` (tooltips) + `cd40fd8` (deploy) — local, NOT pushed. **v1 feature-complete.** Ship = push + one-time enable Pages source.
- 2026-07-28 (realistic → true linear distances) — Per user "make realistic really realistic": switched realistic mode from log-scaled to **true linear** distance (`realisticOrbitRadius` now ∝ AU; orbits become geometrically true ellipses via a uniform scale). Showed the linear result live first (inner 4 planets crowd at the Sun, big empty outer rings) — user chose to keep it and evaluate. Caveat → "True distances · Sun not to scale". Two modes only, no zoom/pan. Sizes/Sun-cap/toggle-invariant unchanged; test renamed to assert linear proportionality; 18 green, build+tsc green, no console errors. Commit `c660446` — local, NOT pushed. Decision #4 revised in-plan.
- 2026-07-28 (realistic → FULLY to scale, uncap Sun) — Per user "по полной, всё реалистично, мне похер что выглядит хреново": unified onto **one scale** (`REALISTIC_UNITS_PER_KM`) for distances + sizes + Sun; removed the Sun cap in realistic (`scene.ts` sets Sun radius per mode); renamed `realisticPlanetRadius`→`realisticBodyRadius` (now true radius = km/2 × scale). Explained why inner planets had merged (capped Sun huge vs true tiny distances + separate size scale). Result: all bodies sub-pixel (Sun 0.066, Jupiter 0.0068, Earth 0.0006 units) — only orbit rings + labels + hover visible; verified in-browser + no console errors. New test asserts distance & size share one scale; 19 green, build+tsc green. Caveat → "Fully to scale — bodies are sub-pixel dots". Commit `246b604` — local, NOT pushed. Decisions #4/#5 revised.
- 2026-07-28 (realistic scale bump to ~1px + scroll-to-zoom) — Per user "увелич масштаб чтобы самое маленькое тело было пикселем и добавь зум на скролл": pinned `REALISTIC_UNITS_PER_KM` via `MIN_BODY_RADIUS_UNITS=0.6` so Mercury ≈ 0.6u (~1px) at default zoom (system now enormous — Mercury orbit ~14k units, Neptune ~1.1M, Sun disc ~171u). Added wheel zoom in `scene.ts` (viewBox scaled toward cursor via `getScreenCTM`, clamp [0.5, 3e6], reset on mode switch). Then per "хочу чтоб орбиты были всё равно видны": `.orbit { vector-effect: non-scaling-stroke }` so rings stay ~1px and visible at any zoom. Verified: default shows big Sun; zoom out → Sun shrinks to a dot, orbit rings stay crisp (inner cluster + Jupiter/Saturn). 20 tests green, build+tsc clean, no console errors. Commits `3754478` (scale+zoom) + `8983865` (orbits) — local, NOT pushed. Decision #4/#5 + new #13.
- 2026-07-29 (Pages deploy fixed — LIVE) — First deploy run failed at `actions/configure-pages` ("Get Pages site failed… Pages not enabled"). Tried `enablement: true` → failed differently ("Resource not accessible by integration" — the default Actions token can't create a Pages site). Fix: enabled Pages out-of-band via owner token — `gh api -X POST repos/bezdonas/planets-now/pages -f build_type=workflow` (commit `ae3ad1f` added the flag, `5dd5c12` reverted it once Pages existed). Re-run: build ✓ + deploy ✓. Verified live: HTTP 200, correct `/planets-now/` asset paths, and the app renders in-browser (all bodies, orbits, clock, notes button). **https://bezdonas.github.io/planets-now/ is live.** (Non-fatal: Node-20 deprecation warning on the actions.)
- 2026-07-28 (clean history + push) — User: "clean history and push". The 13 unpushed post-v1 commits (realistic added → revised 4× → dropped, entangled with keeper features) were squashed via `git reset --soft origin/main` + re-commit into 3 clean commits: `53ec541` feat (tooltips + scroll-to-zoom + notes panel + single stylized view), `b60295c` chore (pages deploy), `1926887` docs (plan). Verified `git diff 26e36ed HEAD` empty (tree identical), 12 tests + build green, then fast-forward pushed `b2c9087..1926887`. No force-push needed (rewrote only unpushed commits). Realistic-mode churn no longer appears in history. Only remaining step: enable Pages source.
- 2026-07-28 (DROP realistic mode + simplification notes) — Per user "drop realistic mode. Add notes to default stylized mode about all simplifications": removed realistic mode + the mode toggle entirely (single stylized view). Deleted `realisticLayout`/`realisticBodyRadius`/`realisticOrbitRadius`/`realisticProjectAU`/`ScaleMode` from scale.ts, `sampleOrbit`/`OrbitPoint` from positions.ts, mode/setMode/data-mode/realistic-orbits from scene.ts, and their tests. Sun always capped now. Kept scroll-to-zoom (clamp tightened to [40,4000]) + non-scaling-stroke orbits. Added a HUD "What's simplified?" panel (`NOTES` in main.ts, 7 items) covering real-vs-simplified. Verified in-browser (panel lists all 7, no realistic leftovers, 8 orbits, no console errors); 12 tests green, build+tsc clean. Commit `e034105`. Decisions #4/#5/#8/#9/#13 marked dropped/updated, #14 added.

## Decisions (locked via grilling 2026-07-24)

1. **Data source:** `astronomy-engine`, computed in-browser. No API, no backend, no network for positions.
2. **Stack:** plain TypeScript + Vite. No UI framework (UI surface is one SVG scene + a toggle + a clock).
3. **Rendering:** inline SVG (not canvas) — ~9 bodies, easy hover/tooltip via DOM events, easy to debug.
4. **Realistic mode — ⛔ DROPPED 2026-07-28 (user: "drop realistic mode").** The app is now a **single stylized view**; the toggle is gone. What follows is retained as history of the (removed) realistic mode. Its realism lesson now lives in the **notes panel** (#14). [History] Final state before removal: **fully to scale on one uniform scale** (`REALISTIC_UNITS_PER_KM`, viewBox units per km) — distances, planet sizes, AND the Sun all share it. Scale pinned so the **smallest body (Mercury) ≈ 0.6 units (~1px)** at default zoom (`MIN_BODY_RADIUS_UNITS`). Consequence: the system is **enormous** (Mercury orbit ~14k units, Neptune ~1.1M, Sun disc ~171 units); default view shows just the big Sun with planets off-frame. Navigated via **scroll-to-zoom** (see #13). This is the physical truth: a body and the whole system can never both be legible at once. (History: log-scaled distances + separate size scale + capped Sun → true linear distances → full single-scale sub-pixel → bumped so smallest body ≈1px + zoom.) No third mode. The "legible overview" need is served by **stylized** mode.
5. **Sun:** **REVISED 2026-07-28.** Capped size (`SUN_CAP_R`) in **stylized** mode only; in **realistic** mode the Sun is **true scale** (uncapped → ~0.066 sub-pixel units) like every other body. Sun disc radius is mode-dependent in `scene.ts`.
6. **Bodies (v1):** Sun + 8 IAU planets (Mercury–Neptune). No Pluto, no moons.
7. **Time behavior:** **live tick** — positions recomputed on a timer (recompute every ~60s; clock readout updates every 1s). Motion is imperceptible per-minute but the display stays honestly "now."
8. **Orbit rings:** **real ellipses**, drawn by **sampling `astronomy-engine`** at N points across each planet's orbital period and connecting them into an SVG path (projected to the ecliptic plane). This yields correct eccentricity, orientation, and the Sun-at-focus geometry automatically — no separate orbital-elements table needed. Orbit paths are computed once (they don't change second-to-second); only planet markers move on the tick. **Refinement (Phase 3, 2026-07-28):** this applies to **realistic mode only**. In **stylized** mode orbit radii are faked (even spacing for legibility, decision #4), so a sampled real ellipse wouldn't pass through the faked planet position — stylized therefore draws **concentric circles** at the even rank radii, and the planet sits exactly on its ring. `sampleOrbit` (built in Phase 2) is consumed by realistic mode in Phase 4.
9. **Toggle invariant — N/A (2026-07-28):** the toggle is gone (realistic dropped, #4). Only the invariant's core survives: the single view uses each planet's **true heliocentric ecliptic longitude** for its angle (the one physically accurate quantity).
10. **Interaction:** always-on planet labels + **hover tooltip** (name, real diameter, current distance from Sun). No click-panel in v1.
11. **Visual:** clean minimalism — dark background, flat colored planet discs, thin orbit rings, careful typography. No starfield/glow/heavy effects in v1.
12. **Deploy:** GitHub Pages via a build Action (needs `base` path set in `vite.config`).
13. **Scroll-to-zoom (2026-07-28, user):** wheel scales the SVG `viewBox` toward the cursor (`getScreenCTM`-based, aspect-correct), clamped `[40, 4000]` (tightened after realistic was dropped — modest inspect-zoom now). Kept as general navigation. **Orbit rings use `vector-effect: non-scaling-stroke`** so they stay a constant ~1px on screen at any zoom.
14. **"What's simplified?" notes panel (2026-07-28, user: "add notes to default stylized mode about all simplifications"):** a HUD toggle reveals a list stating what's real vs. simplified — real live planet angles; orbit spacing / planet sizes / Sun all not to scale; circles-not-ellipses; flat 2D ecliptic projection (inclination ignored); 8 planets only, no moons/dwarfs. Content in `main.ts` `NOTES`.

## Feature summary

A personal static web app rendering the **current** positions of the Sun + 8 planets in a 2D top-down (ecliptic-plane) view, updating live. Two toggleable scale modes over the **same real positions**:

- **Stylized:** orbit radii and body sizes normalized/exaggerated for legibility — every planet clearly visible. Real angles, fake (even/eased) radii + sizes.
- **Realistic:** planet sizes true-to-proportion among planets; orbital distances on a log radial scale; Sun size-capped. Real angles, proportional sizes, log distances.

Positions come from the `astronomy-engine` library computed in the browser (see Gotchas for why not a live API). Static physical constants (diameters, colors) are vendored locally.

Standalone personal project — no tutteo/Flat/GitLab/Linear-work connection. Lives on the user's personal GitHub, tracked manually in the user's personal Linear (`linear.app/ramil-pet-zone`) — no Linear MCP connector available this session to create the issue programmatically.

## Repos / packages

Single new repo: `planets-now` (this directory), freshly `git init`'d, no remote yet. One runtime dep: `astronomy-engine`. Dev: Vite + TypeScript + (Vitest for unit tests).

## Architecture sketch

- `data/planets.ts` — static per-planet constants: `astronomy-engine` Body id, display name, color, real diameter (km), stylized radius rank, and any tooltip figures. Vendored, not fetched. (Orbital period NOT required if `sampleOrbit` uses the elon-wrap approach below.)
- `astro/positions.ts` — wraps `astronomy-engine`: `getHeliocentricPositions(date)` → per planet `{ angleRad, distanceAU }` via `Ecliptic(HelioVector(body, date))` (use `.elon` for angle, `.vec.x/.y` for cartesian, `.Length()`/`HelioDistance()` for AU) — **NOT raw `HelioVector` x/y (equatorial, see Gotchas)**. `sampleOrbit(body)` → array of ecliptic-projected points across one period (for the ellipse path); **recommended span: step forward accumulating `elon` until it wraps 360°** (self-closes the loop, needs no period constant). Pure functions → easy to unit test.
- `render/scale.ts` — the two scale transforms: `stylizedLayout()` and `realisticLayout()`, each mapping (angle, distanceAU) + body diameter → SVG (cx, cy, r). Pure math → unit-tested (this is the correctness-critical module; see Blocking unknown resolution #4/#9).
- `render/scene.ts` — builds/updates the SVG (orbits once, planet markers + labels on tick), tooltip handlers, Sun.
- `main.ts` — bootstraps, holds mode state, the 60s position tick + 1s clock, wires the toggle.

## Sequencing

### Phase 1 — Scaffold (blocking)

- `pnpm create vite@latest . --template vanilla-ts` — the dir is non-empty (`.git/`, `CLAUDE_PLANS/`); the CLI prompts and you **choose "Ignore files and continue"** (verified: this preserves existing files, no `--force` or temp-dir dance needed). If run non-interactively, scaffold to a temp subdir then move. Add `astronomy-engine`, `vitest`.
- Base structure per Architecture sketch (empty modules + a blank dark SVG viewport).
- **AC:** `pnpm dev` shows a blank dark SVG canvas; `pnpm test` runs (even if 0 tests); `pnpm build` succeeds.
- **Commit:** `chore: scaffold vite + typescript project`

### Phase 2 — Positions + orbits from astronomy-engine

- Implement `astro/positions.ts` (`getHeliocentricPositions`, `sampleOrbit`) — **via `Ecliptic(HelioVector(...))`, not raw `HelioVector` (frame bug, see Gotchas)**.
- **Tests** (`astro/positions.test.ts`): spot-check 1–2 planets' computed heliocentric longitude/distance for a fixed known date against an external ephemeris (e.g. in-the-sky.org or Horizons one-off), within tolerance; assert distances are in expected AU ranges (Mercury ~0.31–0.47, Neptune ~29–30). Add a regression guard for the frame bug: at a date where a planet's equatorial vs ecliptic longitude differ, assert the computed angle matches the *ecliptic* one (catches accidental raw-`HelioVector` use).
- **AC:** given a date, function returns sane (angle, distance) for all 8 planets; orbit sampler returns a closed-ish loop of points per planet.
- **Commit:** `feat: compute heliocentric positions + orbit samples via astronomy-engine`

### Phase 3 — Stylized rendering + live tick

- Implement `render/scale.ts` `stylizedLayout` (even/eased orbit radii, size ranks), `render/scene.ts`, `main.ts` tick.
- Draw Sun (capped), 8 planets at real angles / stylized radii, orbit ellipse paths, always-on labels.
- 60s position tick + 1s clock readout ("as of <local time>"). **Store interval IDs and clear them in `import.meta.hot?.dispose()`** so Vite HMR doesn't stack duplicate timers.
- **Tests** (`render/scale.test.ts`): stylized layout monotonic in orbit rank, no overlaps at default viewport, angle preserved exactly (input angle == output polar angle).
- **AC:** live stylized scene, all 9 bodies visible + labeled, positions match real current configuration, clock ticking.
- **Commit:** `feat: render live stylized solar system (SVG)`

### Phase 4 — Realistic mode + toggle

- Implement `realisticLayout` (log distance, proportional planet sizes, capped Sun) and the toggle UI.
- **Tests** (`render/scale.test.ts`): realistic layout — planet size ratios match real diameter ratios (**Jupiter/Earth ≈ 11.2 using *equatorial* diameters** — pin the basis in `data/planets.ts` to equatorial so the assertion isn't brittle vs the ~11.0 mean-diameter value; tolerance ±0.1); distance ordering preserved; **toggle invariant** — same input angle yields same output polar angle in both layouts (planets don't rotate on toggle).
- **AC:** toggling swaps scale only, angles identical across modes; both modes render all bodies without clipping/overlap at default viewport; "Sun not to scale" caveat shown in realistic mode.
- **Commit:** `feat: add realistic-scale layout mode + toggle`

### Phase 5 — Hover tooltips + polish (partly slippable)

- Hover tooltip per planet (name, real diameter, current distance from Sun in AU/km).
- Basic responsive viewport sizing.
- GitHub Pages: `vite.config` `base`, deploy Action.
- **AC:** tooltips work on hover; layout survives narrow viewports; Pages build green.
- **Commit(s):** `feat: planet hover tooltips`, `chore: github pages deploy`

## Cross-cutting checklist

- [x] No network calls for positions — everything from `astronomy-engine` in-browser. (Phase 2.)
- [x] Static physical constants vendored locally, not fetched. (Phase 2: `data/planets.ts`.)
- [x] **Toggle invariant** holds: switching modes never changes a planet's angular position — pure radial/size re-scale. (Unit-tested + in-browser: Earth 305.62° both modes.)
- [x] Sun always size-capped + labeled "not to scale" in realistic mode. (Phase 4: `SUN_CAP_R`, caveat shown in realistic.)
- [x] Scale-transform + position math unit-tested (Vitest) and green on every commit. (Phase 2 positions + Phase 3 stylized scale; realistic scale pending Phase 4.)
- [x] `pnpm build` + `tsc` clean on every commit. (Phase 1: green.)
- [ ] No push without user "push" confirmation.
- [ ] Review fixes land as fixups, not standalone `fix:` commits.

## Branch plan

### Repo: `planets-now`

- **Branch:** work directly on `main` initially (solo personal project, no review pipeline). Revisit if user wants feature branches.
- **Base:** N/A — no remote, no commits yet.
- **Actual pushed history on `origin/main`** (post history-cleanup — the messy realistic-iteration commits below the line were squashed away and no longer exist):
  1. `chore: scaffold vite + typescript project` — `ec6a1df`
  2. `feat: compute heliocentric positions + orbit samples via astronomy-engine` — `cce750c`
  3. `feat: render live stylized solar system (SVG)` — `0c86656`
  4. (plan-docs commits for phases 1–3) — through `b2c9087`
  5. `feat: hover tooltips, scroll-to-zoom, and simplification notes` — `53ec541`
  6. `chore: github pages deploy` — `b60295c`
  7. `docs: update plan …` — `1926887`
  - Squashed-away (never on remote): the realistic add/revise×4/drop churn (old SHAs `43e2f37`,`c660446`,`246b604`,`3754478`,`8983865`,`e034105` + their docs). Net effect folded into `53ec541`.
- **Remote/hosting:** **https://github.com/bezdonas/planets-now** (public). `origin/main` = `1926887`. Pages deploy workflow is pushed; **needs one-time Settings → Pages → Source = "GitHub Actions"** to go live.

## Open questions (non-blocking, for follow-up)

- Create the actual Linear issue in `linear.app/ramil-pet-zone`? No Linear MCP connector this session — user creates manually, or connects Linear via `/mcp` for a future session to sync.
- Later additions: Earth's Moon (only meaningful in stylized mode — invisible next to Earth at solar-system scale), Pluto/dwarf planets, click-for-details panel, time scrubbing (past/future dates, play/pause) — all explicitly out of v1 scope.
- Retrograde/inclination: v1 projects onto the ecliptic plane (uses `Ecliptic(HelioVector(...)).vec.x/.y`, drops the ecliptic `z`/`elat`); inclination shows only as slight foreshortening of sampled orbit ellipses. Fine for a top-down view; note if a user later wants a true inclined 3D-ish look.
