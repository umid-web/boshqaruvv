// Talabalar uchun DEMO ma'lumotlar va doimiy qiymatlar.
// Haqiqiy loyihada createDemoStudents() o‘rniga backend (API) so‘rovi ishlatiladi.

import { chargeForMonth } from './billing';

export const COURSES = [
  { name: 'Matematika', fee: 450_000, groups: ['MAT-A', 'MAT-B'] },
  { name: 'Fizika', fee: 500_000, groups: ['FIZ-B'] },
  { name: 'Ingliz tili', fee: 600_000, groups: ['ENG-C', 'ENG-E'] },
  { name: 'Kimyo', fee: 480_000, groups: ['KIM-D'] },
];

export const getCourse = (name) => COURSES.find((c) => c.name === name);
export const ALL_GROUPS = COURSES.flatMap((c) => c.groups);

// Guruhlar jadvali. days — JS formatida (1 = dushanba … 6 = shanba). Talaba oyning o‘rtasida
// qo‘shilganda to‘lov shu kunlarga qarab hisoblanadi (billing.js), ustozlar sahifasi ham shuni ishlatadi.
const MWF = [1, 3, 5]; // dushanba · chorshanba · juma
const TTS = [2, 4, 6]; // seshanba · payshanba · shanba

export const GROUPS = {
  'MAT-A': { course: 'Matematika', days: MWF, start: '09:00', end: '10:30', room: '1-xona' },
  'MAT-B': { course: 'Matematika', days: TTS, start: '14:00', end: '15:30', room: '1-xona' },
  'FIZ-B': { course: 'Fizika', days: MWF, start: '15:30', end: '17:00', room: '2-xona' },
  'ENG-C': { course: 'Ingliz tili', days: TTS, start: '10:30', end: '12:00', room: '3-xona' },
  'ENG-E': { course: 'Ingliz tili', days: MWF, start: '17:00', end: '18:30', room: '3-xona' },
  'KIM-D': { course: 'Kimyo', days: TTS, start: '16:00', end: '17:30', room: '2-xona' },
};

export const getGroup = (code) => (GROUPS[code] ? { code, ...GROUPS[code] } : null);

const WEEKDAY_SHORT = { 0: 'Yak', 1: 'Du', 2: 'Se', 3: 'Chor', 4: 'Pay', 5: 'Juma', 6: 'Shan' };
export const weekdayShort = (day) => WEEKDAY_SHORT[day];

// "MAT-A" → "Du · Chor · Juma, 09:00–10:30"
export const formatSchedule = (code) => {
  const g = GROUPS[code];
  if (!g) return '—';
  return `${g.days.map(weekdayShort).join(' · ')}, ${g.start}–${g.end}`;
};

export const STATUSES = {
  active: { label: 'Faol', tone: 'success' },
  frozen: { label: 'Muzlatilgan', tone: 'info' },
  graduated: { label: 'Bitirgan', tone: 'muted' },
  dropped: { label: 'Chiqib ketgan', tone: 'danger' },
};
export const STATUS_OPTIONS = Object.entries(STATUSES).map(([value, { label }]) => ({ value, label }));

export const PAYMENT_STATUSES = {
  paid: { label: 'To‘langan', tone: 'success' },
  partial: { label: 'Qisman', tone: 'warning' },
  unpaid: { label: 'Qarzdor', tone: 'danger' },
};
export const PAYMENT_OPTIONS = Object.entries(PAYMENT_STATUSES).map(([value, { label }]) => ({ value, label }));

// Qarz yo‘q → to‘langan; qarz joriy oy to‘lovidan kam → qisman; aks holda → qarzdor.
// Joriy oy to‘lovi: oyning o‘rtasida qo‘shilgan talaba uchun proratsiyalangan summa (billing.js).
export const getPaymentStatus = (student) => {
  if (!student.debt) return 'paid';
  return student.debt < chargeForMonth(student) ? 'partial' : 'unpaid';
};

export const GENDERS = [
  { value: 'male', label: 'O‘g‘il bola' },
  { value: 'female', label: 'Qiz bola' },
];

// ---------- DEMO ma'lumotlar generatori (deterministik: har yuklanishda bir xil) ----------

