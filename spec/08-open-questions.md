# 08 — Open Questions

Decisions deferred until we have data, design feedback, or author preference. Each question carries a recommendation, the alternatives, and a deadline (the phase by which it must be resolved).

---

## Q1 — Default `SITE_GEO`

**Question.** What is the canonical place the site simulates when no per-post `geo` is set and the visitor has not granted geolocation?

**Recommendation.** Hong Kong (`22.3193°N, 114.1694°E`) — the author's hometown and a recurring location in the existing content (`siumai.md`, `mauer-history.md` reference it; the language toggle is bilingual TC). Strong identity claim: "this site is from Hong Kong."

**Alternatives.**

- San Francisco — the author writes about it and currently lives there; many posts have an SF context.
- Singapore — author has organized communities there; geographic proximity to HK reads.
- A symbolic non-place (e.g., `0°N, 0°E` Null Island) — clever but breaks the "ground truth" premise.

**Resolve by.** Phase 0 (before any code).

**How to decide.** The author's call. Once chosen, document the choice in `consts.ts` with a comment that explains *why this place* and not just *which*. The default geo is implicitly a brand statement.

---

## Q2 — Star catalog source

**Question.** YBSC subset, HYG v3.5 subset, or some combination?

**Recommendation.** Bake **both**:
- `stars-default.json` — YBSC filtered to magnitude ≤ 4.5 (~500 stars). Bundled with every page.
- `stars-deep.json` — HYG v3.5 filtered to magnitude ≤ 6.5 (~9000 stars). Lazy-loaded only when the visitor enables "deep sky" on `/sky`.

YBSC is small, public-domain, and has the canonical bright-star names. HYG is denser, with B-V color information and proper motions, and is CC BY-SA 2.5 — fine for our purposes with attribution on `/sky`.

**Alternatives.**

- HYG-only: simpler pipeline; slightly heavier default bundle.
- Hipparcos full: too heavy.

**Resolve by.** Phase 0. After running the pre-build script and measuring final gzipped sizes, pick the actual filter cutoff that fits inside the 30 KB budget.

---

## Q3 — Constellation art: lines only, or boundaries too?

**Question.** Stick-figure connecting lines (Stellarium-style), official IAU **boundary** polygons, or both?

**Recommendation.** **Lines only.** The IAU boundaries are jagged polygons drawn along celestial-equator-aligned segments — visually noisy and rarely useful unless the visitor is identifying a star's "official" constellation home. Stick figures carry the legibility ("that's Orion's belt"), and that's what we want.

**Alternatives.**

- Both, with boundaries hidden by default and shown on a `/sky` toggle. ~10 KB extra.
- Boundaries only — wrong choice; loses recognizability.

**Resolve by.** Phase 3.

---

## Q4 — Light pollution simulation

**Question.** Should the night sky show ~3 stars (city) or ~2000 (rural)?

**Recommendation.** Default to **rural** (everything down to the magnitude limit). The site is asking the reader to **lift their eye** — showing the stars they can't see from their balcony is part of the point. For accuracy fans, expose a `/sky` toggle for "city" mode that caps the magnitude limit at ~2.5 regardless of twilight phase.

**Alternatives.**

- Default to city — accurate, but defeats the design.
- Auto-detect from geo (Bortle scale lookup) — adds a data file, complicates the build, marginal payoff.

**Resolve by.** Phase 3.

---

## Q5 — "Anchor body" pulses for nav hover

**Question.** When `Hacks 作` (red, Mars/Antares) is hovered and the body is **below** the horizon, do we show *anything*?

**Options.**

A. Nothing. Hover is a silent no-op when the body is down.
B. A faint arrow at the bottom edge of the sky pointing "down N°" with a tooltip "Antares is below the horizon at this time."
C. A subtle horizon-edge glow in the direction of the body's azimuth, hinting at where it'll rise.

**Recommendation.** Start with **(A)** in Phase 4. Add **(C)** as a polish iteration if the author finds it worth the complexity. Reject **(B)** — too literal, breaks the ambient quality.

