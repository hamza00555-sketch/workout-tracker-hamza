// Fix: manual formatter avoids iOS en-SA returning Arabic-Indic numerals (٠١٢) that Mestika can't render
export function formatAmount(n) {
  const num = Math.round(Number(n || 0));
  if (isNaN(num)) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// `now` is injectable so date-dependent logic can be tested across months.
export function currentMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonthLabel() {
  return new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' });
}

export function formatDate(d) {
  return new Date(d).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
}

// Negative when the date has already passed; monthsUntil() clamps to 1 and so
// cannot tell an overdue goal from one due next month.
export function monthsRemaining(targetDate) {
  const now = new Date();
  const t = new Date(targetDate);
  return (t.getFullYear() - now.getFullYear()) * 12 + (t.getMonth() - now.getMonth());
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function monthFromDate(d) {
  return d.substring(0, 7);
}

// Clamps a day-of-month to a month that may be shorter: day 31 in September
// lands on the 30th rather than spilling into October.
function dayInMonth(year, month, dayOfMonth) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(dayOfMonth, lastDay));
}

// Days from today until a commitment's next due date. Returns 0 when it falls
// today: both operands are normalised to midnight, so a due date earlier today
// no longer counts as passed, and the roll-forward triggers on a strictly
// earlier date rather than an earlier instant.
export function daysUntil(dayOfMonth, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let target = dayInMonth(today.getFullYear(), today.getMonth(), dayOfMonth);
  if (target < today) target = dayInMonth(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
  return Math.round((target - today) / 86400000);
}

export function uid() {
  return crypto.randomUUID();
}
