/* ============================================================
   TicTic — Settings
   Appearance (theme · accent · contrast · motion) · language ·
   calendar · week start · shift · energy behaviour · data
   (TickTick in/out · backup · reset). Changes apply immediately —
   there is no Save button to forget.
   ============================================================ */
import { S, commit, persist, clearAllData } from './store.js';
import { tr, N, setLang, setCalMode } from './i18n.js';
import { h, announce } from './ui.js';
import { sheet, snackbar } from './components.js';
import { openImportSheet, openExportSheet, toBackup, downloadFile } from './ticktick.js';
import { currentShift } from './timetable.js';
import { THEMES, ACCENTS, themeName, applyAppearance, resolveThemeId } from './theme.js';
import { getSyncCfg, setSyncCfg, isConfigured, syncNow, forgetRemote, startAutoSync } from './sync.js';
import { seedIfNeeded } from './seed.js';

export function openSettings() {
  S.settings.energyBehavior = S.settings.energyBehavior || {};
  const body = h('div', { class: 'settings-body' });

  /* ---- helpers: each control updates itself (the sheet is outside #app) ---- */
  const seg = (labelKey, value, options, onPick) => {
    const wrap = h('div', { class: 'set-row' }, h('div', { class: 'set-label' }, tr(labelKey)));
    const chips = h('div', { class: 'chips-row' });
    let current = value;
    for (const [val, lbl] of options) {
      const btn = h('button', {
        class: 'pick' + (current === val ? ' on' : ''), role: 'radio', 'aria-checked': String(current === val),
        onclick: () => {
          current = val;
          for (const b of chips.children) { b.classList.toggle('on', b === btn); b.setAttribute('aria-checked', String(b === btn)); }
          onPick(val);
        },
      }, lbl);
      chips.append(btn);
    }
    wrap.append(chips);
    return wrap;
  };
  const toggle = (labelKey, value, onToggle) => {
    const btn = h('button', {
      class: 'set-toggle' + (value ? ' on' : ''), role: 'switch', 'aria-checked': String(!!value),
      onclick: e => {
        const cur = e.currentTarget.classList.contains('on');
        onToggle(!cur);
        e.currentTarget.classList.toggle('on', !cur);
        e.currentTarget.setAttribute('aria-checked', String(!cur));
        e.currentTarget.querySelector('.sw').textContent = !cur ? '✓' : '';
      },
    }, h('span', {}, tr(labelKey)), h('span', { class: 'sw' }, value ? '✓' : ''));
    return btn;
  };

  /* ---------------- Appearance ---------------- */
  body.append(h('div', { class: 'detail-label' }, tr('appearance')));

  const grid = h('div', { class: 'theme-grid' });
  const renderThemes = () => {
    const current = S.settings.theme || 'system';
    const activeId = resolveThemeId(current);
    grid.textContent = '';
    for (const t of THEMES) {
      const isSystem = current === 'system' && t.id === activeId;
      const btn = h('button', {
        class: 'theme-swatch' + (current === t.id || isSystem ? ' on' : ''),
        role: 'radio', 'aria-checked': String(current === t.id),
        onclick: () => { setThemeChoice(t.id); renderThemes(); },
      },
      h('span', { class: 'sw-prev' },
        h('i', { style: `background:${t.id.includes('dark') || t.scheme === 'dark' ? '#111116' : '#FBF8F3'}` }),
        h('i', { style: 'background:var(--accent)' }),
      ),
      h('span', {}, themeName(t, S.settings.lang || 'fa')));
      grid.append(btn);
    }
  };
  /* “system” is a first-class choice, shown as its own swatch */
  const systemWrap = h('div', { class: 'set-row' },
    h('div', { class: 'set-label' }, tr('theme_system')),
    h('button', {
      class: 'pick' + ((S.settings.theme || 'system') === 'system' ? ' on' : ''),
      role: 'radio', 'aria-checked': String((S.settings.theme || 'system') === 'system'),
      onclick: e => {
        setThemeChoice('system');
        e.currentTarget.classList.add('on');
        [...e.currentTarget.parentElement.parentElement.querySelectorAll('.pick')].forEach(b => { if (b !== e.currentTarget) b.classList.remove('on'); });
        renderThemes();
      },
    }, tr('theme_system')));
  body.append(systemWrap);

  function setThemeChoice(id) {
    S.settings.theme = id;
    persist(); applyAppearance();
    announce(tr('theme') + ': ' + (id === 'system' ? tr('theme_system') : themeName(THEMES.find(t => t.id === id), S.settings.lang || 'fa')));
  }

  body.append(grid);
  body.append(h('p', { class: 'metric-sub', style: 'margin:8px 0 0' }, tr('theme_note')));

  /* accent hue */
  const accentRow = h('div', { class: 'accent-row' });
  const ACCENT_HEX = { clay: '#C0392B', blue: '#2563A8', green: '#2F7A4F', violet: '#6D4BC4', amber: '#8A5A00', teal: '#0F766E', rose: '#C2255C' };
  const renderAccents = () => {
    accentRow.textContent = '';
    for (const a of ACCENTS) {
      const on = (S.settings.accent || 'auto') === a;
      const dot = h('button', {
        class: 'accent-dot' + (a === 'auto' ? ' accent-dot--auto' : '') + (on ? ' on' : ''),
        title: a === 'auto' ? tr('accent_auto') : a, 'aria-label': a === 'auto' ? tr('accent_auto') : a,
        'aria-pressed': String(on),
        style: a === 'auto' ? '' : `background:${ACCENT_HEX[a]};border-color:${ACCENT_HEX[a]}`,
        onclick: () => {
          S.settings.accent = a; persist(); applyAppearance(); renderAccents();
          announce(tr('accent') + ': ' + (a === 'auto' ? tr('accent_auto') : a));
        },
      }, a === 'auto' ? tr('accent_auto').slice(0, 1) : on ? '✓' : '');
      accentRow.append(dot);
    }
  };
  renderAccents();
  body.append(h('div', { class: 'set-row' }, h('div', { class: 'set-label' }, tr('accent')), accentRow));

  body.append(toggle('contrast_more', S.settings.contrast === 'more', v => {
    S.settings.contrast = v ? 'more' : 'normal'; persist(); applyAppearance();
  }));
  body.append(toggle('motion', S.settings.motion !== 'off', v => {
    S.settings.motion = v ? 'on' : 'off'; persist(); applyAppearance();
  }));

  /* ---------------- Language & region ---------------- */
  body.append(h('div', { class: 'detail-label' }, tr('language')));
  body.append(seg('language', S.settings.lang, [['fa', 'فارسی'], ['en', 'English']], v => {
    S.settings.lang = v; setLang(v); persist(); commit(() => true);
  }));
  body.append(seg('calendar', S.settings.calendar, [['gregorian', 'میلادی'], ['jalali', 'شمسی']], v => {
    S.settings.calendar = v; setCalMode(v); persist(); commit(() => true);
  }));
  body.append(seg('week_start', S.settings.weekStart || 'sat', [['sat', tr('sat_start')], ['mon', tr('mon_start')]], v => {
    S.settings.weekStart = v; persist(); commit(() => true);
  }));

  /* ---------------- Behaviour ---------------- */
  body.append(h('div', { class: 'detail-label' }, tr('energy_behavior')));
  body.append(toggle('sfx', S.settings.sfx, v => { S.settings.sfx = v; persist(); }));
  body.append(toggle('voice_cues', S.settings.voiceCues, v => { S.settings.voiceCues = v; persist(); }));
  body.append(toggle('show_streaks', !!S.settings.showStreaks, v => { S.settings.showStreaks = v; persist(); commit(() => true); }));
  body.append(toggle('low_help', S.settings.energyBehavior?.lowHelpCards !== false, v => {
    S.settings.energyBehavior.lowHelpCards = v; persist(); commit(() => true);
  }));
  body.append(toggle('high_nudge', S.settings.energyBehavior?.highNudge !== false, v => {
    S.settings.energyBehavior.highNudge = v; persist(); commit(() => true);
  }));
  body.append(toggle('bad_auto', S.settings.energyBehavior?.badAutoHelp !== false, v => {
    S.settings.energyBehavior.badAutoHelp = v; persist(); commit(() => true);
  }));

  /* ---------------- Timetable shift ---------------- */
  body.append(h('div', { class: 'detail-label' }, tr('timetable')));
  body.append(seg('settings_shift', currentShift(), [['morning', tr('shift_morning')], ['evening', tr('shift_evening')]], v => {
    if (!S.timetable) S.timetable = { shift: v, data: null };
    S.timetable.shift = v; persist(); commit(() => true);
  }));

  /* ---------------- Data ---------------- */
  body.append(h('div', { class: 'detail-label' }, tr('import_export')));
  body.append(h('div', { class: 'set-row' },
    h('button', { class: 'pick on', style: 'min-height:48px;flex:1', onclick: () => openImportSheet() }, '📥 ' + tr('import_title')),
    h('button', { class: 'pick on', style: 'min-height:48px;flex:1', onclick: () => openExportSheet() }, '📤 ' + tr('export_title')),
  ));

  /* ---------------- Sync (desktop ↔ phone) ---------------- */
  body.append(syncSection());

  /* ---------------- Danger zone ---------------- */
  body.append(h('div', { class: 'detail-label' }, tr('danger_zone')));
  body.append(h('div', { class: 'danger-zone' },
    h('p', { class: 'metric-sub', style: 'margin:0' }, tr('reset_hint')),
    h('div', { class: 'chips-row' },
      h('button', { class: 'pick pick--solid', onclick: () => { downloadFile(`tictic-backup-${new Date().toISOString().slice(0, 10)}.json`, toBackup(), 'application/json'); snackbar(tr('backup_json')); } }, '🗄 ' + tr('export_first')),
      h('button', { class: 'pick pick--danger', onclick: () => openResetSheet() }, '🗑 ' + tr('clear_all')),
    ),
    h('div', { class: 'chips-row' },
      h('button', { class: 'pick', onclick: () => { seedIfNeeded(S, { force: true }); snackbar(tr('demo_loaded')); document.dispatchEvent(new Event('rerender')); } }, '✨ ' + tr('demo_load')),
      h('button', { class: 'pick', onclick: resetAppearance }, '🎨 ' + tr('reset_appearance')),
    ),
    h('p', { class: 'metric-sub', style: 'margin:0' }, tr('demo_note')),
  ));

  /* ---------------- Shortcuts ---------------- */
  body.append(h('div', { class: 'detail-label' }, tr('shortcuts')));
  body.append(h('div', { class: 'set-row', style: 'font-size:13px;color:var(--text-muted)' },
    h('div', {}, '⌘/Ctrl+K — ' + tr('shortcut_palette')),
    h('div', {}, 'n — ' + tr('shortcut_new')),
    h('div', {}, 'd — ' + tr('shortcut_dump')),
    h('div', {}, '/ — ' + tr('shortcut_search')),
  ));

  sheet(tr('settings'), body);
  renderThemes();
  return body;
}

