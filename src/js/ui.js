/* ============================================================
   TicTic ADHD — shared UI helpers
   Small DOM builders + icon set (inline SVG, stroke style)
   ============================================================ */
import { tr, N } from './i18n.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el && k !== 'style' && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

export function sv(path, size = 20) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', size); svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
  for (const p of Array.isArray(path) ? path : [path]) {
    const elem = document.createElementNS(ns, 'path');
    elem.setAttribute('d', p);
    svg.append(elem);
  }
  return svg;
}

export const icons = {
  today: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  plan: 'M3 3h18v18H3zM3 9h18M9 21V9',
  projects: 'M4 20h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-8L9.6 4.8A1 1 0 0 0 8.9 4.5H4a1 1 0 0 0-1 1V19a1 1 0 0 0 1 1z',
  flows: 'M3 12h4l3 8 4-16 3 8h4',
  report: 'M3 3v18h18M7 14l3-4 3 3 5-6',
  drawer: 'M12 3v.01M12 12v.01M12 21v.01',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2z',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  close: 'M18 6L6 18M6 6l12 12',
  chevron: 'M9 18l6-6-6-6',
  play: 'M5 3l14 9-14 9V3z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L7 14.2 2 9.3l6.9-1L12 2z',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5.1L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z',
  undo: 'M3 7v6h6M3.5 13a9 9 0 1 0 2-9.4L3 7',
  noise: 'M2 12h2M20 12h2M6 8l-2-2M6 16l-2 2M18 8l2-2M18 16l2 2M12 6V4M12 20v-2M12 8a4 4 0 0 0 0 8 4 4 0 0 0 0-8z',
  dump: 'M12 3v4M5 7h14l-1 13H6L5 7zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  breathe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  check: 'M20 6L9 17l-5-5',
  mic: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 11a7 7 0 0 1-14 0M12 18v4',
};

export function announce(msg) {
  const live = document.getElementById('live');
  if (live) { live.textContent = msg; }
}

/* XP → level: level = floor(sqrt(XP/25)) + 1 */
export function levelFor(xp) { return Math.floor(Math.sqrt((xp || 0) / 25)) + 1; }
export function levelProgress(xp) {
  const lvl = levelFor(xp);
  const base = (lvl - 1) ** 2 * 25, next = lvl ** 2 * 25;
  return { lvl, pct: Math.min(100, Math.round(((xp - base) / (next - base)) * 100)), remain: next - xp };
}

/* simple confetti (§36 — 18 pieces, reduced-motion aware) */
export function confetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.documentElement.dataset.motion === 'off') return;
  const colors = ['#FFD27A', '#F4E4C1', '#8B5CF6', '#16A34A', 'var(--accent)'];
  const wrap = document.createElement('div');
  wrap.className = 'fx-confetti';
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('i');
    p.style.setProperty('--x', (4 + Math.random() * 92) + '%');
    p.style.setProperty('--d', (0.9 + Math.random() * 0.8) + 's');
    p.style.setProperty('--c', colors[i % colors.length]);
    wrap.append(p);
  }
  document.body.append(wrap);
  setTimeout(() => wrap.remove(), 2200);
}
