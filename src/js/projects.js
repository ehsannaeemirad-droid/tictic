/* ============================================================
   TicTic ADHD — Projects view (§5.8): shiny ideas, dopamine-first.
   Card: name · why (italic) · artifact · deadline pill (neutral
   gray under 3 days, never red) · progress bar · hyperfocus
   blocks with ▶ start · Release / Restore.
   ============================================================ */
import { S, commit, persist, uid } from './store.js';
import { tr, N, fmtDate, parseISO, iso, dayKey } from './i18n.js';
import { h, sv, icons, announce } from './ui.js';
import { sheet } from './components.js';
import { startFocus } from './focus.js';
import { celebrate } from './components.js';

export function renderProjects() {
  const wrap = h('div', {});
  wrap.append(h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px' },
    h('h2', { style: 'font-size:20px;margin:0' }, tr('nav_projects')),
    h('button', { class: 'pick on', onclick: () => projectForm() }, '+ ' + tr('new_project')),
  ));

  const active = S.projects.filter(p => !p.released);
  const released = S.projects.filter(p => p.released);
  for (const p of active) wrap.append(projectCard(p));

  if (released.length) {
    const body = h('div', {}, ...released.map(p => h('div', { style: 'display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)' },
      h('span', { style: 'flex:1' }, p.name),
      h('button', { class: 'pick', onclick: () => { p.released = false; persist(); commit(); rerender(); } }, tr('restore')))));
    const head = h('button', { class: 'sec-h', onclick: () => { body.style.display = body.style.display === 'none' ? '' : 'none'; } }, tr('released_projects'));
    wrap.append(head, body);
  }
  if (!active.length && !released.length) wrap.append(h('div', { class: 'card', style: 'padding:28px;text-align:center;color:var(--text-muted)' }, tr('no_projects')));
  return wrap;
}
function rerender() { document.dispatchEvent(new Event('rerender')); }

