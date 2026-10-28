import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger, logActivity } from '../../activity/activityStore';
import { TEACHER_STATUSES, createDemoTeachers } from './teachersData';

// DEMO: ma'lumotlar brauzerda (localStorage) saqlanadi. Backend ulanganda faqat shu fayldagi
// funksiyalar API so‘rovlari (axios) bilan almashtiriladi — sahifalar kodi o‘zgarmaydi.
const STORAGE_KEY = 'edu-teachers-v1';

/** Ustozlarni bir marta o‘qiydi (talabalar formasi/profili ustoz nomini ko‘rsatish uchun ishlatadi). */
export const loadTeachers = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* buzilgan yoki mavjud bo‘lmagan ma'lumot */
  }
  return createDemoTeachers();
};

/** Guruh kodiga ko‘ra ustozni topadi (yo‘q bo‘lsa — null). */
export const findTeacherByGroup = (teachers, code) => teachers.find((t) => t.groups.includes(code)) ?? null;

const log = createLogger({ module: 'teachers', noun: 'Ustoz', nameOf: (t) => `${t.lastName} ${t.firstName}` });

const nextId = (list) => {
  const max = list.reduce((m, t) => Math.max(m, Number(t.id.replace(/\D/g, '')) || 0), 0);
  return `T-${String(max + 1).padStart(4, '0')}`;
};

export const useTeachers = () => {
  const [teachers, setTeachers] = useState(loadTeachers);
  const latest = useRef(teachers);

  useEffect(() => {
    latest.current = teachers;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(teachers));
    } catch {
      /* e'tiborsiz */
    }
  }, [teachers]);

  const add = useCallback((data) => {
    const created = { ...data, id: nextId(latest.current) };
    setTeachers((list) => [created, ...list]);
    log.created(created);
    return created;
  }, []);

  const update = useCallback((id, patch) => {
    log.updated(latest.current.find((t) => t.id === id), patch);
    setTeachers((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  // O‘chirilgan yozuvlarni qaytaradi — "Qaytarish" (undo) uchun
  const remove = useCallback((ids) => {
    const set = new Set(ids);
    const removed = latest.current.filter((t) => set.has(t.id));
    setTeachers((list) => list.filter((t) => !set.has(t.id)));
    log.deleted(removed);
    return removed;
  }, []);

  const restore = useCallback((items) => {
    log.restored(items);
    setTeachers((list) => [...items, ...list.filter((t) => !items.some((i) => i.id === t.id))]);
  }, []);

  const setStatus = useCallback((ids, status) => {
    const set = new Set(ids);
    log.statusChanged(latest.current.filter((t) => set.has(t.id)), status, TEACHER_STATUSES[status]?.label);
    setTeachers((list) => list.map((t) => (set.has(t.id) ? { ...t, status } : t)));
  }, []);

  const resetDemo = useCallback(() => {
    setTeachers(createDemoTeachers());
    logActivity({ module: 'teachers', action: 'system', severity: 'warning', title: 'Ustozlar ro‘yxati DEMO holatga qaytarildi' });
  }, []);

  return { teachers, add, update, remove, restore, setStatus, resetDemo };
};
