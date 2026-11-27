/**
 * ratibi-dashboard-test.mjs — batch 1 pure-logic tests
 * Run: node scripts/ratibi-dashboard-test.mjs
 */
import assert from 'assert/strict';
import { daysUntil, currentMonth } from '../src/utils/format.js';
import { goalContribFor, calcGoalsMonthlyTotal, calcCommitmentsTotal, isCommitmentDue, bankAllocation } from '../src/utils/calc.js';
import { getNextAction } from '../src/utils/nextAction.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓  ${name}`); passed++; }
  catch (err) { console.error(`  ✕  ${name}\n     ${err.message}`); failed++; }
}

const at = s => new Date(`${s}T14:00:00`);

console.log('\nراتبي — اختبارات الدفعة الأولى\n');

// ── daysUntil: the bug that hid today's commitments ──────────────────────────
console.log('daysUntil');
test('التزام مستحق اليوم يرجّع صفراً', () => {
  assert.equal(daysUntil(30, at('2026-08-30')), 0);
});
test('الغد يرجّع واحداً', () => {
  assert.equal(daysUntil(31, at('2026-08-30')), 1);
});
test('يوم 31 في شهر من 30 يوماً يُقصّ لآخر يوم', () => {
  // 30 September is the last day, so a "31st" commitment is due today.
  assert.equal(daysUntil(31, at('2026-09-30')), 0);
  assert.equal(daysUntil(31, at('2026-09-29')), 1);
});
test('يوم 31 في فبراير يُقصّ إلى 28', () => {
  assert.equal(daysUntil(31, at('2026-02-28')), 0);
  assert.equal(daysUntil(31, at('2026-02-27')), 1);
});
test('التدوير عبر نهاية السنة', () => {
  assert.equal(daysUntil(5, at('2026-12-31')), 5);
});
test('يوم مضى يدوّر للشهر القادم', () => {
  assert.equal(daysUntil(1, at('2026-08-30')), 2);
});

// ── goalContribFor: month-scoped edits stay month-scoped ─────────────────────
console.log('\ngoalContribFor');
const goal = { id: 'g1', monthlyContribution: 1000, completed: false };
test('بلا سجل شهري يستخدم مساهمة الهدف', () => {
  assert.equal(goalContribFor(goal, null), 1000);
});
test('سجل الشهر يتقدّم على مساهمة الهدف', () => {
  assert.equal(goalContribFor(goal, { goalContribs: { g1: 250 } }), 250);
});
test('صفر في السجل قيمة صالحة لا تسقط للافتراضي', () => {
  assert.equal(goalContribFor(goal, { goalContribs: { g1: 0 } }), 0);
});
test('قيمة غير رقمية في السجل تسقط للافتراضي', () => {
  assert.equal(goalContribFor(goal, { goalContribs: { g1: null } }), 1000);
  assert.equal(goalContribFor(goal, { goalContribs: { g1: 'abc' } }), 1000);
});
test('هدف غير مذكور في السجل يستخدم افتراضيه', () => {
  assert.equal(goalContribFor(goal, { goalContribs: { other: 500 } }), 1000);
});
test('calcGoalsMonthlyTotal يحترم سجل الشهر', () => {
  const goals = [goal, { id: 'g2', monthlyContribution: 400, completed: false }];
  assert.equal(calcGoalsMonthlyTotal(goals), 1400);
  assert.equal(calcGoalsMonthlyTotal(goals, { goalContribs: { g1: 100 } }), 500);
});
test('الهدف المكتمل يُحتسب في المتبقي — نفس قاعدة خريطة البنوك', () => {
  // A completed goal that still carries a contribution is spoken-for money.
  // Excluding it here while the bank map counted it let one riyal read as both
  // available and assigned.
  assert.equal(calcGoalsMonthlyTotal([{ ...goal, completed: true }]), 1000);
});
test('الهدف المكتمل بمساهمة صفر لا يخصم شيئاً', () => {
  // Zeroing the contribution is how a finished goal stops counting.
  assert.equal(calcGoalsMonthlyTotal([{ ...goal, completed: true, monthlyContribution: 0 }]), 0);
});
test('تصفير المساهمة لهذا الشهر فقط يُحترم', () => {
  assert.equal(calcGoalsMonthlyTotal([{ ...goal, completed: true }], { goalContribs: { g1: 0 } }), 0);
});

