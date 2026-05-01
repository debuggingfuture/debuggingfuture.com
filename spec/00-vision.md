# 00 — Vision

## Premise

The web has trained us to expect interfaces that are flat, fast, and forgettable. A personal site can be the opposite: a place that *is somewhere*, that holds time. This redesign turns `debuggingfuture.com` into a **sky** — not as decoration, but as the primary interface metaphor. The sky is the layout. The sky is the time. The reader's eye lifts.

## Three properties

### 1. Static-first

Every page is pre-rendered HTML. Astro SSG continues to be the foundation. With JavaScript disabled, the site is fully readable, with a sky baked at build time.

### 2. Truth-grounded

What you see is real. The sun is where the sun is. Polaris does not move. Orion appears in winter (northern hemisphere). The moon's phase matches the actual moon's phase. This is achieved by computing astronomy client-side from baked-in scientific facts (a star catalog, constellation lines, and a few tens of lines of well-known orbital math) — never from a runtime API.

### 3. Progressively richer

Each browser capability unlocks a deeper layer of the experience, but the site is meaningful at every level:

- **L0 — No JS:** static sky, computed at build time, served as inlined CSS variables.
- **L1 — CSS only:** `prefers-color-scheme` + `prefers-reduced-motion` respected.
- **L2 — JS:** sky updates to the visitor's current local time; subtle ambient animation begins.
- **L3 — Intl + opt-in geolocation:** sky personalizes to the visitor's locale; constellations rotate to their meridian.
- **L4 — Canvas/WebGL:** stars, constellation lines, moon phase rendered with full fidelity.
- **L5 — WebGPU LLM (optional):** local model lets the reader ask the sky questions. Off by default.

## Time anchoring

The single most important content decision: **what time and place is being simulated?**

| Route | Time | Place |
|---|---|---|
| `/` (home) | NOW (visitor's local clock) | site default geo, or visitor's geo if granted |
| `/blog`, `/hack`, `/life` index | NOW | same as home |
| `/blog/:slug`, `/hack/:slug`, `/life/:slug` | post `date` (published date) | post `geo` if set, else site default |
| `/about` | NOW | site default |

A post written in Berlin in November 2024 shows the Berlin sky from November 2024. Visiting that post on a summer afternoon in Singapore does not flatten the page to a generic gradient — it shows the reader **what the sky was when the writing happened**. This is the core poetic move.

## Non-goals

- **No third-party APIs at runtime.** Not weather. Not IP geolocation. Not external star catalogs. All facts are baked in or computed.
- **No tracking.** Geolocation is opt-in. No analytics beyond what already exists.
- **No animation that competes with the text.** The sky drifts; it does not flash.
- **No novelty without function.** No shooting-star Easter eggs, no "click for a meteor shower." Every visual element corresponds to a real astronomical phenomenon at the simulated moment.
- **No replacement of the existing brand.** The Bauhaus + Noto Serif TC typography stays. The red/yellow/blue navigation stays. The astronomy theme reinterprets these (red=Mars, yellow=Sun, blue=Vega) rather than erasing them.

## Design principles

1. **Readability is sacred.** If a sky state ever pushes body-text contrast below WCAG AAA, the content card's backplate adapts until it doesn't. The text wins.
2. **Build once, run many.** Anything that can be computed at build time, is. Anything that depends on the visitor's clock or locale, computes once on hydration.
3. **One sky engine.** A single `computeSkyState(time, geo)` function is the source of truth. The build script and the runtime hydration both call it.
4. **Capabilities, not user-agents.** Feature detection (`'gpu' in navigator`, `matchMedia('(prefers-reduced-motion: reduce)')`) — never UA sniffing.
5. **Cheap to delete.** Every layer beyond L0 should be removable without breaking the site. Local LLM is the most aggressive version of this — it can be ripped out and the site still works.

## Success criteria

- A visitor with JS disabled sees a beautiful, readable, time-grounded page.
- A visitor on a fresh browser tab sees the sky update to their local sunrise/sunset/night within 1 second of hydration.
- A visitor opening a 2019 blog post sees a different sky than the one they saw on the home page — and can tell why.
- A reader with low vision or reduced-motion preferences gets a still, high-contrast version with no loss of content.
- The total JS payload for L0–L3 stays under 60 KB gzipped.
