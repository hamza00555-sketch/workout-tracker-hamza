import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_URL = process.env.RATEBI_API_URL;
const API_KEY = process.env.RATEBI_API_KEY;

if (!API_URL || !API_KEY) {
  process.stderr.write('Error: RATEBI_API_URL and RATEBI_API_KEY must be set.\n');
  process.stderr.write('Example: RATEBI_API_URL=https://ratebi-salary-app2.vercel.app RATEBI_API_KEY=your-key node index.js\n');
  process.exit(1);
}

async function fetchSnapshot() {
  const res = await fetch(`${API_URL}/api/data`, {
    headers: { 'x-api-key': API_KEY },
  });
  if (res.status === 401) throw new Error('مفتاح API غير صحيح — تحقق من RATEBI_API_KEY');
  if (res.status === 404) throw new Error('لا توجد بيانات بعد — افتح راتبي وأجرِ تغييراً لتشغيل المزامنة');
  if (!res.ok) throw new Error(`فشل الاتصال بالخادم: ${res.status}`);
  return res.json();
}

function toText(obj) {
  return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] };
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const server = new McpServer({ name: 'ratebi', version: '1.0.0' });

server.tool(
  'get_financial_summary',
  'الملخص المالي للشهر الحالي: الراتب، إجمالي الالتزامات، إجمالي الأهداف، والمتبقي.',
  {},
  async () => {
    const snap = await fetchSnapshot();
    const settings = snap.settings?.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {}) ?? {};
    const month = currentMonth();
    const record = snap.monthlyRecords?.find(r => r.month === month) ?? null;
    const activeCommitments = (snap.commitments ?? []).filter(c => c.active !== false);
    const activeGoals = (snap.goals ?? []).filter(g => !g.completed);
    const commitmentsTotal = record?.commitmentsTotal ?? activeCommitments.reduce((s, c) => s + (c.amount || 0), 0);
    const goalsTotal = record?.goalsTotal ?? activeGoals.reduce((s, g) => s + (g.monthlyContribution || 0), 0);
    const salary = record?.salary ?? settings.salary ?? 0;
    return toText({
      month,
      salary,
      currency: settings.currency ?? 'ريال',
      salaryDay: settings.salaryDay ?? 25,
      commitmentsTotal,
      goalsTotal,
      remaining: salary - commitmentsTotal - goalsTotal,
      activeCommitmentsCount: activeCommitments.length,
      activeGoalsCount: activeGoals.length,
      syncedAt: snap.syncedAt,
    });
  }
);

server.tool(
  'get_commitments',
  'قائمة الالتزامات الشهرية (إيجار، فواتير، أقساط...).',
  { active_only: z.boolean().optional().describe('فلترة الالتزامات النشطة فقط (افتراضي: true)') },
  async ({ active_only = true }) => {
    const snap = await fetchSnapshot();
    let items = snap.commitments ?? [];
    if (active_only) items = items.filter(c => c.active !== false);
    return toText(items.map(c => ({
      id: c.id, name: c.name, amount: c.amount, category: c.category,
      dayOfMonth: c.dayOfMonth, paidThisMonth: c.paidThisMonth, active: c.active,
    })));
  }
);

server.tool(
  'get_goals',
  'قائمة الأهداف المالية مع نسبة التقدم.',
  { include_completed: z.boolean().optional().describe('تضمين الأهداف المكتملة (افتراضي: false)') },
  async ({ include_completed = false }) => {
    const snap = await fetchSnapshot();
    let items = snap.goals ?? [];
    if (!include_completed) items = items.filter(g => !g.completed);
    return toText(items.map(g => ({
      id: g.id, name: g.name, targetAmount: g.targetAmount, savedAmount: g.savedAmount,
      progressPercent: g.targetAmount ? Math.round((g.savedAmount / g.targetAmount) * 100) : 0,
      targetDate: g.targetDate, monthlyContribution: g.monthlyContribution, completed: g.completed,
    })));
  }
);

server.tool(
  'get_expenses',
  'المصروفات لشهر معين (افتراضي: الشهر الحالي).',
  { month: z.string().optional().describe('الشهر بصيغة YYYY-MM مثل 2026-07، افتراضي الشهر الحالي') },
  async ({ month }) => {
    const snap = await fetchSnapshot();
    const m = month ?? currentMonth();
    const expenses = (snap.expenses ?? []).filter(e => e.month === m);
    const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    return toText({ month: m, count: expenses.length, total, expenses });
  }
);

server.tool(
  'get_banks',
  'قائمة البنوك والحسابات.',
  {},
  async () => {
    const snap = await fetchSnapshot();
    return toText(snap.banks ?? []);
  }
);

server.tool(
  'get_debts',
  'قائمة الديون مع المتبقي من كل دين.',
  { include_paid: z.boolean().optional().describe('تضمين الديون المسددة (افتراضي: false)') },
  async ({ include_paid = false }) => {
    const snap = await fetchSnapshot();
    let items = snap.debts ?? [];
    if (!include_paid) items = items.filter(d => !d.paid);
    return toText(items.map(d => ({
      id: d.id, name: d.name, totalAmount: d.totalAmount, paidAmount: d.paidAmount,
      remainingAmount: d.totalAmount - d.paidAmount,
      progressPercent: d.totalAmount ? Math.round((d.paidAmount / d.totalAmount) * 100) : 0,
      paid: d.paid,
    })));
  }
);

server.tool(
  'get_extra_income',
  'سجل الدخل الإضافي خارج الراتب.',
  { limit: z.number().optional().describe('عدد السجلات (افتراضي: 20)') },
  async ({ limit = 20 }) => {
    const snap = await fetchSnapshot();
    const items = (snap.extraIncome ?? [])
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);
    return toText(items);
  }
);

server.tool(
  'get_monthly_records',
  'السجلات الشهرية التاريخية (راتب، التزامات، أهداف، متبقي).',
  { months: z.number().optional().describe('عدد الأشهر الماضية (افتراضي: 6)') },
  async ({ months = 6 }) => {
    const snap = await fetchSnapshot();
    const items = (snap.monthlyRecords ?? [])
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, months);
    return toText(items);
  }
);

server.tool(
  'get_raw_snapshot',
  'البيانات الكاملة من راتبي. استخدمها عندما الأدوات الأخرى لا تكفي.',
  {},
  async () => {
    const snap = await fetchSnapshot();
    return toText(snap);
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