// ── nextAction ───────────────────────────────────────────────────────────────
console.log('\nnextAction');
const settings = { salary: 10000, salaryDay: 25 };
const record = { month: '2026-08', salary: 10000, goalContribs: {} };

test('قبل يوم الراتب يبقى ترتيب الشهر متاحاً بأولوية دنيا', () => {
  // Not urgent, but it must stay reachable — it is the only route into Salary
  // Day from the dashboard.
  const a = getNextAction({ settings, today: at('2026-08-10') });
  assert.equal(a.key, 'plan-month');
  assert.equal(a.page, 'salaryDay');
  assert.equal(a.tone, 'calm');
});
test('ترتيب الشهر لا يزاحم التزاماً مستحقاً', () => {
  const commitments = [{ id: 'c1', name: 'نت', amount: 400, dayOfMonth: 10, active: true }];
  const a = getNextAction({ commitments, settings, today: at('2026-08-10') });
  assert.equal(a.key, 'due-today');
});
test('الشهر المرتَّب بلا شيء مطلوب يعطي clear', () => {
  const commitments = [{ id: 'c1', name: 'إيجار', amount: 10000, dayOfMonth: 1, active: true, paidThisMonth: true }];
  const a = getNextAction({ commitments, record, settings, today: at('2026-08-15') });
  assert.equal(a.key, 'clear');
});
test('يوم الراتب: لا يدّعي أن الراتب نزل', () => {
  const a = getNextAction({ settings, today: at('2026-08-25') });
  assert.equal(a.key, 'salary-day');
  assert.equal(a.title, 'موعد راتبك اليوم');
  assert.ok(!/نزل/.test(a.title + a.detail), 'يجب ألا يدّعي معرفة نزول الراتب');
});
test('ترتيب الشهر يتقدّم على التزام اليوم (حسب الأولوية المتفق عليها)', () => {
  // Planning the month is the prerequisite for everything else, so an unplanned
  // month outranks a bill due today.
  const commitments = [{ id: 'c1', name: 'إيجار', amount: 2000, dayOfMonth: 25, active: true }];
  const a = getNextAction({ commitments, settings, today: at('2026-08-25') });
  assert.equal(a.key, 'salary-day');
});
test('بعد ترتيب الشهر يظهر التزام اليوم', () => {
  const commitments = [{ id: 'c1', name: 'إيجار', amount: 2000, dayOfMonth: 25, active: true }];
  const a = getNextAction({ commitments, record, settings, today: at('2026-08-25') });
  assert.equal(a.key, 'due-today');
  assert.equal(a.title, 'إيجار مستحق اليوم');
});
test('عدة التزامات اليوم تُجمَع', () => {
  const commitments = [
    { id: 'c1', name: 'إيجار', amount: 2000, dayOfMonth: 20, active: true },
    { id: 'c2', name: 'نت', amount: 400, dayOfMonth: 20, active: true },
  ];
  const a = getNextAction({ commitments, record, settings, today: at('2026-08-20') });
  assert.equal(a.key, 'due-today');
  assert.equal(a.detail, 2400);
});
test('المدفوع لا يُنبَّه عليه', () => {
  const commitments = [{ id: 'c1', name: 'إيجار', amount: 2000, dayOfMonth: 20, active: true, paidThisMonth: true }];
  const a = getNextAction({ commitments, record, settings, today: at('2026-08-20') });
  assert.notEqual(a.key, 'due-today');
});
test('الموقوف هذا الشهر لا يُنبَّه عليه', () => {
  const commitments = [{ id: 'c1', name: 'إيجار', amount: 2000, dayOfMonth: 20, active: true, pausedMonth: '2026-08' }];
  const a = getNextAction({ commitments, record, settings, today: at('2026-08-20') });
  assert.notEqual(a.key, 'due-today');
});
test('التزام بعد يومين يظهر كقادم', () => {
  const commitments = [{ id: 'c1', name: 'نت', amount: 400, dayOfMonth: 22, active: true }];
  const a = getNextAction({ commitments, record, settings, today: at('2026-08-20') });
  assert.equal(a.key, 'due-soon');
  assert.ok(a.title.includes('بعد 2'));
});
test('التزام بعد أسبوع لا يظهر كقادم', () => {
  const commitments = [{ id: 'c1', name: 'نت', amount: 400, dayOfMonth: 27, active: true }];
  const a = getNextAction({ commitments, record, settings, today: at('2026-08-20') });
  assert.notEqual(a.key, 'due-soon');
});
test('المبلغ غير المخصص يظهر بعد ترتيب الشهر', () => {
  const a = getNextAction({ record, settings, today: at('2026-08-28') });
  assert.equal(a.key, 'undistributed');
  assert.equal(a.detail, 10000);
});
test('لا تنبيه بغير مخصص قبل ترتيب الشهر', () => {
  const a = getNextAction({ settings, today: at('2026-08-10') });
  assert.notEqual(a.key, 'undistributed');
});
test('التخصيص الكامل لا ينبّه', () => {
  const commitments = [{ id: 'c1', name: 'إيجار', amount: 10000, dayOfMonth: 1, active: true, paidThisMonth: true }];
  const a = getNextAction({ commitments, record, settings, today: at('2026-08-28') });
  assert.equal(a.key, 'clear');
});
test('هدف تجاوز موعده', () => {
  const goals = [{ id: 'g1', name: 'السفر', targetDate: '2026-06-01', completed: false, monthlyContribution: 0 }];
  const r = { ...record, salary: 0 };
  const a = getNextAction({ goals, record: r, settings: { ...settings, salary: 0 }, today: at('2026-08-28') });
  assert.equal(a.key, 'goal-late');
});
test('الهدف المكتمل لا يُعدّ متأخراً', () => {
  const goals = [{ id: 'g1', name: 'السفر', targetDate: '2026-06-01', completed: true }];
  const r = { ...record, salary: 0 };
  const a = getNextAction({ goals, record: r, settings: { ...settings, salary: 0 }, today: at('2026-08-28') });
  assert.equal(a.key, 'clear');
});