const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const MALE_NAMES = ['Anvar', 'Bobur', 'Jasur', 'Sardor', 'Dilshod', 'Azizbek', 'Otabek', 'Javohir', 'Sherzod', 'Rustam', 'Doniyor', 'Akmal', 'Humoyun', 'Muhammad', 'Abdulloh', 'Shohruh'];
const FEMALE_NAMES = ['Madina', 'Malika', 'Dilnoza', 'Zilola', 'Nigora', 'Sevara', 'Gulnoza', 'Shahnoza', 'Mohira', 'Feruza', 'Aziza', 'Munisa', 'Sitora', 'Nilufar', 'Kamola', 'Durdona'];
const SURNAMES = ['Aliyev', 'Karimov', 'Berdiyev', 'Rahimov', 'Yusupov', 'Tursunov', 'Ismoilov', 'Nazarov', 'Qodirov', 'Ergashev', 'Mirzayev', 'Sobirov', 'Hasanov', 'Abdullayev', 'Normatov', 'Odilov', 'Xolmatov', 'Umarov'];
const STREETS = [
  'Farg‘ona sh., Mustaqillik ko‘chasi',
  'Farg‘ona sh., Al-Farg‘oniy ko‘chasi',
  'Farg‘ona sh., Marg‘iloniy ko‘chasi',
  'Marg‘ilon sh., Burhoniddin ko‘chasi',
  'Qo‘qon sh., Turkiston ko‘chasi',
  'Quvasoy sh., Navoiy ko‘chasi',
  'Farg‘ona sh., Yangi Turmush MFY',
];
const PREFIXES = ['90', '91', '93', '94', '97', '88', '33', '95'];
const NOTES = [
  'Ota-onasi bilan har oy suhbat o‘tkazish kerak.',
  'Imtihonga tayyorgarlik uchun qo‘shimcha dars so‘ralgan.',
  'To‘lov har oyning 10-sanasigacha amalga oshiriladi.',
  'Ukasi ham shu markazda o‘qiydi — chegirma qo‘llangan.',
];

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const createDemoStudents = (count = 64) => {
  const rnd = mulberry32(20261023);
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const phone = () =>
    `998${pick(PREFIXES)}${String(Math.floor(rnd() * 10_000_000)).padStart(7, '0')}`;

  const start = new Date(2025, 8, 1).getTime();
  const end = new Date(2026, 9, 15).getTime();

  return Array.from({ length: count }, (_, i) => {
    const female = rnd() < 0.5;
    const surname = pick(SURNAMES);
    const course = pick(COURSES);

    const r = rnd();
    const status = r < 0.7 ? 'active' : r < 0.8 ? 'frozen' : r < 0.92 ? 'graduated' : 'dropped';

    let debt = 0;
    if (status === 'active' || status === 'dropped') {
      const d = rnd();
      if (d < 0.2) debt = Math.round((course.fee * (0.3 + rnd() * 0.5)) / 10_000) * 10_000;
      else if (d < 0.38) debt = Math.round((course.fee * (1 + rnd())) / 10_000) * 10_000;
    }

    const birthYear = 2006 + Math.floor(rnd() * 11);
    return {
      id: `ST-${String(i + 1).padStart(4, '0')}`,
      firstName: pick(female ? FEMALE_NAMES : MALE_NAMES),
      lastName: female ? `${surname}a` : surname,
      gender: female ? 'female' : 'male',
      birthDate: `${birthYear}-${pad(1 + Math.floor(rnd() * 12))}-${pad(1 + Math.floor(rnd() * 28))}`,
      phone: phone(),
      parentPhone: phone(),
      address: pick(STREETS),
      course: course.name,
      group: pick(course.groups),
      status,
      monthlyFee: course.fee,
      debt,
      enrolledAt: isoDate(new Date(start + rnd() * (end - start))),
      attendance: status === 'active' ? 62 + Math.floor(rnd() * 39) : 40 + Math.floor(rnd() * 50),
      note: rnd() < 0.2 ? pick(NOTES) : '',
    };
  });
};

// Talabaning so‘nggi to‘lovlari (DEMO). Doimiy natija: talaba ID siga bog‘liq.
const MONTH_NAMES = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const METHODS = ['Naqd', 'Karta', 'Payme', 'Click'];

export const getPaymentHistory = (student, today = new Date(2026, 9, 23)) => {
  const seed = Number(student.id.replace(/\D/g, '')) || 1;
  const rnd = mulberry32(seed * 7919);
  const enrolled = new Date(student.enrolledAt);
  const rows = [];

  for (let k = 0; k < 5; k++) {
    const month = new Date(today.getFullYear(), today.getMonth() - k, 1);
    if (new Date(month.getFullYear(), month.getMonth() + 1, 0) < enrolled) break;
    // Qo‘shilgan oyda — proratsiyalangan summa; joriy oyda qarz bo‘lsa, faqat to‘langan qismi ko‘rsatiladi
    let amount = chargeForMonth(student, month);
    if (k === 0 && student.debt) amount = Math.max(0, amount - student.debt);
    if (amount <= 0) continue;
    rows.push({
      id: `${student.id}-${k}`,
      period: `${MONTH_NAMES[month.getMonth()]} ${month.getFullYear()}`,
      date: isoDate(new Date(month.getFullYear(), month.getMonth(), 1 + Math.floor(rnd() * 10))),
      amount,
      method: METHODS[Math.floor(rnd() * METHODS.length)],
      partial: k === 0 && Boolean(student.debt),
    });
  }
  return rows;
};
