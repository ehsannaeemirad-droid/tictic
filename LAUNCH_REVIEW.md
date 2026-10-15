# Launch review — TicTic

Pre-ship sign-off. Every claim here has a runner behind it; anything I could
not measure in this environment is labelled **unverified** rather than assumed.

Environment: the repo served from `127.0.0.1:8123` (python http.server),
checked in Chromium via the app's own browser tooling. Automated gates run on
stock Node 20+, no installs.

---

## 1. Scorecard

| Area | Rating | Evidence |
|---|---|---|
| **Design quality** | Strong | Named art direction ("Ruled Paper"), one accent, tokenised everything; 120/120 rendered classes styled (`tools/check-css-coverage.mjs`) |
| **Consistency** | Strong | 149 tokens; zero raw hex outside palette definitions; radii/spacing/motion all from scales (`tools/check.mjs` tokens gate) |
| **Accessibility** | Strong | 1 584 contrast pairs across 9 themes × 8 accents, **0 failing WCAG 2.2 AA**; visible focus, 44 px targets, ARIA on dialogs/switches/radios, `prefers-reduced-motion` + in-app toggle |
| **Performance** | Good | No framework, no build step, fonts subset (~230 KB total across 5 faces), skeleton first paint, no layout shift from fonts (`font-display: swap` + preload). *Lighthouse not run — no Chrome CLI in this environment (unverified)* |
| **PWA compliance** | Strong | Manifest complete (id/scope/standalone/maskable/192/512/shortcuts); SW active with **55/55** precache entries, verified on a **cold install in a fresh profile**; update prompt verified live (new version waits, the page keeps the old worker) |
| **Offline** | Strong (with caveat) | Every shell asset precached and confirmed present; cache-first for assets, network-first for navigations. *A true airplane-mode run was not possible in this tooling — verified via complete precache + cache-hit paths, not by killing the NIC (unverified end-to-end)* |
| **Data integrity** | Strong | TickTick round-trip **129/129**; duplicate-safe imports; backup/restore lossless; IndexedDB primary + localStorage mirror with defined precedence |
| **Code quality** | Strong | 13/13 gates green; zero dependencies; no dead code (placeholder module, an unused horizon helper and one orphan CSS rule removed); console discipline enforced by gate |

## 2. Test matrix

| Surface | Result |
|---|---|
| Chromium (this environment) | Full pass — see §3 |
| Firefox / Safari / Edge | **Not run here** — no other engines available. mitigations: only baseline-2023 CSS (`color-mix`, `100dvh`, ES modules, `:has`-free selectors) and a `100vh` fallback for `100dvh`; Safari safe-area insets handled; `apple-mobile-web-app` meta present |
| 320 px → 2560 px | Sidebar collapses to bottom nav ≤ 820 px (tokenised breakpoint); tested at 320, 768, 1440 in-browser |
| RTL | Default direction; `[dir]` and logical properties (`inset-inline`, `margin-inline`) used throughout — no mirrored-RTL bugs in the shell |
| Keyboard | Esc closes focus/sheets, ⌘/Ctrl+K palette, `n`/`d`/`/` shortcuts, arrow-row moves; all interactive elements focusable with visible rings |
| Version update | ✓ a running page keeps the old worker while the new one waits; the “Reload” bar appears and nothing refreshes under the cursor (verified live; a *reload* is not a valid test — it discards the old client so the new worker never waits) |
| Duplicate rows | ✓ no task is rendered in two groups of one view (`tools/check-horizons.mjs`, 567 assertions) |

## 3. Functional pass (Chromium, this build)

| Check | Result |
|---|---|
| Boot, seed, first paint | ✓ skeleton → shell, console clean (0 messages) |
| Create / complete / delete task | ✓ (tick + 5 s undo snackbar) |
| All 8 themes + accent switch | ✓ live, `data-theme` + `theme-color` meta follow |
| Theme persists across reload | ✓ the active theme reapplied pre-paint after reload; written to **both** localStorage and IndexedDB |
| IDB-wins precedence | ✓ raw localStorage edit was correctly superseded by the newer IndexedDB copy |
| Import (CSV/JSON/paste) | ✓ preview with skip reasons before any write; re-import adds nothing |
| Export (CSV/JSON/backup) | ✓ 24-column header intact |
| Round-trip | ✓ `tools/roundtrip.mjs` — 129/129 |
| Reset (type-to-confirm, backup-first) | ✓ disabled button until `RESET` typed |
| PWA install metadata | ✓ manifest 200, 5 icons on disk, maskable present, `display: standalone` |
| Service worker | ✓ active, controlling page, 55 entries, version `tictic-v4` |
| Offline assets | ✓ every precached shell file present in cache, the `./` root included (`missing: []`) |
| Update prompt | ✓ verified live: a deployed update installs and **waits**, the page stays on the old worker, the bar offers “Reload” |
| Jalali calendar | ✓ `tools/calendar.mjs` — 59 115/59 115 vs ICU |

## 4. Edge cases

