#!/usr/bin/env node
/* ============================================================
   make-samples.mjs — regenerates /samples through the real exporters,
   so a sample file can never drift from the format the app writes.

     node tools/make-samples.mjs
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* same minimal DOM shim as roundtrip.mjs (the modules must load in Node) */
const el = (tag = 'div') => {
  const node = {
    tagName: tag, children: [], dataset: {}, style: { setProperty() {} },
    className: '', textContent: '', hidden: false, disabled: false, value: '', files: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, removeAttribute() {},
    append(...c) { node.children.push(...c); }, appendChild(c) { node.children.push(c); },
    prepend() {}, remove() {}, removeChild() {}, addEventListener() {}, removeEventListener() {},
    querySelector: () => null, querySelectorAll: () => [], focus() {}, click() {},
    insertAdjacentHTML() {}, cloneNode: () => el(tag),
  };
  return node;
};
globalThis.document = {
  documentElement: el('html'), head: el('head'), body: el('body'),
  createElement: el, createElementNS: (_ns, t) => el(t),
  createTextNode: (t) => ({ nodeType: 3, textContent: String(t) }),
  getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
};
globalThis.window = {
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
  addEventListener() {}, removeEventListener() {}, AudioContext: null,
};
globalThis.localStorage = {
  _d: new Map(),
  getItem(k) { return this._d.has(k) ? this._d.get(k) : null; },
  setItem(k, v) { this._d.set(k, String(v)); },
  removeItem(k) { this._d.delete(k); },
  clear() { this._d.clear(); },
};
try { Object.defineProperty(globalThis, 'navigator', { value: { onLine: true, userAgent: 'node' }, configurable: true }); } catch {}

const load = (p) => import(new URL(`../src/js/${p}`, import.meta.url).href);
const { S, makeTask } = await load('store.js');
const { toTickCsv, toBackup } = await load('ticktick.js');

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'samples');
const D = (y, m, d, h, mi) => new Date(y, m - 1, d, h || 0, mi || 0, 0, 0).toISOString();

/* ---- a small, believable planner: two lists, one project folder ------- */
S.lists = [
  { id: 'inbox', name: 'اینباکس', system: true },
  { id: 'l_work', name: 'کار' },
  { id: 'l_home', name: 'خانه' },
];
S.projects = [{ id: 'pr_redesign', name: 'بازطراحی سایت', listId: 'l_work' }];
S.tagsBank = ['کار', 'مهم', 'سلامتی', 'home'];
S.tasks = [
  makeTask({
    id: 'sm-1', title: 'پروژه بازطراحی سایت', listId: 'l_work', priority: 'high', tags: ['کار', 'مهم'],
    dueDate: '2026-11-01', notes: 'سه فاز: تحقیق، طراحی، اجرا',
  }),
  makeTask({
    id: 'sm-2', parentId: 'sm-1', title: 'جمع‌آوری نمونه‌ها', listId: 'l_work', priority: 'med',
    dueDate: '2026-11-03', order: 2,
    subtasks: [{ title: 'سبک‌شناسی', done: true }, { title: 'پالت رنگ', done: false }],
    notes: 'شامل کاما, گیومه " و\nخط دوم یادداشت',
  }),
  makeTask({
    /* comma + quote inside a quoted cell, and a reminder */
    id: 'sm-3', title: 'تماس با مشتری، درباره‌ی «دامنه»', listId: 'l_work', priority: 'frog',
    dueDate: D(2026, 10, 14, 8, 0), plannedStart: D(2026, 10, 14, 7, 45),
    reminder: ['TRIGGER:PT0S'], estimate: 15,
  }),
  makeTask({
    id: 'sm-4', title: 'مدیتیشن 🧘', listId: 'l_home', priority: 'low', recurrence: 'daily',
    dueDate: D(2026, 10, 14, 6, 15),
  }),
  makeTask({
    id: 'sm-5', title: 'خرید نان و شیر', listId: 'l_home', priority: 'none', tags: ['home'],
    dueDate: '2026-10-13',
  }),
  makeTask({
    id: 'sm-6', title: 'ارسال گزارش هفتگی', listId: 'l_work', priority: 'med',
    dueDate: '2026-10-10', status: 'done', progress: 100,
    createdAt: Date.parse(D(2026, 10, 8, 9, 0)),
  }),
  makeTask({
    id: 'sm-7', title: 'ایده‌های قدیمی', listId: 'inbox', kind: 'note', dropped: true,
    notes: 'آرشیو شده — نگه داشته شده که فراموش نشود',
  }),
];

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'ticktick-sample.csv'), toTickCsv());
fs.writeFileSync(path.join(out, 'tictic-backup-sample.json'), toBackup());
console.log(`samples/: ticktick-sample.csv (${S.tasks.length} tasks) · tictic-backup-sample.json`);
