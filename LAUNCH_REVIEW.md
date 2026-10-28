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
| 18 | MAJOR | Today view rendered **every overdue task twice** — the overdue group tested `due < today` while the horizon bucket *independently* tested `due <= today`, so past-due work passed both. 44 duplicate rows on this machine's data, 18 on the seeded demo set | **RESOLVED** — one classifier (`src/js/horizons.js`) gives each row exactly one group, so two predicates cannot disagree; gated by `tools/check-horizons.mjs` (577 assertions, verified to fail on the old rule) **and now also at the view level by `tools/check-dom.mjs`**, which reads the element set the Today view builds and fails on any task drawn twice in the listed layer (mutation-tested by restoring the old `due <= today` bucket rule: 2/228 assertions failed, naming five duplicated ids) |

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
7. **No gate inspected the rendered DOM — `tools/check-dom.mjs` now covers the
   set of elements a view builds, for the Today horizon.** It is not a browser:
   rather than fake a document, the view's selection step was moved into a pure,
   Node-importable plan (`src/js/rows.js`) and `views/daily.js` now renders from
   that plan, so the gate asserts exactly the element set the real view builds.
   What it does **not** cover: appending. A view that built the right set and
   then appended it twice would still pass. It also covers only one horizon of
   one view; Plan, Projects, Flows, Report and the drawer are not checked, and
   the classifier-level guard in `check-horizons.mjs` still misses any
   duplication introduced by some other route into the DOM.
