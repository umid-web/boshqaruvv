// Kurslar uchun DEMO ma'lumotlar va hisob-kitoblar.
// Guruhlar (kodi, dars kunlari, xona) hozircha students/studentsData.js dagi GROUPS da — kurs ularni nomi bo‘yicha bog‘laydi.
// Shuning uchun kurs nomi guruh yoki talabasi bo‘lsa o‘zgartirilmaydi, o‘chirilmaydi (faqat arxivga o‘tkaziladi).

import { COURSES } from '../students/studentsData';
import { GROUP_LIST } from '../teachers/teachersData';

export const LEVELS = ['Boshlang‘ich', 'O‘rta', 'Yuqori', 'Barcha darajalar'];

export const COURSE_STATUSES = {
  active: { label: 'Faol', tone: 'success' },
  archived: { label: 'Arxivda', tone: 'muted' },
};
export const COURSE_STATUS_OPTIONS = Object.entries(COURSE_STATUSES).map(([value, { label }]) => ({ value, label }));

export const COURSE_COLORS = [
  { value: 'primary', label: 'Ko‘k' },
  { value: 'success', label: 'Yashil' },
  { value: 'warning', label: 'To‘q sariq' },
  { value: 'danger', label: 'Qizil' },
];

/** Kursga tegishli guruhlar (kod, kunlar, vaqt, xona). */
export const getCourseGroups = (name) => GROUP_LIST.filter((g) => g.course === name);

/**
 * Kurs bo‘yicha yig‘ma ko‘rsatkichlar. Talabalar, ustozlar va qo‘shimcha ustozlar faqat o‘qiladi.
 * `revenue` — faol talabalarning oylik to‘lovi yig‘indisi (kutilayotgan oylik tushum).
 */
export const getCourseStats = (course, students, teachers, supportTeachers) => {
  const groups = getCourseGroups(course.name);
  const codes = new Set(groups.map((g) => g.code));
  const all = students.filter((s) => s.course === course.name);
  const active = all.filter((s) => s.status === 'active');
  const works = (p) => p.status !== 'left' && p.groups.some((code) => codes.has(code));
  const mainTeachers = teachers.filter(works);
  const supportList = supportTeachers.filter(works);
  const withTeacher = new Set(mainTeachers.flatMap((t) => t.groups));

  return {
    groups,
    groupCount: groups.length,
    totalStudents: all.length,
    activeStudents: active.length,
    revenue: active.reduce((sum, s) => sum + s.monthlyFee, 0),
    debt: all.reduce((sum, s) => sum + (s.debt || 0), 0),
    avgAttendance: active.length ? Math.round(active.reduce((sum, s) => sum + s.attendance, 0) / active.length) : 0,
    weeklyLessons: groups.reduce((sum, g) => sum + g.days.length, 0),
    mainTeachers,
    supportList,
    groupsWithoutTeacher: groups.filter((g) => !withTeacher.has(g.code)).length,
  };
};

// ---------- DEMO ma'lumotlar ----------

const DETAILS = {
  Matematika: {
    description: 'Maktab dasturini mustahkamlash va test imtihonlariga tayyorgarlik: algebra, geometriya, mantiqiy masalalar.',
    level: 'Barcha darajalar', durationMonths: 9, lessonMinutes: 90, color: 'primary',
    topics: ['Sonlar va amallar', 'Tenglamalar va tengsizliklar', 'Funksiyalar va grafiklar', 'Planimetriya', 'Trigonometriya', 'Test mashqlari va olimpiada masalalari'],
  },
  Fizika: {
    description: 'Mexanika, elektr va optika bo‘limlari bo‘yicha nazariya va masalalar yechish. Oliy o‘quv yurtlariga kirishga tayyorlaydi.',
    level: 'O‘rta', durationMonths: 8, lessonMinutes: 90, color: 'warning',
    topics: ['Kinematika va dinamika', 'Saqlanish qonunlari', 'Molekulyar fizika', 'Elektr va magnetizm', 'Optika va to‘lqinlar', 'Atom fizikasi'],
  },
  'Ingliz tili': {
    description: 'Umumiy ingliz tili va IELTS yo‘nalishi: grammatika, speaking, listening, reading va writing ko‘nikmalari.',
    level: 'Boshlang‘ich', durationMonths: 12, lessonMinutes: 90, color: 'success',
    topics: ['Alifbo va asosiy so‘z boyligi', 'Present va Past zamonlar', 'Speaking club', 'Listening amaliyoti', 'Reading va Writing', 'IELTS mock testlari'],
  },
  Kimyo: {
    description: 'Umumiy va organik kimyo asoslari, masalalar yechish va laboratoriya amaliyoti. Tibbiyot yo‘nalishiga tayyorlaydi.',
    level: 'Yuqori', durationMonths: 8, lessonMinutes: 90, color: 'danger',
    topics: ['Atom tuzilishi', 'Kimyoviy bog‘lanish', 'Eritmalar va reaksiyalar', 'Noorganik birikmalar', 'Organik kimyo', 'Masalalar yechish'],
  },
};

export const createDemoCourses = () =>
  COURSES.map((c, i) => ({
    id: `C-${String(i + 1).padStart(4, '0')}`,
    name: c.name,
    fee: c.fee,
    status: 'active',
    createdAt: '2025-08-15',
    ...DETAILS[c.name],
  }));
