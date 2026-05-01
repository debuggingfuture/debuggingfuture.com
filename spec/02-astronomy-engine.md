# 02 — Astronomy Engine

The engine is **a few hundred lines of pure TypeScript** that compute everything the sky needs from the inputs `(time: Date, geo: Geo)`. No I/O, no dependencies, no external APIs at runtime. Algorithms are well-known closed-form approximations from Meeus' *Astronomical Algorithms* and the open-source community (Stellarium, NOAA, suncalc).

## Inputs and outputs

```ts
export interface Geo { lat: number; lon: number; name?: string }

export interface SkyState {
  time: Date
  geo: Geo
  sun:  { altitude: number; azimuth: number; rightAscension: number; declination: number }
  moon: { altitude: number; azimuth: number; phase: number; illumination: number; angle: number }
  twilight: TwilightPhase
  localSiderealTime: number  // hours, 0..24
  cssVars: Record<string, string>
}

export type TwilightPhase =
  | 'day'                  // sun altitude > +6°
  | 'goldenHour'           // +6°  .. -0.83°
  | 'civilTwilight'        // -0.83° .. -6°
  | 'nauticalTwilight'     // -6°  .. -12°
  | 'astronomicalTwilight' // -12° .. -18°
  | 'night'                // < -18°
```

## Solar position

We use NOAA's simplified algorithm (also the basis of the popular `suncalc` library, MIT licensed; we implement directly to avoid the dep). Accuracy: ±1 minute for sunrise/sunset, ±0.1° for altitude. More than enough for a sky background.

Pseudocode:

```
JD ← julianDate(time)                          // Julian Date
T  ← (JD - 2451545.0) / 36525.0                // Julian centuries since J2000

L  ← 280.460 + 36000.770 * T                   // Mean longitude (deg)
g  ← 357.528 + 35999.050 * T                   // Mean anomaly (deg)
λ  ← L + 1.915*sin(g) + 0.020*sin(2g)          // Ecliptic longitude
ε  ← 23.439 - 0.0000004 * (JD - 2451545)       // Obliquity of ecliptic

α  ← atan2(cos(ε)*sin(λ), cos(λ))              // Right ascension
δ  ← asin (sin(ε)*sin(λ))                      // Declination

LST ← localSiderealTime(JD, geo.lon)
H   ← LST*15 - α                               // Hour angle (deg)

altitude ← asin (sin(δ)*sin(geo.lat) + cos(δ)*cos(geo.lat)*cos(H))
azimuth  ← atan2(sin(H), cos(H)*sin(geo.lat) - tan(δ)*cos(geo.lat))
```

Sunrise/sunset are *not* computed by iterative root-finding; instead, the `twilight` phase is derived directly from `altitude`. This means the engine gives correct **continuous** state at any time without needing to know "today's sunrise". Cheap and good.

## Lunar position and phase

Conway/Meeus simplified formula. ±1 day phase accuracy, ±0.5° position accuracy. Sufficient because the moon is rendered as a stylized disk, not a photorealistic body.

```
days ← (JD - 2451550.1) / 29.530588853          // Synodic months since reference new moon
phase ← days - floor(days)                      // 0..1, 0 = new, 0.5 = full
illumination ← (1 - cos(2π * phase)) / 2        // 0..1
```

