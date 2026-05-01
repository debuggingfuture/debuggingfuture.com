# 05 — Performance & Accessibility

The astronomy theme must not slow the site down or shut anyone out. Both are first-class constraints, not afterthoughts. This file defines the budgets, the hydration rules, and the accessibility contract — all of which are enforced in CI.

## Performance budgets

| Metric | Budget | Notes |
|---|---|---|
| **HTML per page** | ≤ 30 KB gzipped | content + inlined sky CSS vars |
| **Critical CSS** | ≤ 8 KB gzipped | Tailwind subset + sky tokens, inlined in `<head>` |
| **JS — L2 bootstrap** | ≤ 6 KB gzipped | sky engine + apply-state |
| **JS — L4 canvas** | ≤ 14 KB gzipped | renderer + twinkle, lazy-loaded |
| **JS — total non-LLM** | ≤ 60 KB gzipped | all layers L2 + L3 + L4 combined |
| **Star catalog (default)** | ≤ 30 KB gzipped | mag ≤ 4.5, ~500 stars |
| **Star catalog (deep, optional)** | ≤ 90 KB gzipped | mag ≤ 6.5, ~9000 stars, lazy |
| **Constellation lines** | ≤ 15 KB gzipped | 88 IAU constellations |
| **Per-night SVG fallback (L0)** | ≤ 4 KB gzipped per post | only on night-anchored posts |
| **LCP (3G slow)** | ≤ 2.0 s | sky engine **must not** be on the LCP path |
| **CLS** | 0 | sky is `position: fixed`; no layout shift |
| **TBT (4× CPU throttle)** | ≤ 100 ms | `client:idle` on the sky island |
| **INP** | ≤ 100 ms | no synchronous work on click |

Each PR is gated by a Lighthouse-CI run; `bundlesize` (or equivalent) blocks merges that exceed the JS / CSS budgets.

## Hydration strategy

Astro's island model gives us exactly what we want here.

```astro
<SkyBackground client:idle />   <!-- the only island on the site -->
```

- `client:idle` ensures nothing about the sky competes with the LCP element (the post title or hero image).
- Content (`<article>`, navigation, headings) ships as **plain HTML, zero JS**.
- The L4 canvas is dynamically `import()`-ed by `SkyBackground` after L2 has applied — gated on `requestIdleCallback`, `IntersectionObserver`, `prefers-reduced-motion`, and viewport size (no canvas on viewports < 480 px width to save mobile budget).

## Inlined CSS variables (the `<style is:inline>` trick)

The build-time-computed `SkyState.cssVars` are written into a small inline `<style>` block in `<head>` so the **first paint** has the right sky.

```astro
---
const sky = computeSkyState(skyTime, skyGeo)
---
<head>
  <style is:inline>
    :root {
      {Object.entries(sky.cssVars).map(([k, v]) => `${k}: ${v};`).join('\n      ')}
    }
  </style>
</head>
```

Cost: ~600 bytes per page, uncompressed. Worth it for the immediate correct-sky paint.

## Render-blocking audit

Nothing about the sky engine is render-blocking:

- **Fonts** continue to load via `<link rel="preconnect">` + Google Fonts (existing).
- **Sky CSS vars** are inlined — no extra request.
- **Sky JS** is `client:idle` (deferred).
- **Star JSON** is loaded only by the L4 canvas, after idle.
- **No webfonts for sky** — emoji and astronomical symbols use `font-feature-settings`.

LCP element on each route stays exactly what it is today (post title for posts; intro text for home). The sky is decorative chrome.

## Worker offloading (deferred)

For the L4 canvas, `OffscreenCanvas` is used when available, with the renderer running on a Web Worker. This keeps the main thread free for scrolling and content. Falls back to main-thread Canvas2D where unavailable. Worker bundle counts toward the L4 budget.

## Accessibility contract

### Reduced motion

`@media (prefers-reduced-motion: reduce)`:

- All keyframe animations disabled (twinkle, particles, glow drift).
- Sky renders one static frame (the L0 baseline) and never updates.
- L4 canvas does not load.
- No view transitions on navigation.

### Reduced data

`navigator.connection.saveData === true` or effective type `2g`/`slow-2g`:

