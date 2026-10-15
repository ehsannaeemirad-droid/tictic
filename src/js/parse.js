/* ============================================================
   TicTic ADHD — quick-add text parser (fa + en)
   Recognizes date / time / tags / priority tokens. Tokens are
   returned separately; UI shows them as editable chips — they are
   NOT silently applied (design principle: explain automation).
   values: when = ISO date string; time = 'HH:MM'
   ============================================================ */
import { iso } from './i18n.js';

const FA_DIGITS = { '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9' };
const lat = s => s.replace(/[۰-۹]/g, d => FA_DIGITS[d]);

export function parseQuick(raw) {
  let text = ' ' + (raw || '') + ' ';
  const out = { title: raw?.trim() || '', when: null, time: null, tags: [], priority: null, recurrence: null };
  const stripped = [];

  /* #tag */
  text = text.replace(/#([\w\u0600-\u06FF\u060C\u200c-]+)/g, (_, t) => { out.tags.push(t); stripped.push(t); return ' '; });

  /* priority tokens: !high !frog / مهم / فوری */
  if (/(^|\s)!(frog|قورباغه)(\s|$)/i.test(text)) { out.priority = 'frog'; text = text.replace(/(^|\s)!(frog|قورباغه)(\s|$)/i, ' '); }
  else if (/(^|\s)!(high|فوری)(\s|$)/i.test(text)) { out.priority = 'high'; text = text.replace(/(^|\s)!(high|فوری)(\s|$)/i, ' '); }
  else if (/(^|\s)!(med|متوسط)(\s|$)/i.test(text)) { out.priority = 'med'; text = text.replace(/(^|\s)!(med|متوسط)(\s|$)/i, ' '); }

  /* recurrence */
  if (/(^|\s)(every day|هر روز)(\s|$)/i.test(text)) { out.recurrence = 'daily'; text = text.replace(/(^|\s)(every day|هر روز)(\s|$)/i, ' '); }
  else if (/(^|\s)(weekly|هر هفته)(\s|$)/i.test(text)) { out.recurrence = 'weekly'; text = text.replace(/(^|\s)(weekly|هر هفته)(\s|$)/i, ' '); }
  else if (/(^|\s)(monthly|هر ماه)(\s|$)/i.test(text)) { out.recurrence = 'monthly'; text = text.replace(/(^|\s)(monthly|هر ماه)(\s|$)/i, ' '); }

  /* times: 8am | 17:30 | ۵ عصر | ساعت ۴ | ۸ صبح
     digits may be Latin or Persian — \(lat) converts before use */
  const D1 = '[0-9۰-۹]{1,2}', D2 = '[0-9۰-۹]{2}';
  const t12 = text.match(new RegExp(`(?:\\s|^)(${D1})(?::(${D2}))?\\s*(am|pm)(?=\\s|$)`, 'i'));
  const t24 = text.match(new RegExp(`(?:\\s|^)(${D1}):(${D2})(?=\\s|$)`));
  const tFa = text.match(new RegExp(`(?:\\s|^)(?:ساعت\\s*)?(${D1})\\s*(صبح|عصر|شب)(?=\\s|$)`));
  if (t12) {
    let hh = +lat(t12[1]) % 12; if (/pm/i.test(t12[3])) hh += 12;
    out.time = `${String(hh).padStart(2,'0')}:${lat(t12[2] || '00')}`;
    text = text.replace(t12[0], ' ');
    stripped.push(t12[0]);
  } else if (t24) {
    const hh = +lat(t24[1]), mm = lat(t24[2]);
    if (hh <= 23 && +mm <= 59) {         /* 99:30 is not a time */
      out.time = `${String(hh).padStart(2,'0')}:${mm}`;
      text = text.replace(t24[0], ' ');
      stripped.push(t24[0]);
    }
  } else if (tFa) {
    let hh = +lat(tFa[1]);
    const part = tFa[2];
    if (part === 'عصر' || part === 'شب') { if (hh <= 11) hh += 12; }
    else if (part === 'صبح' && hh === 12) hh = 0;
    out.time = `${String(hh).padStart(2,'0')}:00`;
    text = text.replace(tFa[0], ' ');
    stripped.push(tFa[0]);
  }

  /* dates: today/tomorrow/weekday names; fa equivalents */
  const today = new Date();
  const dayNames = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6,
    'یکشنبه':0, 'دوشنبه':1, 'سه‌شنبه':2, 'سه شنبه':2, 'چهارشنبه':3, 'پنجشنبه':4, 'جمعه':5, 'شنبه':6 };
  let when = null;
  const wk = text.match(/(?:\s|^)(sunday|monday|tuesday|wednesday|thursday|friday|saturday|یکشنبه|دوشنبه|سه‌شنبه|سه شنبه|چهارشنبه|پنجشنبه|جمعه|شنبه)(?=\s|$)/i);
  if (/((\s|^)(today|امروز)(\s|$))/i.test(text)) { when = new Date(today); text = text.replace(/(\s|^)(today|امروز)(\s|$)/i, ' '); }
  else if (/((\s|^)(tomorrow|فردا)(\s|$))/i.test(text)) { when = new Date(today); when.setDate(when.getDate() + 1); text = text.replace(/(\s|^)(tomorrow|فردا)(\s|$)/i, ' '); }
  else if (wk) {
    const target = dayNames[wk[1].toLowerCase()];
    const d2 = new Date(today);
    const diff = (target - d2.getDay() + 7) % 7 || 7;
    d2.setDate(d2.getDate() + diff);
    when = d2;
    text = text.replace(wk[0], ' ');
  }
  if (when) out.when = when.toISOString();

  /* title: original text minus tokens/stripped bits (not silently reordering words) */
  let title = text.trim().replace(/\s+/g, ' ');
  out.title = title || raw?.trim() || '';
  return out;
}
