import { isoDate } from '../finance/financeStore';
import { parseIso } from '../students/billing';

export const ATT_KEY = 'edu-attendance-v1';

export const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];
export const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

export const PERIODS = [
  { id: 'this-month', label: 'Joriy oy' },
  { id: 'last-month', label: 'O‘tgan oy' },
  { id: 'last-3', label: '3 oy' },
  { id: 'last-6', label: '6 oy' },
  { id: 'year', label: 'Moliyaviy yil' },
  { id: 'custom', label: 'Boshqa davr' },
];

export const sumAmt = (list) => list.reduce((t, x) => t + (Number(x.amount) || 0), 0);
export const inRange = (iso, from, to) => Boolean(iso) && iso >= from && iso <= to;

export const pctChange = (cur, prev) => {
  if (!prev) return cur ? 100 : 0;
  return Math.round(((cur - prev) / Math.abs(prev)) * 100);
};

export const rangeFromPreset = (preset, now = new Date(), fiscalStart = 1) => {
  const today = isoDate(now);
  if (preset === 'last-month') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from: isoDate(d), to: isoDate(last) };
  }
  if (preset === 'last-3') {
    return { from: isoDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: today };
  }
  if (preset === 'last-6') {
    return { from: isoDate(new Date(now.getFullYear(), now.getMonth() - 5, 1)), to: today };
  }
  if (preset === 'year') {
    const fy = Math.min(12, Math.max(1, Number(fiscalStart) || 1));
    let year = now.getFullYear();
    if (now.getMonth() + 1 < fy) year -= 1;
    return { from: isoDate(new Date(year, fy - 1, 1)), to: today };
  }
  return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
};

export const previousRange = (from, to) => {
  const a = parseIso(from);
  const b = parseIso(to);
  const days = Math.round((b - a) / 86400000) + 1;
  const prevTo = new Date(a);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { from: isoDate(prevFrom), to: isoDate(prevTo) };
};

export const monthsInRange = (from, to) => {
  const start = parseIso(from);
  const end = parseIso(to);
  const out = [];
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (d <= last) {
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      name: MONTHS_SHORT[d.getMonth()],
      full: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
    });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
};

export const loadAttendance = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(ATT_KEY));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const fullName = (s) => `${s.lastName} ${s.firstName}`;
