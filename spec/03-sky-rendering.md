# 03 — Sky Rendering

How `SkyState` becomes pixels. The rendering pipeline is **layered, capability-gated, and unified by a single CSS-variable contract** so that a sky with no JS, a sky with JS, and a sky with Canvas/WebGL look like points on the same visual continuum — not three different sites.

## Visual layers

Stacked, back-to-front:

| z | Layer | Tech | Layer required |
|---|---|---|---|
| -50 | **Sky base** — vertical gradient (zenith → horizon) | CSS `linear-gradient` with custom-property stops | L0 |
| -40 | **Horizon glow** — sun azimuth-anchored radial wash | CSS `radial-gradient`, transformed via `--sun-az-deg` | L0 |
| -30 | **Atmospheric scattering tint** — color shift from blue (day) through orange (golden) to indigo (night) | CSS color-mix on tokens | L0 |
| -20 | **Stars** — points with magnitude → opacity, B-V → hue | Canvas2D (L4) or static SVG (L0 fallback for night-baked posts) | L0 / L4 |
| -15 | **Constellation lines** — thin polylines connecting catalog stars | Canvas2D | L4 |
| -10 | **Moon** — disk with phase-shadow mask | inline SVG | L0 / L2 |
| -5  | **Particles** — sparse drift (decorative; opt-in) | CSS `@keyframes` translating tiny pseudo-elements | L1 |
| 0   | **Content card backplate** — adaptive frosted/solid scrim sized to body width | CSS `background-color` with adaptive opacity | always |
| +1+ | **Content** — text, images, navigation | HTML | always |

Everything below z=0 is `position: fixed; inset: 0;` and `aria-hidden="true"`. Content scrolls over a stable sky.

## CSS variable contract

The single bridge between physics and pixels. Every layer reads from these; every renderer (build-time, JS, Canvas) writes to these. Keeping rendering keyed off CSS vars rather than direct values means we can swap renderers without touching the visual rules.

```css
:root {
  /* Color tokens — set by paletteFor(state) */
  --sky-zenith:        #0b1f3a;  /* top of the sky */
  --sky-horizon:       #f4a261;  /* color where sky meets horizon */
  --sky-tint:          #1a2a4a;  /* atmospheric mix layer */
  --sky-glow:          #ffd6a5;  /* sun-anchored horizon glow */
  --sky-glow-alpha:    0.6;

  /* Geometry — set by sun/moon position */
  --sun-az-deg:        180deg;   /* horizontal angle of sun (CSS angle) */
  --sun-alt-deg:       -10deg;   /* vertical angle, signed */
  --moon-az-deg:       45deg;
  --moon-alt-deg:      30deg;
  --moon-phase:        0.5;      /* 0..1, drives SVG mask */
  --moon-illum:        1.0;

  /* Scene state */
  --twilight-phase:    "night";  /* string for debugging / data attrs */
  --star-visibility:   1.0;      /* 0 (day) .. 1 (deep night) */
  --particle-density:  0.3;

  /* Readability */
  --content-bg:        rgba(255, 255, 255, 0.92);
  --content-fg:        #0f1219;
  --content-bg-blur:   8px;
}
```

## State → palette mapping

`paletteFor(twilight, sunAltDeg)` interpolates over a small set of named keyframes. The keyframes themselves are tuned-by-eye against reference photographs of each phase. They live in `src/astronomy/palette.ts`.

| Phase | Zenith | Horizon | Glow | Tint | Star vis | Content bg α |
|---|---|---|---|---|---|---|
| `day` (sun > +30°) | `#5fa8d3` | `#cae9ff` | — | `#a3c9e2` | 0 | 0.85 |
| `day` (sun +6°..+30°) | `#3e7cb1` | `#f0c987` | warm | `#7a9bbf` | 0 | 0.88 |
| `goldenHour` | `#1f3b66` | `#f4a261` | `#ffd6a5` strong | `#5a4a6f` | 0.1 | 0.90 |
| `civilTwilight` | `#1a2a4a` | `#e08a5e` | dim | `#3b3556` | 0.4 | 0.92 |
| `nauticalTwilight` | `#0e1a36` | `#7a4a6a` | faint | `#1f2a4d` | 0.7 | 0.93 |
| `astronomicalTwilight` | `#070d22` | `#1f1d3a` | none | `#10153a` | 0.95 | 0.93 |
| `night` | `#03060f` | `#0a1023` | none | `#06091a` | 1.0 | 0.94 |

Between named phases, interpolation is **linear in OKLCh** (not sRGB) using `color-mix(in oklch, ...)` for perceptual smoothness. Falls back to sRGB on browsers without OKLCh — the difference is small.

## Brand color reinterpretation

The existing nav stripes:

- `--nav-hack:  #be1e2d` (red)   →  reinterpreted as **Mars / Antares** — the red planet/star
- `--nav-blog:  #ffde17` (yellow)→  reinterpreted as **Sun / Capella** — the daytime star
- `--nav-life:  #21409a` (blue)  →  reinterpreted as **Vega / Sirius** — blue-white giants

These continue to appear as the nav underlines. They become *thematic anchors* for each section: a hover state on `Hacks 作` can briefly highlight Mars in the sky if it is up; `Thoughts 思` highlights the sun's current position; `Life 活` highlights Vega. (Phase 4+ feature; not MVP.)

## Sky animation rules

