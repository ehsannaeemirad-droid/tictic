/* ============================================================
   TicTic ADHD — Flows view (§5.9): multi-step routines.
   Start chains through steps via the focus timer; editor with
   add/remove/reorder steps, dopamine & pressure toggles.
   ============================================================ */
import { S, commit, persist, uid } from './store.js';
import { tr, N } from './i18n.js';
import { h, sv, icons, announce } from './ui.js';
import { sheet } from './components.js';
import { startFocus } from './focus.js';

export function renderFlows() {
  const wrap = h('div', {});
  wrap.append(h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px' },
    h('h2', { style: 'font-size:20px;margin:0' }, tr('nav_flows')),
    h('button', { class: 'pick on', onclick: () => flowEditor(null) }, '+ ' + tr('new_flow')),
  ));
  if (!S.flows.length) wrap.append(h('div', { class: 'card', style: 'padding:28px;text-align:center;color:var(--text-muted)' }, tr('no_flows')));
  for (const f of S.flows) {
    const total = f.steps.reduce((a, s) => a + (s.estimate || 0), 0);
    wrap.append(h('div', { class: 'card', style: 'padding:14px;margin-bottom:10px' },
      h('div', { style: 'font-weight:800' }, f.name),
      h('div', { class: 'num', style: 'font-size:13px;color:var(--text-muted);margin:4px 0 10px' },
        tr('steps_n', { n: N(f.steps.length) }) + ' · ' + N(total) + tr('_min')),
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' },
        h('button', { class: 'pick on', onclick: () => startFlow(f, 0) }, '▶ ' + tr('start')),
        h('button', { class: 'pick', onclick: () => flowEditor(f) }, tr('edit')),
      ),
      /* step preview */
      ...f.steps.map((s, i) => h('div', { style: 'display:flex;gap:8px;align-items:center;padding:4px 0;font-size:14px' },
        h('span', { class: 'num', style: 'color:var(--text-muted);min-width:20px' }, N(i + 1) + '.'),
        h('span', { style: 'flex:1' }, s.title),
        h('span', { class: 'num', style: 'color:var(--text-muted)' }, N(s.estimate) + '′'),
      )),
    ));
  }
  return wrap;
}
function rerender() { document.dispatchEvent(new Event('rerender')); }
const DOP_EMOJI = { love: '⚡', soso: '☀', dislike: '☁' };

/* chain steps through focus sessions */
export function startFlow(flow, idx) {
  const step = flow.steps[idx];
  if (!step) { announce(tr('flow_done')); chain = null; return; }
  announce(tr('flow_step_x', { n: N(idx + 1), t: step.title }));
  /* ephemeral task-shaped object for the focus timer; its exact id is what
     tells us later that THIS step (and not another session) finished */
  const stepId = 'flow-' + flow.id + '-' + idx;
  startFocus({ id: stepId, title: flow.name + ' · ' + step.title, estimate: step.estimate });
  /* chain: the focus timer announces the end of a session; advance only when
     it is exactly THIS step (polling postSessions could match another flow) */
  chain = { stepId, flow, idx };
}
/* the one flow step currently waiting for its session to end */
let chain = null;
document.addEventListener('tictic:session-end', e => {
  if (!chain || e.detail?.taskId !== chain.stepId) return;
  const { flow, idx } = chain;
  chain = null;
  startFlow(flow, idx + 1);
});

function flowEditor(flow) {
  const isNew = !flow;
  const f = flow || { id: uid(), name: '', steps: [] };
  const name = h('input', { type: 'text', value: f.name, placeholder: tr('flow_name'), 'aria-label': tr('flow_name') });
  const stepsEl = h('div', { style: 'display:grid;gap:8px' });
  const renderSteps = () => {
    stepsEl.innerHTML = '';
    f.steps.forEach((s, i) => {
      const tIn = h('input', { type: 'text', value: s.title, placeholder: tr('step_ph'), 'aria-label': tr('step') });
      tIn.addEventListener('change', () => { s.title = tIn.value.trim(); });
      const est = h('input', { type: 'number', value: s.estimate || 5, min: 1, style: 'max-width:80px', 'aria-label': tr('estimate') });
      est.addEventListener('change', () => { s.estimate = +est.value || 5; });
      const dop = h('button', { class: 'pick', title: tr('dopamine_pressure'), onclick: () => {
        s.dopamine = s.dopamine === 'love' ? 'soso' : s.dopamine === 'soso' ? 'dislike' : 'love';
        dop.textContent = DOP_EMOJI[s.dopamine];
      } }, DOP_EMOJI[s.dopamine || 'soso']);
      const pre = h('button', { class: 'pick', title: tr('pre_out'), onclick: () => {
        s.pressure = s.pressure === 'self' ? 'out' : 'self';
        pre.textContent = s.pressure === 'self' ? '👤' : '🏛';
      } }, s.pressure === 'self' ? '👤' : '🏛');
      const up = h('button', { class: 'btn-icon', style: 'width:34px;height:34px', title: tr('up'), onclick: () => {
        if (i > 0) { [f.steps[i - 1], f.steps[i]] = [f.steps[i], f.steps[i - 1]]; renderSteps(); }
      } }, '↑');
      const down = h('button', { class: 'btn-icon', style: 'width:34px;height:34px', title: tr('down'), onclick: () => {
        if (i < f.steps.length - 1) { [f.steps[i + 1], f.steps[i]] = [f.steps[i], f.steps[i + 1]]; renderSteps(); }
      } }, '↓');
      const del = h('button', { class: 'btn-icon', style: 'width:34px;height:34px;color:var(--danger)', title: tr('delete'), onclick: () => {
        f.steps.splice(i, 1); renderSteps();
      } }, sv(icons.close, 14));
      stepsEl.append(h('div', { style: 'display:flex;gap:6px;align-items:center' }, up, down, tIn, est, dop, pre, del));
    });
  };
  renderSteps();
  const body = h('div', { style: 'display:grid;gap:10px' },
    h('div', { class: 'detail-label' }, tr('flow_name')), name,
    h('div', { class: 'detail-label' }, tr('steps')), stepsEl,
    h('button', { class: 'pick', style: 'border-style:dashed', onclick: () => { f.steps.push({ id: uid(), title: '', estimate: 5, dopamine: 'soso', pressure: 'self' }); renderSteps(); } }, '+ ' + tr('add_step')),
    h('button', { class: 'pick on', style: 'min-height:48px', onclick: () => {
      if (!name.value.trim()) return;
      f.name = name.value.trim();
      f.steps = f.steps.filter(s => s.title.trim());
      if (isNew) S.flows.push(f);
      persist(); commit(); sheetEl.close(); rerender();
    } }, tr('save')),
  );
  const sheetEl = sheet(isNew ? tr('new_flow') : tr('edit'), body);
}
