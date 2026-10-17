/* ============================================================
   TicTic ADHD — first-run onboarding (pure)
   One question instead of a populated Today view: the app shows
   it only while the user owns no tasks of their own.

   Deliberately free of DOM, localStorage and store imports: the
   decision is a pure function of (tasks, skipped), so the gate
   tools/check-onboard.mjs can prove every case in Node.
   ============================================================ */

/* the skip flag lives in localStorage; the key is owned here so the
   module and the gate cannot drift apart */
export const ONBOARD_SKIP_KEY = 'tictic.onboard.skip';

/* Demo rows are seeded sample inventory (seed.js marks them `demo: true`).
   Anything else — including a row written before the flag existed — is
   treated as the user's own work, so an existing user is never asked. */
const isUsersOwn = (task) => !!task && typeof task === 'object' && task.demo !== true;

/**
 * @param {{ tasks?: Array, skipped?: boolean }} state
 * @returns {boolean} true only for a genuinely empty (or demo-only) list
 */
export function shouldShowOnboarding({ tasks, skipped } = {}) {
  if (skipped === true || skipped === '1') return false;
  if (!Array.isArray(tasks)) return true;
  return !tasks.some(isUsersOwn);
}

/**
 * The one task the question creates: the frog, undated (undated rows land in
 * Today, so no calendar/timezone arithmetic is involved).
 * @param {string} title
 * @returns {object|null} a task patch for the store factory, or null when blank
 */
export function buildOnboardingTask(title) {
  const t = String(title == null ? '' : title).trim();
  if (!t) return null;
  return { title: t, priority: 'frog', listId: 'inbox' };
}
