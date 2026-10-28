import { useCallback, useEffect, useRef, useState } from 'react';
import { getCourse } from '../students/studentsData';
import { createLogger } from '../../activity/activityStore';
import { createDemoCourses } from './coursesData';

// DEMO: ma'lumotlar brauzerda (localStorage) saqlanadi. Backend ulanganda faqat shu fayldagi
// funksiyalar API so‘rovlari (axios) bilan almashtiriladi — sahifalar kodi o‘zgarmaydi.
const STORAGE_KEY = 'edu-courses-v1';

export const loadCourses = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* buzilgan yoki mavjud bo‘lmagan ma'lumot */
  }
  return createDemoCourses();
};

/** Kursning joriy oylik narxi (Kurslar sahifasida o‘zgartirilgan bo‘lsa — shu, aks holda boshlang‘ich narx). */
export const getCourseFee = (name) => loadCourses().find((c) => c.name === name)?.fee ?? getCourse(name)?.fee ?? 0;

const log = createLogger({ module: 'courses', noun: 'Kurs', nameOf: (c) => c.name });

const nextId = (list) => {
  const max = list.reduce((m, c) => Math.max(m, Number(c.id.replace(/\D/g, '')) || 0), 0);
  return `C-${String(max + 1).padStart(4, '0')}`;
};

export const useCourses = () => {
  const [courses, setCourses] = useState(loadCourses);
  const latest = useRef(courses);

  useEffect(() => {
    latest.current = courses;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
    } catch {
      /* e'tiborsiz */
    }
  }, [courses]);

  const add = useCallback((data) => {
    const created = { ...data, id: nextId(latest.current) };
    setCourses((list) => [created, ...list]);
    log.created(created);
    return created;
  }, []);

  const update = useCallback((id, patch) => {
    log.updated(latest.current.find((c) => c.id === id), patch);
    setCourses((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  // O‘chirilgan yozuvlarni qaytaradi — "Qaytarish" (undo) uchun
  const remove = useCallback((ids) => {
    const set = new Set(ids);
    const removed = latest.current.filter((c) => set.has(c.id));
    setCourses((list) => list.filter((c) => !set.has(c.id)));
    log.deleted(removed);
    return removed;
  }, []);

  const restore = useCallback((items) => {
    log.restored(items);
    setCourses((list) => [...items, ...list.filter((c) => !items.some((i) => i.id === c.id))]);
  }, []);

  return { courses, add, update, remove, restore };
};