| Case | Status |
|---|---|
| 0 tasks | ✓ illustrated empty states (`src/js/art.js`) |
| 1 task / many tasks | ✓ demo data seeds ~115; renders without jank |
| 200-char titles / 10 000-char notes | ✓ ellipsis + note field is a textarea; export quotes embedded newlines |
| Emoji / RTL / CJK in titles | ✓ CSV quoting verified in samples; emoji round-trip in fixture |
| Corrupted import file | ✓ parse failure surfaces a message; nothing written |
| Storage quota exceeded | ⚠ caught (`try/catch` around `localStorage.setItem`) — user sees a console warning only. **Known gap** (see bugs #12) |
| JS disabled | ✓ `<noscript>` card explains and links nothing broken |
| Timezone change mid-life | ✓ all-day stored as calendar day, timed as instant; `dayKey()` is local |

## 5. Bug list

| # | Severity | Bug | Status |
|---|---|---|---|
| 1 | BLOCKER | 44/62 dated tasks on wrong calendar day (UTC-vs-local) | **FIXED** — `dayKey()`/`shiftDay()`/`hasTimeOfDay()` |
| 2 | BLOCKER | Component CSS largely missing; Tailwind CDN dependency | **FIXED** — base/components CSS, no CDN |
| 3 | BLOCKER | 139/240 contrast pairs failing AA | **FIXED** — 0/1 584 |
| 4 | BLOCKER | No PWA manifest/icons/SW | **FIXED** — manifest + generated icons + precache SW |
| 5 | MAJOR | `fromJalali` off by ~1 month; `jalaliMonthLen` always 29 (leap flag inverted) | **FIXED** — arithmetic port verified vs ICU (59 115 assertions) |
| 6 | MAJOR | All-day dates changed shape through CSV round-trip | **FIXED** — `Is All Day = Y` → calendar day |
| 7 | MAJOR | Notes containing `- [ ]` lines silently became subtasks | **FIXED** — checklist extraction only when `Is check list = Y` |
| 8 | MAJOR | Eisenhower quadrant `nINU` unreachable, arrow-move threw | **FIXED** |
| 9 | MAJOR | Multi-step flow chained off unrelated sessions | **FIXED** — explicit `tictic:session-end` |
| 10 | MAJOR | Month grid ignored Saturday week-start | **FIXED** |
| 11 | MINOR | "Decide by" showed UTC wall clock | **FIXED** |
| 12 | MINOR | Storage-quota failure is silent to the user (console only) | **WONTFIX for v1** — would need a toast system hook into `persist()`; documented as known gap |
| 13 | MINOR | Broken font preload path (`vazirmatn-var.woff2` didn't exist) | **FIXED** — preloads the arabic subset |
| 14 | MINOR | Duplicate service-worker registration (inline script + module) | **FIXED** — single registration in `pwa.js` |
| 15 | MINOR | Placeholder module `views/extras.js` and orphan `.wrap` rule | **FIXED** — removed |
| 16 | MINOR | Persian-digit time tokens (`۸ صبح`) ignored | **FIXED** |
| 17 | POLISH | Older demo rows keep the old off-by-one where seeded as plain dates | **WONTFIX** — data, not code; re-seeding corrects it |
| 18 | MAJOR | Today view rendered **every overdue task twice** — the overdue group tested `due < today` while the horizon bucket *independently* tested `due <= today`, so past-due work passed both. 44 duplicate rows on this machine's data, 18 on the seeded demo set | **FIXED** — one classifier (`src/js/horizons.js`) gives each row exactly one group, so two predicates cannot disagree; gated by `tools/check-horizons.mjs` (567 assertions, verified to fail on the old rule) |

## 6. Verdict

**SHIP.**

The four blockers are closed with automated evidence, the accessibility and
data-integrity gates are green, and the PWA verifies in a real browser
(service worker active, 55/55 precached on a cold install, update prompt
verified, theme persistence across reload). Nothing in the bug list blocks a
first public release.

One caveat worth stating plainly: bug #18 was found **by hand, not by a gate**.
All 12 gates passed while every overdue row was being drawn twice, because the
rows themselves were valid — only their *multiplicity* was wrong. The lesson is
in the fix: the two predicates became one classifier, and the new `horizons`
gate now fails on the pre-fix rule. Two further gaps the gates do not cover are
listed under limitations (dead exports, and the fact that no gate inspects the
rendered DOM).

### Known limitations to publish with v1

1. **Offline verified by precache completeness, not by a NIC-level outage test**
   in this environment. Worth a manual airplane-mode pass on a phone before a
   big announcement.
2. **Cross-browser**: only Chromium was executable here. Firefox/Safari/Edge
   should get a smoke pass on real devices; the CSS used is baseline-stable.
3. **Lighthouse scores not measured** — no Chrome CLI available. No number is
   claimed.
4. **Storage-quota errors are silent** to the user (bug #12).
5. **TickTick bridge is file-based**; no OAuth sync (see DEFERRED.md).
6. **Frog priority is lossy through TickTick files** (exports as High) —
   documented in README, and the JSON backup is lossless.
7. **No gate inspects the rendered DOM.** The 12 original gates are static
   (source, CSS, tokens, data); bug #18 was 44 perfectly valid rows drawn twice
   and every gate was happy. It is now covered by a pure-logic gate over the
   classifier — which is exactly why the horizon rules were moved out of the
   view into `src/js/horizons.js`. A different view could still duplicate a row
   through some other route; that class is only as closed as the classifier is
   shared.
8. **Nothing checks for unused exports.** The `usage` gate catches a *missing*
   import; it says nothing about an export no one calls. Two such helpers
   (`inHorizon`/`inView`) sat in `tasks.js` carrying the same inverted
   `due <= today` convention and were found by hand during this pass, not by a
   gate. They are removed; the class is not gated.
