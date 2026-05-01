# 04 — Content Model & Routes

The existing collections (`blog`, `hack`, `life`) are preserved unchanged in name, location, and URL shape. The content model gains a small set of **optional** frontmatter fields that let an author anchor a post in time and place. Sky simulation derives from these.

## Existing collections (recap)

```
src/content/
  blog/    *.md, *.mdx          → /blog/[slug]
  hack/    <project>/<file>.md  → /hack/[slug]
  life/    *.md                 → /life/[slug]
  intro.md                      → embedded on /
  blog_archive/                 → unrendered
```

Each collection schema (`src/content.config.ts`) currently has:

```ts
{ title, description?, pubDate?, date, updatedDate?, heroImage?, thumbnail?,
  categories?, tags? }
```

## New optional frontmatter fields

Add to all three collection schemas:

```ts
geo: z.object({
  lat:  z.number().min(-90).max(90),
  lon:  z.number().min(-180).max(180),
  name: z.string().optional(),  // e.g., "Berlin", "San Francisco"
}).optional(),

celestialTags: z.array(z.string()).optional(),  // e.g., ["Orion", "Antares"]
                                                  // optional explicit hints for L4 highlight

skyTimeOverride: z.coerce.date().optional(),     // override the simulated moment;
                                                  // useful when `date` is a publish date
                                                  // but the post is *about* a different night
```

All fields are optional. Backward-compatible with every existing post.

## Site defaults

```ts
// src/consts.ts
export const SITE_TITLE = "Debug 未來";
export const SITE_DESCRIPTION = "debuggingfuture";

export const SITE_GEO = {
  lat: 22.3193,    // Hong Kong — author's hometown, default reference
  lon: 114.1694,
  name: "Hong Kong",
} as const;

export const SITE_BUILD_TIME = new Date();  // captured at build for L0 baseline
```

(Final default `SITE_GEO` is the author's call; see [08-open-questions.md](./08-open-questions.md) Q1.)

## Time and place per route — exhaustive

| Route | Anchor | Time | Place |
|---|---|---|---|
| `/` | `now` | `Date.now()` (build time at L0; live at L2+) | visitor's geo if granted, else `SITE_GEO` |
| `/about` | `now` | as above | as above |
| `/blog`, `/hack`, `/life` (index pages) | `now` | as above | as above |
| `/blog/[slug]` | `post` | `post.skyTimeOverride ?? post.date` | `post.geo ?? SITE_GEO` |
| `/hack/[slug]` | `post` | as above | as above |
| `/life/[slug]` | `post` | as above | as above |
| `/sky` (new) | `now` | as above | as above |
| `/rss.xml` | n/a | n/a | n/a |

## How the layout pulls it in

`src/layouts/Post.astro`:

```astro
---
import { computeSkyState } from '../astronomy/state'
import { SITE_GEO } from '../consts'

const { title, description, date, updatedDate, heroImage,
        geo, skyTimeOverride } = Astro.props

const skyTime = skyTimeOverride ?? date
const skyGeo  = geo ?? SITE_GEO
const sky     = computeSkyState(skyTime, skyGeo)
---
<html lang="en"
      data-sky-anchor="post"
      data-sky-time={skyTime.toISOString()}
      data-sky-lat={skyGeo.lat}
      data-sky-lon={skyGeo.lon}>
  ...
</html>
```

`src/pages/index.astro` (and other "now" routes):

```astro
---
import { computeSkyState } from '../astronomy/state'
import { SITE_GEO, SITE_BUILD_TIME } from '../consts'

const sky = computeSkyState(SITE_BUILD_TIME, SITE_GEO)  // L0 baseline
---
<html lang="en"
      data-sky-anchor="now"
      data-sky-default-lat={SITE_GEO.lat}
      data-sky-default-lon={SITE_GEO.lon}>
  ...
</html>
```

The hydration code reads `data-sky-anchor` and behaves accordingly:

- `now` → recompute with `new Date()` and (if granted) the visitor's geolocation; settle into the slow drift loop.
- `post` → take `data-sky-time`, `data-sky-lat`, `data-sky-lon` as authoritative; do **not** override.

## Sky caption

Every post page shows a small, accessible caption with the simulated moment:

```html
<figcaption class="sky-caption" aria-live="polite">
  The sky over <span data-sky-place>Berlin</span> on
  <time datetime="2024-11-23T22:14:00+01:00">Nov 23, 2024 at 22:14</time>.
</figcaption>
```

Placed under the post title. Reinforces the temporal anchoring as a content feature.

For `now` pages, the caption updates at L2:

> The sky over **Hong Kong** at **22:14 on Mar 5**.

If geolocation is granted, "Hong Kong" updates to the visitor's locality (using `Intl.DateTimeFormat` for tz-name fallback when reverse-geocoding isn't available — we never call a geocoding API).

## Fallback geo from timezone

When the visitor has not granted geolocation, we still want the sky on `now` pages to feel local. We approximate from the IANA timezone:

```ts
// src/astronomy/timezone-geo.ts
import { TZ_TO_GEO } from './data/tz-geo.json'

export function geoFromTimezone(tz: string): Geo | null {
  return TZ_TO_GEO[tz] ?? null  // e.g., "Asia/Hong_Kong" → {lat: 22.3, lon: 114.2}
}
```

`tz-geo.json` is a **build-time-baked** lookup of ~600 IANA timezones to representative city coordinates (the city the timezone is named after). Public-domain data from the IANA tzdata `zone1970.tab` file. ~10 KB gzipped.

This gives a "right enough" sky for the visitor's hemisphere and rough latitude without ever geolocating.

## Per-collection navigation

Existing nav stays:

```html
<HeaderLink href="/hack" class="nav-hack">Hacks 作</HeaderLink>
<HeaderLink href="/blog" class="nav-blog">Thoughts 思</HeaderLink>
<HeaderLink href="/life" class="nav-life">Life 活</HeaderLink>
```

The colored underlines (`#be1e2d`, `#ffde17`, `#21409a`) stay. Hover/active states on each link, in L4, pulse the corresponding "anchor body" (Antares/Sun/Vega) in the sky if that body is currently above the horizon. If the body is below the horizon, a subtle "↓N°" indicator can appear in the sky margin (debug-mode only by default; see Q5).

## New page: `/sky`

A small explainer page describing what the visitor is seeing — the engine, the data sources, the fact that nothing leaves the device, and how to enable optional layers (geolocation, deep-sky mode, starseer LLM). Doubles as the privacy + provenance page.

Suggested sections:

1. *What you're looking at* — the sky over `<place>` at `<time>`, computed locally.
2. *How it works* — links to this spec.
3. *What's not happening* — no APIs, no tracking, no third parties.
4. *Toggles* — enable geolocation / deep-sky / starseer.
5. *Data sources* — links to YBSC / HYG, Stellarium constellation lines, license attributions.

## RSS and atom

No change. Astronomy theme is a pure rendering concern; the feed serves the same posts with the same descriptions.

## Backward compatibility

A post written today and committed without any new frontmatter renders correctly:

- Time anchor: its `date` field (already required).
- Place anchor: `SITE_GEO` (the site default).
- Caption: `"The sky over <SITE_GEO.name> on <date>."`

Zero migration churn. Authors who want to anchor a post to its geographic reality (a Berlin trip, a San Francisco morning) add the `geo` field in the next edit.
