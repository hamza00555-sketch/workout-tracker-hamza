/**
 * ratibi-dashboard-test.mjs — batch 1 pure-logic tests
 * Run: node scripts/ratibi-dashboard-test.mjs
 */
import assert from 'assert/strict';
import { daysUntil, currentMonth } from '../src/utils/format.js';
import { goalContribFor, calcGoalsMonthlyTotal, isCommitmentDue } from '../src/utils/calc.js';
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
test('الأهداف المكتملة مستثناة', () => {
  assert.equal(calcGoalsMonthlyTotal([{ ...goal, completed: true }]), 0);
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

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