/* ---- destructive reset: export first, then type-to-confirm ---- */
function openResetSheet() {
  const field = h('input', { type: 'text', class: 'type-confirm', placeholder: 'RESET', 'aria-label': tr('type_to_confirm'), autocomplete: 'off', spellcheck: 'false' });
  const go = h('button', { class: 'pick pick--danger', style: 'min-height:48px', disabled: true }, '🗑 ' + tr('reset_now'));
  field.addEventListener('input', () => { go.disabled = field.value.trim().toUpperCase() !== 'RESET'; });
  const sh = sheet(tr('clear_all'), h('div', { class: 'stack' },
    h('p', { style: 'margin:0' }, tr('reset_hint')),
    h('button', {
      class: 'pick pick--solid', style: 'min-height:48px',
      onclick: () => { downloadFile(`tictic-backup-${new Date().toISOString().slice(0, 10)}.json`, toBackup(), 'application/json'); snackbar(tr('backup_json')); },
    }, '🗄 ' + tr('export_first')),
    h('div', { class: 'detail-label', style: 'margin-top:8px' }, tr('type_to_confirm')),
    field,
    go,
    h('button', { class: 'pick', style: 'min-height:44px', onclick: () => sh.close() }, tr('cancel')),
  ));
  go.addEventListener('click', () => {
    clearAllData();          /* wipes tasks, lists, caches; keeps the app shell */
    sh.close();
    snackbar(tr('reset_done'));
    setTimeout(() => location.reload(), 600);
  });
}