- **Default cadence:** sky drifts at real-time (1 second of wall-clock = 1 second of simulated time). Stars rotate at sidereal rate (~15°/hour). To the eye: nearly still. This is **not** a screensaver.
- **Arrival animation:** on first paint, the renderer tweens from a neutral starting palette to the target sky palette over **1.5 s** with `cubic-bezier(0.25, 1, 0.5, 1)` easing. Subsequent navigations use Astro view transitions to hold sky continuity.
- **Star twinkle:** purely CSS `@keyframes` per-star with randomized `animation-delay` and `animation-duration`. No JS RAF loop required for this.
- **Frame budget:** Canvas (L4) caps at **30 fps** and uses `requestAnimationFrame` with deltatime; on a ≤60Hz machine half the frames are skipped. Battery- and thermal-friendly.
- **Visibility:** `document.visibilityState === 'hidden'` pauses the RAF loop.
- **Reduced motion:** `prefers-reduced-motion: reduce` → all animations disabled, sky frozen on initial state. Stars do not twinkle. Particles are absent.

## Readability invariants (the contract)

1. **Body text on the content card always passes WCAG AAA** (≥ 7:1 ratio) at every sky state. This is enforced by the `--content-bg` α value in the palette table — those values are tuned so that, given the dark/light text choice, contrast is ≥ 7:1 against the sky's *brightest* possible underlying gradient stop at that phase.
2. **Headings (h1–h3)** pass AA Large (≥ 3:1).
3. **Links** retain the existing yellow underline highlight (`#ffde17`) and the highlighted text passes AAA against yellow.
4. A **lint test** (run in CI) renders each phase + content card and computes contrast; failure breaks the build.
5. Users who set `prefers-contrast: more` get a fully opaque white (or fully opaque dark) backplate, no gradient bleed.

These invariants take priority over visual fidelity. If a sky state cannot meet them, the palette table is wrong, not the rule.

## Content card design

```css
.sky-content-card {
  background: var(--content-bg);
  color: var(--content-fg);
  backdrop-filter: blur(var(--content-bg-blur));
  -webkit-backdrop-filter: blur(var(--content-bg-blur));
  border-radius: 12px;
  /* existing 720px max-width content rules apply */
}

@supports not (backdrop-filter: blur(1px)) {
  .sky-content-card {
    background: var(--content-bg-fallback); /* opaque equivalent */
  }
}

@media (prefers-contrast: more) {
  .sky-content-card {
    background: Canvas;     /* CSS system color */
    color: CanvasText;
    backdrop-filter: none;
  }
}
```

The card hugs the existing 720px reading column. The sky is *behind* the card, not under it — the eye can rest on the card and look up to the sky between paragraphs.

## Static-only fallback (L0)

When JavaScript is disabled, the inlined `<style>` block in `<head>` (written by the Astro frontmatter) sets all CSS variables to the build-time-computed sky for that route's anchor (post date or build NOW). Stars at L0 are rendered as a static SVG shipped per route — but only on **night-anchored posts**, since for daytime routes the sky has no visible stars and we save the bytes.

The L0 SVG is a one-time static rasterization of the star field projected for that route's `(time, geo)`. Generated at build time by the same pre-build script that bakes catalog data. Cost: ~3 KB per night-anchored post (the same ~500 stars as a path layer with mag-derived radius).

## Day vs. night: which dominates?

A subtle UX choice: most posts will **default** to night when `geo` and `date` would have placed the actual sky in daylight, because:

- Stars and constellations are the most distinctive visual element of the design.
- The brand uses a black background-friendly palette historically (the existing `--accent: #000000`).
- Daytime gradients can wash out content readability.

**Decision:** time anchoring is honored faithfully (a post written at noon shows a noon sky). But the renderer applies a small **stylization knob** — a uniform dimming (~20%) — at all times, which makes daytime skies more cinematic and night skies more comfortable. This is documented in `palette.ts` as the `STYLIZATION_DIM` constant and is the **only** place where we deviate from physical truth. Removable in one line.

## Per-route hooks

The sky reacts to mouse and scroll *minimally*:

- A slow horizontal **parallax** on the horizon glow tracks pointer X (max ±5°). Disabled on touch and on `prefers-reduced-motion`.
- Scrolling does **not** parallax the sky — it stays put. This is critical: parallaxed skies fight the reader.
- Hovering a section nav link briefly nudges the corresponding "anchor body" (Mars, Sun, Vega) in the rendered sky if that body is currently up. Phase 4+ feature.

## Renderer module surface

```
src/components/sky/
  SkyBackground.astro    // Astro island, client:idle, owns lifecycle
  apply-state.ts         // Writes SkyState.cssVars to document.documentElement.style
  bake-svg-stars.ts      // Build-time helper, emits <svg> for L0 night posts
  canvas-renderer.ts     // L4: stars + constellation lines + moon disk
  moon.ts                // SVG-based phase mask
  twinkle.css            // Per-star CSS animation (L1+)
```

## Performance hooks (cross-ref)

- L4 canvas only renders if `IntersectionObserver` shows the sky in viewport.
- L4 redraws only when:
  - The simulated time has advanced enough that any star moved ≥ 1 px (typically every several seconds).
  - The viewport resized.
  - Phase boundary crossed.
- See [05-performance-and-a11y.md](./05-performance-and-a11y.md) for budgets.
