// Fix: manual formatter avoids iOS en-SA returning Arabic-Indic numerals (٠١٢) that Mestika can't render
export function formatAmount(n) {
  const num = Math.round(Number(n || 0));
  if (isNaN(num)) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonthLabel() {
  return new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' });
}

export function formatDate(d) {
  return new Date(d).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function monthFromDate(d) {
  return d.substring(0, 7);
}

export function daysUntil(dayOfMonth) {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
  if (target <= today) target.setMonth(target.getMonth() + 1);
  return Math.ceil((target - today) / 86400000);
}

export function uid() {
  return crypto.randomUUID();
}
