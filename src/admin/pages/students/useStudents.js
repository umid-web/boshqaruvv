import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger, logActivity } from '../../activity/activityStore';
import { STATUSES, createDemoStudents } from './studentsData';

// DEMO: ma'lumotlar brauzerda (localStorage) saqlanadi. Backend ulanganda bu hook
// ichidagi funksiyalar API so‘rovlari (axios) bilan almashtiriladi — sahifa kodi o‘zgarmaydi.
const STORAGE_KEY = 'edu-students-v1';

const load = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* buzilgan yoki mavjud bo‘lmagan ma'lumot */
  }
  return createDemoStudents();
};

// Faoliyat tarixi: talabalar ro‘yxatidagi har bir o‘zgarish shu yerda yoziladi.
// "debt" va "attendance" avtomatik hisoblanadi (to‘lov/davomat bilan), shuning uchun alohida yozilmaydi.
const log = createLogger({
  module: 'students',
  noun: 'Talaba',
  nameOf: (s) => `${s.lastName} ${s.firstName}`,
  ignore: ['debt', 'attendance'],
  notifyCreate: (s) => ({
    category: 'student',
    priority: 'low',
    title: 'Yangi talaba qo‘shildi',
    message: `${s.lastName} ${s.firstName} · ${s.course}, ${s.group}`,
    link: '/admin/students',
  }),
});

const nextId = (list) => {
  const max = list.reduce((m, s) => Math.max(m, Number(s.id.replace(/\D/g, '')) || 0), 0);
  return `ST-${String(max + 1).padStart(4, '0')}`;
};

export const useStudents = () => {
  const [students, setStudents] = useState(load);
  const latest = useRef(students);

  useEffect(() => {
    latest.current = students;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    } catch {
      /* e'tiborsiz */
    }
  }, [students]);

  const add = useCallback((data) => {
    const created = { ...data, id: nextId(latest.current) };
    setStudents((list) => [created, ...list]);
    log.created(created);
    return created;
  }, []);

  const update = useCallback((id, patch) => {
    log.updated(latest.current.find((s) => s.id === id), patch);
    setStudents((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  // O‘chirilgan yozuvlarni qaytaradi — "Qaytarish" (undo) uchun
  const remove = useCallback((ids) => {
    const set = new Set(ids);
    const removed = latest.current.filter((s) => set.has(s.id));
    setStudents((list) => list.filter((s) => !set.has(s.id)));
    log.deleted(removed);
    return removed;
  }, []);

  const restore = useCallback((items) => {
    log.restored(items);
    setStudents((list) => [...items, ...list.filter((s) => !items.some((i) => i.id === s.id))]);
  }, []);

  const setStatus = useCallback((ids, status) => {
    const set = new Set(ids);
    log.statusChanged(latest.current.filter((s) => set.has(s.id)), status, STATUSES[status]?.label);
    setStudents((list) => list.map((s) => (set.has(s.id) ? { ...s, status } : s)));
  }, []);

  const resetDemo = useCallback(() => {
    setStudents(createDemoStudents());
    logActivity({ module: 'students', action: 'system', severity: 'warning', title: 'Talabalar ro‘yxati DEMO holatga qaytarildi' });
  }, []);

  return { students, add, update, remove, restore, setStatus, resetDemo };
};
