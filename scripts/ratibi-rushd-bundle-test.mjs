/**
 * ratibi-rushd-bundle-test.mjs
 * Run: node scripts/ratibi-rushd-bundle-test.mjs
 */
import assert from 'assert/strict';
import { buildRushdFinanceBundle, settingsToObj, SalaryMissingError } from '../src/lib/rushdBundle.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✕  ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

const MONTH = '2026-02';
const EXPORTED_AT = '2026-02-15T10:00:00.000Z';

function baseSnapshot(overrides = {}) {
  return {
    settings: [
      { key: 'salary', value: 10000 },
      { key: 'salaryDay', value: 25 },
      { key: 'currency', value: 'ريال' },
    ],
    commitments: [],
    goals: [],
    banks: [],
    monthlyRecords: [],
    debts: [],
    extraIncome: [],
    expenses: [],
    ...overrides,
  };
}

function build(overrides = {}, params = {}) {
  return buildRushdFinanceBundle({
    rawSnapshot: baseSnapshot(overrides),
    month: MONTH,
    displayName: 'حمزة',
    exportedAt: EXPORTED_AT,
    ...params,
  });
}

console.log('\nراتبي ← رُشد bundle tests\n');

// 1. Settings array → object conversion
test('settingsToObj: array → object', () => {
  const arr = [{ key: 'salary', value: 9000 }, { key: 'salaryDay', value: 20 }];
  const obj = settingsToObj(arr);
  assert.equal(obj.salary, 9000);
  assert.equal(obj.salaryDay, 20);
});

test('settingsToObj: passthrough when already object', () => {
  const obj = { salary: 5000 };
  assert.deepEqual(settingsToObj(obj), obj);
});

