// Ustozlar uchun DEMO ma'lumotlar, doimiy qiymatlar va hisob-kitob yordamchilari.
// Guruh jadvali (kunlar, vaqt) students/studentsData.js dagi GROUPS dan olinadi — yagona manba.

import { COURSES, GROUPS, getGroup } from '../students/studentsData';

export const SUBJECTS = COURSES.map((c) => c.name);

export const TEACHER_STATUSES = {
  active: { label: 'Ishlamoqda', tone: 'success' },
  vacation: { label: 'Ta‘tilda', tone: 'info' },
  left: { label: 'Ketgan', tone: 'muted' },
};
export const TEACHER_STATUS_OPTIONS = Object.entries(TEACHER_STATUSES).map(([value, { label }]) => ({ value, label }));

export const EDUCATION_OPTIONS = ['Oliy (bakalavr)', 'Oliy (magistr)', 'O‘rta maxsus', 'Talaba'];

export const SALARY_TYPES = [
  { value: 'percent', label: 'Foiz (guruh tushumidan)' },
  { value: 'fixed', label: 'Qat’iy oylik' },
];

// Barcha guruhlar ro‘yxati (forma va hisob-kitoblar uchun)
export const GROUP_LIST = Object.keys(GROUPS).map((code) => getGroup(code));

export const teacherName = (t) => `${t.lastName} ${t.firstName}`;

// ---------- Hisob-kitob ----------

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Ikki guruh bir xil kuni vaqti kesishsa — true (bitta ustoz ikkalasiga ulgurmaydi). */
export const groupsOverlap = (a, b) =>
  a.days.some((d) => b.days.includes(d)) && toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);

/** Tanlangan guruhlar orasida vaqti kesishadigan birinchi juftlikni topadi. */
export const findScheduleConflict = (codes) => {
  const list = codes.map(getGroup).filter(Boolean);
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (groupsOverlap(list[i], list[j])) return [list[i].code, list[j].code];
    }
  }
  return null;
};

/** Guruh qaysi ustozga biriktirilgan (`exceptId` — shu ustozni hisobga olmaydi). */
export const findGroupOwner = (teachers, code, exceptId) =>
  teachers.find((t) => t.id !== exceptId && t.groups.includes(code)) ?? null;

export const getTeacherStats = (teacher, students) => {
  const mine = students.filter((s) => teacher.groups.includes(s.group) && s.status === 'active');
  const revenue = mine.reduce((sum, s) => sum + s.monthlyFee, 0);
  const salary = teacher.salaryType === 'fixed'
    ? teacher.salaryValue
    : Math.round((revenue * teacher.salaryValue) / 100 / 10_000) * 10_000;
  const weeklyLessons = teacher.groups.reduce((sum, code) => sum + (GROUPS[code]?.days.length ?? 0), 0);
  return { studentCount: mine.length, revenue, salary, weeklyLessons };
};

// ---------- DEMO ma'lumotlar ----------

export const createDemoTeachers = () => [
  {
    id: 'T-0001', firstName: 'Rustam', lastName: 'Karimov', gender: 'male', birthDate: '1988-03-14',
    phone: '998901234501', address: 'Farg‘ona sh., Mustaqillik ko‘chasi', subjects: ['Matematika'],
    groups: ['MAT-A', 'MAT-B'], status: 'active', hiredAt: '2021-09-01', experience: 11,
    education: 'Oliy (magistr)', salaryType: 'percent', salaryValue: 40, note: 'Olimpiada o‘quvchilari bilan ishlaydi.',
  },
  {
    id: 'T-0002', firstName: 'Dilnoza', lastName: 'Yusupova', gender: 'female', birthDate: '1991-07-22',
    phone: '998931234502', address: 'Farg‘ona sh., Al-Farg‘oniy ko‘chasi', subjects: ['Fizika'],
    groups: ['FIZ-B'], status: 'active', hiredAt: '2022-02-10', experience: 8,
    education: 'Oliy (bakalavr)', salaryType: 'percent', salaryValue: 45, note: '',
  },
  {
    id: 'T-0003', firstName: 'Sevara', lastName: 'Nazarova', gender: 'female', birthDate: '1994-11-05',
    phone: '998941234503', address: 'Marg‘ilon sh., Burhoniddin ko‘chasi', subjects: ['Ingliz tili'],
    groups: ['ENG-C'], status: 'active', hiredAt: '2023-01-15', experience: 6,
    education: 'Oliy (bakalavr)', salaryType: 'percent', salaryValue: 40, note: 'IELTS 8.0 sertifikati bor.',
  },
  {
    id: 'T-0004', firstName: 'Jasur', lastName: 'Ergashev', gender: 'male', birthDate: '1990-01-30',
    phone: '998971234504', address: 'Farg‘ona sh., Marg‘iloniy ko‘chasi', subjects: ['Ingliz tili'],
    groups: ['ENG-E'], status: 'active', hiredAt: '2022-09-05', experience: 9,
    education: 'Oliy (magistr)', salaryType: 'fixed', salaryValue: 3_500_000, note: '',
  },
  {
    id: 'T-0005', firstName: 'Malika', lastName: 'Rahimova', gender: 'female', birthDate: '1989-05-18',
    phone: '998901234505', address: 'Qo‘qon sh., Turkiston ko‘chasi', subjects: ['Kimyo'],
    groups: ['KIM-D'], status: 'active', hiredAt: '2020-10-01', experience: 12,
    education: 'Oliy (magistr)', salaryType: 'percent', salaryValue: 45, note: 'Tibbiyot institutiga tayyorlaydi.',
  },
  {
    id: 'T-0006', firstName: 'Otabek', lastName: 'Sobirov', gender: 'male', birthDate: '1996-09-09',
    phone: '998881234506', address: 'Quvasoy sh., Navoiy ko‘chasi', subjects: ['Matematika', 'Fizika'],
    groups: [], status: 'vacation', hiredAt: '2024-03-01', experience: 4,
    education: 'Oliy (bakalavr)', salaryType: 'percent', salaryValue: 35, note: 'Noyabr oyida qaytadi.',
  },
  {
    id: 'T-0007', firstName: 'Zilola', lastName: 'Qodirova', gender: 'female', birthDate: '1993-12-02',
    phone: '998951234507', address: 'Farg‘ona sh., Yangi Turmush MFY', subjects: ['Ingliz tili', 'Kimyo'],
    groups: [], status: 'left', hiredAt: '2021-01-11', experience: 7,
    education: 'Oliy (bakalavr)', salaryType: 'percent', salaryValue: 40, note: '',
  },
];
