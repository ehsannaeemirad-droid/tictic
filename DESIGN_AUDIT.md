# Phase 1 — Visual-layer audit

Date: 2026-10-13 · Scope: `index.html`, `src/css/*`, `public/*`, every `class:`/inline `style:` in `src/js/**`
Method: three scripts, all reproducible — `node .freebuff/audit-base.mjs` (class coverage), `node tools/contrast.mjs` (WCAG gate), `grep` sweeps. Numbers below are from those runs, not from memory.

## Severity legend
`[BLOCKER]` ships broken · `[MAJOR]` must fix before launch · `[MINOR]` fix if cheap · `[POLISH]` nice to have

## A. Component CSS is largely missing `[BLOCKER]`

**36 of the 103 classes the app renders have no base rule at all.** 67 are styled, but several of those only match a descendant selector or a fake-class:

| Group | Unstyled classes | Consequence as rendered today |
|---|---|---|
| Sheet / modal | `ov-sheet`, `ov-inner`, `ov-head`, `ov-title` | every dialog (task detail, settings, import, palette, search, focus calibration) renders **inline at the end of the page**, unstyled and unscrollable, with no overlay and no backdrop |
| Quick add | `qa`, `qa-box`, `qa-chips`, `qa-chip`, `qa-follow`, `qa-dismiss` | the capture bar — the app's most important surface — is a bare input with default buttons |
| Task row | `t-main`, `t-title`, `t-meta`, `t-actions`, `t-tick`, `t-decide` | rows are unstyled divs; tick circle, title and actions have no layout, so priority/date/meta are not scannable |
| Buttons | `pick` (only `.dump-list .pick{min-height}`), `on`, `act`, `f`, `x`, `star-btn` | **every chip and button** uses default browser chrome (grey bevel, ~21px tall, no 44px target) |
| Toasts | `snack`, `snack-undo` | undo toasts render as plain inline text |
| Structure | `chips-row`, `segs`→`seg`, `plan-seg`, `detail-sec`, `step-row`, `day-card`, `mini-row`, `mini-more`, `pri-chip`, `blocker-out`, `br-ov`, `fo-ring` | no flex/grid wrappers: chip rows don't wrap, the focus ring SVG has no size, the breathing overlay has no layout |

Dead selectors found at the same time: `.lab`, `.sb-tools`, `.collapsed`, `.beam`, `.min-h-dvh` (no markup ever applies them — the "lighthouse beam" never renders).

## B. Colour and contrast `[MAJOR]`

`node tools/contrast.mjs` checks the 16 text/background pairs the UI actually uses across 2 base themes × 7 accents = 240 pairs:

- **139 of 240 fail WCAG 2.2 AA.** Light themes are worst: `--warning` text **2.15:1**, `--text-muted` **3.43:1**, `--accent` on cards **2.49:1 (teal) / 2.59:1 (orange) / 2.80:1 (orange)**, `--priority-med` (🟠 orange) **2.15:1**, `--priority-none` **2.57:1**, `--success` **3.30:1**, `--danger`/`--priority-high` **3.91:1**.
- Dark themes are close but still fail: frog 4.03:1, danger 4.36:1, accent on cards 4.03–4.46:1.
- **`--accent-contrast` does not exist**; `.fab-add` and `.set-toggle.on .sw` hardcode `color:#fff` — on light accents (amber/teal/orange) that is ~2:1.
- 10 raw hex values sit outside token declarations, incl. `#0a101a` for the drawer scrim and `#fff` in three rules.

## C. Type, spacing and rythm `[MAJOR]`

- Three type scales compete: `--fs-*` tokens (12…32px), raw `font-size` in `views.css`, and ~40 inline `font-size:` values in JS. `--fs-*` is used by **zero** rules.
- Spacing: `--sp-*` exists but is used by **zero** rules; every padding/margin in the CSS and in 221 JS lines is a magic number (`10px`, `14px`, `18px`, `6px`…).
- Radii mix `6/10/14px`, `9999px`, `999px` and raw `10px`/`12px`/`14px` in inline styles (see `.q-item`, `.resume-cue`, `.trow:focus-visible`).
- Line-height is set once (1.55) — Persian needs more for descenders in dense rows.

## D. Themes `[MAJOR]`

Only light/dark + 6 accent overrides. No distinct art directions, no high-contrast theme, no `color-scheme` (`<meta>`) property, so native controls, scrollbars and the focus ring stay light-mode in dark themes. `theme-color` is fixed `#E8453C` regardless of theme or light/dark.

## E. Motion and interaction states `[MINOR]`

- `--dur-micro/std/emph` + easings exist, but only 8 rules use them; component states (`:hover`, `:active`, `:disabled`) are missing wherever the component itself is missing (see A).
- No `:active`/pressed feedback on chips, no hover state on `.q-item` (has one), no selected-state styling for `.pick.on`.
- Hover-only affordances: row actions (`.t-actions`) are always visible on touch — acceptable, but with A fixed they need a touch-visible default.

## F. Missing states `[MAJOR]`

Empty states exist (emoji + text) but **loading, error and offline states do not exist anywhere**: no skeleton while the store boots, no visible error surface if a module fails, no offline indicator even though the app ships a service worker. No `<noscript>` fallback.

## G. Assets and PWA `[BLOCKER]`

- `public/manifest.json` references `icons/favicon-48.png`, `icons/icon-192.png`, `icons/icon-512.png` — **`public/icons/` is empty**. No maskable icon, no `apple-touch-icon`, no `scope`, no `categories`, no `id`. Chrome will not offer install (`icons` are required at 192+512).
- `index.html` hotlinks `fonts.googleapis.com`/`fonts.gstatic.com` → **the app is not offline-capable** as promised; a cold start with no network falls back to Tahoma.
- The service worker is network-first everywhere with `CORE = ['./', './index.html', './public/manifest.json']` — it never precaches CSS/JS/fonts/icons, so a cold offline start fails; there is no update prompt (`skipWaiting` is unconditional).

## H. Repo hygiene `[MINOR]`

No `README.md`, `CREDITS.md`, `LICENSE`, `.gitignore`, `.editorconfig`, or check script. `src/js/views/extras.js` is dead (never imported). Two `console.warn`s remain (both legitimate storage diagnostics). Root drafts (`Draft.html`, `day.html`, `first draft.txt`, `aiprompt.txt`) are the user's source material — left in place, documented in the README.

## What is already good (keep it)

- Semantic token names and a light/dark split; priority colours as tokens; `prefers-reduced-motion` + an in-app motion switch; logical properties (`inset-inline`, `border-inline-end`) so RTL works; `.num` tabular numerals; `:focus-visible` ring; 44px `btn-icon`; `sr-only` + `aria-live` region; safe-area insets in the shell, topbar, FABs and nav; a real CSV parser and a full-backup restore path.

## Fix order used in this pass

1. Token layer (colour incl. `--accent-contrast`, space, radius, elevation, z, motion, type) + 6 themes + high-contrast → verified by the contrast gate.
2. `base.css` (resets, forms, focus, scrollbars, `color-scheme`) and `components.css` (the 36 missing families + states + 44px targets).
3. Art direction pass on shell/views, dead CSS removed, `#fff`/raw hex tokenised.
4. Real assets: logo/favicon/PWA icons (SVG + generated PNG), self-hosted fonts, empty-state art.
5. Theme picker, reset flow, import preview, PWA (precache + update prompt + offline banner), loading/error states.
