import { useSyncExternalStore } from 'react';
import { formatNumber, formatPhone } from '../utils/format';
import { pushNotification } from './notificationStore';

// DEMO: faoliyat tarixi brauzerda (localStorage) saqlanadi. Backend ulanganda faqat shu fayldagi
// logActivity() va o‘qish funksiyalari API so‘rovlariga almashtiriladi (audit log serverda yoziladi).
//
// Yozuv: { id, at, actor, module, action, title, entityId, entityName, changes, items, severity, meta }
//  - changes: [{ field, label, from, to }] — tahrirlashda nima nimaga o‘zgargani
//  - items:   [{ id, name }] — ommaviy amallarda (masalan, 5 ta talaba o‘chirildi) ta’sirlangan yozuvlar
//  - severity: info | success | warning | danger

const KEY = 'edu-activity-v1';
const MAX = 1000;

// Hozircha tizimda login yo‘q — keyinchalik haqiqiy foydalanuvchi bilan almashtiriladi.
export const getActor = () => ({ id: 'U-ADMIN', name: 'Administrator', role: 'Admin' });

/* ====================== Maydonlarni o‘qiladigan ko‘rinishga keltirish ====================== */

const FIELD_LABELS = {
  firstName: 'Ism', lastName: 'Familiya', gender: 'Jinsi', birthDate: 'Tug‘ilgan sana',
  phone: 'Telefon', parentPhone: 'Ota-ona telefoni', address: 'Manzil', email: 'Email',
  course: 'Kurs', group: 'Guruh', groups: 'Guruhlar', subjects: 'Fanlar', status: 'Holati',
  monthlyFee: 'Oylik to‘lov', fee: 'Narx', debt: 'Qarz', amount: 'Summa', salaryType: 'Maosh turi',
  salaryValue: 'Maosh', enrolledAt: 'Qo‘shilgan sana', hiredAt: 'Ishga olingan sana',
  experience: 'Tajriba (yil)', education: 'Ma’lumoti', attendance: 'Davomat (%)', note: 'Izoh',
  days: 'Dars kunlari', start: 'Boshlanishi', end: 'Tugashi', room: 'Xona', capacity: 'Sig‘im',
  startDate: 'Boshlanish sanasi', name: 'Nomi', title: 'Sarlavha', category: 'Toifa', date: 'Sana',
  method: 'To‘lov usuli', roleId: 'Rol', color: 'Rang', tone: 'Rang', description: 'Tavsif',
  duration: 'Davomiyligi', durationMonths: 'Davomiyligi (oy)', lessonMinutes: 'Dars davomiyligi (daq.)',
  topics: 'Mavzular', level: 'Daraja', teacher: 'Ustoz', teachers: 'Ustozlar',
  permissions: 'Ruxsatlar', period: 'Davr', theme: 'Mavzu', density: 'Zichlik', language: 'Til',
  dateFormat: 'Sana formati', currency: 'Valyuta', timezone: 'Vaqt mintaqasi',
};

const STATUS_LABELS = {
  active: 'Faol', frozen: 'Muzlatilgan', graduated: 'Bitirgan', dropped: 'Chiqib ketgan',
  vacation: 'Ta‘tilda', left: 'Ketgan', archived: 'Arxivda', invited: 'Taklif yuborilgan', blocked: 'Bloklangan',
};

const GENDER_LABELS = { male: 'O‘g‘il bola', female: 'Qiz bola' };
const WEEKDAYS = { 0: 'Yak', 1: 'Du', 2: 'Se', 3: 'Chor', 4: 'Pay', 5: 'Juma', 6: 'Shan' };
const MONEY_KEYS = new Set(['monthlyFee', 'fee', 'debt', 'amount']);
const PHONE_KEYS = new Set(['phone', 'parentPhone']);

export const fieldLabel = (key) => FIELD_LABELS[key] ?? key;

export const formatValue = (key, value) => {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Ha' : 'Yo‘q';
  if (key === 'days' && Array.isArray(value)) return value.map((d) => WEEKDAYS[d] ?? d).join(', ') || '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return 'o‘zgartirildi';
  if (key === 'status' && STATUS_LABELS[value]) return STATUS_LABELS[value];
  if (key === 'gender' && GENDER_LABELS[value]) return GENDER_LABELS[value];
  if (PHONE_KEYS.has(key)) return formatPhone(value);
  if (MONEY_KEYS.has(key) && typeof value === 'number') return `${formatNumber(value)} so‘m`;
  const text = String(value);
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
};

const same = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');

