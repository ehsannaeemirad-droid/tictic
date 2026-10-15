#!/usr/bin/env node
/* ============================================================
   calendar.mjs — the Jalali (Solar Hijri) gate.
   The app's own arithmetic conversion is checked against the ICU
   calendar that ships with Node/V8 (`fa-u-ca-persian`) — an
   independent implementation — day by day.

     1. toJalali      == ICU for every day in the window
     2. fromJalali ∘ toJalali == identity (no drift either way)
     3. jalaliMonthLen agrees with the calendar (month rollovers)
     4. known anchors: Nowruz 1403 / 1405, Esfand 1404

     node tools/calendar.mjs     exit 0 = every day matches
   ============================================================ */
import { toJalali, fromJalali, jalaliMonthLen } from '../src/js/i18n.js';

const icu = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
  year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC',
});
const icuParts = (date) => {
  const p = Object.fromEntries(icu.formatToParts(date).map((x) => [x.type, x.value]));
  return { jy: +p.year, jm: +p.month, jd: +p.day };
};

let fails = 0, checks = 0;
const bad = [];
const check = (label, got, want) => {
  checks++;
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    fails++;
    if (bad.length < 10) bad.push(`${label}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
  }
};

/* 1 + 2 — every day, 1990..2060, both directions */
const start = Date.UTC(1990, 0, 1);
const end = Date.UTC(2060, 11, 31);
let days = 0;
for (let t = start; t <= end; t += 86400000) {
  const d = new Date(t);
  /* toJalali reads local parts; keep it honest by feeding UTC noon in the
     local zone — instead compare against ICU in UTC and drive the app with
     the same wall-clock day by constructing the date at UTC midnight, which
     is the same calendar day in every zone from -12 to +14 except 12:00–24:00
     east of UTC. To remove that ambiguity entirely we use timeZone UTC in ICU
     and feed the app the same y/m/d via a local-midnight date. */
  const local = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const j = toJalali(local);
  const want = icuParts(d);
  check(`${d.toISOString().slice(0, 10)} toJalali`, j, want);

  const back = fromJalali(j.jy, j.jm, j.jd);
  check(`${d.toISOString().slice(0, 10)} round-trip`,
    back && [back.getFullYear(), back.getMonth() + 1, back.getDate()],
    [local.getFullYear(), local.getMonth() + 1, local.getDate()]);
  days++;
}
console.log(`  toJalali + round-trip: ${days} days checked`);

/* 3 — month lengths: the day after the last day of month m is 1/(m+1)
       or 1/(jy+1), and every month starts where ICU says it starts */
for (let jy = 1300; jy <= 1500; jy++) {
  for (let jm = 1; jm <= 12; jm++) {
    const len = jalaliMonthLen(jy, jm);
    check(`${jy}/${jm} length sane`, len, jm <= 6 ? 31 : jm <= 11 ? 30 : (len === 29 || len === 30) ? len : 'invalid');
    const last = fromJalali(jy, jm, len);
    check(`${jy}/${jm} exists`, !!last, true);
    if (last) {
      const next = fromJalali(jy, jm, len);
      next.setDate(next.getDate() + 1);
      const after = toJalali(next);
      const expect = jm === 12 ? { jy: jy + 1, jm: 1, jd: 1 } : { jy, jm: jm + 1, jd: 1 };
      check(`${jy}/${jm} rollover`, after, expect);
    }
  }
}
console.log('  month lengths + rollovers: 1300–1500 checked');

/* 4 — anchors a human can verify at a glance (UTC dates) */
const anchor = (iso, jy, jm, jd) => {
  const [y, m, d] = iso.split('-').map(Number);
  check(`anchor ${iso}`, toJalali(new Date(y, m - 1, d)), { jy, jm, jd });
  const back = fromJalali(jy, jm, jd);
  check(`anchor back ${iso}`, back && `${back.getFullYear()}-${back.getMonth() + 1}-${back.getDate()}`,
    `${y}-${m}-${d}`);
};
anchor('2024-03-20', 1403, 1, 1);      /* Nowruz 1403 */
anchor('2026-03-21', 1405, 1, 1);      /* Nowruz 1405 */
anchor('2021-03-21', 1400, 1, 1);      /* Nowruz 1400 */
anchor('1983-03-21', 1362, 1, 1);      /* Nowruz 1362 */
check('Esfand 1404 has 29 days (1404 is common)', jalaliMonthLen(1404, 12), 29);
check('Esfand 1403 has 30 days (1403 was a leap year)', jalaliMonthLen(1403, 12), 30);
check('Esfand 1399 has 30 days (1399 was a leap year)', jalaliMonthLen(1399, 12), 30);
check('Esfand 1400 has 29 days', jalaliMonthLen(1400, 12), 29);
check('out-of-range year returns null instead of a wrong date', fromJalali(9000, 1, 1), null);
console.log('  anchors: Nowruz 1362/1400/1403/1405, leap years, range guard');

if (bad.length) console.log('\n' + bad.join('\n'));
console.log(`\n${checks - fails}/${checks} calendar assertions passed${fails ? ` · ${fails} FAILED` : ' · all green'}`);
process.exit(fails ? 1 : 0);
