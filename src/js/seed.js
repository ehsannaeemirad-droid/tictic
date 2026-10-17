/* ============================================================
   TicTic ADHD — Seed data (first launch only, §10)
   Outline-driven builder reproducing the user's TickTick seed
   inventory faithfully (titles, dates, times, nesting), plus the
   brief's ADHD specials (frog, decisions, delay-window, noise,
   projects, sprint, morning flow, sections, tags).
   Date deltas are relative to launch day: "(Oct 12)" rows in the
   inventory are treated as "today".
   ============================================================ */
import { makeTask, uid } from './store.js';
import { iso, dayKey } from './i18n.js';
import { DEFAULT_TIMETABLE } from './timetable.js';

const DAY = 86400000;
export function seedIfNeeded(S, { force = false } = {}) {
  /* First launch only. Guarded twice on purpose: `__seeded` survives reloads
     (hydrate restores it), and any existing tasks also block a re-seed so a
     user's own list can never be overwritten by the demo inventory.
     `force` is only used by Settings → “load sample data”, never at boot. */
  if (!force && (S.__seeded || (S.tasks && S.tasks.length))) { S.__seeded = true; return false; }
  S.__seeded = true;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  /* time-of-day → a real instant; no time → a plain calendar day, so the
     stored value cannot drift to the previous day in a positive UTC offset */
  const d = (offset, hh = null, mm = null) => {
    const x = new Date(today); x.setDate(x.getDate() + offset);
    if (hh != null) { x.setHours(hh, mm || 0, 0, 0); return x.toISOString(); }
    x.setHours(0, 0, 0, 0);
    return iso(x);
  };

  /* lists */
  S.lists = [
    { id: 'inbox', name: 'اینباکس', system: true },
    { id: 'work', name: 'کار' }, { id: 'personal', name: 'شخصی' },
    { id: 'home', name: 'خانه' }, { id: 'health', name: 'سلامت' },
  ];
  S.sections = [{ id: 'sec-work', name: 'کار' }, { id: 'sec-personal', name: 'شخصی' }];
  S.tagsBank = [{ name: 'frog' }, { name: 'quick' }, { name: 'later' }];

  /* --- outline builder ------------------------------------------------ */
  const tasks = [];
  const lastAt = lvl => tasks.filter(t => t._l === lvl - 1).at(-1);

  function add(lvl, title, extra = {}) {
    const parent = lvl > 0 ? lastAt(lvl) : null;
    const t = makeTask({
      title, parentId: parent ? parent.id : null,
      listId: extra.listId || (parent ? parent.listId : 'work'),
      order: tasks.length,
      /* provenance — onboarding only asks users who own no tasks of their own.
         Set here, in the single builder every seed row passes through. */
      demo: true,
      ...extra,
    });
    t._l = lvl;
    tasks.push(t);
    return t;
  }

  /* ================= PINNED ================= */
  add(0, 'Mona Tasks', { pinned: true, dueDate: d(-9), listId: 'personal' });
  add(0, 'BIG Picture Data', { pinned: true, dueDate: d(-9), listId: 'work' });

  /* ================= OVERDUE ================= */
  const o = (title, extra = {}) => { const { _day, ...rest } = extra; return add(0, title, { dueDate: d(_day ?? -5), ...rest }); };

  add(0, 'سبک زندگی و درآمد', { dueDate: d(-5) });
  const sabk = tasks.at(-1);
  add(1, 'Respect project', { dueDate: d(-5), parentId: sabk.id });
  add(1, 'Notes on phone', { dueDate: d(-5), parentId: sabk.id });
  o('Asakiri', { listId: 'personal' });
  o('خرید هوش مصنوعی', { listId: 'personal' });
  o('Hand writing', { listId: 'personal', dopamineType: 'soso' });
  o('مقاومت به انسولین', { listId: 'health' });
  o('سایر');
  o('قوانین احداث مدرسه هوم اسکول + هوش مصنوعی', { _day: -2, estimate: 90 });
  o('مرادیان', { _day: -2 });

  /* ================= TODAY ================= */
  add(0, 'بانک ملی: کارت + درخواست چک', { dueDate: d(0, 8), kind: 'decision', dopamineType: 'dislike', pressureType: 'out', listId: 'personal',
    decision: { pros: 'چک صادر می‌شود', cons: 'صف طولانی', options: 'بروم یا نه', by: d(0, 12) } });
  add(0, 'تمیز کردن کفش و پوشاک مدرسه', { dueDate: d(0, 16), listId: 'home' });
  add(0, 'قاب عینک سارا', { dueDate: d(0, 18), listId: 'personal' });
  add(0, 'نوبت آزمایش', { dueDate: d(0, 21), listId: 'health' });
  add(0, 'لیلی درس بعد', { dueDate: d(0), estimate: 45 });
  add(0, 'زیپ شلوار', { dueDate: d(0), estimate: 10, listId: 'home' });
  add(0, 'سواعدی');
  add(0, 'نهایی سازی مدرسه', { dueDate: d(0), estimate: 120, sectionId: 'sec-work' });
  const nahaei = tasks.at(-1);
  for (const st of [
    'تدریس کتاب جدید / برنامه سبک تدریس بخش دوم',
    'برنامه اموزش زبان در مدرسه',
    'تهیه و پرینت برگه ها',
    'شفاف سازی: تعریف قوانین و سیستم نمره دهی',
    'برنامه ثابت و مکتوب برای هر کلاس و پایه',
  ]) add(1, st, { dueDate: d(-1), parentId: nahaei.id, estimate: 30 });
  tasks[tasks.length - 5].dueDate = d(-1, 11);
  /* مربیگری شطرنج — the delay-windowed task from brief §10 */
  add(0, 'مربیگری شطرنج: ثبت‌نام', { dueDate: d(0, 18), priority: 'high', delay: dayKey(d(0, 18)),
    reminder: [d(-2, 9), d(-1, 9), d(0, 17)], listId: 'personal', tags: ['quick'] });
  add(0, 'Fix TV', { dueDate: d(0), estimate: 15, listId: 'home' });
  add(0, 'فیببک لیلی', { dueDate: d(0) });
  add(0, 'اکشن لیست مالی', { dueDate: d(0), listId: 'personal', tags: ['quick'] });
  add(0, 'قسط مسکن ۱۱ هر ماه', { dueDate: d(0), recurrence: 'monthly', listId: 'personal' });
  add(0, 'شیشه شور ماشین', { dueDate: d(0), estimate: 10, listId: 'home' });
  add(0, 'اندروید باکس', { dueDate: d(0), estimate: 45 });

  /* first-launch frog (brief §10) */
  add(0, 'BUILD APP', { priority: 'frog', key: true, estimate: 180, dueDate: d(0), tags: ['frog'], listId: 'work' });
  /* noise (brief §10) */
  add(0, 'بررسی ترندهای تیک‌تاک', { noise: true, listId: 'inbox', notes: 'پارک شد — چند روز دیگر دیدم.' });

  /* ================= TOMORROW ================= */
  add(0, 'Call Mona', { dueDate: d(1, 10), listId: 'personal', tags: ['quick'] });
  add(0, 'GROCERY SHOPPING', { dueDate: d(1, 16), recurrence: 'weekly', listId: 'home' });
  add(0, 'سه شنبه صدرا', { dueDate: d(1) });
  add(0, 'آمادگی لیلی', { dueDate: d(1), estimate: 30 });
  add(0, 'تصمیم شغل دوم', { dueDate: d(1), kind: 'decision', dopamineType: 'soso', pressureType: 'self',
    decision: { pros: 'درآمد دوم', cons: 'زمان نهایی نمی‌ماند', options: 'داوری شطرنج درجه ۳ / skyeng', by: d(1) } });
  const shoghl = tasks.at(-1);
  add(1, 'تصمیم داوری شطرنج درجه ۳', { dueDate: d(1), kind: 'decision', parentId: shoghl.id });
  add(1, 'skyeng?', { dueDate: d(1), kind: 'decision', parentId: shoghl.id });
  add(0, 'تصحیح سوالات تعیین سطح سطوح ۴ و بالاتر + بازخورد اوتوماتیک', { dueDate: d(1), estimate: 60 });
  add(0, 'ثبت امور مالی', { dueDate: d(1), listId: 'personal' });

  /* ================= NEXT 7 DAYS ================= */
  add(0, 'gym', { dueDate: d(2, 16), estimate: 45, listId: 'health' });
  add(0, 'HOUSE CLEANING — 17:00–19:00', { dueDate: d(2, 17), listId: 'home' });
  add(0, 'WIFE TIME — 20:00–BEDTIME', { dueDate: d(3, 20), listId: 'personal', dopamineType: 'love' });
  add(0, 'سفرنامه خوانی جمعه', { dueDate: d(3), listId: 'personal', dopamineType: 'love' });
  add(0, 'WEEKENDS OFF Work Family Time', { dueDate: d(3), listId: 'personal' });
  add(0, 'روتین هفته', { dueDate: d(3) });
  add(0, 'Clean house so weekends are free', { dueDate: d(3), listId: 'home' });
  add(0, 'Managerial: Define tomorrow key tasks', { dueDate: d(3) });
  add(0, 'Manegarial: Day Essential Tasks + Partner', { dueDate: d(3) });
  add(0, 'FRIDAY — RELATIVES 18:00–23:00', { dueDate: d(4, 18), listId: 'personal', pressureType: 'out' });
  add(0, 'شنبه و دوشنبه شیف عصر راه موفقیت', { dueDate: d(5, 13) });
  add(0, 'صدرا - دوشنبه', { dueDate: d(7, 7) });

  /* ================= LATER ================= */
  add(0, 'راه موفقیت - شیفت صبح', { dueDate: d(12, 12) });
  add(0, 'شنبه و دوشنبه شیف صبح راه موفقیت', { dueDate: d(12) });
  add(0, 'نت سیما', { dueDate: d(23, 18), listId: 'personal' });
  add(0, 'یک درصد امام زمان (عج)', { dueDate: d(27, 12), listId: 'personal' });

  /* ================= NO DATE ================= */
  add(0, '30 Days Marketing Deadline Reminder');
  const mkt = tasks.at(-1);
  add(1, '0. Daily Marketing Efforts', { parentId: mkt.id });
  add(1, '📊 گزارش هفتگی عملکرد مارکتینگ', { parentId: mkt.id });
  add(0, '7. وبینار اول');
  add(0, 'ژئوپولتبک');
  add(0, 'اهداف کلیدی');
  const ok = tasks.at(-1);
  add(1, 'شغل', { parentId: ok.id });
  add(2, '1. صنعت', { parentId: ok.id });
  add(2, 'کسب و کار', { parentId: ok.id });
  add(1, 'ساخت پایه سالم', { parentId: ok.id, listId: 'personal' });
  const salam = tasks.at(-1);
  add(2, 'پلن ورزشی برای اصلاح فرم بدن و آمادگی جسمانی', { parentId: salam.id, dueDate: d(-5), listId: 'health' });
  add(2, 'پیگیری فرزند', { parentId: salam.id, listId: 'personal' });
  const peygiri = tasks.at(-1);
  add(3, 'KID TIME', { parentId: peygiri.id, dueDate: d(12), listId: 'personal' });
  add(2, 'مدیریت نیرودایورجنس', { parentId: salam.id, listId: 'personal' });
  const madirat = tasks.at(-1);
  for (const st of ['Notes to Action', 'ابر راه حل', 'ISSUE', 'Productivity & ADHD management', 'روتین صبح', 'ورزش + تغذیه', 'Key Progress Tasks', 'PDAC design for life and career'])
    add(3, st, { parentId: madirat.id, listId: 'personal' });
  add(2, '2. مدیریت بیش فعالی', { parentId: salam.id, listId: 'personal' });
  const bish = tasks.at(-1);
  for (const st of ['ACTION Coach?', 'Strategy design', 'more books on ADHD'])
    add(3, st, { parentId: bish.id, listId: 'personal' });
  add(2, 'SPOUSE TIME', { parentId: salam.id, listId: 'personal' });
  add(0, 'اهداف ثانویه', { listId: 'personal' });
  const thavani = tasks.at(-1);
  for (const st of ['1. سبک زندگی', '3. سلامت جسم', '4. سلامت روان'])
    add(1, st, { parentId: thavani.id, listId: 'personal' });
  add(0, '1. Hitalki: About me + Video + Activate Add');
  add(0, '5. تکمیل اطلاعات اینستاگرام');
  add(0, 'یاداورهای مهم + تعهدات مالی', { listId: 'personal' });
  const yadav = tasks.at(-1);
  add(1, 'بیمه شخص ثالث ماشین', { parentId: yadav.id, dueDate: d(0, 19), listId: 'personal' });
  add(1, 'شارژ شهرک', { parentId: yadav.id, dueDate: d(0), listId: 'personal' });
  add(1, 'صندوق نسرین', { parentId: yadav.id, dueDate: d(10), listId: 'personal' });
  add(0, 'app Art 11');
  const appArt = tasks.at(-1);
  add(1, 'برنامه تیک تیک نسخه مناسب من', { parentId: appArt.id });
  for (const st of ['اسکرپ و دراپ شیپینگ', 'Grammar Gym: Feedback', 'ٰVocabulry Gym (CEFR , chucks, idiomaticity etc.)', 'Feedback and Personal Progress Visulizer', 'برنامه سازی', 'Brain Hack', 'Cool Ideas', 'Life Experiences', 'Excel Projects', 'Study'])
    add(0, st);

  /* ================= NOTE ================= */
  add(0, 'نکات', { notes: 'یادداشت‌های پراکنده — اینجا می‌مانند تا تبدیل بشن.', status: 'note', dueDate: d(-12) });
  add(0, 'Teacher Notes', { notes: 'feedback for teaching', status: 'note', dueDate: d(-12) });

  /* ================= COMPLETED ================= */
  const c = (title, extra = {}) => add(0, title, { status: 'done', progress: 100, dueDate: d(0), ...extra });
  c('درخواست خروج پول های تاکی', { listId: 'personal' });
  c('Call Mona', { dueDate: d(0, 10), listId: 'personal' });
  c('اطلاع به سمیرا برای دوشنبه');
  c('شنبه و دوشنبه شیف صبح راه موفقیت', { dueDate: d(0) });
  c('یادآوری ابراهیم', { dueDate: d(0, 8) });

  /* cleanup: strip builder-only fields */
  for (const t of tasks) delete t._l;
  for (const t of tasks) if (t.parentId && !tasks.some(x => x.id === t.parentId)) t.parentId = null;

  S.tasks = tasks;

  /* ================= PROJECTS / SPRINT / FLOW ================= */
  S.projects = [
    {
      id: uid(), name: 'Respect Project', why: 'قلبم را می‌کشد، می‌خواهم بگویم.',
      artifact: 'پیش‌نویس کامل کتاب', deadline: d(30).slice(0, 10),
      plannedHours: 20, consumedHours: 0, released: false,
      blocks: [{ id: uid(), date: d(3).slice(0, 10), minutes: 90 }, { id: uid(), date: d(6).slice(0, 10), minutes: 60 }],
    },
    {
      id: uid(), name: 'Android Box', why: 'ساختن چیز جدید',
      artifact: 'نمونه اولیه کارا', deadline: d(60).slice(0, 10),
      plannedHours: 12, consumedHours: 0, released: false,
      blocks: [{ id: uid(), date: d(2).slice(0, 10), minutes: 120 }],
    },
  ];
  S.sprint = { name: 'اسپرینت هفته اول', goal: 'پایه‌های مدرسه', start: d(0).slice(0, 10), length: 14 };

  /* weekly shift timetable (user-provided) */
  S.timetable = { shift: 'morning', data: DEFAULT_TIMETABLE };
  S.flows = [{
    id: uid(), name: 'روتین صبح', steps: [
      { id: uid(), title: 'آب + آماده شدن', estimate: 10, dopamine: 'soso', pressure: 'self' },
      { id: uid(), title: 'صبحانه با پروتئین', estimate: 15, dopamine: 'soso', pressure: 'self' },
      { id: uid(), title: '۵ دقیقه خیره شدن به دیوار', estimate: 5, dopamine: 'soso', pressure: 'self' },
      { id: uid(), title: 'مرور برنامه امروز', estimate: 5, dopamine: 'soso', pressure: 'self' },
    ],
  }];

  /* habits (§5.10) — flexible, no shaming */
  S.habits = [
    { id: uid(), name: 'آب کافی', checkins: [] },
    { id: uid(), name: 'ورزش کوتاه', checkins: [] },
    { id: uid(), name: '۱۰ دقیقه مطالعه', checkins: [] },
    { id: uid(), name: 'خواب منظم', checkins: [] },
  ];

  /* countdowns (§5.11) */
  S.countdowns = [
    { id: uid(), name: 'قسط مسکن', date: iso(new Date(today.getTime() + 11 * DAY)), notify: true },
    { id: uid(), name: 'پایان اسپرینت', date: iso(new Date(today.getTime() + 14 * DAY)), notify: false },
  ];

  return true;
}
