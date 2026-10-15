/* ============================================================
   TicTic ADHD — Drawer (three-dot, §drawer in draft)
   Horizons · sections · tags · Noise Harbor shortcut
   ============================================================ */
import { S, commit, persist, uid } from './store.js';
import { tr, N } from './i18n.js';
import { h, sv, icons } from './ui.js';

export const HORIZONS = ['today', 'tomorrow', 'this_week', 'next7', 'inbox'];

export function openDrawer() {
  let ov = document.querySelector('.drawer-ov');
  if (ov) { ov.remove(); return; }
  ov = h('div', { class: 'drawer-ov', onClick: e => { if (e.target === ov) ov.remove(); } });
  const panel = h('div', { class: 'drawer' , role: 'dialog', 'aria-label': tr('horizons') });

  /* horizons */
  panel.append(h('div', { class: 'detail-label' }, tr('horizons')));
  for (const hz of HORIZONS) {
    panel.append(h('button', { class: 'sb-item' + (S.ui.horizon === hz ? ' active' : ''), onclick: () => {
      S.ui.horizon = hz; persist(); commit(); ov.remove(); rerenderAll();
    } }, tr({ today: 'today', tomorrow: 'tomorrow', this_week: 'this_week', next7: 'next_7_days', inbox: 'inbox' }[hz])));
  }

  /* sections */
  panel.append(h('div', { class: 'detail-label' }, tr('sections')));
  const secRow = h('div', { class: 'chips-row' });
  secRow.append(h('button', { class: 'pick' + (!S.ui.sectionFilter ? ' on' : ''), onclick: () => { S.ui.sectionFilter = null; persist(); commit(); ov.remove(); rerenderAll(); } }, tr('all')));
  for (const sec of S.sections) {
    secRow.append(h('button', { class: 'pick' + (S.ui.sectionFilter === sec.id ? ' on' : ''), onclick: () => { S.ui.sectionFilter = sec.id; persist(); commit(); ov.remove(); rerenderAll(); } }, sec.name));
  }
  panel.append(secRow, inlineCreate(tr('sections'), name => {
    const id = uid(); S.sections.push({ id, name }); persist(); commit(); ov.remove(); openDrawer();
  }));

  /* tags */
  panel.append(h('div', { class: 'detail-label' }, tr('tags')));
  const tagRow = h('div', { class: 'chips-row' });
  tagRow.append(h('button', { class: 'pick' + (!S.ui.tagFilter ? ' on' : ''), onclick: () => { S.ui.tagFilter = null; persist(); commit(); ov.remove(); rerenderAll(); } }, tr('all')));
  for (const tg of S.tagsBank) {
    tagRow.append(h('button', { class: 'pick' + (S.ui.tagFilter === tg.name ? ' on' : ''), onclick: () => { S.ui.tagFilter = tg.name; persist(); commit(); ov.remove(); rerenderAll(); } }, '#' + tg.name));
  }
  panel.append(tagRow, inlineCreate(tr('tags'), name => {
    S.tagsBank.push({ name: name }); persist(); commit(); ov.remove(); openDrawer();
  }));

  /* noise harbor */
  const noiseCount = S.tasks.filter(t => t.noise).length;
  panel.append(h('div', { class: 'detail-label' }, tr('noise_harbor')));
  panel.append(h('button', { class: 'sb-item', onclick: () => { ov.remove(); import('./noise.js').then(m => m.openNoiseHarbor()); } },
    '🛟 ', h('span', { class: 'sb-label' }, tr('noise_harbor')), noiseCount ? h('span', { class: 'count' }, N(noiseCount)) : null));

  ov.append(panel);
  document.getElementById('overlays').append(ov);
}

function inlineCreate(placeholder, onCreate) {
  const inp = h('input', { type: 'text', placeholder: '+ ' + placeholder, 'aria-label': placeholder });
  const kev = e => {
    if (e.key === 'Enter' && inp.value.trim()) { onCreate(inp.value.trim()); }
  };
  inp.addEventListener('keydown', kev);
  return inp;
}

function rerenderAll() { document.dispatchEvent(new Event('rerender')); }