For altitude/azimuth, an analogous reduction to ecliptic coordinates → equatorial → horizontal as for the sun (lookup tables for moon's mean longitude, anomaly, node).

`phase` drives a CSS mask on an SVG circle to render the lit portion. `angle` (parallactic angle) rotates the terminator so the bright limb points correctly toward the sun.

## Local sidereal time

Standard formula:

```
LST(hours) ← (6.697374558 + 0.06570982441908*(JD-2451545.0) + 1.00273790935*UT_hours + lon/15) mod 24
```

LST is the right ascension currently overhead — i.e., the rotation of the celestial sphere relative to the observer. It is the bridge that converts the catalog's `(rightAscension, declination)` into the renderer's `(altitude, azimuth)`.

## Equatorial → horizontal

For each catalog star (and the planets, if we add them later):

```
H ← LST*15 - star.RA
alt ← asin (sin(star.dec)*sin(lat) + cos(star.dec)*cos(lat)*cos(H))
az  ← atan2(sin(H), cos(H)*sin(lat) - tan(star.dec)*cos(lat))
```

Stars with `alt < 0` are below the horizon and culled. Stars with `alt > 0` and visible-magnitude (depends on twilight phase) are drawn.

## Visible-magnitude threshold

The naked-eye limiting magnitude depends on sky brightness, which is driven by the sun's altitude:

| Phase | Limiting magnitude |
|---|---|
| `day` | n/a (no stars rendered) |
| `goldenHour` | 1.5 (only Sirius, Vega, Capella, Arcturus, Rigel, Procyon, Betelgeuse, etc.) |
| `civilTwilight` | 2.5 |
| `nauticalTwilight` | 3.5 |
| `astronomicalTwilight` | 4.5 |
| `night` | 4.5 (default) or 6.5 (deep-sky mode, opt-in) |

This produces the satisfying "stars come out" progression at dusk, cued to physics rather than scripted.

## Star catalog

**Source candidates** (all open-data):

- **HYG Database v3.5** — combines Hipparcos, Yale BSC, and Gliese. CC BY-SA 2.5. ~120 K stars; we use a magnitude-cut subset.
- **Yale Bright Star Catalog (YBSC) 5th Ed.** — ~9 100 stars to magnitude 6.5. Public domain.
- **Hipparcos Tycho-2** — denser, but heavier; not needed.

**Decision:** YBSC subset for the bundled default; HYG-v3 to magnitude 6.5 as an optional lazy-load asset for the deep-sky mode. (Final pick deferred to [08-open-questions.md](./08-open-questions.md) Q2 once we measure both.)

**Bundled fields per star:**

```ts
interface StarRecord {
  id: number          // catalog ID (HD or HIP)
  ra: number          // right ascension, radians
  dec: number         // declination, radians
  mag: number         // apparent visual magnitude
  ci?: number         // B-V color index (drives star color rendering)
  name?: string       // proper name if it has one (Sirius, Polaris, ...)
}
```

**Storage:** flat `Float32Array`-friendly JSON shape (parallel arrays for `ra`, `dec`, `mag`, `ci`) to minimize parse cost and bundle size. Targets: ≤ 30 KB gzipped for the ~500-star default subset.

```jsonc
{
  "ra":  [/* float32 radians */],
  "dec": [/* float32 radians */],
  "mag": [/* float16-ish, two decimals */],
  "ci":  [/* B-V */],
  "named": { "32349": "Sirius", "11767": "Polaris", ... }
}
```

## Constellation lines

**Source:** Stellarium's `constellationship.fab` files (GPL-compatible) or the more permissive Stellarium-derived datasets distributed by `d3-celestial` (BSD). Pick the BSD-licensed one to avoid GPL contamination.

**Format:** for each of the 88 IAU constellations, a list of line segments by HD/HIP id pairs:

```jsonc
{
  "Ori": {
    "name": { "en": "Orion", "la": "Orion" },
    "lines": [[39801, 35468], [35468, 36861], ...]   // HD pairs
  },
  ...
}
```

Renderer joins each pair into a polyline using the cached horizontal coordinates already computed for the star catalog. Constellation **labels** appear at the centroid of their visible stars.

## Color from B-V index

Realistic star color (warm yellow for K stars, blue-white for B stars) is computed from the B-V color index using a standard polynomial fit (Mamajek 2013 or Ballesteros 2012). One small lookup table baked into `palette.ts`. Stars without B-V default to white.

## Module surface

```
src/astronomy/
  sun.ts          export function solarPosition(t, geo)        : SunState
  moon.ts         export function lunarPosition(t, geo)        : MoonState
  sidereal.ts     export function localSiderealTime(t, geo.lon): number
                  export function equatorialToHorizontal(...)
  state.ts        export function computeSkyState(t, geo)      : SkyState
  palette.ts      export function paletteFor(twilight, sun)    : Record<string,string>
  catalog.ts      export function loadCatalog(level: 'default'|'deep'): Promise<StarCatalog>
  constellations.ts
                  export function loadConstellations(): Promise<ConstellationMap>
  types.ts
  data/
    stars-default.json     // ≤500 stars, mag ≤ 4.5
    stars-deep.json        // lazy-loaded
    constellations.json
```

Every function in `sun.ts`, `moon.ts`, `sidereal.ts`, `state.ts`, `palette.ts` is **pure** and **synchronous**. Easy to unit-test. The `catalog.ts` and `constellations.ts` are async only because they `import()` JSON dynamically for code-splitting.

## Tests

Golden-value tests against published almanac data:

- Sunrise/sunset for SF, Berlin, Singapore on 4 dates spanning a year — within ±2 minutes.
- Sun altitude/azimuth at solstice noon for selected latitudes — within ±0.2°.
- Moon phase on known new/full moon dates — within ±1 day.
- Polaris altitude ≈ observer latitude (sanity check).
- Local sidereal time at 0h UT on J2000 epoch from Greenwich — well-known value.

These tests run in CI and lock the engine's correctness as the rest of the site evolves.

## References

- Meeus, J. *Astronomical Algorithms*, 2nd ed.
- NOAA Solar Calculator equations: <https://gml.noaa.gov/grad/solcalc/calcdetails.html>
- suncalc (MIT, design reference): <https://github.com/mourner/suncalc>
- Stellarium constellation lines: <https://github.com/Stellarium/stellarium>
- HYG Database v3.5: <https://github.com/astronexus/HYG-Database>
- d3-celestial (BSD, similar approach): <https://github.com/ofrohn/d3-celestial>
