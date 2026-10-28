// Raqamlarni o‘zbekcha ko‘rinishda formatlash yordamchilari.

const MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];
const WEEKDAYS = [
  'yakshanba', 'dushanba', 'seshanba', 'chorshanba',
  'payshanba', 'juma', 'shanba',
];

// 1234567 → "1 234 567"
export const formatNumber = (n) =>
  Math.round(Number(n) || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');

// 12400000 → "12,4 mln so‘m", 2710000000 → "2,71 mlrd so‘m"
export const formatMoney = (n) => {
  const value = Number(n) || 0;
  const trim = (x, digits) => Number(x.toFixed(digits)).toString().replace('.', ',');
  if (Math.abs(value) >= 1e9) return `${trim(value / 1e9, 2)} mlrd so‘m`;
  if (Math.abs(value) >= 1e6) return `${trim(value / 1e6, 1)} mln so‘m`;
  return `${formatNumber(value)} so‘m`;
};

// Date → "23-oktabr, 2026-yil · juma"
export const formatLongDate = (date) =>
  `${date.getDate()}-${MONTHS[date.getMonth()]}, ${date.getFullYear()}-yil · ${WEEKDAYS[date.getDay()]}`;

// "2026-10-18 10:15" → "18.10.2026, 10:15"
export const formatDateTime = (value) => {
  const [d, t = ''] = String(value).split(' ');
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return String(value);
  return `${day}.${m}.${y}${t ? `, ${t}` : ''}`;
};

// "998901234567" → "+998 90 123 45 67"
export const formatPhone = (value) => {
  const d = String(value ?? '').replace(/\D/g, '');
  if (d.length !== 12 || !d.startsWith('998')) return value ? `+${d}` : '—';
  return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
};

// Kiritilayotgan matnni "+998 90 123 45 67" niqobiga keltiradi (tahrirlash uchun)
export const maskPhoneInput = (value) => {
  let d = String(value ?? '').replace(/\D/g, '');
  if (d.startsWith('998')) d = d.slice(3);
  d = d.slice(0, 9);
  if (!d) return '';
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return `+998 ${parts.join(' ')}`;
};

// Niqobdagi telefonni faqat raqamlarga ("998901234567") aylantiradi
export const phoneDigits = (masked) => String(masked ?? '').replace(/\D/g, '');

// "2026-10-18" → "18.10.2026"
export const formatDate = (value) => {
  const [y, m, d] = String(value ?? '').split('-');
  return y && m && d ? `${d}.${m}.${y}` : '—';
};

// "Aliyev Anvar" → "AA"
export const getInitials = (...names) =>
  names
    .filter(Boolean)
    .map((n) => n.trim()[0]?.toUpperCase())
    .join('')
    .slice(0, 2);

// To‘liq so‘m ko‘rinishi: 1 250 000 so‘m
export const formatSom = (n) => `${formatNumber(n)} so‘m`;
