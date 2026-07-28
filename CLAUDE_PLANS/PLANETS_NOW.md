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

**Project state:** Planning complete + pre-investigated (2026-07-27). All decisions locked; library API verified against `astronomy.d.ts`. Repo `git init`'d, no code yet, no remote.

**Current session focus:** planning (grilling + pre-investigation done)

**Next session focus:** Start implementation at Phase 1 (scaffold Vite + TS). No blocking unknowns remain.

**Local-only working state (NEVER commit):** none yet

**Quickstart for next session:**
1. Read this file top-to-bottom.
2. `git status` to confirm repo state.
3. Begin Phase 1 — everything is decided; go straight to `pnpm create vite`.

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
- **⚠️ Do NOT use `EclipticLongitude(body, date)` (`astronomy.d.ts:1358`)** — it's the standard *geocentric apparent* ecliptic longitude, not heliocentric. For planet-around-Sun angle, always use `Ecliptic(HelioVector(...)).elon`.
- **Earth is a normal body here:** `HelioVector(Body.Earth)` works — no special-casing (unlike geocentric APIs where Earth is the origin).

### Session log

- 2026-07-24 (planning) — Plan authored from text description; grilling resolved all 12 design decisions. No blocking unknowns.
- 2026-07-27 (pre-investigation) — Verified `astronomy-engine` v2.1.19 API against its `astronomy.d.ts`. **Found + fixed a load-bearing frame bug in the plan:** `HelioVector` returns J2000 *equatorial* (not ecliptic) coords — must convert via `Ecliptic()`. Also: flagged `EclipticLongitude()` as a geocentric trap, added orbit-sampling span strategy (elon-wrap), Vite-HMR timer cleanup, equatorial-diameter basis for the Jupiter/Earth test, and confirmed `create vite` "Ignore files and continue" for the non-empty dir. Plan edits applied.

## Decisions (locked via grilling 2026-07-24)

1. **Data source:** `astronomy-engine`, computed in-browser. No API, no backend, no network for positions.
2. **Stack:** plain TypeScript + Vite. No UI framework (UI surface is one SVG scene + a toggle + a clock).
3. **Rendering:** inline SVG (not canvas) — ~9 bodies, easy hover/tooltip via DOM events, easy to debug.
4. **Realistic-mode scale:** planet **sizes** true-to-proportion *among the planets* (Jupiter ~11× Earth); orbital **distances** on a **logarithmic** radial scale so all 8 orbits stay visible/spaced. Planet-size scale and distance scale are **independent** free coefficients tuned for legibility.
5. **Sun:** rendered at a **separate capped size** (NOT 109× Earth) — labeled "Sun not to scale." Planets keep their mutual proportions; the Sun opts out of the planet size scale.
6. **Bodies (v1):** Sun + 8 IAU planets (Mercury–Neptune). No Pluto, no moons.
7. **Time behavior:** **live tick** — positions recomputed on a timer (recompute every ~60s; clock readout updates every 1s). Motion is imperceptible per-minute but the display stays honestly "now."
8. **Orbit rings:** **real ellipses**, drawn by **sampling `astronomy-engine`** at N points across each planet's orbital period and connecting them into an SVG path (projected to the ecliptic plane). This yields correct eccentricity, orientation, and the Sun-at-focus geometry automatically — no separate orbital-elements table needed. Orbit paths are computed once (they don't change second-to-second); only planet markers move on the tick.
9. **Toggle invariant (CRITICAL):** **real angular positions in BOTH modes.** The stylized⇄realistic toggle changes ONLY the radial scale (orbit radii) and body sizes. A planet's *direction from the Sun* is its true current heliocentric ecliptic longitude in both modes — planets never "jump" around the ring when toggling. Both pictures show the same real current configuration at different scales.
10. **Interaction:** always-on planet labels + **hover tooltip** (name, real diameter, current distance from Sun). No click-panel in v1.
11. **Visual:** clean minimalism — dark background, flat colored planet discs, thin orbit rings, careful typography. No starfield/glow/heavy effects in v1.
12. **Deploy:** GitHub Pages via a build Action (needs `base` path set in `vite.config`).

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

- [ ] No network calls for positions — everything from `astronomy-engine` in-browser.
- [ ] Static physical constants vendored locally, not fetched.
- [ ] **Toggle invariant** holds: switching modes never changes a planet's angular position — pure radial/size re-scale. (Unit-tested.)
- [ ] Sun always size-capped + labeled "not to scale" in realistic mode.
- [ ] Scale-transform + position math unit-tested (Vitest) and green on every commit.
- [ ] `pnpm build` + `tsc` clean on every commit.
- [ ] No push without user "push" confirmation.
- [ ] Review fixes land as fixups, not standalone `fix:` commits.

## Branch plan

### Repo: `planets-now`

- **Branch:** work directly on `main` initially (solo personal project, no review pipeline). Revisit if user wants feature branches.
- **Base:** N/A — no remote, no commits yet.
- **Commits planned (conventional, atomic):**
  1. `chore: scaffold vite + typescript project`
  2. `feat: compute heliocentric positions + orbit samples via astronomy-engine`
  3. `feat: render live stylized solar system (SVG)`
  4. `feat: add realistic-scale layout mode + toggle`
  5. `feat: planet hover tooltips`
  6. `chore: github pages deploy`
- **Remote/hosting:** personal GitHub + GitHub Pages. Create repo + push only after explicit "push" confirmation (push policy).

## Open questions (non-blocking, for follow-up)

- Create the actual Linear issue in `linear.app/ramil-pet-zone`? No Linear MCP connector this session — user creates manually, or connects Linear via `/mcp` for a future session to sync.
- Later additions: Earth's Moon (only meaningful in stylized mode — invisible next to Earth at solar-system scale), Pluto/dwarf planets, click-for-details panel, time scrubbing (past/future dates, play/pause) — all explicitly out of v1 scope.
- Retrograde/inclination: v1 projects onto the ecliptic plane (uses `Ecliptic(HelioVector(...)).vec.x/.y`, drops the ecliptic `z`/`elat`); inclination shows only as slight foreshortening of sampled orbit ellipses. Fine for a top-down view; note if a user later wants a true inclined 3D-ish look.