8. **Nothing checked for unused exports — `tools/check-exports.mjs` now does,
   with limits.** It parses export declarations and resolves every *static*
   import specifier to a real file; the `usage` gate still only catches a
   *missing* import. Limits: a dynamic `import('./x.js').then(ns => ns.f(…))`
   call is not resolved to a binding, so such names are reported and must be
   allowlisted (`tools/exports-allowlist.json`, one reason per entry, 4 entries
   today — the sidebar loaders in shell.js, the Today noise card, and one name
   collision with `tools/build-sw.mjs`). Name matching is textual, so an export
   sharing a name with an unrelated local elsewhere reads as used; that
   direction is safe — it can miss a dead export but cannot invent one. The
   gate fails on a *stale* allowlist entry, so the list cannot rot. Its
   allowlist also held **15 entries for genuinely dead exports** (finding #22),
   which the gate printed as `(4 false-positive, 15 dead)` on every run rather
   than hiding behind a green tick. Since #22 was resolved the list holds only
   the 4 false-positive entries; both category counts are still printed every
   run, including the zero — `(4 false-positive, 0 dead)`.

---

## Addendum — Now strip, rendered-DOM gate, unused-export gate (suite: 19 gates)

Appended after the review above, so the findings are recorded rather than
rediscovered. Counts in §1–§5 reflect the review date and are left as they were.

| # | Severity | Finding | Status |
|---|---|---|---|
| 19 | MINOR / cosmetic | The frog rendered twice on Today: `frogBanner()` drew it at the top **and** the same task was drawn again as a row in its horizon group (and in the Now strip when shortlisted). Both copies were valid rows — only the multiplicity was wrong | **FIXED** — the view's row selection moved into `src/js/rows.js`, where the banner task is excluded from the list layer, so one task is one element: banner 1 + rows 84 + strip 3 = 88 today (before: 85 rows, frog twice). The banner is not suppressed and the row is not dimmed; the frog's single `.trow` is its strip row. Gated by `tools/check-dom.mjs` (213 assertions), which states the rule directly (`the frog is drawn as the banner AND in the bucket (#19)`) and was mutation-tested by removing the exclusion: 5/216 assertions failed, naming the duplicated id |
| 20 | MAJOR | The Now strip scored `S.tasks` directly, so it ignored the active list/tag/section/query filters and could list tasks the view had hidden behind them. Measured on the live build with `filterList='work'`: 5 strip items, 2 of them from `personal` — phantom rows, and 49 rendered rows instead of 47 | **FIXED** — the strip is filtered by the same `visible()` predicate the rows use, capped at 3, with a total tie-break order and one reason + one action per item; each shortlisted row below carries a `now` chip. Gated by `tools/check-now.mjs` (208 assertions, verified to fail on the old scoring) and by the seeded block in `tools/check-horizons.mjs` (577 assertions; it prints the derived 85 rows = 18 overdue + 62 bucket + 5 done, plus a 3-item strip) |
| 21 | MINOR | No UI clears `ui.filterList` once a sidebar list is chosen (`clearFilter()` resets only the text query), so a list-filtered view is stickier than it looks — and bug #20's fix makes that more visible, because the strip shrinks with it | **RESOLVED** — a clear-filter chip now renders in the topbar next to the existing query chip whenever `S.ui.filterList !== 'all'` (reused class `pick`, `title` = existing i18n key `filter_clear` in fa+en — no new key was needed; the key already existed for the query chip). Clicking it sets `filterList = 'all'` and re-renders inline; no sheet opens. `filterList` still round-trips through IndexedDB on every save (`store.js` persists only `route`, `horizon` and `filterList`), which is the persistence that made this state stick before the chip existed; persistence was deliberately NOT changed in this commit |
| 21 · decision | DECISION | `filterList` persistence across sessions | DECISION: filterList persists across sessions (store.js:63). The #21 chip is the escape hatch when a user returns to a filtered view. Removing persistence would be a one-line change in store.js:63 if the behavior proves unwanted; recorded here so the tradeoff is not re-litigated. |
| 22 | POLISH | 15 exports nothing imports and nothing references in their own file: `artEmptyList`, `artOffline`, `artImport`, `markArt` (art.js), `priChip` (components.js), `toLatinDigits`, `monthName`, `fmtDateEn` (i18n.js), `unsubscribeAll`, `childrenOf`, `isDescendant`, `taskDepth` (store.js), `effectiveListId`, `sortKey` (tasks.js), `setTheme`, `setAccent` (theme.js). Found by the new `tools/check-exports.mjs` on its first run | **RESOLVED** — all 15 dead exports deleted from their modules (art.js ×4, components.js ×1, i18n.js ×3, store.js ×4, tasks.js `effectiveListId`, theme.js ×2); `sortKey`, named in the finding above, was reclassified as the 4th false-positive (its only other mention is an unrelated local function in `tools/build-sw.mjs`) and is kept. `tools/exports-allowlist.json` now holds only the 4 false-positive entries (`renderHabits`, `renderCountdowns`, `openNoiseHarbor`, `sortKey`) and the gate prints `allowlist 4 (4 false-positive, 0 dead)` on every run. That composition-line change (always print both counts, including the zero) was mutation-tested: a stale allowlist entry and an unallowlisted unused export each still fail the gate, with sha256-identical restores |
| 23 | MAJOR / privacy | Personal names and real task text shipped in `seed.js` and `timetable.js`; draft files `Draft.html`, `day.html`, `first draft.txt` were public | **RESOLVED — in the working tree since `73147a0`, and in history as of option B (executed later the same day, 2026-10-17).** Scrubbed with counts, dates, priorities, nesting, demo flags and list distribution preserved so no gate fixture moved: every personal name (a given name → the pinned `Team A Tasks` row; a family surname → `خانواده`; a colleague's name → `همکار`; a friend's/student's given name → `دوست`; four further given names likewise → `دوست`/`ویژه`, the timetable's student class labels → generic class labels, the language-platform handle → `Language class` — the originals are gone from every commit and this row deliberately spells none of them) and the personal task text (insulin resistance, mortgage instalment incl. its countdown, third-party car insurance, lab booking, chess coaching registration + officiating decision, homeschool+AI, the named bank). `samples/` was already clean — 0 matches, no file changed there. The three drafts were **untracked** from git, gitignored and moved into `local-personal-drafts/`: they remain on disk locally and can never re-enter the repo (the move also makes the verification grep return zero, since it globs only `src/`, `samples/` and root-level `*.html`/`*.txt`). History (option B, **executed**): `git filter-repo` dropped the three draft paths from every commit and replaced every scrubbed literal across all blobs, then `git push --force-with-lease origin main` — every hash after `add61df` is rewritten, so pre-rewrite links (incl. `…/commit/add61df`) now 404; the pre-rewrite recovery bundle lives outside the repo in `backups/`. What B cannot fix: forks, old clones, CDN/browser caches and archive crawlers that fetched the pre-rewrite hashes before 2026-10-17 |
| 24 | CHANGED / privacy-relevant | A fresh install booted with seeded demo inventory, so the app opened on sample data the user never created (and, before #23, on real personal data) | **RESOLVED** — Seed data no longer loads on boot; `seed.js` remains as a gate fixture only (`tools/check-dom.mjs`, `check-horizons.mjs` and `check-now.mjs` import it directly, so every fixture is unchanged and the suite stays 19/19). First-run offers three paths — import from TickTick, add one task, or start blank — and every one of them sets the skip flag through a single `retire()` before handing off, so the sheet cannot re-fire; `tools/check-onboard.mjs` grew from 30 to 37 assertions, covering "boot ships no demo data" and "three labelled paths", both mutation-tested (restoring the boot seed fails with the demo row named; dropping a path label fails with the count). Users with existing data unaffected: the sheet still keys off "no task of the user's own", never off emptiness. Today shows the existing empty state when there is nothing to show |
| 25 | MAJOR / data | A TickTick CSV import brought back every task, including ones completed years earlier (a v7.2 export carries `0 Normal / -1 Abandoned / 2 Completed` in its preamble legend, and a repeating task exports one row per historical occurrence, so the noise dominates) | **RESOLVED** — `parseTickCsv` now reads the file's own preamble legend instead of assuming the v7.1 0/1/2 mapping, so v7.2's `2 Completed` and `-1 Abandoned` decode correctly; `previewImport`/`applyImport` skip completed rows unless the “Include completed” switch is on (now **off by default**) and skip abandoned rows always, each with its own preview counter (`۴ · انجام‌شده` / `۲ · رهاشده`) and snackbar mention. `tools/roundtrip.mjs` grew 129→150 assertions: a synthetic v7.2-shaped fixture (`tools/fixtures/ticktick-v72.csv` — 6 Normal with priorities 0/1/3/5, 4 Completed incl. a 2-row repeating history with different taskIds, 2 Abandoned, embedded-newline Content, scientific-notation `Order`) must import exactly 6 · completed-skipped 4 · abandoned-skipped 2, leak none of it, and survive re-import with 0 additions; both new filter lines were mutation-tested (completed filter removed → “applied count got 10 want 6” + leak names; abandoned filter removed → “abandoned skipped got 0 want 2” + leak names) and restored byte-identically (sha256 match, 150/150 green). Verified live: fresh-profile import of the fixture shows 6 imported · 4 completed · 2 abandoned · 0 duplicates, and re-importing the same file imports nothing. Follow-up finding (OPEN, minor, not planned for this commit): an “import completed history” toggle for users who want their archive back in one go |

The `check-dom` scope limitation recorded in §7 (the gate proves the *set*, not that anything was appended; Today and one horizon only) is **unchanged by this commit**.

Two gates were added for this, both mutation-tested: `tools/check-dom.mjs` (213
assertions — the element set of the Today view, catching #18 and #19) and
`tools/check-exports.mjs` (zero dependencies — dead exports, with the allowlist
categories printed on every run). The suite is 19 gates.

`visible()` moved out of `views/daily.js` into `horizons.js` for #20: the view
module imports the UI layer and cannot be imported in Node, so no gate could
compute the render set it produced. The text matcher is now injected into
`visible()` rather than imported, because `search.js` touches the DOM at module
scope and importing it would have made the pure module unusable outside the
browser. A query with no matcher supplied fails closed (hides rows) rather than
falling open.

For #18/#19 the same trick was applied to the rows themselves: the view's
selection step now lives in `src/js/rows.js` as `todayRenderPlan()`, and
`views/daily.js` renders that plan instead of filtering `S.tasks` itself. The
view and the gate therefore read one function, and the plan decides the element
set that `tools/check-dom.mjs` asserts — banner, list rows and strip together.
The gate also derives the badge count (`|strip ∩ rows|`, 2 today) instead of
assuming an integer, so an orphan badge fails it; that derivation caught its own
first bug, where the banner was counted as a badge-bearing row.

Suite is 19 gates as of ddd14bf (18 through 1715ac7; 19 from 0fed905, the commit that landed the canary gate).