function resetAppearance() {
  S.settings.theme = 'system';
  S.settings.accent = 'auto';
  S.settings.motion = 'on';
  S.settings.contrast = 'normal';
  persist(); applyAppearance();
  snackbar(tr('reset_appearance_done'));
  document.querySelectorAll('.ov-sheet').forEach(s => s.remove());
  openSettings();
}

/* ---- device sync: point this device at your sync server, pick a
   passphrase, tap sync. Config lives outside the app state, so the
   passphrase can never be exported or synced away. ---- */
function syncSection() {
  const wrap = h('div', { class: 'stack', style: 'padding:var(--sp-4) 0' });
  const cfg = getSyncCfg();

  wrap.append(h('div', { class: 'detail-label' }, tr('sync_title')));
  wrap.append(h('p', { class: 'metric-sub', style: 'margin:0' }, tr('sync_intro')));
  const urlInp = h('input', { type: 'text', value: cfg.endpoint, placeholder: tr('sync_url_ph'), dir: 'ltr', autocomplete: 'off', spellcheck: 'false' });
  const passInp = h('input', { type: 'text', value: cfg.passphrase, placeholder: tr('sync_pass_ph'), dir: 'ltr', autocomplete: 'off', spellcheck: 'false' });
  const save = () => setSyncCfg({ endpoint: urlInp.value.trim(), passphrase: passInp.value.trim() });
  urlInp.addEventListener('change', save);
  passInp.addEventListener('change', save);

  wrap.append(h('div', { class: 'set-label' }, tr('sync_url')));
  wrap.append(urlInp);
  wrap.append(h('div', { class: 'set-label', style: 'margin-top:8px' }, tr('sync_pass')));
  wrap.append(passInp);

  const status = h('p', { class: 'metric-sub', style: 'margin:0' }, syncStatusText());
  const doSync = h('button', { class: 'pick pick--solid', style: 'min-height:48px' }, '🔄 ' + tr('sync_now'));
  doSync.addEventListener('click', async () => {
    save();
    if (!isConfigured()) { snackbar(tr('sync_not_configured')); return; }
    doSync.disabled = true;
    status.textContent = tr('sync_working');
    const r = await syncNow();
    doSync.disabled = false;
    status.textContent = syncStatusText();
    if (r.ok) {
      const s = r.stats || { added: 0, updated: 0, removed: 0 };
      snackbar(tr('sync_done', { a: s.added, u: s.updated, d: s.removed }));
    } else {
      snackbar(syncFailText(r.reason));
    }
  });
  wrap.append(h('div', { class: 'chips-row', style: 'margin-top:8px' }, doSync));
  wrap.append(status);

  const autoLbl = h('span', {}, tr('sync_auto'));
  const autoBtn = h('button', {
    class: 'set-toggle' + (cfg.auto ? ' on' : ''), role: 'switch', 'aria-checked': String(!!cfg.auto),
    onclick: e => {
      const on = !e.currentTarget.classList.contains('on');
      setSyncCfg({ auto: on });
      e.currentTarget.classList.toggle('on', on);
      e.currentTarget.setAttribute('aria-checked', String(on));
      e.currentTarget.querySelector('.sw').textContent = on ? '✓' : '';
      startAutoSync();            /* starts if just enabled, stops if just disabled */
    },
  }, autoLbl, h('span', { class: 'sw' }, cfg.auto ? '✓' : ''));
  wrap.append(autoBtn);

  const forget = h('button', { class: 'pick pick--danger', style: 'min-height:44px' }, '🗑 ' + tr('sync_forget'));
  forget.addEventListener('click', async () => {
    save();
    const r = await forgetRemote();
    snackbar(r.ok ? tr('sync_forget_done') : syncFailText(r.reason));
  });
  wrap.append(h('div', { class: 'chips-row' }, forget));

  return wrap;
}

function syncStatusText() {
  const cfg = getSyncCfg();
  if (!isConfigured()) return tr('sync_not_configured');
  if (!cfg.lastSyncAt) return tr('sync_never');
  return tr('sync_last', { t: new Date(cfg.lastSyncAt).toLocaleTimeString() });
}

function syncFailText(reason) {
  if (reason === 'offline') return tr('sync_offline');
  if (reason === 'bad_key') return tr('sync_bad_key');
  if (reason === 'not_configured') return tr('sync_not_configured');
  if (reason === 'insecure_context') return tr('sync_insecure');
  return tr('sync_fail');
}