// ── dismissal is bound to the value, not the month ───────────────────────────
console.log('\nإخفاء التنبيه مربوط بالبصمة');
test('الإخفاء بنفس القيمة يُسكت التنبيه', () => {
  const a1 = getNextAction({ record, settings, today: at('2026-08-28') });
  assert.equal(a1.key, 'undistributed');
  const a2 = getNextAction({
    record, settings, today: at('2026-08-28'),
    dismissed: [{ key: 'undistributed', sig: a1.sig }],
  });
  assert.equal(a2.key, 'clear');
});
test('تغيّر المبلغ يعيد التنبيه رغم الإخفاء السابق', () => {
  const a1 = getNextAction({ record, settings, today: at('2026-08-28') });
  const commitments = [{ id: 'c1', name: 'إيجار', amount: 3000, dayOfMonth: 1, active: true, paidThisMonth: true }];
  const a2 = getNextAction({
    commitments, record, settings, today: at('2026-08-28'),
    dismissed: [{ key: 'undistributed', sig: a1.sig }],
  });
  assert.equal(a2.key, 'undistributed', 'المبلغ تغيّر فيجب أن يعود التنبيه');
  assert.equal(a2.detail, 7000);
});
test('الالتزام المستحق اليوم غير قابل للإخفاء', () => {
  const commitments = [{ id: 'c1', name: 'إيجار', amount: 2000, dayOfMonth: 20, active: true }];
  const a1 = getNextAction({ commitments, record, settings, today: at('2026-08-20') });
  assert.equal(a1.dismissible, false);
  const a2 = getNextAction({
    commitments, record, settings, today: at('2026-08-20'),
    dismissed: [{ key: 'due-today', sig: a1.sig }],
  });
  assert.equal(a2.key, 'due-today', 'الالتزامات الصلبة لا تُسكَت');
});