- Skip L4 canvas entirely.
- Do not lazy-load deep-sky catalog.
- Skip optional model download for L5.

### High contrast

`@media (prefers-contrast: more)` and Windows High Contrast Mode (`forced-colors: active`):

- Content card becomes opaque `Canvas` / `CanvasText` system colors.
- Sky background hidden behind the card; sky still visible above the fold for atmosphere only.
- Star/constellation rendering disabled — they introduce visual noise that hurts contrast users.

### Color scheme

`@media (prefers-color-scheme)`:

- Honored at L0 by mapping the palette to a dark-leaning baseline if `dark` and the simulated time is daytime — the **stylization dim** (see [03-sky-rendering.md](./03-sky-rendering.md)) tilts further down. Reverse for `light` + nighttime if the visitor explicitly opted into a "always light" mode (rare).
- This is a small concession to user preference; physics still drives the *shape* of the sky.

### Screen readers

The entire sky pipeline is `aria-hidden="true"`. Text content (`<article>`, headings, links) is the navigable layer.

For users who want a textual sky, an `aria-live="polite"` region under each post's title speaks the caption:

> *"The sky over Berlin on November 23, 2024 at 22:14. Civil twilight. Vega is overhead. The moon is a waxing crescent in the southwest."*

This caption is generated server-side from `SkyState` by a small `describeSky(state)` function. Updated on `now` pages every ~5 minutes via `aria-live`. Never spammy.

A keyboard shortcut `?` opens a small overlay listing current sky facts (sun position, moon phase, visible bright stars) for power users. Keyboard-only navigable.

### Keyboard interactions

- `Esc` dismisses any sky-related overlay.
- `Tab` order ignores sky elements entirely.
- `?` opens sky facts (above).
- Toggles for geolocation / deep-sky / starseer are standard `<button>` elements with visible focus rings (system default ring at minimum).

### Color contrast (enforced)

A test in CI iterates every `(twilight, content-card)` pair from `palette.ts` and computes the ratio between `--content-fg` and the *brightest* `--sky-*` stop visible behind the card. If the ratio falls below 7:1, the test fails the build. Same test runs against `prefers-contrast: more` overrides (must be ≥ 7:1 also).

### Image alt text

No new images are introduced by the sky. Existing content images keep their existing alt text; nothing in the astronomy theme degrades or wraps content imagery.

## Service worker (optional Phase 4)

The site is highly cache-friendly: deterministic SSG output, hashed assets, no per-user content. A trivial service worker (Workbox) caches:

- HTML for visited routes (stale-while-revalidate).
- Sky engine JS, star catalog, constellation lines (cache-first).
- Local LLM model file (cache-first, OPFS-backed).

Result: a returning visitor on a flight sees their sky at sea over the ocean, on the post they last read, at the originally-anchored time. Pleasant edge case.

## Mobile and battery

- L4 canvas is **disabled by default** on viewports `< 480 px` and on `(hover: none) and (pointer: coarse)` until the user explicitly opts in via the `/sky` page toggle. Mobile gets the L0–L2 sky out of the box, which is plenty.
- L2 ambient drift uses `Page Visibility API` to fully pause when the tab is hidden. No background work.
- L4 RAF loop pegs at 30 fps, halts on visibility-hidden, resumes on visibility-visible.

## What we measure post-launch

- **Real User Monitoring** is not added (no third-party JS). Instead, a one-off lighthouse + WebPageTest run on a few representative routes (home, an old post, a recent post with a heroImage, a long blog index) before each release.
- The single internally-tracked metric is `sky-engine-time` — how long `computeSkyState` took on the visitor's CPU at hydration. Logged to `console.debug` only in dev. Telemetry-free.

## Summary: the rules in one place

1. JS off → site works, sky baked.
2. Reduced motion → sky frozen, no animation.
3. Reduced data → no canvas, no LLM, no deep catalog.
4. High contrast → opaque card, no sky overlay.
5. Screen reader → sky `aria-hidden`, caption `aria-live`.
6. Mobile → no canvas by default; L0–L2 only.
7. Slow CPU → `client:idle` keeps sky off the critical path.
8. Tests in CI gate budgets, contrast, and rendering correctness.
