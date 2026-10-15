# Deferred features — TicTic ADHD

Everything below is **explicitly deferred**, per acceptance criterion "Every TickTick inventory feature is represented or explicitly deferred." Ordered by build phase.

## Phase 5 — Calendar
- Full keyboard-mode dnd for the day visualizer is present in `day.html`; its port to the app ships with Phase 5, including arrow-key 15-min moves.
- Additional time zones, subscribed calendars, "future repeats" display options.

## Phase 8 — Projects
- Drag reorder inside the flow editor (HTML5 + long-press arm) — planned, not yet wired.
- Habit gallery beyond the 6 seed examples (60+ target).

## Phase 8 — data & sync
- Cloud sync / multi-device conflict handling (local IndexedDB + localStorage mirror only).
- Background/closed-app reminder delivery (needs a push server; in-app cues + Notification permission only).
- TickTick OAuth API sync (the shipped bridge is file/paste based: CSV, Open-API JSON, full backup).
- Attachments upload and Markdown note rendering.

## Phase 10 — Misc
- Attachments in task detail (file picker + object URL preview).
- Markdown rendering in notes (plain text until Phase 9).
- Bulk select via drag-selection rectangle (Ctrl/Shift click only).
- Reminder delivery when the app is closed (requires push server; in-app + Notification API only).
- True dark-theme toggle in Settings now ships (Settings → Theme: system/light/dark, plus accent colour).

## Verified in this build
See `LAUNCH_REVIEW.md` for the scorecard, test matrix and bug list, and
`tools/check.mjs` for the automated gates (`npm run check`).
