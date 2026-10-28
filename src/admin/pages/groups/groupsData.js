// Guruhlar uchun doimiy qiymatlar, hisob-kitoblar va tekshiruvlar.
//
// Guruh jadvali (kunlar, vaqt, xona) boshqa sahifalarda `students/studentsData.js` dagi GROUPS orqali o‘qiladi.
// Shuning uchun guruhlar o‘zgarganda `applyGroupsRegistry()` shu umumiy ro‘yxatlarni joyida yangilaydi —
// Talabalar, Ustozlar, Qo‘shimcha ustozlar va Kurslar sahifalari kodini o‘zgartirish shart emas.
//
// Ustoz biriktirishlar: asosiy ustoz — `teacher.groups`, qo‘shimcha ustozlar — `person.groups`
// (ikkala do‘konda ham avvalgidek). Guruhlar sahifasi shularni yagona manba sifatida o‘qiydi va yozadi.

import { ALL_GROUPS, COURSES, GROUPS, getGroup } from '../students/studentsData';
import { GROUP_LIST, groupsOverlap, teacherName } from '../teachers/teachersData';
import { WEEK_DAYS } from '../support-teachers/supportData';

export { WEEK_DAYS, teacherName };

export const DEFAULT_CAPACITY = 15;

export const GROUP_STATUSES = {
  active: { label: 'Faol', tone: 'success' },
  archived: { label: 'Arxivda', tone: 'muted' },
};
export const GROUP_STATUS_OPTIONS = Object.entries(GROUP_STATUSES).map(([value, { label }]) => ({ value, label }));

// Boshlang‘ich (statik) guruhlar — registry hali o‘zgartirilmagan paytda olinadi.
const SEED = Object.entries(GROUPS).map(([code, g]) => ({
  code,
  course: g.course,
  days: [...g.days],
  start: g.start,
  end: g.end,
  room: g.room,
  capacity: DEFAULT_CAPACITY,
  startDate: '2025-09-01',
  status: 'active',
  note: '',
}));

export const createDemoGroups = () => SEED.map((g) => ({ ...g, days: [...g.days] }));

/** Umumiy ro‘yxatlarni (GROUPS, GROUP_LIST, ALL_GROUPS, COURSES[].groups) guruhlar bilan moslashtiradi. */
export const applyGroupsRegistry = (list) => {
  for (const code of Object.keys(GROUPS)) delete GROUPS[code];
  for (const g of list) GROUPS[g.code] = { course: g.course, days: [...g.days], start: g.start, end: g.end, room: g.room };

  const active = list.filter((g) => g.status === 'active');
  GROUP_LIST.length = 0;
  GROUP_LIST.push(...active.map((g) => getGroup(g.code)));

  for (const course of COURSES) course.groups = active.filter((g) => g.course === course.name).map((g) => g.code);
  ALL_GROUPS.length = 0;
  ALL_GROUPS.push(...COURSES.flatMap((c) => c.groups));
};

/** Yangi guruh uchun kod taklifi: kursning mavjud prefiksi + birinchi bo‘sh harf (MAT-A → MAT-C). */
export const suggestCode = (course, groups) => {
  const sibling = groups.find((g) => g.course === course);
  const letters = course.replace(/[^A-Za-z]/g, '').toUpperCase();
  const prefix = sibling ? sibling.code.split('-')[0] : letters.slice(0, 3) || 'GRP';
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    if (!groups.some((g) => g.code === `${prefix}-${ch}`)) return `${prefix}-${ch}`;
  }
  return `${prefix}-${groups.length + 1}`;
};

export const formatDays = (days) => [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => WEEK_DAYS.find((w) => w.value === d)?.label ?? '').join(' · ');
export const formatGroupSchedule = (g) => `${formatDays(g.days)}, ${g.start}–${g.end}`;

// ---------- Jamoa (ustozlar) ----------

/** Guruhning asosiy ustozi va qo‘shimcha ustozlari (ketganlar hisobga olinmaydi). */
export const getGroupTeam = (code, teachers, supportTeachers) => ({
  main: teachers.find((t) => t.status !== 'left' && t.groups.includes(code)) ?? null,
  support: supportTeachers.filter((p) => p.status !== 'left' && p.groups.includes(code)),
});

export const getGroupStats = (group, students) => {
  const all = students.filter((s) => s.group === group.code);
  const active = all.filter((s) => s.status === 'active');
  return {
    totalStudents: all.length,
    activeStudents: active.length,
    fill: group.capacity ? Math.round((active.length / group.capacity) * 100) : 0,
    revenue: active.reduce((sum, s) => sum + s.monthlyFee, 0),
    debt: all.reduce((sum, s) => sum + (s.debt || 0), 0),
    avgAttendance: active.length ? Math.round(active.reduce((sum, s) => sum + s.attendance, 0) / active.length) : 0,
  };
};

// ---------- Tekshiruvlar ----------

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const isValidRange = (start, end) => Boolean(start && end) && toMinutes(start) < toMinutes(end);

/** Ustozning boshqa guruhlaridan biri `draft` bilan bir vaqtda bo‘lsa — shu guruh kodi. */
const scheduleClash = (person, draft) => {
  const other = person.groups
    .filter((c) => c !== draft.code)
    .map(getGroup)
    .filter(Boolean)
    .find((g) => groupsOverlap(g, draft));
  return other?.code ?? null;
};

/** Asosiy ustoz uchun to‘siq (matn) yoki null. Fan mos kelishi tanlov ro‘yxatida allaqachon filtrlangan. */
export const mainTeacherProblem = (teacher, draft) => {
  const clash = scheduleClash(teacher, draft);
  return clash ? `${clash} bilan dars vaqti kesishadi` : null;
};

/** Qo‘shimcha ustoz uchun to‘siq: vaqt kesishishi yoki ish kunlariga mos kelmaslik (bo‘sh ish kunlari — istalgan kun). */
export const supportProblem = (person, draft) => {
  const clash = scheduleClash(person, draft);
  if (clash) return `${clash} bilan dars vaqti kesishadi`;
  const off = person.availableDays?.length && draft.days.some((d) => !person.availableDays.includes(d));
  return off ? 'dars kunlari ish kunlariga mos kelmaydi' : null;
};

/** Bir xil xonada vaqti kesishadigan boshqa faol guruh (bo‘lsa). */
export const findRoomConflict = (groups, draft) =>
  groups.find((g) => g.code !== draft.code && g.status === 'active' && g.room.trim().toLowerCase() === draft.room.trim().toLowerCase() && groupsOverlap(g, draft)) ?? null;

/** Fan mos va ishdan ketmagan ustozlar (asosiy / qo‘shimcha ro‘yxatlar uchun). */
export const eligiblePeople = (list, course) => list.filter((p) => p.status !== 'left' && p.subjects.includes(course));
