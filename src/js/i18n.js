/* ============================================================
   TicTic ADHD — i18n
   Two languages: fa (default, RTL) and en (LTR). Live switch,
   no reload. Persian digits via N(). Jalali or Gregorian calendar.
   ============================================================ */

export let LANG = 'fa';

/* Persian digit conversion */
const FA_DIGITS = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
export function N(input) {
  if (input === null || input === undefined) return '';
  const s = String(input);
  if (LANG !== 'fa') return s;
  return s.replace(/\d/g, d => FA_DIGITS[+d]);
}

/* exported so tooling can prove both languages stay in step */
export const STRINGS = {
  fa: {
    app_name: 'تیک‌تیک',
    nav_today: 'امروز', nav_plan: 'برنامه', nav_projects: 'پروژه‌ها',
    nav_flows: 'روتین‌ها', nav_report: 'گزارش',
    /* drawers / smart lists */
    horizons: 'افق‌ها', today: 'امروز', tomorrow: 'فردا', this_week: 'این هفته',
    next_7_days: '۷ روز آینده', inbox: 'اینباکس', all: 'همه',
    completed: 'انجام‌شده', wont_do: 'انجام نمی‌دم',
    now_list: 'الان', key_tasks: 'کارهای کلیدی',
    overdue: 'عقب‌افتاده', dropped: 'رهاشده', done_today: 'امروز غرق شدیم',
    noise_harbor: 'بندر نویز', parked_items: 'موارد پارک‌شده',
    sections: 'بخش‌ها', tags: 'تگ‌ها', lists: 'لیست‌ها',
    /* task */
    add_task: 'افزودن کار', quick_add_ph: 'یک فکر… Enter = ذخیره',
    task: 'کار', subtasks: 'زیرکارها', check_items: 'چک‌آیتم‌ها',
    due: 'سررسید', planned_start: 'شروع برنامه‌ریزی‌شده', estimate: 'برآورد',
    actual: 'زمان واقعی', reminders: 'یادآورها', repeat: 'تکرار',
    priority: 'اهمیت', notes: 'یادداشت‌ها', first_step: 'قدم اول',
    /* priorities */
    pri_frog: '🐸 قورباغه', pri_frog_label: 'باید امروز انجام بدی',
    pri_high: '🔴 خیلی مهم', pri_med: '🟠 مهم', pri_low: '🔵 خوبه انجام بشه', pri_none: '⚪ معمولی',
    /* views */
    week: 'هفته', month: 'ماه', sprint: 'اسپرینت', agenda: 'دستور کار', matrix: 'ماتریس',
    eisenhower: 'ماتریس آیزنهاور',
    /* misc */
    start: 'شروع', start_timer: 'شروع با تایمر', start_no_timer: 'شروع بدون تایمر',
    edit: 'ویرایش', delete: 'حذف', save: 'ذخیره', cancel: 'انصراف', close: 'بستن',
    undo: 'واگرد', done: 'انجام شد', complete: 'تکمیل', move: 'جابه‌جایی',
    settings: 'تنظیمات', search: 'جستجو', filters: 'فیلترها',
    empty_today: 'امروز هیچ کاری نیست. یک فکر اضافه کن یا از افق‌ها بردار.',
    /* first run: one question instead of a full Today */
    onboard_title: 'فقط یک چیز: امروز چه کاری از همه مهم‌تره؟',
    onboard_ph: 'یک چیز را بنویس…',
    onboard_cta: 'با همین شروع کن',
    onboard_skip: 'فعلاً رد کن',
    /* energy */
    energy: 'انرژی', energy_normal: 'روز عادی', energy_low: 'انرژی کم',
    energy_high: 'انرژی بالا', energy_bad: 'روز خیلی بد',
    resume_cue: 'دستی داشتی روی {x} برگشتی؟', resume: 'برگردم', dismiss: 'بی‌خیال',
    level: 'سطح {n}', xp_to_next: '{n} تجربه تا سطح بعد',
    dump: 'ریختن فکر', breathe: 'تنفس',
    _min: ' دقیقه', no_time: 'بدون زمان‌بندی',
    done_count: 'انجام‌شده',
    /* phase 2 */
    eat_it: 'بخورش!', key_toggle: 'کار کلیدی', restore: 'برگرداندن',
    decide: 'تصمیم', finish: 'تمام', pause: 'مکث', drift: 'حواس‌پرتی',
    add_first_step: 'قدم اول را اضافه کن', add_first_step_prompt: 'یک قدم اول اضافه می‌کنی؟',
    ask_start_prompt: 'کی شروع می‌کنی؟', first_step_ph: 'کوچک‌ترین قدم…', first_step_plural: 'مراحل کوچک',
    skip: 'الان نه', voice: 'صدا', voice_unavailable: 'صدا در این مرورگر نیست',
    commitments: 'تعهدات', kind: 'نوع', kind_action: 'اقدام', kind_decision: 'تصمیم', kind_project: 'پروژه',
    dopamine_pressure: 'دوپامین / فشار', dop_love: 'عاشقشم', dop_soso: 'یعنییعنی', dop_dislike: 'خیلی دوست ندارم',
    pre_out: 'فشار بیرونی', pre_self: 'انتخاب خودم',
    repeat_daily: 'هر روز', repeat_weekly: 'هر هفته', repeat_monthly: 'هر ماه', repeat_yearly: 'هر سال',
    focus: 'تمرکز', no_timer_running: 'بدون تایمر — فقط ثبت زمان',
    cue_50: 'نصف زمان گذشت', cue_75: 'سه‌چهارم زمان گذشت', cue_5_left: '۵ دقیقه مونده',
    post_run_q: 'آیا همان‌طور که انتظار داشتی پیش رفت؟',
    post_run_title: 'بعد از تمرکز', cal_ok: 'آره، خوب بود', cal_drifted: 'نه، حواسم پرت شد', cal_logged: 'زمان ثبت شد: {m} دقیقه',
    removed_to: 'جابه‌جا شد به', completed_toast: 'انجام شد',
    drawer_btn: 'منو', harbor_empty: 'بندر خالی است — چیزی پارک نشده.', unpark: 'بازکردن', unpark_done: 'به امروز برگشت',
    r_frog: 'قورباغه است', r_key: 'کار کلیدی', r_overdue: 'عقب‌افتاده', r_due_today: 'سررسید امروز', r_due_tomorrow: 'سررسید فردا', r_delayed: 'تأخیر خورده',
    r_overdue_days: '{n} روز عقب', r_next_commitment: 'بعدی: {t}', now_badge: 'الان',
    /* plan + matrix + timetable */
    week_prev: 'هفته قبل', week_next: 'هفته بعد', prev_next: 'جابه‌جایی', more: 'بیشتر', move_later: 'یک روز بعد', moved_later: 'یک روز después شد', day_x_of_y: 'روز {x} از {y}', moved: 'جابه‌جا شد', urgent: 'فوری', calm: 'بی‌عجله', matrix_kbd_hint: 'با کلیک روی کار و کلید جهت‌دار ⇦ ⇨ بین ربع‌ها جابه‌جا کن.',
    q_iu: 'مهم و فوری', q_inu: 'مهم، غیرفوری', q_niu: 'غیرمهم و فوری', q_ninu: 'غیرمهم، غیرفوری',
    timetable: 'برنامه ثابت هفته', shift_morning: 'شیفت صبح', shift_evening: 'شیفت عصر', fixed_commitment: 'تعهد ثابت', no_commitments_today: 'امروز تعهد ثابتی نیست',
    /* projects */
    new_project: 'پروژه جدید', no_projects: 'پروژه‌ای نیست', no_flows: 'روتینی نیست', released_projects: 'رهاشده‌ها', release: 'رها کن', released_msg: 'رها شد — هر وقت خواستی برش گردان',
    proj_name: 'نام', proj_why: 'چی کشیده؟', proj_why_ph: 'چی جذبم می‌کند…', artifact: 'محصول', artifact_ph: 'وقتی تمام شود چه می‌ماند؟', artifact_req: 'محصول (لازم)', deadline: 'مهلت', days_left: 'روز مانده', progress: 'پیشرفت', hours: 'ساعت', hyperfocus: 'هایپرفوکوس', hyperfocus_blocks: 'بلوک‌های هایپرفوکوس', add_block: 'بلوک', block_date: 'تاریخ', duration: 'مدت', planned_hours: 'ساعت برنامه‌ریزی',
    /* flows */
    new_flow: 'روتین جدید', flow_name: 'نام روتین', steps: 'مرحله‌ها', steps_n: '{n} مرحله', add_step: 'مرحله', step_ph: 'متن مرحله', step: 'مرحله', up: 'بالا', down: 'پایین', flow_done: 'روتین تمام شد', flow_step_x: 'مرحله {n}: {t}',
    /* report */
    day: 'روز', completion: 'تکمیل', remaining: 'مانده', drift_note: 'ثبت شد — عادی است', resume_cue2: 'دستی روی {x} داشتی. برمی‌گردی؟', time_up: 'زمان تمام شد',
    habits: 'عادت‌ها', new_habit: 'عادت جدید', habit_name: 'نام عادت', checkin: 'ثبت امروز', checkins_total: 'بار ثبت‌شده', streak_n: '{n} پیاپی', show_streaks: 'نمایش زنجیره', no_habits: 'هنوز عادتی نیست', ideas: 'ایده‌ها',
    countdown: 'شمارش معکوس', new_countdown: 'شمارش جدید', countdown_name: 'نام رویداد', days: 'روز', passed: 'گذشت', notify_toggle: 'یادآوری', no_countdowns: 'هنوز رویدادی نیست',
    extra_modules: 'ماژول‌ها',
    /* settings */
    language: 'زبان', theme: 'پوسته', theme_system: 'هماهنگ با سیستم', theme_light: 'روشن', theme_dark: 'تیره', accent: 'رنگ اصلی',
    voice_cues: 'اعلان صوتی', foghorn: 'شیپور ظهر', sfx: 'افکت صدا', notifications: 'اجازه اطلاع‌رسانی', import_export: 'ورود/خروج TickTick', clear_all: 'پاک‌کردن همه داده‌ها', clear_confirm: 'مطمئنی؟ همه کارها، روتین‌ها و گزارش‌ها پاک می‌شود.',
    week_start: 'شروع هفته', sat_start: 'شنبه', mon_start: 'دوشنبه', calendar: 'تقویم', day_free: 'خالی',
    energy_behavior: 'رفتار انرژی', low_help: 'کارت‌های کمکی انرژی کم', high_nudge: 'نوک انرژی بالا', bad_def: 'تعریف فوری در روز بد', bad_out: 'فشار بیرونی', bad_red: 'اهمیت قرمز', bad_both: 'هر دو', bad_auto: 'افزودن خودکار کارهای کمکی', bad_count: 'تعداد کارهای کمکی',
    blocker: 'چی مانع شده؟', blocker_b1: 'حوصله ندارم', blocker_b2: 'انرژی اجرایی صفر', blocker_b3: 'خسته‌کننده است', blocker_b4: 'غرق شدم', blocker_b5: 'ترس اجتماعی', blocker_b6: 'بدنم خسته است',
    suggest_title: 'می‌شود این کارها را کرد', breathing: 'تنفس ۴-۴-۴-۴', breathe_in: 'دم', breathe_hold: 'نگه', breathe_out: 'بازدم', cycles: 'دوره',
    checkin_title: 'چک‌این ۳۰ ثانیه', checkin_time: 'وقت روز', checkin_ctx: 'جای شما', morning: 'صبح', afternoon: 'ظهر', evening: 'عصر', ctx_home: 'خانه', ctx_work: 'کار', ctx_social: 'مهمانی', ctx_other: 'دیگر',
    import_title: 'ورود از TickTick', import_pick: 'فایل CSV/JSON', import_paste: 'یا متن را بچسبان', import_preview: 'پیش‌نمایش', import_do: 'وارد کن', import_done: 'وارد شد: {n} کار', include_completed: 'با انجام‌شده‌ها',
    export_json: 'خروجی JSON', export_csv: 'خروجی CSV',
    export_title: 'خروجی گرفتن', export_json_api: 'JSON برای TickTick', backup_json: 'برکاپ کامل (برگرداندن همه‌چیز)',
    export_hint: 'خروجی CSV را در TickTick → تنظیمات → پشتیبان‌گیری و بازیابی وارد کن. برکاپ کامل برای برگرداندن همین اپ است.',
    csv_howto: 'CSV را TickTick می‌فهمد؛ برکاپ کامل همان چیزی است که با «ورود» برمی‌گردد.',
    import_hint: 'فایل CSV یا JSON را از TickTick بگیر (تنظیمات → پشتیبان‌گیری) یا همین‌جا متن را بچسبان — هر خط یک کار.',
    import_none: 'هنوز چیزی انتخاب نشده', import_error: 'نشد این را بخوانم — فرمت را چک کن',
    backup_found: 'برکاپ کامل پیدا شد: همه‌چیز برمی‌گردد', backup_restored: 'برگردانده شد',
    or_paste: 'یا بچسبان', parse_text: 'بخوان', or_drop: 'یا فایل را همین‌جا رها کن',
    search_ph: 'بگرد در کارها، تگ‌ها، یادداشت‌ها…', results: 'نتیجه‌ها', no_results: 'چیزی پیدا نشد',
    filter_save: 'ذخیره فیلتر', filter_today: 'فیلتر امروز', filter_name: 'اسم فیلتر؟',
    filter_saved: 'فیلتر ذخیره شد: {x}', filter_applied: 'فیلتر روشن شد: {x}', filter_clear: 'برداشتن فیلتر',
    palette: 'فرمان‌ها', palette_ph: 'یک فرمان بنویس یا بگرد…', commands: 'فرمان‌ها', shortcuts: 'میان‌برها',
    shortcut_palette: 'پالت فرمان‌ها', shortcut_search: 'جستجو', shortcut_new: 'کار جدید', shortcut_dump: 'ریختن فکر',
    settings_shift: 'شیفت این هفته',
    kbd_move_hint: 'Alt + چپ/راست = اهمیت، Alt + بالا/پایین = جابه‌جایی', day_empty: 'این روز خالی است',
    repeat_rolled: 'موعد بعدی تنظیم شد',
    log_time: 'ثبت زمان',
    /* symptom names + one unblocking tip each (report) */
    sym_mental_energy: 'انرژی ذهنی', advice_mental_energy: 'یک کار ۵ دقیقه‌ای، بعد استراحت کوتاه',
    sym_task_initiation: 'شروع کردن کار', advice_task_initiation: 'فقط قدم اول را انجام بده، نه کل کار',
    sym_working_memory: 'حافظه کاری', advice_working_memory: 'همین حالا بنویسش؛ سرت را نگه ندار',
    sym_planning: 'برنامه‌ریزی', advice_planning: 'فقط سه کار برای امروز انتخاب کن',
    sym_decision_paralysis: 'فلج تصمیم', advice_decision_paralysis: 'گزینه‌ها را بنویس و با یک معیار یکی را انتخاب کن',
    sym_perfectionism: 'کمال‌گرایی', advice_perfectionism: 'نسخه خام را تحویل بده؛ بعد بهترش کن',
    sym_routine_adherence: 'پایبندی به روتین', advice_routine_adherence: 'روتین را کوچک کن: فقط یک مرحله این هفته',
    sym_sustained_attention: 'تمرکز طولانی', advice_sustained_attention: 'تایمر ۱۵ دقیقه‌ای بگذار و بعد جایزه بده',
    sym_distractibility: 'حواس‌پرتی', advice_distractibility: 'نوتیفیکیشن‌ها را قطع کن و دو دقیقه بی‌وقفه کار کن',
    sym_task_re_engagement: 'برگشتن به کار', advice_task_re_engagement: 'جای دقیقی که رها کردی را بنویس و از همان برگرد',
    sym_time_blindness: 'کوری زمانی', advice_time_blindness: 'یک تایمر بگذار تا ببینی واقعاً چقدر طول می‌کشد',
    sym_inhibition: 'تکانش‌گری / بی‌قراری', advice_inhibition: 'بدن را ۲ دقیقه تکان بده، بعد برگرد',
    sym_reward_sensitivity: 'حساسیت به پاداش', advice_reward_sensitivity: 'بعد از هر قدم کوچک به خودت یک پاداش واقعی بده',
    sym_irritability: 'زودرنجی', advice_irritability: 'امروز توقع را کم کن؛ کار سبک انتخاب کن',
    decision_options: 'گزینه‌ها', decision_pros: 'به‌نفع', decision_cons: 'به‌ضرر', decide_by: 'مهلت تصمیم', decide_now: 'تصمیم گرفتم — تمام', decision_made: 'تصمیم ثبت شد',
    s_hold: 'نگه‌داشتن تمرکز', s_start: 'شروع کردن',
    micro_1: 'یک لیوان آب', micro_2: '۲ دقیقه کشش', micro_3: 'سه نفس عمیق', micro_4: 'چند خط کتاب', micro_added: 'اضافه شد: {x}',
    energy_low_note: 'انرژی کم است — فقط یک قدم کوچک:', energy_high_note: 'انرژی بالاست — وقت قورباغه:', energy_bad_note: 'روز بد — این کارهای ریز امروز اضافه شدند و انجام‌شده حساب می‌شوند.',
    dump_ph: 'هرچی توی سرته…', dump_hint: 'همین الان خالی کن؛ بعداً مرتب می‌کنیم. Ctrl+Enter = ذخیره',
    dump_save: 'بریز توی بندر', dump_saved: 'پارک شد', dump_parked: 'پارک‌شده‌ها', dump_empty: 'فعلاً چیزی پارک نشده',
    dump_to_task: 'تبدیل به کار', dump_moved: 'شد کار — در اینباکس',
    breathe_done: 'تنفس تمام شد — +۲ تجربه', blocker_hint: 'یک گزینه را بزن تا فقط یک قدم کوچک بگیری',
    im_starting: 'شروع می‌کنم (+۱)', blocker_logged: 'ثبت شد — برو یک قدم کوچک',
    energy_hint: 'امروز چه حالی داری؟ پیشنهادها بر همین اساس عوض می‌شوند.',
    s_fog: 'مه مغزی', s_restless: 'بی‌قراری', s_tired: 'خستگی', s_mood: 'حال و حوصله', checkin_saved: 'چک‌این ثبت شد',
now_label: 'الان', decisions_resolved: 'تصمیم‌های گرفته‌شده', deciding_is_work: 'تصمیم گرفتن هم کار اجرایی است — همین که تصمیم گرفتی، برنده‌ای', symptoms: 'میانگین علائم', no_checkins: 'هنوز چک‌این ثبت نشده', worst_symptom: 'سخت‌ترین: {s}', tradeoffs: 'دوپامین و فشار', pressure_open: 'فشار بیرونی/خودی', calibration: 'کالیبراسیون', no_cal_data: 'وقتی هم برآورد و هم زمان واقعی داشته باشی، اینجا یادت می‌ماند چقدر دقیق تخمین می‌زنی', cal_hint: 'وقتی ۲۰ دقیقه حدس می‌زنی، معمولاً {n} دقیقه طول می‌کشد', rhythm: 'ریتم', rhythm_under: 'زیر نیمه انجام شد — عادی است؛ امروز از فردا بهتر است', rhythm_good: 'ریتم خوبی داشتی',
    /* appearance · reset · pwa · states (added with the visual pass) */
    appearance: 'ظاهر', accent_auto: 'پیش‌فرض پوسته', contrast_more: 'کنتراست بیشتر',
    theme_note: 'همه پوسته‌ها رنگ‌ها را از توکن‌ها می‌گیرند؛ هیچ‌جای اپ رنگ ثابت ندارد.',
    danger_zone: 'ناحیه خطر', reset_hint: 'همه کارها، روتین‌ها، عادت‌ها و گزارش‌ها از همین دستگاه پاک می‌شود و برگشتی ندارد. اول یک نسخه پشتیبان بگیر.',
    export_first: 'اول پشتیبان بگیر', type_to_confirm: 'برای تأیید بنویس: RESET',
    reset_now: 'پاک کن و از صفر شروع کن', reset_done: 'پاک شد — از یک صفحه سفید شروع می‌کنی',
    reset_appearance: 'ظاهر را به پیش‌فرض برگردان', reset_appearance_done: 'ظاهر به پیش‌فرض برگشت',
    demo_load: 'بارگذاری داده نمونه', demo_note: 'اگر می‌خواهی اپ را با یک لیست نمونه ببینی', demo_loaded: 'داده نمونه بارگذاری شد',
    /* sync */
    sync_title: 'همگام‌سازی دستگاه‌ها',
    sync_intro: 'با یک بار تنظیم روی هر دستگاه، کارهایت بین کامپیوتر و موبایل جابه‌جا می‌شود. هر دستگاه یک کپی کامل نگه می‌دارد و با هر بار همگام‌سازی، تغییرات از آخرین ویرایش با هم ترکیب می‌شود (چیزی که جدیدتر ویرایش شده برنده است).',
    sync_url: 'آدرس سرور همگام‌سازی', sync_url_ph: 'آدرس سرور را اینجا بچسبان',
    sync_pass: 'گذرواژه (اتاق همگام‌سازی)', sync_pass_ph: 'یک عبارت یادماندنی بنویس',
    sync_now: 'همگام‌سازی کن', sync_working: 'در حال همگام‌سازی…',
    sync_done: 'همگام شد — {a} تازه، {u} به‌روز، {d} حذف',
    sync_auto: 'همگام‌سازی خودکار',
    sync_last: 'آخرین همگام‌سازی: {t}', sync_never: 'هنوز همگام‌سازی نشده',
    sync_not_configured: 'اول آدرس سرور و گذرواژه را تنظیم کن',
    sync_offline: 'سرور در دسترس نیست — بعداً دوباره امتحان کن',
    sync_bad_key: 'گذرواژه این اتاق درست نیست',
    sync_insecure: 'همگام‌سازی فقط روی https یا localhost کار می‌کند',
    sync_fail: 'همگام‌سازی انجام نشد',
    sync_forget: 'حذف نسخه ذخیره‌شده روی سرور', sync_forget_done: 'نسخه سرور حذف شد',
    pwa_offline: 'آفلاین کار می‌کنی — همه‌چیز از حافظه همین دستگاه می‌آید',
    pwa_update: 'نسخه تازه آماده است', pwa_reload: 'بارگذاری',
    error_title: 'یک جای کار لنگید', error_body: 'داده‌هایت سالم است. صفحه را دوباره باز کن؛ اگر باز هم شد همین پیام را بفرست.',
    error_reload: 'بازخوانی', loading: 'در حال بارگذاری…',
    empty_list_title: 'هنوز چیزی اینجا نیست', empty_hint_add: 'با دکمه + یا کلید n یک کار اضافه کن',
    import_preview_title: 'قبل از ورود، یک نگاه', import_counts: '{tasks} کار · {lists} لیست',
    import_skipped: '{n} مورد رد می‌شود', import_skip_empty: 'بدون عنوان', import_skip_done: 'انجام‌شده (خاموش است)',
    import_dupes: '{n} کار تکراری پیدا شد', import_dupe_mode: 'تکراری‌ها', import_dupe_skip: 'رد کن',
    import_dupe_add: 'هر دو را نگه دار', import_more_lists: 'لیست‌های تازه: {names}', import_confirm: 'وارد کن',
    import_skip_dupe_n: '{n} تکراری رد شد',

  },
  en: {
    app_name: 'TicTic',
    nav_today: 'Today', nav_plan: 'Plan', nav_projects: 'Projects',
    nav_flows: 'Flows', nav_report: 'Report',
    horizons: 'Horizons', today: 'Today', tomorrow: 'Tomorrow', this_week: 'This week',
    next_7_days: 'Next 7 days', inbox: 'Inbox', all: 'All',
    completed: 'Completed', wont_do: "Won't Do",
    now_list: 'Now', key_tasks: 'Key tasks',
    overdue: 'Overdue', dropped: 'Dropped', done_today: 'Done today',
    noise_harbor: 'Noise Harbor', parked_items: 'parked',
    sections: 'Sections', tags: 'Tags', lists: 'Lists',
    add_task: 'Add task', quick_add_ph: 'One thought… Enter = save',
    task: 'Task', subtasks: 'Subtasks', check_items: 'Check items',
    due: 'Due', planned_start: 'Planned start', estimate: 'Estimate',
    actual: 'Actual', reminders: 'Reminders', repeat: 'Repeat',
    priority: 'Priority', notes: 'Notes', first_step: 'First step',
    pri_frog: '🐸 Frog', pri_frog_label: 'must do today',
    pri_high: '🔴 High', pri_med: '🟠 Medium', pri_low: '🔵 Low', pri_none: '⚪ None',
    week: 'Week', month: 'Month', sprint: 'Sprint', agenda: 'Agenda', matrix: 'Matrix',
    eisenhower: 'Eisenhower Matrix',
    start: 'Start', start_timer: 'Start with timer', start_no_timer: 'Start without timer',
    edit: 'Edit', delete: 'Delete', save: 'Save', cancel: 'Cancel', close: 'Close',
    undo: 'Undo', done: 'Done', complete: 'Complete', move: 'Move',
    settings: 'Settings', search: 'Search', filters: 'Filters',
    empty_today: 'Nothing here. Add a thought or pick from Horizons.',
    onboard_title: "One thing: what matters most today?",
    onboard_ph: 'Type one thing…',
    onboard_cta: 'Start with this',
    onboard_skip: 'Skip for now',
    energy: 'Energy', energy_normal: 'Normal', energy_low: 'Low energy',
    energy_high: 'High energy', energy_bad: 'Very bad day',
    resume_cue: 'You were working on {x} — pick it up?', resume: 'Resume', dismiss: 'Dismiss',
    level: 'Level {n}', xp_to_next: '{n} XP to next level',
    dump: 'Brain dump', breathe: 'Breathe',    _min: ' min', no_time: 'No estimate',
    done_count: 'done',
    /* phase 2 */
    eat_it: 'Eat it!', key_toggle: 'Key task', restore: 'Restore',
    decide: 'Decide', finish: 'Finish', pause: 'Pause', drift: 'Drift',
    add_first_step: 'Add first step', add_first_step_prompt: 'Add a first step?',
    ask_start_prompt: 'When will you start?', first_step_ph: 'Smallest step…', first_step_plural: 'Mini steps',
    skip: 'Not now', voice: 'Voice', voice_unavailable: 'Voice not in this browser',
    commitments: 'Commitments', kind: 'Kind', kind_action: 'Action', kind_decision: 'Decision', kind_project: 'Project',
    dopamine_pressure: 'Dopamine / Pressure', dop_love: 'Love it', dop_soso: 'So-so', dop_dislike: 'Dislike',
    pre_out: 'Outside pressure', pre_self: 'My own choice',
    repeat_daily: 'Daily', repeat_weekly: 'Weekly', repeat_monthly: 'Monthly', repeat_yearly: 'Yearly',
    focus: 'Focus', no_timer_running: 'No timer — just tracking time',
    cue_50: 'Halfway there', cue_75: 'Three quarters done', cue_5_left: '5 minutes left',
    post_run_q: 'Did that go as expected?',
    post_run_title: 'Post-run', cal_ok: 'Yes, on track', cal_drifted: 'No, it drifted', cal_logged: 'Logged: {m} min',
    removed_to: 'Moved to', completed_toast: 'Completed',
    drawer_btn: 'Menu', harbor_empty: 'Harbor is empty — nothing parked.', unpark: 'Un-park', unpark_done: 'Restored to today',
    r_frog: 'your frog', r_key: 'key task', r_overdue: 'overdue', r_due_today: 'due today', r_due_tomorrow: 'due tomorrow', r_delayed: 'delayed',
    r_overdue_days: 'overdue {n} days', r_next_commitment: 'up next: {t}', now_badge: 'now',
    /* plan + matrix + timetable */
    week_prev: 'Previous week', week_next: 'Next week', prev_next: 'Navigate', more: 'more', move_later: 'Move one day later', moved_later: 'Moved a day later', day_x_of_y: 'Day {x} of {y}', moved: 'Moved', urgent: 'urgent', calm: 'calm', matrix_kbd_hint: 'Focus a task and use arrow keys ⇦ ⇨ to move between quadrants.',
    q_iu: 'Important & Urgent', q_inu: 'Important, Not Urgent', q_niu: 'Not Important & Urgent', q_ninu: 'Not Important, Not Urgent',
    timetable: 'Weekly commitments', shift_morning: 'Morning shift', shift_evening: 'Evening shift', fixed_commitment: 'fixed', no_commitments_today: 'No fixed commitments today',
    /* projects */
    new_project: 'New project', no_projects: 'No projects yet', no_flows: 'No flows yet', released_projects: 'Released', release: 'Release', released_msg: 'Released — restore anytime',
    proj_name: 'Name', proj_why: 'Why it pulls you', proj_why_ph: 'What makes this exciting…', artifact: 'Artifact', artifact_ph: 'What remains when done?', artifact_req: 'Artifact (required)', deadline: 'Deadline', days_left: 'days left', progress: 'Progress', hours: 'hrs', hyperfocus: 'Hyperfocus', hyperfocus_blocks: 'Hyperfocus blocks', add_block: 'Add block', block_date: 'Date', duration: 'Duration', planned_hours: 'Planned hours',
    /* flows */
    new_flow: 'New flow', flow_name: 'Flow name', steps: 'Steps', steps_n: '{n} steps', add_step: 'Add step', step_ph: 'Step text…', step: 'Step', up: 'Up', down: 'Down', flow_done: 'Flow complete', flow_step_x: 'Step {n}: {t}',
    /* report */
    day: 'Day', completion: 'Completion', remaining: 'left', drift_note: 'Logged — happens to everyone', resume_cue2: 'You were working on {x} — resume?', time_up: 'Time is up',
    habits: 'Habits', new_habit: 'New habit', habit_name: 'Habit name', checkin: 'Check in', checkins_total: 'check-ins', streak_n: '{n} in a row', show_streaks: 'Show streaks', no_habits: 'No habits yet', ideas: 'Ideas',
    countdown: 'Countdown', new_countdown: 'New countdown', countdown_name: 'Event name', days: 'days', passed: 'passed', notify_toggle: 'Notify', no_countdowns: 'Nothing yet',
    extra_modules: 'Modules',
    /* settings */
    language: 'Language', theme: 'Theme', theme_system: 'System', theme_light: 'Light', theme_dark: 'Dark', accent: 'Accent',
    voice_cues: 'Voice cues', foghorn: 'Noon foghorn', sfx: 'Sound effects', notifications: 'Notification permission', import_export: 'TickTick import/export', clear_all: 'Clear all data', clear_confirm: 'Sure? All tasks, flows and reports are wiped.',
    week_start: 'Week starts', sat_start: 'Saturday', mon_start: 'Monday', calendar: 'Calendar', day_free: 'free',
    energy_behavior: 'Energy behavior', low_help: 'Low-energy help cards', high_nudge: 'High-energy nudge', bad_def: 'Urgent definition on bad day', bad_out: 'outside pressure', bad_red: 'red priority', bad_both: 'both', bad_auto: 'Auto-add helpful tasks', bad_count: 'Number of helpers',
    blocker: 'What is blocking you?', blocker_b1: 'Not in the mood', blocker_b2: 'No executive energy', blocker_b3: 'Bored', blocker_b4: 'Overwhelmed', blocker_b5: 'Social fear', blocker_b6: 'Physically tired',
    suggest_title: 'Try one of these', breathing: '4-4-4-4 Box breathing', breathe_in: 'In', breathe_hold: 'Hold', breathe_out: 'Out', cycles: 'cycles',
    checkin_title: '30-second check-in', checkin_time: 'Time of day', checkin_ctx: 'Context', morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', ctx_home: 'Home', ctx_work: 'Work', ctx_social: 'Social', ctx_other: 'Other',
    import_title: 'Import from TickTick', import_pick: 'CSV/JSON file', import_paste: '...or paste text', import_preview: 'Preview', import_do: 'Import', import_done: 'Imported: {n} tasks', include_completed: 'Include completed',
    export_json: 'Export JSON', export_csv: 'Export CSV',
    export_title: 'Export', export_json_api: 'JSON for TickTick', backup_json: 'Full backup (restore everything)',
    export_hint: 'Load the CSV into TickTick → Settings → Backup & Restore. The full backup restores this app exactly.',
    csv_howto: 'TickTick understands the CSV; the full backup is what re-imports everything here.',
    import_hint: 'Grab a CSV/JSON from TickTick (Settings → Backup) — or just paste text here, one task per line.',
    import_none: 'Nothing selected yet', import_error: 'Could not read that — check the format',
    backup_found: 'Full backup found: everything will be restored', backup_restored: 'Restored',
    or_paste: 'or paste', parse_text: 'Read', or_drop: 'or drop a file here',
    search_ph: 'Search tasks, tags, notes…', results: 'Results', no_results: 'Nothing found',
    filter_save: 'Save filter', filter_today: 'Filter today', filter_name: 'Filter name?',
    filter_saved: 'Filter saved: {x}', filter_applied: 'Filter on: {x}', filter_clear: 'Clear filter',
    palette: 'Commands', palette_ph: 'Type a command or search…', commands: 'Commands', shortcuts: 'Keyboard shortcuts',
    shortcut_palette: 'Command palette', shortcut_search: 'Search', shortcut_new: 'New task', shortcut_dump: 'Brain dump',
    settings_shift: 'This week shift',
    kbd_move_hint: 'Alt + left/right = priority, Alt + up/down = move', day_empty: 'Nothing on this day',
    repeat_rolled: 'next date set',
    log_time: 'log time',
    sym_mental_energy: 'Mental energy', advice_mental_energy: 'One 5-minute task, then a short break',
    sym_task_initiation: 'Getting started', advice_task_initiation: 'Do the first step only, not the whole task',
    sym_working_memory: 'Working memory', advice_working_memory: 'Write it down now — do not hold it in your head',
    sym_planning: 'Planning', advice_planning: 'Pick three tasks for today, not ten',
    sym_decision_paralysis: 'Decision paralysis', advice_decision_paralysis: 'List the options, then pick one with a single criterion',
    sym_perfectionism: 'Perfectionism', advice_perfectionism: 'Ship the rough version, improve it after',
    sym_routine_adherence: 'Keeping routines', advice_routine_adherence: 'Shrink the routine to one step this week',
    sym_sustained_attention: 'Sustained attention', advice_sustained_attention: 'Set a 15-minute timer, then a real reward',
    sym_distractibility: 'Distractibility', advice_distractibility: 'Silence notifications and work for two quiet minutes',
    sym_task_re_engagement: 'Re-engaging', advice_task_re_engagement: 'Note exactly where you stopped and resume there',
    sym_time_blindness: 'Time blindness', advice_time_blindness: 'Start a timer so you can see how long it really takes',
    sym_inhibition: 'Restlessness', advice_inhibition: 'Move your body for two minutes, then come back',
    sym_reward_sensitivity: 'Reward sensitivity', advice_reward_sensitivity: 'Give yourself a real reward after each small step',
    sym_irritability: 'Irritability', advice_irritability: 'Lower the bar today; choose light work',
    decision_options: 'Options', decision_pros: 'Pros', decision_cons: 'Cons', decide_by: 'Decide by', decide_now: 'I decided — done', decision_made: 'Decision logged',
    s_hold: 'Holding focus', s_start: 'Getting started',
    micro_1: 'A glass of water', micro_2: '2-minute stretch', micro_3: 'Three deep breaths', micro_4: 'A few lines of a book', micro_added: 'Added: {x}',
    energy_low_note: 'Low energy — one tiny step only:', energy_high_note: 'Energy is high — frog time:', energy_bad_note: 'Bad day — these small ones were added and count as done.',
    dump_ph: 'Whatever is in your head…', dump_hint: 'Empty it now, sort it later. Ctrl+Enter = save',
    dump_save: 'Park it', dump_saved: 'Parked', dump_parked: 'Parked', dump_empty: 'Nothing parked yet',
    dump_to_task: 'Make it a task', dump_moved: 'Made a task — it is in Inbox',
    breathe_done: 'Breathing done — +2 XP', blocker_hint: 'Pick one and take a single small step',
    im_starting: 'I am starting (+1)', blocker_logged: 'Logged — go take one small step',
    energy_hint: 'How do you feel today? Suggestions adapt to this.',
    s_fog: 'Brain fog', s_restless: 'Restless', s_tired: 'Tired', s_mood: 'Mood', checkin_saved: 'Check-in saved',
now_label: 'Now', decisions_resolved: 'Decisions resolved', deciding_is_work: 'Deciding is executive work too — resolving it counts', symptoms: 'Symptom averages', no_checkins: 'No check-ins yet', worst_symptom: 'Hardest right now: {s}', tradeoffs: 'Dopamine & pressure', pressure_open: 'Outside/self pressure', calibration: 'Calibration', no_cal_data: 'Once tasks have both an estimate and real time, this shows how accurate you are', cal_hint: 'When you guess 20 min, it usually takes {n} min', rhythm: 'Rhythm', rhythm_under: 'Under half done — that happens; tomorrow is a fresh page', rhythm_good: 'Good rhythm today',
    /* appearance · reset · pwa · states (added with the visual pass) */
    appearance: 'Appearance', accent_auto: 'Theme default', contrast_more: 'Higher contrast',
    theme_note: 'Every theme is built from tokens — no colour is hard-coded anywhere.',
    danger_zone: 'Danger zone', reset_hint: 'Deletes every task, routine, habit and report from this device. There is no undo. Export a backup first.',
    export_first: 'Export a backup first', type_to_confirm: 'Type RESET to confirm',
    reset_now: 'Delete everything and start fresh', reset_done: 'Cleared — you start from a blank page',
    reset_appearance: 'Reset appearance to defaults', reset_appearance_done: 'Appearance back to defaults',
    demo_load: 'Load sample data', demo_note: 'If you want to see the app with a sample list', demo_loaded: 'Sample data loaded',
    /* sync */
    sync_title: 'Device sync',
    sync_intro: 'Set up once on each device and your tasks move between desktop and phone. Each device keeps a full copy and merges on every sync (newest edit wins).',
    sync_url: 'Sync server URL', sync_url_ph: 'Paste your server address',
    sync_pass: 'Passphrase (sync room)', sync_pass_ph: 'Pick something memorable',
    sync_now: 'Sync now', sync_working: 'Syncing…',
    sync_done: 'Synced — {a} new, {u} updated, {d} deleted',
    sync_auto: 'Auto-sync',
    sync_last: 'Last sync: {t}', sync_never: 'Not synced yet',
    sync_not_configured: 'Set the server URL and passphrase first',
    sync_offline: 'Server unreachable — try again later',
    sync_bad_key: 'That passphrase does not match this room',
    sync_insecure: 'Sync only works on https or localhost',
    sync_fail: 'Sync failed',
    sync_forget: 'Delete the copy stored on the server', sync_forget_done: 'Server copy deleted',
    pwa_offline: 'You are offline — everything comes from this device',
    pwa_update: 'A new version is ready', pwa_reload: 'Reload',
    error_title: 'Something broke', error_body: 'Your data is safe. Reload the page; if it happens again, send this message on.',
    error_reload: 'Reload', loading: 'Loading…',
    empty_list_title: 'Nothing here yet', empty_hint_add: 'Add a task with the + button or the n key',
    import_preview_title: 'A look before importing', import_counts: '{tasks} tasks · {lists} lists',
    import_skipped: '{n} will be skipped', import_skip_empty: 'no title', import_skip_done: 'completed (switch is off)',
    import_dupes: '{n} look like duplicates', import_dupe_mode: 'Duplicates', import_dupe_skip: 'Skip them',
    import_dupe_add: 'Keep both', import_more_lists: 'New lists: {names}', import_confirm: 'Import',
    import_skip_dupe_n: '{n} duplicates skipped',

  }
};

