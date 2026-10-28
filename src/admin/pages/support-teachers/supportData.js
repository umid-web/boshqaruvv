import { GROUPS } from '../students/studentsData';
import { GROUP_LIST, SUBJECTS, findScheduleConflict, teacherName } from '../teachers/teachersData';

export { GROUP_LIST, SUBJECTS, findScheduleConflict, teacherName };

export const SUPPORT_ROLES = {
  assistant: { label: 'Yordamchi ustoz', tone: 'primary', hint: 'Dars vaqtida asosiy ustozga yordam beradi' },
  mentor: { label: 'Mentor', tone: 'info', hint: 'Talabalar bilan individual ishlaydi, uy vazifasini kuzatadi' },
  substitute: { label: 'O‘rinbosar ustoz', tone: 'warning', hint: 'Asosiy ustoz yo‘q kunlarda dars o‘tadi' },
};
export const SUPPORT_ROLE_OPTIONS = Object.entries(SUPPORT_ROLES).map(([value, { label }]) => ({ value, label }));

export const SUPPORT_STATUSES = {
  active: { label: 'Ishlamoqda', tone: 'success' },
  vacation: { label: 'Ta‘tilda', tone: 'info' },
  left: { label: 'Ketgan', tone: 'muted' },
};
export const SUPPORT_STATUS_OPTIONS = Object.entries(SUPPORT_STATUSES).map(([value, { label }]) => ({ value, label }));

export const PAY_TYPES = [
  { value: 'perLesson', label: 'Har bir dars uchun' },
  { value: 'fixed', label: 'Qat’iy oylik' },
];

export const PAY_STATUSES = {
  unpaid: { label: 'To‘lanmagan', tone: 'danger' },
  partial: { label: 'Qisman to‘langan', tone: 'warning' },
  paid: { label: 'To‘langan', tone: 'success' },
};
export const PAY_STATUS_OPTIONS = Object.entries(PAY_STATUSES).map(([value, { label }]) => ({ value, label }));

export const WEEK_DAYS = [
  { value: 1, label: 'Du' },
  { value: 2, label: 'Se' },
  { value: 3, label: 'Chor' },
  { value: 4, label: 'Pay' },
  { value: 5, label: 'Juma' },
  { value: 6, label: 'Shan' },
];

const WEEKS_IN_MONTH = 4;

/** Qo‘shimcha ustozning haftalik darslari va taxminiy oyligi (faol talabalar bo‘yicha). */
export const getSupportStats = (person, students) => {
  const mine = students.filter((s) => person.groups.includes(s.group) && s.status === 'active');
  const weeklyLessons = person.groups.reduce((sum, code) => sum + (GROUPS[code]?.days.length ?? 0), 0);
  const monthlyLessons = weeklyLessons * WEEKS_IN_MONTH;
  const pay = person.payType === 'fixed' ? person.payValue : person.payValue * monthlyLessons;
  return { studentCount: mine.length, weeklyLessons, monthlyLessons, pay };
};

/** Tanlangan guruhlarning dars kunlari ustozning bo‘sh kunlariga to‘g‘ri kelmasa — birinchi nomuvofiq guruhni qaytaradi. */
export const findAvailabilityConflict = (groupCodes, availableDays) => {
  if (!availableDays.length) return null;
  return groupCodes.find((code) => GROUPS[code]?.days.some((d) => !availableDays.includes(d))) ?? null;
};

export const createDemoSupportTeachers = () => [
  {
    id: 'S-0001', firstName: 'Gulnora', lastName: 'Tursunova', gender: 'female', birthDate: '1999-04-12',
    phone: '998901112201', address: 'Farg‘ona sh., Mustaqillik ko‘chasi', role: 'assistant', subjects: ['Matematika'],
    groups: ['MAT-A', 'MAT-B'], availableDays: [1, 2, 3, 4, 5, 6], status: 'active', startedAt: '2024-09-02',
    payType: 'perLesson', payValue: 40_000, payStatus: 'paid', note: 'Pedagogika universiteti 4-kurs talabasi.',
  },
  {
    id: 'S-0002', firstName: 'Bekzod', lastName: 'Aliyev', gender: 'male', birthDate: '1997-08-25',
    phone: '998931112202', address: 'Marg‘ilon sh., Burhoniddin ko‘chasi', role: 'mentor', subjects: ['Ingliz tili'],
    groups: ['ENG-C', 'ENG-E'], availableDays: [], status: 'active', startedAt: '2024-02-12',
    payType: 'perLesson', payValue: 45_000, payStatus: 'partial', note: 'Speaking club olib boradi.',
  },
  {
    id: 'S-0003', firstName: 'Nigora', lastName: 'Hasanova', gender: 'female', birthDate: '1998-01-19',
    phone: '998941112203', address: 'Farg‘ona sh., Al-Farg‘oniy ko‘chasi', role: 'assistant', subjects: ['Fizika', 'Kimyo'],
    groups: ['FIZ-B', 'KIM-D'], availableDays: [], status: 'active', startedAt: '2025-01-20',
    payType: 'fixed', payValue: 1_800_000, payStatus: 'unpaid', note: '',
  },
  {
    id: 'S-0004', firstName: 'Sherzod', lastName: 'Normatov', gender: 'male', birthDate: '1994-06-03',
    phone: '998971112204', address: 'Quvasoy sh., Navoiy ko‘chasi', role: 'substitute', subjects: ['Matematika', 'Fizika'],
    groups: [], availableDays: [1, 3, 5], status: 'active', startedAt: '2023-10-09',
    payType: 'perLesson', payValue: 60_000, payStatus: 'paid', note: 'Dushanba, chorshanba, juma kunlari chaqirish mumkin.',
  },
  {
    id: 'S-0005', firstName: 'Mohira', lastName: 'Odilova', gender: 'female', birthDate: '1996-11-30',
    phone: '998881112205', address: 'Qo‘qon sh., Turkiston ko‘chasi', role: 'mentor', subjects: ['Kimyo'],
    groups: ['KIM-D'], availableDays: [2, 4, 6], status: 'vacation', startedAt: '2024-05-06',
    payType: 'fixed', payValue: 2_200_000, payStatus: 'partial', note: 'Dekabrda qaytadi.',
  },
  {
    id: 'S-0006', firstName: 'Humoyun', lastName: 'Xolmatov', gender: 'male', birthDate: '2000-03-08',
    phone: '998951112206', address: 'Farg‘ona sh., Yangi Turmush MFY', role: 'assistant', subjects: ['Matematika'],
    groups: [], availableDays: [], status: 'left', startedAt: '2023-03-01',
    payType: 'perLesson', payValue: 35_000, payStatus: 'unpaid', note: '',
  },
];