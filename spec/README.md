# Astronomy Theme — Spec

A complete redesign of `debuggingfuture.com` as a personal site that **is a sky**, not a site decorated with stars. Visitors see the actual sky overhead at the moment they arrive on the home page, and the actual sky over the place and time a post was written when they open it.

## Reading order

| File | What it answers |
|---|---|
| [00-vision.md](./00-vision.md) | Why. Goals, principles, non-goals. |
| [01-architecture.md](./01-architecture.md) | How Astro SSG and progressive layers compose. |
| [02-astronomy-engine.md](./02-astronomy-engine.md) | The math: sun, moon, stars, constellations. Pure functions, no APIs. |
| [03-sky-rendering.md](./03-sky-rendering.md) | The sky state machine, palettes, readability invariants, animation rules. |
| [04-content-and-routes.md](./04-content-and-routes.md) | Which time and place each route simulates. Frontmatter additions. |
| [05-performance-and-a11y.md](./05-performance-and-a11y.md) | Budgets, hydration strategy, reduced motion, contrast, screen readers. |
| [06-local-llm.md](./06-local-llm.md) | Optional WebGPU LLM layer ("starseer"). |
| [07-implementation-plan.md](./07-implementation-plan.md) | Phased rollout. Each phase ships. |
| [08-open-questions.md](./08-open-questions.md) | Tradeoffs to revisit before/during build. |

## TL;DR

- **Static-first.** Astro SSG. Every page renders without JavaScript.
- **Truth-grounded.** Sky derives from baked-in physics (solar position, sidereal time, star catalog, constellation lines). No runtime API calls, ever.
- **Progressively richer.** Five enhancement layers (L0–L4 + optional L5). Each layer is additive; nothing breaks if a layer is missing.
- **Time-anchored content.** Home page renders the sky **NOW**. A blog post renders the sky on its **published date** (and optionally its place). The reader is placed in the moment a thought was written.
- **Readable always.** Content text passes WCAG AAA contrast at every sky state, day or night. The sky is the backdrop, never the obstacle.

## What's NOT in scope

- Real-time weather (would require an API).
- Push notifications, comments, accounts.
- Replacing the existing typography, brand colors, or content collections — the astronomy theme **layers onto** the current Bauhaus + Noto Serif TC identity. Brand reds/yellows/blues map to Mars/Sun/Vega.