// ── ordering ─────────────────────────────────────────────────────────────────
console.log('\nترتيب الأولوية');
test('اليوم يتقدّم على القادم ثم غير المخصص', () => {
  const commitments = [
    { id: 'c1', name: 'اليوم', amount: 100, dayOfMonth: 20, active: true },
    { id: 'c2', name: 'قادم', amount: 100, dayOfMonth: 22, active: true },
  ];
  assert.equal(getNextAction({ commitments, record, settings, today: at('2026-08-20') }).key, 'due-today');
  assert.equal(getNextAction({ commitments: [commitments[1]], record, settings, today: at('2026-08-20') }).key, 'due-soon');
});

// ── every rendered title must be safe for a font with no digit glyphs ────────
console.log('\nالأرقام داخل النصوص');
function wrapped(text) {
  return text.split(/(\d[\d,.]*)/g).filter(p => /^\d/.test(p));
}
test('عناوين الخطوة التالية لا تترك رقماً خارج .num', () => {
  // Mestika renders no digits, so any numeral baked into a title string has to
  // be split out and wrapped by the view. This asserts the splitter catches the
  // numbers the rules actually produce.
  const commitments = [{ id: 'c1', name: 'اشتراكات', amount: 258, dayOfMonth: 22, active: true }];
  const a = getNextAction({ commitments, record, settings, today: at('2026-08-19') });
  assert.equal(a.key, 'due-soon');
  assert.ok(/\d/.test(a.title), 'هذا العنوان يحتوي رقماً');
  assert.deepEqual(wrapped(a.title), ['3'], 'الرقم يجب أن يُستخرج ليُلفّ');
});
test('عنوان بعدة التزامات يستخرج عدده', () => {
  const commitments = [
    { id: 'c1', name: 'أ', amount: 1, dayOfMonth: 20, active: true },
    { id: 'c2', name: 'ب', amount: 1, dayOfMonth: 20, active: true },
  ];
  const a = getNextAction({ commitments, record, settings, today: at('2026-08-20') });
  assert.deepEqual(wrapped(a.title), ['2']);
});
test('العناوين بلا أرقام تمرّ كما هي', () => {
  const a = getNextAction({ record, settings, today: at('2026-08-28') });
  assert.equal(a.key, 'undistributed');
  assert.deepEqual(wrapped(a.title), [], 'لا رقم في هذا العنوان — المبلغ يُعرض منفصلاً');
});

// ── Dashboard and Banks must report the same figure for a bank ──────────────
console.log('\nbankAllocation');
// Reproduces the real report: the dashboard said 4,500 for الانماء while the
// Banks page listed rows adding to 5,700. The gap was one completed goal that
// Banks counted and the dashboard did not.
const BANK = 'b-inma';
const bankCommitments = [
  { id: 'c1', name: 'الطوارئ', amount: 1000, dayOfMonth: 27, active: true, bankId: BANK, accountId: 'a-emg' },
  { id: 'c2', name: 'السفر', amount: 1000, dayOfMonth: 27, active: true, bankId: BANK, accountId: 'a-trv' },
  { id: 'c3', name: 'السوبرماركت', amount: 1500, dayOfMonth: 27, active: true, bankId: BANK, accountId: 'a-shop' },
];
const bankGoals = [
  { id: 'g-res', name: 'الاقامة', monthlyContribution: 1200, completed: true,  bankId: BANK, accountId: 'a-res' },
  { id: 'g-res2', name: 'الاقامة', monthlyContribution: 0,    completed: false, bankId: BANK, accountId: 'a-res' },
  { id: 'g-debt', name: 'دين', monthlyContribution: 1000, completed: false, bankId: BANK, accountId: 'a-main' },
];
const ACCOUNTS = ['a-emg', 'a-trv', 'a-res', 'a-main', 'a-shop'];