// 2. Monthly record salary takes priority over general settings
test('salary: monthly record wins over settings', () => {
  const snap = baseSnapshot({
    settings: [{ key: 'salary', value: 10000 }],
    monthlyRecords: [{ month: MONTH, salary: 12000, remaining: 5000 }],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  assert.equal(bundle.income.salary, 12000);
});

// 3. Extra income filtered by month
test('extra income: only this month', () => {
  const snap = baseSnapshot({
    extraIncome: [
      { id: 'a', date: '2026-02-10', source: 'عمل', amount: 500 },
      { id: 'b', date: '2026-01-15', source: 'قديم', amount: 200 },
      { id: 'c', date: '2026-02-20', source: 'مشروع', amount: 1000 },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  assert.equal(bundle.income.additional.length, 2);
  assert.ok(bundle.income.additional.every(e => ['a', 'c'].includes(e.id)));
});

// 4. Active commitments only
test('obligations: active !== false only', () => {
  const snap = baseSnapshot({
    commitments: [
      { id: 'c1', name: 'إيجار', amount: 2000, dayOfMonth: 1, active: true, paidThisMonth: false },
      { id: 'c2', name: 'قديم', amount: 500, dayOfMonth: 5, active: false, paidThisMonth: false },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  assert.equal(bundle.obligations.length, 1);
  assert.equal(bundle.obligations[0].id, 'c1');
});

test('obligations: paused for this month is excluded', () => {
  const snap = baseSnapshot({
    commitments: [
      { id: 'c1', name: 'إيجار', amount: 2000, dayOfMonth: 1, active: true, paidThisMonth: false },
      { id: 'c2', name: 'موقف', amount: 700, dayOfMonth: 5, active: true, paidThisMonth: false, pausedMonth: MONTH },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  assert.equal(bundle.obligations.length, 1);
  assert.equal(bundle.obligations[0].id, 'c1');
});

test('obligations: paused for a different month still counts', () => {
  const snap = baseSnapshot({
    commitments: [
      { id: 'c1', name: 'إيجار', amount: 2000, dayOfMonth: 1, active: true, paidThisMonth: false, pausedMonth: '2026-01' },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  assert.equal(bundle.obligations.length, 1);
});

test('budgets: paused commitment is not deducted from flexible limit', () => {
  const snap = baseSnapshot({
    commitments: [
      { id: 'c1', name: 'إيجار', amount: 3000, dayOfMonth: 1, active: true, paidThisMonth: false },
      { id: 'c2', name: 'موقف', amount: 1000, dayOfMonth: 5, active: true, paidThisMonth: false, pausedMonth: MONTH },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  const flex = bundle.budgets.find(b => b.id === 'flexible');
  assert.equal(flex.limit, 7000); // 10000 - 3000، والموقوف لا يُخصم
});

// 5. paidThisMonth → paidAmount
test('obligations: paidThisMonth=true → paidAmount equals amount', () => {
  const snap = baseSnapshot({
    commitments: [
      { id: 'c1', name: 'إيجار', amount: 2000, dayOfMonth: 1, active: true, paidThisMonth: true },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  assert.equal(bundle.obligations[0].paidAmount, 2000);
  assert.equal(bundle.obligations[0].amount, 2000);
});

test('obligations: paidThisMonth=false → paidAmount=0', () => {
  const snap = baseSnapshot({
    commitments: [
      { id: 'c1', name: 'إيجار', amount: 2000, dayOfMonth: 1, active: true, paidThisMonth: false },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  assert.equal(bundle.obligations[0].paidAmount, 0);
});

// 6. dueDate: day 31 in February → last valid day (28 in 2026)
test('dueDate: day 31 in Feb 2026 → 2026-02-28', () => {
  const snap = baseSnapshot({
    commitments: [
      { id: 'c1', name: 'تأمين', amount: 300, dayOfMonth: 31, active: true, paidThisMonth: false },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  assert.equal(bundle.obligations[0].dueDate, '2026-02-28');
});

test('dueDate: day 15 in Feb → 2026-02-15', () => {
  const snap = baseSnapshot({
    commitments: [
      { id: 'c1', name: 'فاتورة', amount: 100, dayOfMonth: 15, active: true, paidThisMonth: false },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  assert.equal(bundle.obligations[0].dueDate, '2026-02-15');
});

// 7. Incomplete goals only
test('goals: completed=true is excluded', () => {
  const snap = baseSnapshot({
    goals: [
      { id: 'g1', name: 'سيارة', targetAmount: 50000, savedAmount: 10000, monthlyContribution: 1000, completed: false },
      { id: 'g2', name: 'منتهي', targetAmount: 5000, savedAmount: 5000, monthlyContribution: 500, completed: true },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  assert.equal(bundle.goals.length, 1);
  assert.equal(bundle.goals[0].id, 'g1');
});

// 8. saved never exceeds target
test('goals: saved is clamped to target', () => {
  const snap = baseSnapshot({
    goals: [
      { id: 'g1', name: 'هدف', targetAmount: 1000, savedAmount: 1500, monthlyContribution: 200, completed: false },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  assert.equal(bundle.goals[0].saved, 1000);
  assert.ok(bundle.goals[0].saved <= bundle.goals[0].target);
});

// 9. Wishes budget
test('budgets: wishes budget included when > 0', () => {
  const snap = baseSnapshot({
    settings: [
      { key: 'salary', value: 10000 },
      { key: 'rushdWishesBudget', value: 1500 },
      { key: 'rushdWishesSpent', value: 800 },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  const wishes = bundle.budgets.find(b => b.id === 'wishes');
  assert.ok(wishes, 'wishes budget should exist');
  assert.equal(wishes.limit, 1500);
  assert.equal(wishes.spent, 800);
  assert.equal(wishes.kind, 'wishes');
});

test('budgets: wishes spent clamped to limit', () => {
  const snap = baseSnapshot({
    settings: [
      { key: 'salary', value: 10000 },
      { key: 'rushdWishesBudget', value: 500 },
      { key: 'rushdWishesSpent', value: 900 },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  const wishes = bundle.budgets.find(b => b.id === 'wishes');
  assert.equal(wishes.spent, 500);
});

test('budgets: wishes budget absent when = 0', () => {
  const bundle = build();
  const wishes = bundle.budgets.find(b => b.id === 'wishes');
  assert.equal(wishes, undefined);
});

// 10. Flexible budget
test('budgets: flexible budget always present', () => {
  const bundle = build();
  const flex = bundle.budgets.find(b => b.id === 'flexible');
  assert.ok(flex, 'flexible budget should exist');
  assert.equal(flex.kind, 'flexible');
});

test('budgets: flexible limit = salary - commitments - goals', () => {
  const snap = baseSnapshot({
    commitments: [
      { id: 'c1', name: 'إيجار', amount: 3000, dayOfMonth: 1, active: true, paidThisMonth: false },
    ],
    goals: [
      { id: 'g1', name: 'هدف', targetAmount: 20000, savedAmount: 0, monthlyContribution: 1000, completed: false },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  const flex = bundle.budgets.find(b => b.id === 'flexible');
  assert.equal(flex.limit, 6000); // 10000 - 3000 - 1000
});

// 11. Banks and accounts
test('accounts: bank+account merged correctly', () => {
  const snap = baseSnapshot({
    banks: [
      {
        id: 'b1', name: 'الراجحي',
        accounts: [
          { id: 'a1', name: 'جاري' },
          { id: 'a2', name: 'توفير' },
        ],
      },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  assert.equal(bundle.accounts.length, 2);
  assert.equal(bundle.accounts[0].id, 'b1:a1');
  assert.equal(bundle.accounts[0].title, 'الراجحي — جاري');
  assert.equal(bundle.accounts[0].balance, null);
  assert.equal(bundle.accounts[0].type, 'حساب بنكي');
});

// 12. Expenses filtered to this month only
test('transactions: only current month expenses', () => {
  const snap = baseSnapshot({
    expenses: [
      { id: 'e1', month: '2026-02', date: '2026-02-10', amount: 150, category: 'food', note: 'غداء' },
      { id: 'e2', month: '2026-01', date: '2026-01-20', amount: 200, category: 'transport', note: '' },
      { id: 'e3', month: '2026-02', date: '2026-02-14', amount: 80, category: 'coffee', note: 'قهوة' },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  assert.equal(bundle.transactions.length, 2);
  assert.ok(bundle.transactions.every(t => ['e1', 'e3'].includes(t.id)));
});

// 13. No email, PIN, token, API key in bundle
test('privacy: no sensitive fields in bundle', () => {
  const text = JSON.stringify(build());
  const forbidden = ['email', 'pinHash', 'password', 'token', 'cloudApiKey', 'webhookUrl', 'biometric', 'apiKey'];
  for (const f of forbidden) {
    assert.ok(!text.toLowerCase().includes(f.toLowerCase()), `bundle must not contain "${f}"`);
  }
});

// 14. Salary = 0 throws SalaryMissingError
test('validation: salary=0 throws SalaryMissingError', () => {
  const snap = baseSnapshot({ settings: [{ key: 'salary', value: 0 }] });
  assert.throws(
    () => buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT }),
    SalaryMissingError,
  );
});

// 15. NaN and Infinity are rejected
test('validation: NaN salary throws SalaryMissingError', () => {
  const snap = baseSnapshot({ settings: [{ key: 'salary', value: NaN }] });
  assert.throws(
    () => buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT }),
    SalaryMissingError,
  );
});

test('validation: numeric string amounts are coerced', () => {
  const snap = baseSnapshot({
    commitments: [
      { id: 'c1', name: 'فاتورة', amount: '500', dayOfMonth: 5, active: true, paidThisMonth: false },
    ],
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  assert.equal(typeof bundle.obligations[0].amount, 'number');
  assert.equal(bundle.obligations[0].amount, 500);
});

// 16. Max 200 items per list
test('limits: commitments capped at 200', () => {
  const snap = baseSnapshot({
    commitments: Array.from({ length: 250 }, (_, i) => ({
      id: `c${i}`, name: `التزام ${i}`, amount: 100, dayOfMonth: 1, active: true, paidThisMonth: false,
    })),
  });
  const bundle = buildRushdFinanceBundle({ rawSnapshot: snap, month: MONTH, displayName: null, exportedAt: EXPORTED_AT });
  assert.ok(bundle.obligations.length <= 200);
});

// 17. Fingerprint is stable when data unchanged
test('fingerprint: same data produces same fingerprint key fields', () => {
  const bundle1 = build();
  const bundle2 = build();
  // exportedAt differs — fingerprint computation excludes it
  const { exportedAt: _a, ...fin1 } = bundle1;
  const { exportedAt: _b, ...fin2 } = bundle2;
  assert.equal(JSON.stringify(fin1), JSON.stringify(fin2));
});

// ── Schema / constant checks ──────────────────────────────────────────────────
test('schema: fixed values correct', () => {
  const bundle = build();
  assert.equal(bundle.schema, 'ratibi.rushd.finance');
  assert.equal(bundle.version, 1);
  assert.equal(bundle.currency, 'SAR');
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