/** Tahrirlashda faqat haqiqatan o‘zgargan maydonlar ro‘yxati. `patch` — yangi qiymatlar. */
export const diffObjects = (before, patch, { ignore = [], labels = {} } = {}) => {
  const skip = new Set(ignore);
  return Object.keys(patch)
    .filter((k) => !skip.has(k) && !same(before?.[k], patch[k]))
    .map((k) => ({
      field: k,
      label: labels[k] ?? fieldLabel(k),
      from: formatValue(k, before?.[k]),
      to: formatValue(k, patch[k]),
    }));
};

/* ====================== Do‘kon (store) ====================== */

const uid = () => `A-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Birinchi ochilishda sahifa bo‘sh ko‘rinmasligi uchun DEMO yozuvlar (backend ulanganda olib tashlanadi)
const demoSeed = () => {
  const now = Date.now();
  const ago = (min) => new Date(now - min * 60_000).toISOString();
  const actor = getActor();
  const rows = [
    [18, 'students', 'create', 'Talaba qo‘shildi: Rahimov Jasur', 'ST-0065', 'Rahimov Jasur', 'success'],
    [44, 'payments', 'payment', 'To‘lov qabul qilindi: Karimova Madina — 450 000 so‘m', 'PAY-1', 'Karimova Madina', 'success'],
    [130, 'groups', 'update', 'Guruh tahrirlandi: MAT-A', 'MAT-A', 'MAT-A', 'info',
      [{ field: 'capacity', label: 'Sig‘im', from: '14', to: '16' }]],
    [60 * 5, 'attendance', 'save', 'MAT-A · davomat saqlandi (12/14)', 'MAT-A', 'MAT-A', 'info'],
    [60 * 7, 'students', 'status', 'Talaba holati o‘zgartirildi: Muzlatilgan', 'ST-0012', 'Yusupova Nodira', 'warning',
      [{ field: 'status', label: 'Holati', from: 'Faol', to: 'Muzlatilgan' }]],
    [60 * 26, 'users', 'security', 'Foydalanuvchi bloklandi: Qodirov Sherzod', 'U-0004', 'Qodirov Sherzod', 'danger',
      [{ field: 'status', label: 'Holati', from: 'Faol', to: 'Bloklangan' }]],
    [60 * 29, 'expenses', 'create', 'Xarajat qo‘shildi: Elektr va internet — 2 350 000 so‘m', 'EXP-1', 'Elektr va internet', 'success'],
    [60 * 31, 'teachers', 'update', 'Ustoz ma’lumotlari tahrirlandi: Karimov Rustam', 'T-0001', 'Karimov Rustam', 'info',
      [{ field: 'salaryValue', label: 'Maosh', from: '40', to: '42' }]],
    [60 * 50, 'students', 'delete', 'Talaba o‘chirildi: Sobirov Doston', 'ST-0031', 'Sobirov Doston', 'danger'],
    [60 * 52, 'settings', 'save', 'Sozlamalar saqlandi', '', '', 'info',
      [{ field: 'notifications.telegram', label: 'Bildirishnomalar: Telegram', from: 'Yo‘q', to: 'Ha' }]],
    [60 * 74, 'courses', 'update', 'Kurs tahrirlandi: Ingliz tili', 'C-0003', 'Ingliz tili', 'info',
      [{ field: 'fee', label: 'Narx', from: '550 000 so‘m', to: '600 000 so‘m' }]],
    [60 * 98, 'system', 'export', 'Eksport: talabalar.csv', '', 'talabalar.csv', 'info'],
  ];
  return rows.map(([min, module, action, title, entityId, entityName, severity, changes = []], i) => ({
    id: `A-demo-${i + 1}`,
    at: ago(min),
    actor,
    module,
    action,
    title,
    entityId,
    entityName,
    changes,
    items: [],
    severity,
    meta: null,
    demo: true,
  }));
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

let state = read();
const listeners = new Set();

const commit = (next) => {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* kvota yoki private rejim */
  }
  listeners.forEach((l) => l());
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    state = read();
    listeners.forEach((l) => l());
  });
  if (localStorage.getItem(KEY) === null) commit(state);
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => state;

/** Barcha yozuvlar (yangisi birinchi). O‘zgarganda komponent qayta chiziladi. */
export const useActivities = () => useSyncExternalStore(subscribe, getSnapshot);

/**
 * Faoliyatni yozib qo‘yadi. `notify` berilsa — shu bilan birga bildirishnoma ham yaratiladi:
 * notify: { category, priority, title, message, link }
 */
export const logActivity = ({
  module = 'system',
  action = 'update',
  title,
  entityId = '',
  entityName = '',
  changes = [],
  items = [],
  severity = 'info',
  meta = null,
  notify = null,
}) => {
  const entry = {
    id: uid(),
    at: new Date().toISOString(),
    actor: getActor(),
    module,
    action,
    title,
    entityId: String(entityId ?? ''),
    entityName,
    changes: changes.slice(0, 40),
    items: items.slice(0, 100),
    severity,
    meta,
  };
  commit([entry, ...state].slice(0, MAX));
  if (notify) pushNotification({ ...notify, activityId: entry.id });
  return entry;
};

/** Tarixni tozalaydi va bu haqda bitta yozuv qoldiradi (audit uchun). */
export const clearActivities = () => {
  const count = state.length;
  commit([]);
  logActivity({
    module: 'system',
    action: 'system',
    title: `Faoliyat tarixi tozalandi (${count} ta yozuv)`,
    severity: 'warning',
    notify: { category: 'security', priority: 'normal', title: 'Faoliyat tarixi tozalandi', message: `${count} ta yozuv o‘chirildi`, link: '/admin/activity' },
  });
};

/* ====================== CRUD do‘konlari uchun tayyor yordamchi ====================== */

const bulkTitle = (count, noun, verb) => `${count} ta ${noun.toLowerCase()} ${verb}`;

/**
 * Har bir do‘kon (students, teachers, ...) uchun bitta marta sozlanadi:
 *   const log = createLogger({ module: 'students', noun: 'Talaba', nameOf: (s) => `${s.lastName} ${s.firstName}`, ignore: ['debt'] });
 *   log.created(item) · log.updated(before, patch) · log.deleted(items) · log.restored(items) · log.statusChanged(items, status)
 */
export const createLogger = ({ module, noun, nameOf, idOf = (x) => x.id, ignore = [], moduleFor = null, notifyCreate = null, labels = {} }) => {
  const lower = noun.toLowerCase();
  const itemsOf = (list) => list.map((x) => ({ id: String(idOf(x)), name: nameOf(x) }));

  return {
    created(item) {
      return logActivity({
        module,
        action: 'create',
        severity: 'success',
        title: `${noun} qo‘shildi: ${nameOf(item)}`,
        entityId: idOf(item),
        entityName: nameOf(item),
        notify: notifyCreate ? notifyCreate(item) : null,
      });
    },

    updated(before, patch) {
      if (!before) return null;
      const changes = diffObjects(before, patch, { ignore, labels });
      if (!changes.length) return null;
      const after = { ...before, ...patch };
      return logActivity({
        module: moduleFor ? moduleFor(patch) : module,
        action: 'update',
        title: `${noun} ma’lumotlari tahrirlandi: ${nameOf(after)}`,
        entityId: idOf(after),
        entityName: nameOf(after),
        changes,
      });
    },

    deleted(list, { notifyBulkFrom = 3 } = {}) {
      if (!list.length) return null;
      const single = list.length === 1;
      return logActivity({
        module,
        action: 'delete',
        severity: 'danger',
        title: single ? `${noun} o‘chirildi: ${nameOf(list[0])}` : bulkTitle(list.length, noun, 'o‘chirildi'),
        entityId: single ? idOf(list[0]) : '',
        entityName: single ? nameOf(list[0]) : '',
        items: single ? [] : itemsOf(list),
        notify: list.length >= notifyBulkFrom
          ? { category: 'system', priority: 'high', title: 'Ommaviy o‘chirish', message: bulkTitle(list.length, noun, 'o‘chirildi'), link: '/admin/activity' }
          : null,
      });
    },

    restored(list) {
      if (!list.length) return null;
      const single = list.length === 1;
      return logActivity({
        module,
        action: 'restore',
        severity: 'info',
        title: single ? `${noun} qaytarildi: ${nameOf(list[0])}` : bulkTitle(list.length, noun, 'qaytarildi'),
        entityId: single ? idOf(list[0]) : '',
        entityName: single ? nameOf(list[0]) : '',
        items: single ? [] : itemsOf(list),
      });
    },

    /** statusLabel — "Muzlatilgan" kabi o‘qiladigan yorliq. */
    statusChanged(list, status, statusLabel, field = 'status') {
      const changed = list.filter((x) => x[field] !== status);
      if (!changed.length) return null;
      const single = changed.length === 1;
      const label = statusLabel ?? formatValue('status', status);
      return logActivity({
        module,
        action: 'status',
        severity: status === 'blocked' || status === 'dropped' ? 'danger' : 'warning',
        title: single
          ? `${noun} holati o‘zgartirildi: ${nameOf(changed[0])} → ${label}`
          : `${changed.length} ta ${lower} holati o‘zgartirildi → ${label}`,
        entityId: single ? idOf(changed[0]) : '',
        entityName: single ? nameOf(changed[0]) : '',
        changes: single ? [{ field, label: fieldLabel(field), from: formatValue(field, changed[0][field]), to: label }] : [],
        items: single ? [] : itemsOf(changed),
      });
    },
  };
};
