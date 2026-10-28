// Vaqt yordamchilari: nisbiy ("5 daqiqa oldin"), kun bo‘yicha guruhlash va saqlash formati.

const MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

const pad = (n) => String(n).padStart(2, '0');

export const toDayKey = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const todayKey = () => toDayKey(Date.now());

const dayDiff = (value) => {
  const a = new Date(toDayKey(Date.now()));
  const b = new Date(toDayKey(value));
  return Math.round((a - b) / 86_400_000);
};

export const formatClock = (value) => {
  const d = new Date(value);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "18.10.2026, 10:15" */
export const formatStamp = (value) => {
  const d = new Date(value);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${formatClock(value)}`;
};

/** "hozir" · "5 daqiqa oldin" · "3 soat oldin" · "kecha, 14:20" · "18.10.2026, 10:15" */
export const timeAgo = (value) => {
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 45_000) return 'hozir';
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)} daqiqa oldin`;
  const days = dayDiff(value);
  if (days === 0) return `${Math.floor(minutes / 60)} soat oldin`;
  if (days === 1) return `kecha, ${formatClock(value)}`;
  return formatStamp(value);
};

/** Ro‘yxatni kunlarga bo‘lish uchun sarlavha: "Bugun" · "Kecha" · "23-oktabr". */
export const dayLabel = (value) => {
  const days = dayDiff(value);
  if (days === 0) return 'Bugun';
  if (days === 1) return 'Kecha';
  const d = new Date(value);
  const year = d.getFullYear() === new Date().getFullYear() ? '' : `, ${d.getFullYear()}`;
  return `${d.getDate()}-${MONTHS[d.getMonth()]}${year}`;
};

/** [{ key, label, items }] — kun bo‘yicha guruhlangan (tartib saqlanadi). */
export const groupByDay = (list, pick = (x) => x.at) => {
  const groups = [];
  for (const item of list) {
    const key = toDayKey(pick(item));
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label: dayLabel(pick(item)), items: [item] });
  }
  return groups;
};

/** ISO → "2026-10-18 10:15" (Dashboard va boshqa eski komponentlar formati) */
export const toLocalStamp = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${formatClock(value)}`;
};