function projectCard(p) {
  const days = p.deadline ? Math.ceil((parseISO(dayKey(p.deadline)) - new Date(new Date().setHours(0, 0, 0, 0))) / 86400000) : null;
  const pct = p.plannedHours ? Math.min(100, Math.round((p.consumedHours || 0) / p.plannedHours * 100)) : 0;
  const card = h('div', { class: 'card', style: 'padding:14px;margin-bottom:10px' },
    h('div', { style: 'display:flex;justify-content:space-between;gap:8px;align-items:flex-start' },
      h('div', { style: 'flex:1' },
        h('div', { style: 'font-weight:800;font-size:17px' }, p.name),
        p.why ? h('div', { style: 'font-style:italic;color:var(--text-secondary);font-size:14px;margin-top:2px' }, '“' + p.why + '”') : null,
      ),
      p.deadline ? h('span', { class: 'chip num', style: 'font-size:12px' }, tr('deadline') + ': ' + N(fmtDate(parseISO(p.deadline))) + (days != null ? ' · ' + N(days) + ' ' + tr('days_left') : '')) : null,
    ),
    p.artifact ? h('div', { style: 'font-size:13px;margin-top:8px' }, '📦 ' + tr('artifact') + ': ' + p.artifact) : null,
    h('div', { style: 'margin-top:10px' },
      h('div', { class: 'detail-label' }, tr('progress')),
      h('div', { class: 'xpbar', style: 'width:100%' }, h('i', { style: `width:${pct}%` })),
      h('div', { class: 'num', style: 'font-size:12px;color:var(--text-muted);margin-top:4px' },
        N(p.consumedHours || 0) + ' / ' + N(p.plannedHours || 0) + ' ' + tr('hours')),
    ),
    h('div', { class: 'detail-label', style: 'margin-top:12px' }, tr('hyperfocus_blocks')),
    ...(p.blocks || []).map(b => h('div', { style: 'display:flex;gap:8px;align-items:center;padding:6px 0' },
      h('span', { class: 'num', style: 'flex:1' }, N(fmtDate(parseISO(b.date))) + ' · ' + N(b.minutes) + tr('_min')),
      h('button', { class: 'act', title: tr('start_timer'), 'aria-label': tr('start_timer'), onclick: () => startFocus({ title: p.name + ' — ' + tr('hyperfocus'), estimate: b.minutes, id: 'proj-' + p.id }) }, sv(icons.play, 16)),
      h('button', { class: 'btn-icon', style: 'width:32px;height:32px', title: tr('delete'), onclick: () => {
        p.blocks = p.blocks.filter(x => x.id !== b.id); persist(); commit(); rerender();
      } }, sv(icons.close, 14)),
    )),
    h('div', { style: 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap' },
      h('button', { class: 'pick', onclick: () => blockForm(p) }, '+ ' + tr('add_block')),
      h('button', { class: 'pick', onclick: () => {
        p.consumedHours = Math.round(((p.consumedHours || 0) + 0.5) * 10) / 10;   /* manual half-hour log */
        persist(); commit(); rerender();
      } }, '＋30′ ' + tr('log_time')),
      h('button', { class: 'pick', onclick: () => projectForm(p) }, tr('edit')),
      h('button', { class: 'pick', style: 'border-style:dashed', onclick: () => {
        p.released = true; persist(); commit(); rerender();
        announce(tr('released_msg'));
      } }, tr('release')),
    ),
  );
  return card;
}

function projectForm(p) {
  const isNew = !p;
  const name = h('input', { type: 'text', value: p?.name || '', placeholder: tr('proj_name'), 'aria-label': tr('proj_name') });
  const why = h('input', { type: 'text', value: p?.why || '', placeholder: tr('proj_why_ph'), 'aria-label': tr('proj_why') });
  const artifact = h('input', { type: 'text', value: p?.artifact || '', placeholder: tr('artifact_ph'), 'aria-label': tr('artifact') });
  const deadline = h('input', { type: 'date', value: p?.deadline || '' });
  const planned = h('input', { type: 'number', value: p?.plannedHours || 10, min: 1, 'aria-label': tr('planned_hours') });
  const body = h('div', { style: 'display:grid;gap:10px' },
    h('div', { class: 'detail-label' }, tr('proj_name')), name,
    h('div', { class: 'detail-label' }, tr('proj_why')), why,
    h('div', { class: 'detail-label' }, tr('artifact_req')), artifact,
    h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:10px' },
      h('div', {}, h('div', { class: 'detail-label' }, tr('deadline')), deadline),
      h('div', {}, h('div', { class: 'detail-label' }, tr('planned_hours')), planned),
    ),
    h('button', { class: 'pick on', style: 'min-height:48px', onclick: () => {
      if (!name.value.trim() || !artifact.value.trim()) return; /* both required */
      const data = { name: name.value.trim(), why: why.value.trim(), artifact: artifact.value.trim(), deadline: deadline.value || null, plannedHours: +planned.value || 10 };
      if (isNew) S.projects.push({ id: uid(), ...data, consumedHours: 0, released: false, blocks: [] });
      else Object.assign(p, data);
      persist(); commit(); sheetEl.close(); rerender();
    } }, tr('save')),
  );
  const sheetEl = sheet(isNew ? tr('new_project') : tr('edit'), body);
}

function blockForm(p) {
  const date = h('input', { type: 'date', value: iso(new Date()) });
  const dur = h('input', { type: 'number', value: 60, min: 15, step: 15, 'aria-label': tr('duration') });
  const body = h('div', { style: 'display:grid;gap:10px' },
    h('div', { class: 'detail-label' }, tr('block_date')), date,
    h('div', { class: 'detail-label' }, tr('duration')), dur,
    h('button', { class: 'pick on', style: 'min-height:48px', onclick: () => {
      p.blocks = p.blocks || [];
      p.blocks.push({ id: uid(), date: date.value, minutes: +dur.value || 60 });
      persist(); commit(); sheetEl.close(); rerender();
    } }, tr('save')),
  );
  const sheetEl = sheet(tr('add_block'), body);
}
