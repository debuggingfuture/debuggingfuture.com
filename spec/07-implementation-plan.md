# 07 — Implementation Plan

A phased rollout. **Each phase ships to production**, on the existing `master` deploy pipeline. No big-bang rewrites, no long-lived feature branches. The goal at every phase boundary is "the site is better than yesterday and not worse in any dimension."

Branch naming: `df/astronomy-theme-p<N>-<slug>`. Each phase merges to `master` independently.

## Phase 0 — Foundation (target: 3–5 days)

Goal: spec frozen, scaffolding in place, site **visually unchanged** to visitors.

- [ ] Spec reviewed and merged (this PR).
- [ ] Decide `SITE_GEO` default ([08-open-questions.md](./08-open-questions.md) Q1). Add to `src/consts.ts`.
- [ ] Pick star catalog source ([Q2](./08-open-questions.md)). Bake initial `stars-default.json`, `constellations.json`, `tz-geo.json` via `scripts/build-sky-data.ts`.
- [ ] Implement `src/astronomy/` module surface with stubs returning sane values.
- [ ] Write the golden-value tests for sun, moon, sidereal time. Tests pass.
- [ ] Add CI: `pnpm test` on every push. Lighthouse-CI baseline captured for budgets.
- [ ] Wire frontmatter additions in `content.config.ts` (all optional; existing posts unaffected).
- [ ] Read-through of every existing route; confirm no behavior change.

**Ship gate:** unit tests green, Lighthouse scores unchanged from `master`, no visible diff on the deployed preview.

## Phase 1 — Static Sky (L0/L1) (target: 1 week)

Goal: every page has a real, time-anchored sky baked at build time. JS still optional.

- [ ] Implement `computeSkyState`, `paletteFor`. All pure functions, fully tested.
- [ ] Add `<style is:inline>` block in `BaseHead.astro` populated from `cssVars`.
- [ ] Add `SkyBackground.astro` (no-JS variant first): `position: fixed` div with the gradient layers wired to CSS vars.
- [ ] Add the **content card backplate** with adaptive `--content-bg`. Verify content remains pinned to existing 720px column.
- [ ] Build-time SVG star fallback for night-anchored posts (`scripts/bake-svg-stars.ts`).
- [ ] Add the **contrast lint test** in CI. Tune palette table until every state passes.
- [ ] Add `prefers-reduced-motion`, `prefers-contrast`, `prefers-color-scheme` CSS branches.
- [ ] Add the sky caption (`<figcaption>`) under post titles.
- [ ] Add the new `/sky` explainer page with toggles UI placeholders (inert in this phase).

**Ship gate:** site visibly transformed on JS-disabled browsers. Existing posts render with their original date as anchor. WCAG AAA contrast passing on every route. Performance budgets unchanged or better.

## Phase 2 — Live Sky (L2/L3) (target: 1 week)

Goal: home page updates to NOW; visitor can opt into geolocation.

- [ ] Hydrate `SkyBackground` with `client:idle`. JS reads `data-sky-anchor`.
  - `now` → recompute every minute, smooth-tween palette over 1.5 s on each step.
  - `post` → no override; just attach the slow drift (still an island, but read-only).
- [ ] Add the geolocation toggle on `/sky`. On grant, persist to `localStorage`; recompute home/index sky.
- [ ] Add the timezone-derived geo fallback for home pages without geolocation.
- [ ] Update sky caption live via `aria-live="polite"`.
- [ ] Add **slow horizon-glow parallax** with pointer X (capped, disabled on touch and reduced-motion).
- [ ] Add Page Visibility API integration; pause sky updates on hidden tabs.

**Ship gate:** visiting the home page after sundown shows a night sky; the same page in the morning shows dawn. Old posts continue to show their published-date sky and do not flicker on hydration. JS disabled still works. JS critical path under 6 KB gzipped.

## Phase 3 — Stars and Constellations (L4) (target: 2 weeks)

Goal: the visual centerpiece. Real stars, real constellation lines, the moon with phase.

