# Credits & asset licences

Every third-party asset bundled in this repository, with its source, licence
and retrieval date. Nothing here is attribution-ambiguous: if an asset is not
listed, it was authored in this repo.

**Retrieved: 13 October 2026.**

---

## Typefaces (self-hosted, subset, no CDN at runtime)

| Asset | Files | Source | Licence |
|---|---|---|---|
| **Vazirmatn** (fa · latin · latin-ext subsets) | `public/fonts/vazirmatn-*.woff2` | [fonts.google.com/specimen/Vazirmatn](https://fonts.google.com/specimen/Vazirmatn) — fetched at build time by `tools/fetch-fonts.mjs` via the Google Fonts CSS API, then self-hosted | SIL Open Font License 1.1 |
| **Inter** (latin · latin-ext subsets) | `public/fonts/inter-*.woff2` | [fonts.google.com/specimen/Inter](https://fonts.google.com/specimen/Inter) — same pipeline | SIL Open Font License 1.1 |

- Subsetting: latin / latin-ext / arabic ranges, weights 400–800, `font-display: swap`.
- After the fetch step, **every `url()` in `src/css/fonts.css` is local** — the app
  makes no third-party request at runtime (enforced by the `offline-url` gate in
  `tools/check.mjs`).
- To re-fetch: `npm run build:fonts` (network required; the repo already contains
  the output, so this is only needed to refresh).

## Icons

| Asset | Where | Source | Licence |
|---|---|---|---|
| UI icon geometry (calendar, search, settings, clock, bell, flag, check, mic…) | `icons` map in `src/js/ui.js` | Geometry derived from **Lucide** — [lucide.dev](https://lucide.dev), repository: [github.com/lucide-icons/lucide](https://github.com/lucide-icons/lucide) | ISC |
| App logo, favicon, PWA icons (192 / 512 / maskable / apple-touch 180) | `public/icons/*.svg`, `public/icons/*.png` | Generated in-repo by `tools/make-icons.py` (the mark is original geometry) | Same as this repo (MIT) |

- Lucide's ISC notice: “ISC License — Copyright (c) for portions of Lucide are
  held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright
  (c) for Lucide are held by Lucide Contributors 2022.”
- The icons are used as inline SVG path data with `currentColor` strokes; no
  raster icon set is bundled.

## Algorithms / code lineage

| Asset | Where in this repo | Source | Licence |
|---|---|---|---|
| Jalali (Solar Hijri) calendar conversion — `jalCal` / `g2d` / `d2g` / `j2d` / `d2j` arithmetic | `src/js/i18n.js` | **jalaali-js** — [github.com/jalaali/jalaali-js](https://github.com/jalaali/jalaali-js) (Behrang Noruzi Niya) | MIT |

- Ported, not vendored: no dependency is added, and the port is verified
  day-by-day against the ICU `persian` calendar by `tools/calendar.mjs`
  (59 115 assertions, 1900–2200 CE).
- jalaali-js MIT notice: “Copyright (c) Behrang Noruzi Niya”.
- TickTick field formats (CSV header, Open-API JSON shape) were derived from
  TickTick's published export/Open-API documentation; no TickTick code or asset
  is bundled.

## What is *not* third-party

Everything else — the illustrations in `src/js/art.js`, the noise/harbor art,
the service worker, all CSS, all application code — is original to this
repository and covered by the MIT licence in [LICENSE](LICENSE).
