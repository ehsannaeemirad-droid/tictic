/* ============================================================
   TicTic ADHD — Relief tools (§5.9, §5.13, §5.14)
   • Brain dump: dump a thought now, triage later (never forces
     decisions at the moment of capture).
   • Box breathing 4-4-4-4 overlay with cycles + calm-down exit.
   • "What is blocking you?" helper: pick a blocker, get ONE
     small unblocker — no lecture.
   • 30-second check-in (time of day + context + symptom sliders)
     feeding the report, and the energy-mode switch.
   All of these are one-tap from the FABs / palette.
   ============================================================ */
import { S, commit, persist, uid, makeTask } from './store.js';
import { tr, N, dayKey } from './i18n.js';
import { h, announce } from './ui.js';
import { sheet, snackbar } from './components.js';

const overlays = () => document.getElementById('overlays');

/* ---------------- brain dump ---------------- */
export function openBrainDump() {
  const area = h('textarea', { rows: 5, placeholder: tr('dump_ph'), 'aria-label': tr('dump') });
  const list = h('div', { class: 'dump-list', style: 'max-height:180px;overflow:auto;margin-top:8px' });
  const renderList = () => {
    list.innerHTML = '';
    for (const d of S.dumps || []) {
      list.append(h('div', { class: 'pick', style: 'display:flex;gap:8px;align-items:center;margin:6px 0;text-align:start' },
        h('span', { style: 'flex:1' }, d.text),
        h('button', { class: 'pick', title: tr('dump_to_task'), onclick: () => { dumpToTask(d.id); renderList(); } }, '→ ' + tr('task')),
        h('button', { class: 'btn-icon', 'aria-label': tr('delete'), onclick: () => { S.dumps = S.dumps.filter(x => x.id !== d.id); persist(); commit(); renderList(); } }, '🗑'),
      ));
    }
    if (!S.dumps?.length) list.append(h('div', { style: 'color:var(--text-muted);font-size:13px' }, tr('dump_empty')));
  };
  const save = () => {
    const text = area.value.trim();
    if (!text) return;
    for (const line of text.split('\n').map(s => s.trim()).filter(Boolean)) {
      S.dumps.push({ id: uid(), text: line, at: Date.now() });
    }
    area.value = '';
    persist(); commit(); renderList(); announce(tr('dump_saved'));
  };
  const body = h('div', {},
    h('p', { style: 'margin:0 0 8px;color:var(--text-muted);font-size:13px' }, tr('dump_hint')),
    area,
    h('button', { class: 'pick on', style: 'width:100%;margin-top:8px;min-height:48px', onclick: save }, tr('dump_save')),
    h('div', { class: 'detail-label', style: 'margin-top:12px' }, tr('dump_parked')),
    list,
  );
  area.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); });
  renderList();
  sheet(tr('dump'), body);
  setTimeout(() => area.focus(), 50);
}
function dumpToTask(id) {
  const d = (S.dumps || []).find(x => x.id === id); if (!d) return;
  S.tasks.push(makeTask({ title: d.text, listId: 'inbox', order: Date.now() }));
  S.dumps = S.dumps.filter(x => x.id !== id);
  persist(); commit(() => true);
  snackbar(tr('dump_moved'));
  document.dispatchEvent(new Event('rerender'));
}

/* ---------------- breathing ---------------- */
export function openBreathe() {
  let alive = true, cycle = 0, phaseIdx = 0, timer = null;
  const PHASES = [['breathe_in', 4], ['breathe_hold', 4], ['breathe_out', 4], ['breathe_hold', 4]];
  const circle = h('div', { class: 'br-circle' }, tr('breathe_in'));
  const meta = h('div', { class: 'num', style: 'color:var(--text-muted)' }, tr('cycles') + ': 0');
  const ov = h('div', { class: 'focus-ov br-ov', role: 'dialog', 'aria-label': tr('breathing'), onclick: e => { if (e.target === ov) stop(); } },
    h('div', { class: 'fo-task' }, tr('breathing')),
    circle, meta,
    h('button', { class: 'pick on', style: 'min-height:48px', onclick: () => stop(true) }, tr('done')),
  );
  overlays().append(ov);
  const tick = () => {
    if (!alive) return;
    const [key, secs] = PHASES[phaseIdx];
    circle.textContent = tr(key);
    circle.dataset.phase = key;
    circle.style.setProperty('--br-dur', secs + 's');
    phaseIdx++;
    if (phaseIdx >= PHASES.length) { phaseIdx = 0; cycle++; meta.textContent = tr('cycles') + ': ' + N(cycle); if (cycle >= 4) return stop(true); }
    timer = setTimeout(tick, secs * 1000);
  };
  const stop = (done) => {
    if (!alive) return;
    alive = false; clearTimeout(timer); ov.remove();
    if (done) { announce(tr('breathe_done')); S.xp = (S.xp || 0) + 2; persist(); commit(); }
  };
  tick();
}

