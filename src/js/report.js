/* ============================================================
   TicTic ADHD — Report view (§5.14): day/week/sprint/month.
   Completion · decisions resolved · symptom averages · dopamine
   & pressure distribution · calibration · no-guilt feedback.
   ============================================================ */
import { S, commit, persist } from './store.js';
import { tr, N, fmtDate, parseISO, dayKey } from './i18n.js';
import { h } from './ui.js';

let period = 'week';
let anchorDate = new Date();

export function renderReport() {
  const wrap = h('div', {});
  const seg = h('div', { class: 'seg', style: 'margin-bottom:12px' });
  for (const [m, k] of [['day', 'day'], ['week', 'week'], ['sprint', 'sprint'], ['month', 'month']]) {
    seg.append(h('button', { class: period === m ? 'on' : '', onclick: () => { period = m; rerender(); } }, tr(k)));
  }
  wrap.append(seg);
  wrap.append(rangeNav());

  const { from, to } = range();
  const inRange = t => { const d = t.dueDate ? dayKey(t.dueDate) : null; return d && d >= from && d <= to; };
  const done = S.tasks.filter(t => t.status === 'done' && inRange(t));
  const total = S.tasks.filter(t => inRange(t) && t.status !== 'note').length;
  const decisions = S.tasks.filter(t => t.kind === 'decision' && inRange(t));
  const decResolved = decisions.filter(t => t.status === 'done').length;
  const minutes = done.reduce((a, t) => a + (t.actual || 0), 0);

  wrap.append(card(tr('completion'),
    h('div', { class: 'num', style: 'font-size:24px;font-weight:800' }, N(done.length) + ' / ' + N(total)),
    h('div', { class: 'num', style: 'font-size:13px;color:var(--text-muted)' }, N(minutes) + tr('_min')),
  ));

  wrap.append(card(tr('decisions_resolved'),
    h('div', { class: 'num', style: 'font-size:24px;font-weight:800' }, N(decResolved) + ' / ' + N(decisions.length)),
    h('div', { style: 'font-size:12px;color:var(--text-muted)' }, tr('deciding_is_work')),
  ));

  wrap.append(symptomCard());
  wrap.append(distributionCard(done));
  wrap.append(calibrationCard());

  /* feedback, no-guilt */
  const half = total ? done.length / total : 0;
  wrap.append(card(tr('rhythm'),
    h('p', { style: 'font-size:14px;margin:0' }, half < 0.5 ? tr('rhythm_under') : tr('rhythm_good')),
  ));
  return wrap;
}
function rerender() { document.dispatchEvent(new Event('rerender')); }

function card(title, ...body) {
  return h('div', { class: 'card', style: 'padding:14px;margin-bottom:10px' },
    h('div', { class: 'detail-label' }, title), ...body);
}
function rangeNav() {
  /* the sprint window comes from S.sprint, so there is nothing to page through */
  if (period === 'sprint') {
    return h('div', { style: 'margin:6px 0 12px;text-align:center;font-weight:700' }, rangeLabel());
  }
  return h('div', { style: 'display:flex;align-items:center;gap:8px;margin:6px 0 12px' },
    h('button', { class: 'btn-icon', 'aria-label': tr('prev_next'), onclick: () => { shiftRange(-1); rerender(); } }, '‹'),
    h('span', { style: 'flex:1;text-align:center;font-weight:700' }, rangeLabel()),
    h('button', { class: 'btn-icon', 'aria-label': tr('prev_next'), onclick: () => { shiftRange(1); rerender(); } }, '›'));
}
function range() {
  const a = anchorDate;
  if (period === 'day') return { from: iso(a), to: iso(a) };
  if (period === 'week') { const s = new Date(a); s.setDate(s.getDate() - s.getDay()); const e = new Date(s); e.setDate(e.getDate() + 6); return { from: iso(s), to: iso(e) }; }
  if (period === 'month') { const s = new Date(a.getFullYear(), a.getMonth(), 1), e = new Date(a.getFullYear(), a.getMonth() + 1, 0); return { from: iso(s), to: iso(e) }; }
  /* sprint: use S.sprint start + length */
  const sp = S.sprint || { start: iso(new Date()), length: 14 };
  const s = new Date(sp.start), e = new Date(s); e.setDate(e.getDate() + (sp.length - 1));
  return { from: iso(s), to: iso(e) };
}
function iso(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function shiftRange(dir) {
  if (period === 'day') anchorDate = new Date(anchorDate.getTime() + dir * 86400000);
  else if (period === 'week') anchorDate = new Date(anchorDate.getTime() + dir * 7 * 86400000);
  else if (period === 'month') { anchorDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + dir, 1); }
}
function rangeLabel() {
  const { from, to } = range();
  return N(from) === N(to) ? N(fmtDate(parseISO(from), { withYear: true })) : N(fmtDate(parseISO(from))) + ' – ' + N(fmtDate(parseISO(to)));
}

