# 01 — Architecture

## Stack (preserved)

- **Astro 5** with SSG (`output: 'static'`).
- **MDX + Markdown** content collections (`blog`, `hack`, `life`).
- **Tailwind CSS 4** via `@tailwindcss/vite`.
- **Biome** for lint/format.

No new framework dependencies in the critical path. The astronomy engine is pure TypeScript (~300 lines) with zero runtime deps. All rendering uses the platform: CSS gradients, SVG, Canvas2D. WebGL and WebGPU appear only in optional L4/L5 layers behind capability detection.

## High-level flow

```mermaid
flowchart LR
  subgraph Build["Build (Node)"]
    SC[Star catalog\nJSON] --> SE[sky-engine.ts]
    CL[Constellation lines\nJSON] --> SE
    SE --> BAKED[baked-sky.json\n(per-route defaults)]
    POSTS[content/*.md] --> ASTRO[Astro SSG]
    BAKED --> ASTRO
    ASTRO --> HTML[Static HTML\n+ inlined CSS vars]
  end

  subgraph Runtime["Runtime (Browser)"]
    HTML --> L0[L0: paint static sky]
    L0 -->|JS available| L2[L2: re-compute for NOW]
    L2 -->|prefers-reduced-motion: no-preference| L3[L3: animate state]
    L3 -->|canvas supported| L4[L4: stars + constellations]
    L4 -->|WebGPU + opt-in| L5[L5: starseer LLM]
  end
```

## Source layout (proposed)

```
src/
  astronomy/                  # Pure functions, no DOM, no I/O
    sun.ts                    # solar position + twilight phases
    moon.ts                   # lunar phase + altitude
    sidereal.ts               # local sidereal time, equatorial→horizontal
    state.ts                  # computeSkyState(time, geo) → SkyState
    types.ts                  # SkyState, Geo, TwilightPhase, etc.
    palette.ts                # SkyState → CSS variable bundle
    data/
      stars.json              # bundled star catalog (filtered)
      constellations.json     # bundled stick-figure lines
  components/
    sky/
      SkyBackground.astro     # the sky island (client:idle)
      SkyCanvas.ts            # L4 canvas renderer
      SkyDescription.astro    # screen-reader-friendly textual sky
    Header.astro              # existing, untouched
    Footer.astro              # existing, untouched
    BaseHead.astro            # existing, gains <style> with sky CSS vars
  layouts/
    Post.astro                # gains sky time = post.data.date
  pages/                      # existing routes preserved
  styles/
    global.css                # existing, gains sky variable contract
    sky.css                   # state-keyed gradient stops
  scripts/
    build-sky-data.ts         # build-time bake of stars/constellations
  consts.ts                   # SITE_GEO default lat/lon added
```

## The sky engine contract

A single function is the source of truth. Both the build (Astro frontmatter) and the runtime (hydration) call it.

```ts
// src/astronomy/state.ts
export interface Geo { lat: number; lon: number; name?: string }

export interface SkyState {
  time: Date
  geo: Geo
  sun: { altitude: number; azimuth: number }
  moon: { altitude: number; azimuth: number; phase: number; illumination: number }
  twilight: 'day' | 'goldenHour' | 'civil' | 'nautical' | 'astronomical' | 'night'
  localSiderealTime: number  // hours
  // Derived rendering tokens:
  cssVars: Record<string, string>
}

export function computeSkyState(time: Date, geo: Geo): SkyState
```

`cssVars` is the bridge between physics and rendering: the same token names drive the static (build-time) inlined `<style>` and the runtime updates. Renderers don't read physics values directly.

## Time and place per route

Decided at build time, applied via Astro frontmatter:

```astro
---
// src/layouts/Post.astro
import { computeSkyState } from '../astronomy/state'
import { SITE_GEO } from '../consts'
const time = Astro.props.date  // post's publish date
const geo  = Astro.props.geo ?? SITE_GEO
const sky  = computeSkyState(time, geo)
---
<html data-sky-anchor="post" data-sky-time={time.toISOString()} data-sky-lat={geo.lat} data-sky-lon={geo.lon}>
  <head>
    <style is:inline>{cssVarsToString(sky.cssVars)}</style>
  </head>
  ...
</html>
```

```astro
---
// src/pages/index.astro
const time = new Date()           // build-time NOW; hydration overrides
const sky  = computeSkyState(time, SITE_GEO)
---
<html data-sky-anchor="now" data-sky-lat={SITE_GEO.lat} data-sky-lon={SITE_GEO.lon}>
  ...
</html>
```

Hydration code reads `data-sky-anchor` and decides what to do:

- `anchor="post"` → the time and geo on the element are authoritative; do not override. Optional micro-animation: tween palette over a few seconds for arrival, then hold.
- `anchor="now"` → recompute with `new Date()` and the (optionally overridden) geo, then enter the slow ambient animation loop.

## Layer responsibilities

| Layer | Trigger | Adds |
|---|---|---|
| L0 | always | inlined CSS vars; gradient sky; no JS |
| L1 | always (CSS only) | `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-contrast` |
| L2 | JS available | recompute for visitor's `Date.now()` (home), tween palette toward target, slow drift over time |
| L3 | `Intl.DateTimeFormat().resolvedOptions().timeZone` + opt-in `navigator.geolocation` | personalize geo to visitor; constellations align to local meridian |
| L4 | `HTMLCanvasElement` + `requestAnimationFrame` available, no `prefers-reduced-motion: reduce` | stars rendered via Canvas2D; constellation lines; moon disk with phase shadow |
| L5 | `'gpu' in navigator` + explicit user opt-in | local LLM enabled (see [06-local-llm.md](./06-local-llm.md)) |

Layers above L0 are non-essential. Each one's bootstrap code starts with a capability check; if the check fails, the layer no-ops and lower layers continue to drive the experience.

## Build-time data baking

A pre-build script (`scripts/build-sky-data.ts`) runs before `astro build`:

1. Reads raw star catalog (HYG v3 or Yale BSC) and constellation line file.
2. Filters to magnitude ≤ 4.5 by default (configurable; ≤ 6.5 dataset bundled separately for L4 deep-sky mode).
3. Encodes as compact JSON (typed-array layout for stars, integer index lookup for constellation lines).
4. Writes to `src/astronomy/data/`.

This step runs once per dependency-update, not on every build, but Astro will re-bundle the JSON. Total payload target: ~30 KB gzipped for the default catalog, ~50 KB for the deep set.

## Hydration strategy

- `<SkyBackground />` is the **only** island. `client:idle` directive — sky never blocks first paint.
- All content (posts, lists, navigation) is plain Astro HTML — zero JS shipped for content rendering.
- `<SkyCanvas>` (L4) is dynamically `import()`-ed by `<SkyBackground />` only after the L2 sky is up and the browser is idle.
- L5 (LLM) is loaded only after explicit user opt-in via UI.

## Caching and offline

The sky engine is deterministic given `(time, geo)`. Once a post is built, the inlined CSS vars never change. Service worker can cache the entire site aggressively. The runtime engine (~10 KB JS) lives at a hashed URL and caches forever.

## Out-of-scope dependencies

Explicitly **not** added:

- React, Vue, Svelte
- Three.js (Canvas2D suffices for stars)
- moment.js, date-fns (`Intl` is enough)
- A weather API of any kind

A new dep is added only if it justifies its bundle weight against the budgets in [05-performance-and-a11y.md](./05-performance-and-a11y.md).