export function tr(key, vars) {
  const d = STRINGS[LANG] || STRINGS.fa;
  let s = d[key] ?? STRINGS.fa[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}
/* Short alias */
export const t = tr;

export function setLang(lang) {
  LANG = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  /* font emphasis differs per script */
  document.documentElement.style.setProperty(
    '--font-app',
    lang === 'fa' ? "'Vazirmatn', 'Inter', Tahoma, system-ui, sans-serif"
                  : "'Inter', system-ui, sans-serif"
  );
}

/* ------------------------------------------------------------
   Dates: Gregorian <-> Jalali conversion + Persian labels
   ------------------------------------------------------------ */
export function calMode() {
  return window.__ticticCalendar || 'gregorian';
}
export function setCalMode(m) { window.__ticticCalendar = m; }

function div(a, b) { return ~~(a / b); }
function mod(a, b) { return a - ~~(a / b) * b; }

/* ---------------------------------------------------------------
   Jalali (Solar Hijri) conversion.
   Arithmetic day-number algorithm — the same one the jalaali-js
   library implements (MIT). Arithmetic, not a lookup table: no
   dependency, no network, and every year is derivable. Verified
   against the ICU calendar shipped with Node/V8 by tools/calendar.mjs
   (toJalali, fromJalali and month lengths over 1900–2200 CE).
   --------------------------------------------------------------- */

/* leap breaks for the Persian astronomical calendar */
const JAL_BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

/** metadata for a jalali year: {leap, gy, march} — march = Gregorian day of Farvardin 1 */
function jalCal(jy) {
  const bl = JAL_BREAKS.length;
  const gy = jy + 621;
  if (jy < JAL_BREAKS[0] || jy >= JAL_BREAKS[bl - 1]) return null;   /* outside the modelled range */
  let leapJ = -14, jp = JAL_BREAKS[0], jump, leap, n, i;
  let jm = 0;
  for (i = 1; i < bl; i += 1) {
    jm = JAL_BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy, gm, gd) {                    /* Gregorian date → Julian day number */
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
        + div(153 * mod(gm + 9, 12) + 2, 5)
        + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}
function d2g(jdn) {                          /* Julian day number → Gregorian date */
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}
function j2d(jy, jm, jd) {                   /* jalali date → Julian day number */
  const r = jalCal(jy);
  if (!r) return null;
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}
function d2j(jdn) {                          /* Julian day number → jalali date */
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  if (!r) return null;
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm, jd;
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1, leap: r.leap };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd, leap: r.leap };
}

