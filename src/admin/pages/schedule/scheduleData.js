// Dars jadvali uchun sof hisob-kitoblar: ustoz/xona qatorlari, band va bo‘sh vaqt, ziddiyatlar.
// Manba — Guruhlar (jadval, xona) va ustozlarga biriktirilgan guruhlar; bu fayl hech narsani saqlamaydi.

import { teacherName } from '../teachers/teachersData';
import { SUPPORT_ROLES } from '../support-teachers/supportData';

export const SCHEDULE_DAYS = [
  { value: 1, short: 'Du', full: 'Dushanba' },
  { value: 2, short: 'Se', full: 'Seshanba' },
  { value: 3, short: 'Chor', full: 'Chorshanba' },
  { value: 4, short: 'Pay', full: 'Payshanba' },
  { value: 5, short: 'Juma', full: 'Juma' },
  { value: 6, short: 'Shan', full: 'Shanba' },
];

export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export const fmtDuration = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} daq`;
  return m ? `${h} soat ${m} daq` : `${h} soat`;
};

/** Vaqt chizig‘i oralig‘i: kamida 08:00–20:00, darslar tashqariga chiqsa — butun soatgacha kengayadi. */
export const getRange = (groups) => {
  let start = 8 * 60;
  let end = 20 * 60;
  for (const g of groups) {
    if (g.status !== 'active') continue;
    start = Math.min(start, Math.floor(toMin(g.start) / 60) * 60);
    end = Math.max(end, Math.ceil(toMin(g.end) / 60) * 60);
  }
  return { start, end };
};

const byStart = (a, b) => toMin(a.start) - toMin(b.start);

/**
 * Qatorlar: har biri bitta ustoz yoki bitta xona va unga tegishli faol guruhlar (darslar).
 * mode: 'teacher' (asosiy + qo‘shimcha ustozlar) | 'room'
 */
export const buildRows = (mode, groups, teachers, supportTeachers) => {
  const active = groups.filter((g) => g.status === 'active');

  if (mode === 'room') {
    const rooms = [...new Set(active.map((g) => g.room))].sort((a, b) => a.localeCompare(b, 'uz', { numeric: true }));
    return rooms.map((room) => {
      const lessons = active.filter((g) => g.room === room);
      return { key: `room:${room}`, kind: 'room', title: room, subtitle: `${lessons.length} ta guruh`, status: 'active', lessons };
    });
  }

  const forPerson = (p) => active.filter((g) => p.groups.includes(g.code));
  const main = teachers
    .filter((t) => t.status !== 'left')
    .map((t) => ({
      key: t.id, kind: 'main', title: teacherName(t), subtitle: `Asosiy ustoz · ${t.subjects.join(', ')}`, status: t.status, lessons: forPerson(t),
    }));
  const support = supportTeachers
    .filter((p) => p.status !== 'left')
    .map((p) => ({
      key: p.id, kind: 'support', title: teacherName(p), subtitle: `${SUPPORT_ROLES[p.role]?.label ?? 'Qo‘shimcha ustoz'} · ${p.subjects.join(', ')}`, status: p.status, lessons: forPerson(p),
    }));
  return [...main, ...support].sort((a, b) => a.title.localeCompare(b.title, 'uz'));
};

export const lessonsOn = (row, day) => row.lessons.filter((g) => g.days.includes(day)).sort(byStart);

const overlap = (a, b) => toMin(a.start) < toMin(b.end) && toMin(b.start) < toMin(a.end);

/** Bir kun ichidagi darslar orasida vaqti kesishgan juftliklar: [[a, b], …] */
export const findDayConflicts = (lessons) => {
  const out = [];
  for (let i = 0; i < lessons.length; i++) {
    for (let j = i + 1; j < lessons.length; j++) {
      if (overlap(lessons[i], lessons[j])) out.push([lessons[i], lessons[j]]);
    }
  }
  return out;
};

const mergeBusy = (lessons) => {
  const merged = [];
  for (const g of [...lessons].sort(byStart)) {
    const s = toMin(g.start);
    const e = toMin(g.end);
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  return merged;
};

export const busyMinutes = (lessons) => mergeBusy(lessons).reduce((sum, [s, e]) => sum + (e - s), 0);

/** Bo‘sh oraliqlar [[boshlanish, tugash], …] (daqiqada), `minLen` dan qisqalari hisobga olinmaydi. */
export const freeSlots = (lessons, range, minLen = 30) => {
  const out = [];
  let cursor = range.start;
  for (const [s, e] of mergeBusy(lessons)) {
    if (s - cursor >= minLen) out.push([cursor, s]);
    cursor = Math.max(cursor, e);
  }
  if (range.end - cursor >= minLen) out.push([cursor, range.end]);
  return out;
};

/** Barcha qator va kunlar bo‘yicha ziddiyatlar (to‘g‘ri sozlangan ma'lumotda bo‘lmasligi kerak). */
export const findAllConflicts = (rowsByMode) => {
  const list = [];
  for (const [mode, rows] of Object.entries(rowsByMode)) {
    for (const row of rows) {
      for (const day of SCHEDULE_DAYS) {
        for (const [a, b] of findDayConflicts(lessonsOn(row, day.value))) {
          list.push({ mode, row: row.title, day: day.full, a: a.code, b: b.code, rowKey: row.key, dayValue: day.value });
        }
      }
    }
  }
  return list;
};