**Resolve by.** Phase 4.

---

## Q6 — Sky time on RSS / feed readers

**Question.** When a post is read in an RSS reader (no JS, no CSS), should we add the sky caption to the description?

**Recommendation.** Yes, append a single line:

> *— The sky over Berlin on Nov 23, 2024 at 22:14.*

Italicized, after the existing description. Honest about the site's premise even in the feed. ~80 characters per item; immaterial bloat.

**Resolve by.** Phase 4.

---

## Q7 — Local LLM model choice

**Question.** Qwen2.5-0.5B (fast, weak), Llama-3.2-1B (balanced), Phi-3.5-mini (best, heavy)?

**Recommendation.** Default to **Qwen2.5-0.5B** for the first ship to keep the download under 500 MB. Add a "use a larger model" toggle on `/sky` that swaps to Llama-3.2-1B at the cost of an extra ~300 MB download. Re-evaluate as `web-llm`'s registry evolves.

**Resolve by.** Phase 5 (only if we ship L5).

---

## Q8 — What about days when nothing is interesting?

**Question.** A post written at 14:00 on a clear bright day is anchored to a near-empty sky (sun + maybe Venus). Visually, that sky has *less to show* than the same post written at 22:00. Do we compensate?

**Recommendation.** **No.** The visual emptiness is honest. A post written at 2 PM should look like 2 PM. The reader learns the rhythm: long-form essays often happen late at night, and the site reflects that. Daytime posts get a beautiful gradient sky, no stars; that's correct.

This is a tempting place to "fix it" by stylization, but stylization is anti-spec.

**Resolve by.** Phase 1.

---

## Q9 — Time-zone of `post.date`

**Question.** Frontmatter `date: 2024-11-23` lacks an hour. Default to noon UTC? Local midnight at `geo`? Sunset at `geo`?

**Recommendation.** Default to **20:00 in `geo`'s local timezone** (computed via `Intl.DateTimeFormat`). This is approximately when most personal essays get written, and it lands the simulated sky in evening twilight or early night — the most visually rich state. Override per-post via `skyTimeOverride` if the author wants a specific moment.

**Alternatives.**

- Noon UTC — predictable; unhelpfully often gives a daytime sky to a post written about a city the author wasn't in at noon.
- Sunset at `geo` — varies by date; semi-magical but harder to reason about.

**Resolve by.** Phase 1.

---

## Q10 — Should the sky carry post navigation cues?

**Question.** When a visitor is on `/blog/post-A` and there's a "next post" link, does the sky preview the next post's anchored sky on hover (a momentary "see what's next" tween)?

**Recommendation.** **Phase 4+, optional.** Mechanically simple — `computeSkyState` is fast — but it's a charming feature that risks distracting from the post. Prototype it, A/B against a static "next post" hover, decide by feel.

**Resolve by.** Phase 4 (only if we want it).

---

## Q11 — Locale and language

**Question.** Site has bilingual section labels (`Hacks 作`, `Thoughts 思`, `Life 活`). Should the sky caption and constellation labels follow `<html lang>`?

**Recommendation.** Yes — modest L10n. Constellation names: ship English + Traditional Chinese (Stellarium has localized constellation files for both). Sky caption likewise. Default to `<html lang="en">` as today; switch to `zh-Hant` only if/when the site supports a language toggle.

**Resolve by.** Phase 3.

---

## Q12 — `prefers-reduced-transparency`

**Question.** This media query is shipping — it asks the OS-level "reduce transparency" toggle. Should we honor it?

**Recommendation.** **Yes.** Treat it like `prefers-contrast: more` — make the content card fully opaque, drop the backdrop blur. Cheap to implement, real accessibility win for users with vestibular issues from semi-transparent overlays.

**Resolve by.** Phase 1.

---

## How to update this file

When a question is resolved, **don't delete it**. Move it to a `## Resolved` section at the bottom with the decision, the date, and a one-line rationale. The history is the document.