export function toJalali(date) {
  const r = d2j(g2d(date.getFullYear(), date.getMonth() + 1, date.getDate()));
  if (!r) return { jy: date.getFullYear(), jm: date.getMonth() + 1, jd: date.getDate() };
  return { jy: r.jy, jm: r.jm, jd: r.jd };   /* public shape: year, month, day */
}
export function fromJalali(jy, jm, jd) {
  const jdn = j2d(jy, jm, jd);
  if (jdn == null) return null;
  const { gy, gm, gd } = d2g(jdn);
  return new Date(gy, gm - 1, gd);
}
/** days in a jalali month — Esfand has 30 in a leap year.
    jalCal's `leap` cycles 0…4; 0 marks a leap year (the convention the
    reference jalaali-js library uses and our ICU cross-check confirms). */
export function jalaliMonthLen(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  const r = jalCal(jy);
  return r ? 29 + (r.leap === 0 ? 1 : 0) : 29;
}

const FA_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const FA_GREG_MONTHS = ['ژانویه','فوریه','مارس','آپریل','مه','ژوئن','ژوئیه','اوت','سپتامبر','اکتبر','نوامبر','دسامبر'];
const EN_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const FA_DAYS = ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه']; // getDay(): 0=Sun
const EN_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export function dayName(d) { return (LANG === 'fa' ? FA_DAYS : EN_DAYS)[d.getDay()]; }