/* --- symptom averages, last 14 days check-ins --- */
function symptomCard() {
  const recent = S.checkins.slice(-14);
  if (!recent.length) return card(tr('symptoms'), h('p', { style: 'font-size:14px;color:var(--text-muted);margin:0' }, tr('no_checkins')));
  const avg = key => {
    let sum = 0, n = 0;
    for (const c of recent) for (const s of c.symptoms || []) if (s.key === key && s.v != null) { sum += s.v; n++; }
    return n ? sum / n : null;
  };
  const all = [];
  const keys = ['mental_energy','task_initiation','working_memory','planning','decision_paralysis','perfectionism','routine_adherence','sustained_attention','distractibility','task_re_engagement','time_blindness','inhibition','reward_sensitivity','irritability'];
  for (const k of keys) { const v = avg(k); if (v != null) all.push({ k, v }); }
  all.sort((x, y) => y.v - x.v);
  const worst = all[0];
  return card(tr('symptoms'),
    ...['HI', 'EF', 'EA'].map(cl => h('div', { style: 'display:flex;justify-content:space-between;font-size:14px;padding:2px 0' },
      h('span', {}, cl), h('span', { class: 'num' }, clusterAvg(recent, cl) != null ? N(clusterAvg(recent, cl).toFixed(1)) : '—'))),
    worst ? h('div', { style: 'margin-top:8px;padding:10px;background:color-mix(in srgb,var(--beam) 12%,transparent);border-radius:10px;font-size:13px' },
      '📈 ' + tr('worst_symptom', { s: tr('sym_' + worst.k) }) + ' — ' + tr('advice_' + worst.k)) : null,
  );
}
function clusterAvg(checkins, cl) {
  const map = { HI: ['inhibition', 'reward_sensitivity', 'irritability'], EF: ['mental_energy', 'task_initiation', 'working_memory', 'planning', 'decision_paralysis', 'perfectionism'], EA: ['routine_adherence', 'sustained_attention', 'distractibility', 'task_re_engagement', 'time_blindness'] };
  let sum = 0, n = 0;
  for (const c of checkins) for (const s of c.symptoms || []) if (map[cl]?.includes(s.key) && s.v != null) { sum += s.v; n++; }
  return n ? sum / n : null;
}

function distributionCard(done) {
  const dop = { love: 0, soso: 0, dislike: 0 }, pre = { out: 0, self: 0 };
  for (const t of done) { if (t.dopamineType) dop[t.dopamineType]++; if (t.pressureType) pre[t.pressureType]++; }
  const bar = (obj, colors) => {
    const tot = Object.values(obj).reduce((a, b) => a + b, 0) || 1;
    return h('div', { style: 'display:flex;height:14px;border-radius:8px;overflow:hidden;margin-top:6px' },
      ...Object.entries(obj).map(([k, v]) => v > 0 ? h('div', { style: `flex:${v};background:${colors[k]}`, title: k }) : h('span')));
  };
  return card(tr('tradeoffs'),
    h('div', { class: 'detail-label' }, tr('dopamine_pressure')), bar(dop, { love: '#16A34A', soso: '#F59E0B', dislike: '#E5484D' }),
    h('div', { class: 'num', style: 'font-size:12px;color:var(--text-muted);margin-top:4px' }, '⚡' + N(dop.love) + ' · ☀' + N(dop.soso) + ' · ☁' + N(dop.dislike)),
    h('div', { class: 'detail-label', style: 'margin-top:10px' }, tr('pressure_open')), bar(pre, { out: '#3B82F6', self: '#9AA2B1' }),
    h('div', { class: 'num', style: 'font-size:12px;color:var(--text-muted);margin-top:4px' }, '🏛' + N(pre.out) + ' · 👤' + N(pre.self)),
  );
}

function calibrationCard() {
  const withBoth = S.tasks.filter(t => t.estimate && t.actual && t.actual > 0);
  if (!withBoth.length) return card(tr('calibration'), h('p', { style: 'color:var(--text-muted);font-size:14px;margin:0' }, tr('no_cal_data')));
  const ratio = withBoth.reduce((a, t) => a + t.actual / t.estimate, 0) / withBoth.length;
  return card(tr('calibration'),
    h('div', { class: 'num', style: 'font-size:22px;font-weight:800' }, '×' + N(ratio.toFixed(1))),
    h('p', { style: 'font-size:13px;color:var(--text-muted);margin:4px 0 0' }, tr('cal_hint', { n: N(Math.round(20 * ratio)) })));
}
