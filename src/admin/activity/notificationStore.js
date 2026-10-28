import { useSyncExternalStore } from 'react';

// DEMO: bildirishnomalar brauzerda (localStorage) saqlanadi. Backend ulanganda faqat shu fayldagi
// funksiyalar API (axios yoki WebSocket) bilan almashtiriladi — sahifalar va qo‘ng‘iroqcha kodi o‘zgarmaydi.
//
// Bildirishnoma: { id, at, category, priority, title, message, link, read, key?, activityId? }
//  - key: takrorlanmasligi uchun (masalan, "debts:2026-10-27" — kuniga bir marta)
//  - link: bosilganda ochiladigan sahifa (/admin/...)

const KEY = 'edu-notifications-v1';
const MAX = 200;

const uid = () => `N-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const demoSeed = () => {
  const now = Date.now();
  const ago = (min) => new Date(now - min * 60_000).toISOString();
  return [
    { category: 'payment', priority: 'high', title: 'To‘lov muddati o‘tgan talabalar', message: '14 nafar talaba, jami 18,7 mln so‘m qarz', link: '/admin/debts', at: ago(25), read: false },
    { category: 'payment', priority: 'normal', title: 'To‘lov qabul qilindi', message: 'Karimova Madina · 450 000 so‘m (Click)', link: '/admin/payments', at: ago(95), read: false },
    { category: 'attendance', priority: 'normal', title: 'Davomat past', message: '6 nafar faol talabaning davomati 70% dan past', link: '/admin/attendance', at: ago(60 * 5), read: false },
    { category: 'student', priority: 'low', title: 'Yangi talaba qo‘shildi', message: 'Rahimov Jasur · Matematika, MAT-A', link: '/admin/students', at: ago(60 * 26), read: true },
    { category: 'security', priority: 'high', title: 'Foydalanuvchi bloklandi', message: 'Qodirov Sherzod hisobi bloklandi', link: '/admin/users-roles', at: ago(60 * 30), read: true },
    { category: 'system', priority: 'low', title: 'Sozlamalar yangilandi', message: 'Bildirishnoma sozlamalari o‘zgartirildi', link: '/admin/settings', at: ago(60 * 52), read: true },
  ].map((n, i) => ({ ...n, id: `N-demo-${i + 1}`, demo: true }));
};

const read = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return demoSeed();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* buzilgan ma'lumot */
  }
  return demoSeed();
};

const buildSnapshot = (items) => ({
  items,
  unread: items.reduce((n, x) => n + (x.read ? 0 : 1), 0),
  urgent: items.reduce((n, x) => n + (!x.read && x.priority === 'high' ? 1 : 0), 0),
});

let snapshot = buildSnapshot(read());
const listeners = new Set();

const commit = (items) => {
  snapshot = buildSnapshot(items.slice(0, MAX));
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot.items));
  } catch {
    /* kvota yoki private rejim */
  }
  listeners.forEach((l) => l());
};

// Boshqa oynada (tab) o‘zgarsa — shu yerda ham yangilanadi
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    snapshot = buildSnapshot(read());
    listeners.forEach((l) => l());
  });
  // Birinchi ochilishda demo ma'lumotlar ham saqlansin
  if (localStorage.getItem(KEY) === null) commit(snapshot.items);
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => snapshot;

/** { items, unread, urgent } — o‘zgarganda komponent qayta chiziladi. */
export const useNotifications = () => useSyncExternalStore(subscribe, getSnapshot);

/** Yangi bildirishnoma. `key` berilsa va shunday bildirishnoma mavjud bo‘lsa — qo‘shilmaydi. */
export const pushNotification = ({ category = 'system', priority = 'normal', title, message = '', link = '', key, activityId }) => {
  if (key && snapshot.items.some((n) => n.key === key)) return null;
  const created = { id: uid(), at: new Date().toISOString(), category, priority, title, message, link, read: false, key, activityId };
  commit([created, ...snapshot.items]);
  return created;
};

export const markRead = (ids, value = true) => {
  const set = new Set([].concat(ids));
  commit(snapshot.items.map((n) => (set.has(n.id) && n.read !== value ? { ...n, read: value } : n)));
};

export const markAllRead = () => commit(snapshot.items.map((n) => (n.read ? n : { ...n, read: true })));

/** O‘chirilgan yozuvlarni qaytaradi — "Qaytarish" (undo) uchun. */
export const removeNotifications = (ids) => {
  const set = new Set([].concat(ids));
  const removed = snapshot.items.filter((n) => set.has(n.id));
  commit(snapshot.items.filter((n) => !set.has(n.id)));
  return removed;
};

export const restoreNotifications = (items) => {
  const have = new Set(snapshot.items.map((n) => n.id));
  const merged = [...snapshot.items, ...items.filter((n) => !have.has(n.id))];
  commit(merged.sort((a, b) => b.at.localeCompare(a.at)));
};

export const clearRead = () => {
  const removed = snapshot.items.filter((n) => n.read);
  commit(snapshot.items.filter((n) => !n.read));
  return removed;
};