export function fmtDate(date, { withYear = false } = {}) {
  const label = fmtDateParts(date, withYear);
  return N(label);
}
function fmtDateParts(date, withYear) {
  if (calMode() === 'jalali') {
    const { jy, jm, jd } = toJalali(date);
    return `${jd} ${FA_MONTHS[jm-1]}${withYear ? ' ' + jy : ''}`;
  }
  const d = date;
  return LANG === 'fa'
    ? `${d.getDate()} ${FA_GREG_MONTHS[d.getMonth()]}${withYear ? ' ' + d.getFullYear() : ''}`
    : `${EN_MONTHS[d.getMonth()]} ${d.getDate()}${withYear ? ', ' + d.getFullYear() : ''}`;
}

/* ISO yyy-mm-dd in local time */
export function iso(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}
export function isoTime(d) {
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}
export function parseISO(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/* A due date is stored in one of two shapes:
     'YYYY-MM-DD'        a calendar day (no time of day)
     an ISO instant      a real moment, e.g. '2026-10-13T04:30:00.000Z'
   Reading `.slice(0, 10)` off an instant yields the *UTC* day, which is not
   the user's calendar day for part of every day (and never is at UTC+03:30
   between 00:00 and 03:30). dayKey() always returns the *local* day, so both
   shapes compare and aggregate safely. */
export function dayKey(v) {
  if (!v) return null;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : iso(d);
}

/* shift a due date by whole days, keeping its stored shape */
export function shiftDay(v, days) {
  const key = dayKey(v);
  if (!key) return v;
  if (String(v).length <= 10) {           /* calendar day stays a calendar day */
    const d = parseISO(key);
    d.setDate(d.getDate() + days);
    return iso(d);
  }
  const inst = new Date(v);               /* timed value keeps its wall-clock time */
  inst.setDate(inst.getDate() + days);
  return inst.toISOString();
}

/* true when a stored due date carries a real time of day (midnight = all-day) */
export function hasTimeOfDay(v) {
  if (!v || String(v).length <= 10) return false;
  const d = new Date(v);
  if (isNaN(d.getTime())) return false;
  return !(d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0);
}
