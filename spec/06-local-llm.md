# 06 — Local LLM ("starseer")

The optional L5 layer. A small open-weight model that runs entirely in the visitor's browser via WebGPU, with no data ever leaving the device. **Off by default, opt-in only.** Naming convention: *starseer* — a stargazer who reads.

This is the most aggressive layer. It is also the easiest to remove if it doesn't earn its weight.

## Why bother

Three concrete uses:

1. **"What am I looking at?"** — hover or tap a constellation, the model gives a 1–2 sentence description tied to current sky state. ("Orion is rising in the east — its belt will be highest at 02:00.")
2. **"Summarize this post"** — a one-sentence summary of the current post for visitors browsing fast.
3. **"What's interesting about the sky tonight?"** — a paragraph of sky-relevant context: visible planets, bright stars near zenith, current moon phase.

All of these are *augmentations* — the post is fully readable without them, the sky is fully seen without them. starseer is gravy.

## Why local

- **Privacy.** No prompts leave the device. No keys to rotate. No API costs.
- **Spec consistency.** The whole site's premise is "no runtime API calls"; an OpenAI dependency would betray that.
- **Persistence.** Once the model is in OPFS, the visitor can use starseer offline. (Returning visitor on a plane reading old posts: starseer still works.)

## Library choice

**Primary candidate:** [@mlc-ai/web-llm](https://github.com/mlc-ai/web-llm) (Apache-2.0). Mature, actively maintained, supports WebGPU + WASM fallback, ships with a model registry.

**Alternative:** [transformers.js](https://github.com/xenova/transformers.js) by Xenova (Apache-2.0). Broader model support; somewhat slower for large LLMs.

**Decision:** start with `@mlc-ai/web-llm`; revisit if model breadth becomes a problem.

## Model selection

We evaluate quantized models (q4f16) on three axes: download size, response quality on our three uses, and tokens/sec on a mid-tier MacBook Air (M1).

| Model | Quant | Size | Quality (our tasks) | Speed (M1) | Verdict |
|---|---|---|---|---|---|
| Qwen2.5-0.5B-Instruct | q4f16 | ~400 MB | adequate for hover descriptions; weak at summary | ~80 tok/s | start here |
| Llama-3.2-1B-Instruct | q4f16 | ~700 MB | good at all three uses | ~40 tok/s | upgrade path |
| Phi-3.5-mini-instruct | q4f16 | ~2 GB | excellent | ~25 tok/s | too heavy for default |
| Gemma-2-2B-it | q4f16 | ~1.4 GB | very good | ~30 tok/s | candidate alt |

**Decision:** ship with **Qwen2.5-0.5B** as the default to keep download under 500 MB. Offer Llama-3.2-1B as an "upgrade" toggle on `/sky`. Re-evaluate as `web-llm` adds models.

## UX flow

1. Visitor lands on `/sky` (or sees a small `🜨 starseer` icon in the footer on any page).
2. Clicking the toggle shows a one-screen consent UI:
   > *Starseer runs an AI model entirely in your browser to answer questions about the sky and your reading. It downloads a one-time model file (~400 MB) and stores it locally. Nothing you type is ever sent to a server. You can delete it anytime in your browser's storage settings.*
3. Visitor clicks **Enable**.
4. WebGPU adapter is requested; if denied or unavailable, show "Not supported on this device" and bail.
5. Model file streams to OPFS with a progress indicator. Pausable; resumable on next visit (web-llm handles chunked download).
6. Once ready, a small `🜨` glyph appears in the corner. Click → input bar.

## Persistence

State stored in `localStorage` under a single key:

```ts
{
  starseer: {
    enabled: true,
    model: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    downloadedAt: "2025-…",
  }
}
```

Model weights live in OPFS (managed by web-llm). Removable from the `/sky` page with a single "Forget the model" button (clears OPFS + localStorage flag).

## Capability detection

```ts
async function canRunStarseer(): Promise<boolean> {
  if (!('gpu' in navigator)) return false
  try {
    const adapter = await (navigator as any).gpu.requestAdapter()
    if (!adapter) return false
    // Optional: check adapter limits to make sure required matmul features are present
    return true
  } catch { return false }
}
```

If `false`, the toggle is hidden entirely. We do not show "your browser doesn't support this" guilt-tripping; absence is the message.

## Prompts

Three system prompts, each baked at build time, tuned for each use case. They reference the **current `SkyState`** (passed in as structured context) so answers are grounded.

```ts
// Example: hover-a-constellation
const prompt = `
You are a quiet stargazer. Given the sky state below, describe ${constellation} in 1–2 sentences,
mentioning whether it is visible right now and where to look. Be specific about altitude and azimuth.

Sky state:
- time: ${state.time.toISOString()}
- place: ${state.geo.name ?? "unknown"} (${state.geo.lat}, ${state.geo.lon})
- twilight: ${state.twilight}
- sun: alt ${state.sun.altitude.toFixed(1)}°, az ${state.sun.azimuth.toFixed(0)}°
- moon: phase ${state.moon.phase.toFixed(2)}, alt ${state.moon.altitude.toFixed(1)}°

Constellation summary (offline reference):
${constellationFacts[constellation]}  // baked-in reference text
`
```

By passing **physical state and a small offline reference** alongside the question, even a small model can produce useful output. The model is essentially a re-phraser plus a tone-keeper, not a knowledge source. This is the design that makes a 500 MB model viable.

## Failure modes

| Failure | Behavior |
|---|---|
| WebGPU absent | toggle hidden; site works as L0–L4 |
| Adapter request denied | "Not supported on this device" message on `/sky`; toggle disabled |
| Download interrupted | resumable on next visit; progress restored from OPFS |
| Model OOM at runtime | fall back to a canned response from `constellationFacts` lookup |
| User typed something off-topic | model declines politely (system prompt enforces "this is a sky and reading site") |

## Privacy copy

On `/sky`, prominent and unambiguous:

> **starseer is local.** The model file is downloaded once and stored in your browser. Nothing you ask it leaves your device. There is no server. There are no logs. We can't see your prompts. *Why does this matter?* Because every other AI feature on the web sends what you type to someone else's computer. This one doesn't.

## What starseer does NOT do

- It does not write blog posts.
- It does not fact-check the author.
- It does not generate images.
- It does not stream "live" — every interaction is a single prompt → completion (a few seconds at most).
- It is not used for search. The site has no search; if it gains one, it'll be a tiny static index, not a model.

## Bundle and load impact

- Library JS: `@mlc-ai/web-llm` is ~150 KB gzipped. **Loaded only after the visitor opts in** — never on first paint, never on a non-`/sky` route by default. Excluded from L0–L4 budgets.
- Model file: 400 MB+. Cached in OPFS forever. Counted against the visitor's storage, not the page weight.
- Cold start time: ~5–15 s on a mid-tier laptop after model is downloaded. Spinner is shown. Idle thereafter.

## Removal plan

If starseer doesn't earn its place:

1. Delete `src/components/sky/starseer/` directory.
2. Remove the toggle on `/sky`.
3. Remove the dependency from `package.json`.
4. Site builds, ships, looks identical to a visitor who never opted in.

The L5 layer is engineered to be deletable in an afternoon.
