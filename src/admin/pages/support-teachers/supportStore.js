import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger } from '../../activity/activityStore';
import { SUPPORT_STATUSES, createDemoSupportTeachers } from './supportData';

// DEMO: ma'lumotlar brauzerda (localStorage) saqlanadi. Backend ulanganda faqat shu fayldagi
// funksiyalar API so‘rovlari (axios) bilan almashtiriladi — sahifalar kodi o‘zgarmaydi.
const STORAGE_KEY = 'edu-support-teachers-v1';

/** Qo‘shimcha ustozlarni bir marta o‘qiydi (boshqa sahifalar ko‘rsatish uchun ishlatishi mumkin). */
export const loadSupportTeachers = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* buzilgan yoki mavjud bo‘lmagan ma'lumot */
  }
  return createDemoSupportTeachers();
};

/** Guruhga biriktirilgan (ishlayotgan va ta‘tildagi) qo‘shimcha ustozlar. */
export const findSupportByGroup = (list, code) => list.filter((p) => p.status !== 'left' && p.groups.includes(code));

const log = createLogger({ module: 'support', noun: 'Qo‘shimcha ustoz', nameOf: (p) => `${p.lastName} ${p.firstName}` });

const nextId = (list) => {
  const max = list.reduce((m, p) => Math.max(m, Number(p.id.replace(/\D/g, '')) || 0), 0);
  return `S-${String(max + 1).padStart(4, '0')}`;
};

export const useSupportTeachers = () => {
  const [items, setItems] = useState(loadSupportTeachers);
  const latest = useRef(items);

  useEffect(() => {
    latest.current = items;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* e'tiborsiz */
    }
  }, [items]);

  const add = useCallback((data) => {
    const created = { ...data, id: nextId(latest.current) };
    setItems((list) => [created, ...list]);
    log.created(created);
    return created;
  }, []);

  const update = useCallback((id, patch) => {
    log.updated(latest.current.find((p) => p.id === id), patch);
    setItems((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  // O‘chirilgan yozuvlarni qaytaradi — "Qaytarish" (undo) uchun
  const remove = useCallback((ids) => {
    const set = new Set(ids);
    const removed = latest.current.filter((p) => set.has(p.id));
    setItems((list) => list.filter((p) => !set.has(p.id)));
    log.deleted(removed);
    return removed;
  }, []);

  const restore = useCallback((restored) => {
    log.restored(restored);
    setItems((list) => [...restored, ...list.filter((p) => !restored.some((r) => r.id === p.id))]);
  }, []);

  const setStatus = useCallback((ids, status) => {
    const set = new Set(ids);
    log.statusChanged(latest.current.filter((p) => set.has(p.id)), status, SUPPORT_STATUSES[status]?.label);
    setItems((list) => list.map((p) => (set.has(p.id) ? { ...p, status } : p)));
  }, []);

  return { supportTeachers: items, add, update, remove, restore, setStatus };
};
