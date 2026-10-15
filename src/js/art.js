/* ============================================================
   TicTic — illustrations
   Hand-drawn inline SVG, no external files, no raster. Stroke uses
   currentColor so every theme recolours them; the geometry is a
   132×96 canvas of ruled-paper line work to match the art direction.
   ============================================================ */
import { sv } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';

function sheet(...parts) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 132 96');
  svg.setAttribute('class', 'state-art');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  for (const p of parts) {
    const el = document.createElementNS(NS, p.t);
    for (const [k, v] of Object.entries(p.a)) el.setAttribute(k, v);
    svg.append(el);
  }
  return svg;
}

const P = (d, a = {}) => ({ t: 'path', a: { d, ...a } });
const R = (x, y, w, h, r = 6, a = {}) => ({ t: 'rect', a: { x, y, width: w, height: h, rx: r, ...a } });
const C = (cx, cy, r, a = {}) => ({ t: 'circle', a: { cx, cy, r, ...a } });
const L = (x1, y1, x2, y2, a = {}) => ({ t: 'line', a: { x1, y1, x2, y2, ...a } });

/* a page with a rising sun: “nothing scheduled — the day is open” */
export const artOpenDay = () => sheet(
  R(26, 16, 80, 66, 8),
  P('M26 40h80'),
  P('M38 52h30'), P('M38 62h44'), P('M38 72h22'),
  L(18, 82, 114, 82, { opacity: '.45' }),
  C(96, 30, 9, { opacity: '.75' }),
  P('M96 15v-5M111 30h5M81 30h-5M107 19l4-4M85 19l-4-4', { opacity: '.6' }),
);

/* an empty list: card with a tick waiting */
export const artEmptyList = () => sheet(
  R(24, 14, 84, 68, 10),
  C(40, 32, 6), P('M37 32l2.4 2.4L44 29'),
  C(40, 52, 6), P('M37 52l2.4 2.4L44 49'),
  C(40, 72, 6),
  P('M56 32h36'), P('M56 52h28'), P('M56 72h32', { opacity: '.7' }),
);

/* harbor: a moored boat on quiet water */
export const artHarbor = () => sheet(
  P('M14 74c8-6 16-6 24 0s16 6 24 0 16-6 24 0 16 6 24 0', { opacity: '.7' }),
  P('M40 62h52l-10 14H50z'),
  P('M66 62V26l20 36'),
  P('M66 34l-16 28'),
  L(30, 86, 102, 86, { opacity: '.4' }),
);

/* offline: a cloud with a quiet slash */
export const artOffline = () => sheet(
  P('M44 66h44a13 13 0 0 0 0-26 17 17 0 0 0-32-4 12 12 0 0 0-12 12 12 12 0 0 0 0 18z'),
  L(26, 20, 106, 84, { 'stroke-dasharray': '6 6', opacity: '.8' }),
  L(34, 84, 98, 84, { opacity: '.35' }),
);

/* error: a page with its corner torn */
export const artTorn = () => sheet(
  P('M32 14h50l18 18v50H32z'),
  P('M82 14v18h18'),
  P('M56 44v14M56 66v2', { 'stroke-width': '2.6' }),
  P('M20 78c6-4 10 4 16 0', { opacity: '.5' }),
);

/* search: a magnifier over ruled lines */
export const artSearch = () => sheet(
  C(58, 40, 22),
  L(74, 56, 94, 76),
  P('M30 82h48', { opacity: '.7' }),
  P('M44 34h28', { opacity: '.6' }),
  P('M40 46h22', { opacity: '.6' }),
);

/* import: an inbox with an arrow going in */
export const artImport = () => sheet(
  P('M28 22h76v52H28z'),
  P('M28 56h22l6 10h20l6-10h22'),
  P('M66 32v20M58 44l8 8 8-8'),
);

/* the sidebar/app mark, reused where a small logo is handy */
export const markArt = () => sheet(
  R(42, 22, 48, 48, 12),
  P('M54 46l8 8 16-18', { 'stroke-width': '3' }),
);

export { sv };