/* ---------------- blocker helper ---------------- */
const BLOCKER_HELP = {
  blocker_b1: ['5 دقیقه فقط شروع کن، بعد تصمیم بگیر', 'یک کار ۲ دقیقه‌ای انتخاب کن', 'بدن را تکان بده: ۱۰ حرکت کششی'],
  blocker_b2: ['اول آب + یک نفس عمیق', 'ساده‌ترین قدم را بنویس', 'کار را نصف کن؛ بقیه بعد'],
  blocker_b3: ['با تایمر ۱۰ دقیقه‌ای شروع کن', 'یک آهنگ پخش کن و فقط شروع کن', 'پاداش بعد از ۱۵ دقیقه مشخص کن'],
  blocker_b4: ['فقط ۱۰ دقیقه کار کن، بعد رها کن', 'کار را به تکه‌های ریز بشکن', 'قدم سوم را حذف کن — الان لازم نیست'],
  blocker_b5: ['فقط پیام بفرست، نه تماس', 'دو خط بنویس و بفرست', 'با کسی برو که هست'],
  blocker_b6: ['۱۰ دقیقه دراز بکش، تایمر بگذار', 'کار سبک انتخاب کن', 'امروز را روز کم‌توقع اعلام کن'],
};
export function openBlocker() {
  const out = h('div', { class: 'blocker-out' });
  const body = h('div', {},
    h('p', { style: 'margin:0 0 10px;color:var(--text-muted);font-size:13px' }, tr('blocker_hint')),
    h('div', { class: 'chips-row' }, ...Object.keys(BLOCKER_HELP).map(k => h('button', {
      class: 'pick', onclick: () => {
        const ideas = BLOCKER_HELP[k];
        out.innerHTML = '';
        out.append(h('div', { class: 'detail-label' }, tr('suggest_title')));
        for (const idea of ideas) out.append(h('div', { class: 'card', style: 'padding:10px 12px;margin:6px 0;font-size:14px' }, '💡 ' + idea));
        out.append(h('button', { class: 'pick on', style: 'width:100%;margin-top:8px;min-height:48px', onclick: () => {
          S.xp = (S.xp || 0) + 1; persist(); commit();
          document.querySelector('.ov-sheet')?.remove();
          snackbar(tr('blocker_logged'));
        } }, tr('im_starting')));
      },
    }, tr(k)))),
    out,
  );
  sheet(tr('blocker'), body);
}

/* ---------------- energy mode ---------------- */
/* [stored value, i18n key, emoji] — the stored value matches the Today view chips */
export const ENERGY_MODES = [
  ['normal', 'energy_normal', '🙂'],
  ['low', 'energy_low', '🔋'],
  ['high', 'energy_high', '⚡'],
  ['bad', 'energy_bad', '🌧'],
];
export function setEnergyMode(mode) {
  S.settings.energyMode = mode;
  const today = dayKey(new Date());
  S.energyModes[today] = mode;
  S.energyModes.today = mode;   /* kept for views that read the short key */
  persist(); commit(() => true);
  document.dispatchEvent(new Event('rerender'));
  announce(tr('energy') + ': ' + tr(mode));
}
export function openEnergySheet() {
  const cur = S.settings.energyMode || 'normal';
  const body = h('div', {},
    h('p', { style: 'margin:0 0 10px;color:var(--text-muted);font-size:13px' }, tr('energy_hint')),
    h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:8px' },
      ...ENERGY_MODES.map(([key, label, emoji]) => h('button', {
        class: 'pick' + (cur === key ? ' on' : ''), style: 'min-height:56px',
        onclick: () => { setEnergyMode(key); document.querySelector('.ov-sheet')?.remove(); },
      }, emoji + ' ' + tr(label)))),
  );
  sheet(tr('energy'), body);
}

/* ---------------- 30-second check-in ---------------- */
/* slider → report symptom key (report.js clusters HI / EF / EA) */
const SYMPTOM_KEY = {
  s_fog: 'working_memory', s_restless: 'inhibition', s_tired: 'mental_energy',
  s_mood: 'irritability', s_start: 'task_initiation', s_hold: 'sustained_attention',
};
export function openCheckin() {
  const SYMPTOMS = ['s_fog', 's_restless', 's_tired', 's_mood', 's_start', 's_hold'];
  let time = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening';
  let ctx = 'ctx_home';
  const vals = {};
  for (const k of SYMPTOMS) vals[k] = 3;
  const timeChips = h('div', { class: 'chips-row' });
  const ctxChips = h('div', { class: 'chips-row' });
  const pickRow = (container, options, get, set) => {
    container.innerHTML = '';
    for (const [k, lbl] of options) {
      container.append(h('button', { class: 'pick' + (get() === k ? ' on' : ''), onclick: () => { set(k); pickRow(container, options, get, set); } }, lbl));
    }
  };
  pickRow(timeChips, [['morning', tr('morning')], ['afternoon', tr('afternoon')], ['evening', tr('evening')]], () => time, v => time = v);
  pickRow(ctxChips, [['ctx_home', tr('ctx_home')], ['ctx_work', tr('ctx_work')], ['ctx_social', tr('ctx_social')], ['ctx_other', tr('ctx_other')]], () => ctx, v => ctx = v);

  const body = h('div', {},
    h('div', { class: 'detail-label' }, tr('checkin_time')), timeChips,
    h('div', { class: 'detail-label', style: 'margin-top:10px' }, tr('checkin_ctx')), ctxChips,
    h('div', { class: 'detail-label', style: 'margin-top:10px' }, tr('symptoms')),
    ...SYMPTOMS.map(k => {
      const range = h('input', { type: 'range', min: 1, max: 5, value: vals[k], 'aria-label': tr(k), oninput: e => vals[k] = +e.target.value });
      return h('div', { class: 'set-row' }, h('span', { style: 'font-size:13px' }, tr(k)), range);
    }),
    h('button', { class: 'pick on', style: 'width:100%;margin-top:12px;min-height:48px', onclick: () => {
      S.checkins.push({
        id: uid(), at: Date.now(), time, ctx, ...vals,
        /* the report reads this shape */
        symptoms: Object.entries(vals).map(([k, v]) => ({ key: SYMPTOM_KEY[k] || k, v })),
      });
      persist(); commit(() => true);
      document.querySelector('.ov-sheet')?.remove();
      snackbar(tr('checkin_saved'));
      document.dispatchEvent(new Event('rerender'));
    } }, tr('save')),
  );
  sheet(tr('checkin_title'), body);
}
