/**
 * Pure financial bundle builder — no Firebase, no React.
 * Fully testable in Node.js without any mocking.
 */

export class SalaryMissingError extends Error {
  constructor() {
    super('no-salary');
    this.name = 'SalaryMissingError';
  }
}

/** Convert settings [{key,value}] array to plain object */
export function settingsToObj(settingsArr) {
  if (!Array.isArray(settingsArr)) return settingsArr ?? {};
  return settingsArr.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
}

function clampStr(str, max = 200) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, max);
}

function safeNum(n) {
  const v = Number(n);
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

function isValidId(id) {
  return typeof id === 'string' && id.trim().length > 0;
}

function monthOf(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  return dateStr.substring(0, 7);
}

/**
 * Build a safe ISO due-date from month + dayOfMonth.
 * Day 31 in February → last valid day of February (no rollover).
 */
function buildDueDate(month, dayOfMonth) {
  const day = Number(dayOfMonth);
  if (!Number.isFinite(day) || day < 1) return null;
  const [y, m] = month.split('-').map(Number);
  // new Date(y, m, 0) gives the last day of month m (0-indexed trick)
  const daysInMonth = new Date(y, m, 0).getDate();
  const clamped = Math.min(day, daysInMonth);
  return `${month}-${String(clamped).padStart(2, '0')}`;
}

/**
 * Return a valid ISO datetime for an expense.
 * Uses expense.date (YYYY-MM-DD) or expense.occurredAt (ISO).
 * Falls back to first of month — deterministic, never uses new Date() in hot path.
 */
function safeOccurredAt(expense, month) {
  if (expense.date && typeof expense.date === 'string' && expense.date.length >= 10) {
    const ts = Date.parse(expense.date);
    if (Number.isFinite(ts)) return new Date(ts).toISOString();
  }
  if (expense.occurredAt) {
    const ts = Date.parse(expense.occurredAt);
    if (Number.isFinite(ts)) return new Date(ts).toISOString();
  }
  return `${month}-01T00:00:00.000Z`;
}

function assertSchema(bundle) {
  if (bundle.schema !== 'ratibi.rushd.finance') throw new Error('schema mismatch');
  if (bundle.version !== 1) throw new Error('version mismatch');
  if (bundle.currency !== 'SAR') throw new Error('currency mismatch');
}

/**
 * Build a RatibiFinanceBundleV1 from raw IndexedDB snapshot.
 *
 * @param {object} params
 * @param {object} params.rawSnapshot  — db.exportAll() result
 * @param {string} params.month        — YYYY-MM
 * @param {string|null} params.displayName
 * @param {string} params.exportedAt   — ISO datetime
 * @throws {SalaryMissingError} when salary is 0 or absent
 */
export function buildRushdFinanceBundle({ rawSnapshot, month, displayName, exportedAt }) {
  const settings = settingsToObj(rawSnapshot.settings ?? []);
  const monthlyRecords = rawSnapshot.monthlyRecords ?? [];
  const record = monthlyRecords.find(r => r.month === month) ?? null;

  // ── Salary ───────────────────────────────────────────────────────────────
  const rawSalary = record?.salary ?? settings.salary ?? 0;
  const salary = safeNum(rawSalary);
  if (!(salary > 0)) throw new SalaryMissingError();

  // ── Extra income (filter to this month) ──────────────────────────────────
  const additional = (rawSnapshot.extraIncome ?? [])
    .filter(e => isValidId(e.id) && monthOf(e.date) === month)
    .slice(0, 200)
    .map(e => ({
      id: String(e.id),
      title: clampStr(e.source || 'دخل إضافي', 100),
      amount: safeNum(e.amount),
    }));

  // ── Obligations (active commitments, minus any paused for this month) ────
  const obligations = (rawSnapshot.commitments ?? [])
    .filter(c => isValidId(c.id) && c.active !== false && c.pausedMonth !== month)
    .slice(0, 200)
    .map(c => {
      const amount = safeNum(c.amount);
      const paidAmount = c.paidThisMonth ? amount : 0;
      return {
        id: String(c.id),
        title: clampStr(c.name || 'التزام', 100),
        amount,
        paidAmount: Math.min(paidAmount, amount),
        dueDate: buildDueDate(month, c.dayOfMonth),
        category: clampStr(c.category || '', 50) || null,
      };
    });

  // ── Goals (incomplete) ───────────────────────────────────────────────────
  const goals = (rawSnapshot.goals ?? [])
    .filter(g => isValidId(g.id) && g.completed !== true)
    .slice(0, 200)
    .map(g => {
      const target = safeNum(g.targetAmount);
      const saved = Math.min(safeNum(g.savedAmount), target);
      return {
        id: String(g.id),
        title: clampStr(g.name || 'هدف', 100),
        target,
        saved,
        monthlyAllocation: safeNum(g.monthlyContribution),
        contributedThisMonth: safeNum(record?.goalContribs?.[g.id]),
        deadline: g.targetDate ? clampStr(g.targetDate, 20) : null,
        category: clampStr(g.category || '', 50) || null,
      };
    });

  // ── Budgets ───────────────────────────────────────────────────────────────
  const budgets = [];

  const wishesBudget = safeNum(settings.rushdWishesBudget);
  const wishesSpent = safeNum(settings.rushdWishesSpent);
  if (wishesBudget > 0) {
    budgets.push({
      id: 'wishes',
      title: 'أماني رُشد',
      limit: wishesBudget,
      spent: Math.min(wishesSpent, wishesBudget),
      kind: 'wishes',
    });
  }

  const commitmentsTotal = obligations.reduce((s, o) => s + o.amount, 0);
  const goalsTotal = goals.reduce((s, g) => s + g.monthlyAllocation, 0);
  const calculatedRemaining = Math.max(0, salary - commitmentsTotal - goalsTotal);
  const flexibleLimit = Math.max(0, record?.remaining ?? calculatedRemaining);

  const monthExpenses = (rawSnapshot.expenses ?? []).filter(
    e => isValidId(e.id) && (monthOf(e.date) === month || e.month === month)
  );
  const flexibleSpent = monthExpenses.reduce((s, e) => s + safeNum(e.amount), 0);

  budgets.push({
    id: 'flexible',
    title: 'المصروف المرن',
    limit: flexibleLimit,
    spent: flexibleSpent,
    kind: 'flexible',
  });

  // ── Accounts ──────────────────────────────────────────────────────────────
  const accounts = [];
  for (const bank of (rawSnapshot.banks ?? []).slice(0, 50)) {
    if (!isValidId(bank.id)) continue;
    for (const acct of (bank.accounts ?? []).slice(0, 20)) {
      if (!isValidId(acct.id)) continue;
      accounts.push({
        id: `${bank.id}:${acct.id}`,
        title: clampStr(`${bank.name || 'بنك'} — ${acct.name || 'حساب'}`, 150),
        type: 'حساب بنكي',
        balance: null,
      });
      if (accounts.length >= 200) break;
    }
    if (accounts.length >= 200) break;
  }

  // ── Transactions (expenses this month) ───────────────────────────────────
  const transactions = monthExpenses.slice(0, 200).map(e => ({
    id: String(e.id),
    title: clampStr(e.note || e.title || 'مصروف', 100),
    amount: safeNum(e.amount),
    category: clampStr(e.category || '', 50) || null,
    occurredAt: safeOccurredAt(e, month),
  }));

  // ── Profile ───────────────────────────────────────────────────────────────
  const salaryDay = settings.salaryDay != null ? Number(settings.salaryDay) : null;

  const bundle = {
    schema: 'ratibi.rushd.finance',
    version: 1,
    exportedAt,
    month,
    currency: 'SAR',
    profile: {
      displayName: clampStr(displayName || 'مستخدم راتبي', 100) || null,
      salaryDay: Number.isFinite(salaryDay) ? salaryDay : null,
    },
    income: { salary, additional },
    obligations,
    goals,
    budgets,
    accounts,
    transactions,
  };

  assertSchema(bundle);
  return bundle;
}
