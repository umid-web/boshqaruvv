import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger } from '../../activity/activityStore';
import { GROUP_STATUSES, applyGroupsRegistry, createDemoGroups } from './groupsData';

// DEMO: ma'lumotlar brauzerda (localStorage) saqlanadi. Backend ulanganda faqat shu fayldagi
// funksiyalar API so‘rovlari (axios) bilan almashtiriladi — sahifalar kodi o‘zgarmaydi.
const STORAGE_KEY = 'edu-groups-v1';

export const loadGroups = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* buzilgan yoki mavjud bo‘lmagan ma'lumot */
  }
  return createDemoGroups();
};

// Dars vaqti/xonasi o‘zgarsa — "Dars jadvali" bo‘limi, qolgan hammasi — "Guruhlar"
const SCHEDULE_KEYS = new Set(['days', 'start', 'end', 'room']);
const log = createLogger({
  module: 'groups',
  noun: 'Guruh',
  nameOf: (g) => g.code,
  idOf: (g) => g.code,
  moduleFor: (patch) => (Object.keys(patch).every((k) => SCHEDULE_KEYS.has(k)) ? 'schedule' : 'groups'),
});

// Ilova ochilishi bilan (App.jsx bu faylni darhol import qiladi) umumiy guruh ro‘yxatlari yangilanadi —
// shundan keyin Talabalar, Ustozlar va Kurslar sahifalari saqlangan guruhlarni ko‘radi.
applyGroupsRegistry(loadGroups());

export const useGroups = () => {
  const [groups, setGroups] = useState(loadGroups);
  const latest = useRef(groups);

  useEffect(() => {
    latest.current = groups;
    applyGroupsRegistry(groups);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    } catch {
      /* e'tiborsiz */
    }
  }, [groups]);

  // Guruh kodi — yagona kalit (o‘zgarmaydi)
  const add = useCallback((data) => {
    setGroups((list) => [data, ...list]);
    log.created(data);
    return data;
  }, []);

  const update = useCallback((code, patch) => {
    log.updated(latest.current.find((g) => g.code === code), patch);
    setGroups((list) => list.map((g) => (g.code === code ? { ...g, ...patch } : g)));
  }, []);

  // O‘chirilgan yozuvlarni qaytaradi — "Qaytarish" (undo) uchun
  const remove = useCallback((codes) => {
    const set = new Set(codes);
    const removed = latest.current.filter((g) => set.has(g.code));
    setGroups((list) => list.filter((g) => !set.has(g.code)));
    log.deleted(removed);
    return removed;
  }, []);

  const restore = useCallback((items) => {
    log.restored(items);
    setGroups((list) => [...items, ...list.filter((g) => !items.some((i) => i.code === g.code))]);
  }, []);

  const setStatus = useCallback((codes, status) => {
    const set = new Set(codes);
    log.statusChanged(latest.current.filter((g) => set.has(g.code)), status, GROUP_STATUSES[status]?.label);
    setGroups((list) => list.map((g) => (set.has(g.code) ? { ...g, status } : g)));
  }, []);

  return { groups, add, update, remove, restore, setStatus };
};