- [ ] Implement Canvas2D star renderer (`src/components/sky/canvas-renderer.ts`).
- [ ] Cull stars to the visibility threshold for the current twilight phase.
- [ ] Star color from B-V index; size from magnitude (with floor).
- [ ] Constellation lines drawn on a separate layer; toggle on/off via UI.
- [ ] Per-star CSS `@keyframes` twinkle (CSS, not JS).
- [ ] SVG moon with phase mask + parallactic angle.
- [ ] `OffscreenCanvas` + Worker offload where supported.
- [ ] Cap to 30 fps; redraw only when needed (time delta or resize).
- [ ] Mobile gating: no canvas under 480 px viewport unless explicitly enabled on `/sky`.
- [ ] **Deep-sky toggle** (`/sky`): lazy-load `stars-deep.json`.

**Ship gate:** Canvas budget under 14 KB gzipped. RAF loop pegged at 30 fps with no jank on a mid-2018 MacBook Pro. Deep-sky download lazy and gated. Reduced-motion users still see no canvas.

## Phase 4 — Polish (target: 1 week)

Goal: tighten, document, attribute, measure.

- [ ] Astro view transitions on navigation so the sky persists smoothly between pages.
- [ ] Service worker (Workbox) caching for HTML, assets, model file.
- [ ] Brand-color highlight: hover/active nav link → pulse Mars/Sun/Vega in the sky if up.
- [ ] `?` shortcut for sky facts overlay.
- [ ] Polish the `/sky` page copy, attribution, license disclosures.
- [ ] WebPageTest run on real-mobile profile; tune as needed.
- [ ] RSS feed item descriptions: include caption (e.g., "The sky over Berlin on Nov 23, 2024 …") for poetic effect when read in a feed reader.

**Ship gate:** visitor returning a week later loads the site offline. Mobile a11y audit passes. Lighthouse Performance ≥ 95 on mobile.

## Phase 5 — Optional: Local LLM (target: 1–2 weeks)

Only if Phase 0–4 ship cleanly and the layer earns the time.

- [ ] Add `@mlc-ai/web-llm` behind dynamic import.
- [ ] Implement opt-in flow on `/sky`.
- [ ] Wire the three seed interactions (constellation hover, post summary, sky tonight).
- [ ] Test on Chromium (WebGPU primary), Safari (WebGPU shipping), Firefox (WebGPU behind flag — gracefully unsupported).
- [ ] Document in `/sky` clearly: privacy, storage cost, performance.

**Ship gate:** WebGPU detection robust. Toggle invisible to non-supporting browsers. Bundle/data weight zero for visitors who never opt in.

## Cross-cutting work

Throughout all phases:

- **Documentation.** Each phase updates the spec with anything we learn. The spec is a living document until Phase 4 ship; then it is frozen and changes go via ADRs (`spec/adr/`).
- **Visual regression.** Add Playwright + percy.io or Argos screenshot tests on a small route set (home, one post, `/sky`). Catches palette regressions visually.
- **Test data.** Continue accumulating golden-value tests as edge cases surface (high-latitude posts, poles, midnight sun, polar night).
- **Accessibility audits.** axe-core run in CI on every PR.

## Risks

| Risk | Mitigation |
|---|---|
| Star catalog larger than budgets | start with mag ≤ 4.0; only widen if visual feedback demands it |
| Color palette ugly between named phases | tune in real environments (laptop, OLED phone) before locking |
| Mobile devices burn battery on Canvas | gating in P3; visibility API; 30 fps cap |
| Local LLM model size blows up | gate behind explicit user action; never auto-download |
| Build time growth from baking SVG stars per night-post | cache on disk by `(skyTime, geo)` hash so rebuilds are idempotent |
| Sky overlay confuses screen-reader users | `aria-hidden` on every sky element; provide textual caption |

## Rollback plan

Each phase is independently reversible:

- Phase 1 rollback: revert the `BaseHead.astro` and `Post.astro` changes; site is back to current state.
- Phase 2 rollback: stop hydrating `SkyBackground`; static L0 sky remains.
- Phase 3 rollback: dynamic-import call to `canvas-renderer.ts` is removed; CSS sky remains.
- Phase 5 rollback: see [06-local-llm.md](./06-local-llm.md) "Removal plan".

The architecture is layered so that any layer above L0 can be amputated without affecting the layers below.