test('الهدف المكتمل يُحتسب — الخريطة تعرض كل ما هو معيَّن', () => {
  // Reported from the app: Banks listed rows totalling 5,700 while the
  // dashboard said 4,500. The owner's call is that the bank view maps every
  // assignment, so the completed goal counts and 5,700 is the right figure.
  const t = bankAllocation(BANK, { commitments: bankCommitments, goals: bankGoals, month: '2026-11' }).total;
  assert.equal(t, 5700, '3500 التزامات + 1200 هدف مكتمل + 0 + 1000 هدف مفتوح');
});
test('الالتزام الموقوف يبقى مستثنى — أُطفئ صراحةً', () => {
  const paused = bankCommitments.map(c => c.id === 'c3' ? { ...c, pausedMonth: '2026-11' } : c);
  const t = bankAllocation(BANK, { commitments: paused, goals: bankGoals, month: '2026-11' }).total;
  assert.equal(t, 4200, 'يسقط 1500 الموقوف فقط');
});
test('مجموع الحسابات يساوي مجموع البنك بالضبط', () => {
  const bankTotal = bankAllocation(BANK, { commitments: bankCommitments, goals: bankGoals, month: '2026-11' }).total;
  const sumOfAccounts = ACCOUNTS.reduce((s, accountId) =>
    s + bankAllocation(BANK, { commitments: bankCommitments, goals: bankGoals, month: '2026-11', accountId }).total, 0);
  assert.equal(sumOfAccounts, bankTotal, 'الشاشتان يجب ألا تختلفا أبداً');
});
test('تعديل مساهمة الشهر ينعكس على تحويلات البنك', () => {
  // Salary Day edits live on the record; the bank view must follow them without
  // the goal itself being rewritten.
  const rec = { goalContribs: { 'g-debt': 250 } };
  const t = bankAllocation(BANK, { commitments: bankCommitments, goals: bankGoals, record: rec, month: '2026-11' }).total;
  assert.equal(t, 4950, '1000 صارت 250 لهذا الشهر فقط');
});
test('حساب بلا تعيينات يرجّع صفراً', () => {
  const r = bankAllocation(BANK, { commitments: bankCommitments, goals: bankGoals, month: '2026-11', accountId: 'nope' });
  assert.equal(r.total, 0);
  assert.equal(r.commitments.length + r.goals.length, 0);
});


// ── the whole salary must be accounted for, with nothing double-counted ──────
console.log('\nمطابقة الراتب');
test('الراتب = التزامات + أهداف + المتبقي (بلا ازدواج)', () => {
  // The reported bug in miniature: a completed goal counted by the bank map but
  // not by "remaining" made the same 1,200 appear twice.
  const salary = 18645;
  const cs = [{ id: 'c1', amount: 14124, dayOfMonth: 1, active: true }];
  const gs = [
    { id: 'g1', name: 'الخادمة', monthlyContribution: 200, completed: false },
    { id: 'g2', name: 'الاقامة', monthlyContribution: 1200, completed: true },
    { id: 'g3', name: 'دين', monthlyContribution: 1000, completed: false },
  ];
  const commitmentsTotal = calcCommitmentsTotal(cs, '2026-11');
  const goalsTotal = calcGoalsMonthlyTotal(gs);
  const remaining = salary - commitmentsTotal - goalsTotal;
  assert.equal(goalsTotal, 2400, 'كل الأهداف الحاملة لمساهمة');
  assert.equal(remaining, 2121);
  assert.equal(commitmentsTotal + goalsTotal + remaining, salary, 'لا شيء يُحسب مرتين');
});

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
