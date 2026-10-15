# Design plan — TicTic

The working plan for the visual layer and the launch pass. Decisions here are
already made and argued; nothing waits on a choice. Each section names what is
*done* (with the evidence) and what is *next*.

---

## 0. Constraints that shaped every decision

- **No runtime dependency.** No framework, no CDN, no `npm install`. The app is
  plain ES modules + CSS custom properties; every tool in `tools/` runs on a
  stock Node with zero packages (`node tools/check.mjs`).
- **Offline first.** Anything the app shows must come off the disk after the
  first visit, fonts included.
- **Persian-first, bilingual.** `fa` (RTL) is the default; `en` (LTR) is a
  first-class switch, not an afterthought. Vazirmatn for fa, Inter for latin.
- **ADHD-shaped product.** Calm surfaces, one loud accent at most, no shame
  colours (overdue is grey, not red), completion is the only celebration.

## 1. Art direction — "Ruled Paper"

Named, so every later change has something to be consistent with.

| Element | Call | Why |
|---|---|---|
| Surface | Warm paper tones (`--paper-*`), never pure white | A planner is stationery; `#FFF` reads as a spreadsheet |
| Ink | `#1C1A17`-family warm blacks, three muted steps | Warm ink on warm paper keeps contrast without glare |
| Accent | **Clay** `#C0392B` — one, loud, used sparingly | A single accent makes hierarchy readable at a glance; 7 alternates exist as themes, not as decoration |
| Overdue | Neutral grey, explicitly never red | Shame-free is a product requirement, not a taste |
| Type | Vazirmatn 400–800 (fa) · Inter 400–800 (latin), self-hosted woff2 subsets | No CDN, no layout shift, `font-display: swap` |
| Numbers | Tabular everywhere dates/counts appear | ADHD scanning: digits must not jitter between rows |
| Illustration | Hand-drawn inline SVG, ruled-paper line work, `currentColor` | Zero raster, zero requests, recoloured by every theme for free |
| Radii | 4-step scale `--r-xs…xl`, no free-hand values | Consistency reads as "one app", not "several templates" |
| Motion | ≤ 300 ms, tokenised durations + easing, `prefers-reduced-motion` honoured and user-toggleable | Purposeful only: completion tick, view change, sheet, drag |

## 2. Token architecture

`src/css/tokens.css` is the only place values live.

- **Semantic layer** (`--bg`, `--surface`, `--text`, `--accent`, `--danger`…) is
  what components use. Raw hex exists only inside the palette definitions.
- **Themes** = `[data-theme="…"]` overrides of that same layer. 8 themes:
  paper, sepia, mint (light) · midnight, neon, terminal (dark) ·
  contrast, contrast-dark (high-contrast). `System / Light / Dark` is a
  first-class choice; the picker shows live swatches.
- **Accents** = 7 hues × 8 themes, swapped by `[data-accent]`.
- **Motion / contrast** toggles are data-attributes, not duplicated CSS.

Verified by `tools/contrast.mjs`: **1 584 pairs across 9 theme × accent
combinations, 0 failing WCAG 2.2 AA** (the audit started at 139/240 failing,
worst 2.15:1).

## 3. What the redesign fixed (Phases 1–3)

Full detail in [DESIGN_AUDIT.md](DESIGN_AUDIT.md). The four blockers:

1. Component CSS largely did not exist (`ov-sheet`, `qa-*`, `trow`, `pick`…);
   the app depended on the Tailwind CDN for basics like `.sr-only`. Now:
   `base.css` + `components.css`, no CDN, **120/120 rendered classes styled**
   (`tools/check-css-coverage.mjs`).
2. 139/240 contrast pairs failed AA → 0/1 584 after retuning the palettes.
3. No loading, empty, error or offline states → skeleton shell in
   `index.html`, illustrated empty states (`src/js/art.js`), fatal-error card
   (`src/js/main.js`), offline bar + update prompt (`src/js/pwa.js`).
4. No PWA identity → `manifest.json` + generated icon set + precaching
   service worker with an explicit "Reload" update flow.

## 4. Verification strategy — every claim has a runner

`node tools/check.mjs` is the CI gate (13 gates, all green as of this writing):

| Gate | Proves |
|---|---|
| `syntax` | all 34 modules parse |
| `usage` | no call to a never-imported identifier |
| `css` | 120/120 rendered classes styled; orphans reported |
| `tokens` | every `var(--x)` resolves to a definition or fallback |
| `i18n` | fa and en carry the same 415 keys |
| `manifest` | parseable; 192/512/maskable icons exist on disk |
| `offline-url` | zero third-party URLs in runtime files |
| `console` | no `console.log` left in the app |
| `sw-precache` | `sw.js` matches the tree (`tools/build-sw.mjs`) |
| `contrast` | 1 584 pairs, 0 failing |
| `calendar` | Jalali conversion vs ICU, 25 933 days + 59 115 assertions |
| `roundtrip` | TickTick export → import reproduces the data (129/129) |
| `horizons` | no task lands in two groups of one view (567 assertions) |

## 5. Bugs this pass surfaced (fixed)

The Jalali reverse conversion (`fromJalali`) was ~1 month out and
`jalaliMonthLen` always returned 29 for Esfand, so leap years lost a day.
Replaced with the arithmetic algorithm (same one jalaali-js implements, MIT,
no dependency) and cross-checked against ICU day by day:

- `tools/calendar.mjs` — 59 115/59 115 assertions, 1900–2200 CE window.
- TickTick bridge: all-day rows now import as calendar days (shape preserved),
  and checklist rows are only extracted from files labelled as check lists —
  both found by `tools/roundtrip.mjs`.

## 6. Roadmap — all three phases done

1. ~~**Phase 8 — PWA verification in a real browser**~~ — done: service worker
   active, **55/55** precache entries on a cold install in a fresh profile,
   update prompt verified live (new version waits, page keeps the old worker),
   install metadata complete. *A reload cannot test the update prompt — it
   discards the old client, so the new worker never waits; the page must stay
   open.*
2. ~~**Phase 9 — `LAUNCH_REVIEW.md`**~~ — done: scorecard, cross-browser/width
   matrix, functional pass, edge cases, bug list, ship verdict. Only verified
   claims.
3. ~~**Phase 10 — repo deliverables**~~ — done: `README.md` (with the exact
   TickTick field mapping), `CREDITS.md`, `LICENSE`, `.gitignore`,
   `.editorconfig`, dependency-free `package.json` so `npm run check` works.
4. ~~Docs sync~~ — done: `VERIFICATION.md`'s bug log now lives in
   `LAUNCH_REVIEW.md` §5; `DEFERRED.md` points at the launch review.

## 7. Explicit non-goals

- No Lighthouse score will be *claimed* unless it is actually run; if the
  environment cannot run it, the review says so and reports the manual
  measurements instead.
- No cloud sync, push reminders, or TickTick OAuth — documented in
  [DEFERRED.md](DEFERRED.md) with reasons.
