// Foydalanuvchilar va rollar uchun DEMO ma'lumotlar, ruxsatlar katalogi va yordamchi funksiyalar.
// Ruxsat kaliti: `<bo‘lim>.<amal>` (masalan, `students.edit`). Bo‘limlar navigation.js dan olinadi,
// shuning uchun menyuga yangi sahifa qo‘shilsa, u ruxsatlar jadvalida avtomatik paydo bo‘ladi.

import { navSections } from '../../navigation';

/* ============ Amallar va bo‘limlar ============ */
export const ACTIONS = [
  { key: 'view', label: 'Ko‘rish' },
  { key: 'create', label: 'Qo‘shish' },
  { key: 'edit', label: 'Tahrirlash' },
  { key: 'delete', label: 'O‘chirish' },
  { key: 'export', label: 'Eksport' },
];
export const ACTION_LABEL = Object.fromEntries(ACTIONS.map((a) => [a.key, a.label]));

const FULL = ['view', 'create', 'edit', 'delete', 'export'];
const CRUD = ['view', 'create', 'edit', 'delete'];

// Har bir bo‘limda qanday amallar mavjudligi (qolganlari jadvalda "—" bo‘ladi)
const MODULE_ACTIONS = {
  dashboard: ['view'],
  students: FULL,
  teachers: FULL,
  'support-teachers': FULL,
  courses: CRUD,
  groups: CRUD,
  schedule: CRUD,
  attendance: ['view', 'edit', 'export'],
  finance: ['view', 'export'],
  payments: FULL,
  debts: ['view', 'export'],
  expenses: FULL,
  salaries: ['view'],
  reports: ['view', 'export'],
  notifications: ['view', 'create'],
  'users-roles': CRUD,
  settings: ['view', 'edit'],
  activity: ['view', 'export'],
};

export const PERMISSION_SECTIONS = navSections.map((section) => ({
  title: section.title,
  modules: section.items.map((item) => {
    const key = item.path || 'dashboard';
    return { key, label: item.label, icon: item.icon, actions: MODULE_ACTIONS[key] ?? ['view'] };
  }),
}));
export const MODULES = PERMISSION_SECTIONS.flatMap((s) => s.modules);

export const permKey = (moduleKey, action) => `${moduleKey}.${action}`;
export const ALL_PERMISSIONS = MODULES.flatMap((m) => m.actions.map((a) => permKey(m.key, a)));
const VALID_PERMISSIONS = new Set(ALL_PERMISSIONS);

/* ============ Ruxsatlarni o‘zgartirish (sof funksiyalar, yangi massiv qaytaradi) ============ */
// Qoida: "Ko‘rish" ruxsatisiz boshqa amal bo‘lmaydi.
export const togglePermission = (perms, moduleKey, action) => {
  const next = new Set(perms);
  const key = permKey(moduleKey, action);
  if (next.has(key)) {
    next.delete(key);
    if (action === 'view') MODULES.find((m) => m.key === moduleKey)?.actions.forEach((a) => next.delete(permKey(moduleKey, a)));
  } else {
    next.add(key);
    if (action !== 'view') next.add(permKey(moduleKey, 'view'));
  }
  return [...next];
};

export const setModulePermissions = (perms, moduleKey, on) => {
  const next = new Set(perms);
  MODULES.find((m) => m.key === moduleKey)?.actions.forEach((a) => (on ? next.add(permKey(moduleKey, a)) : next.delete(permKey(moduleKey, a))));
  return [...next];
};

export const setActionPermissions = (perms, action, on) => {
  const next = new Set(perms);
  MODULES.filter((m) => m.actions.includes(action)).forEach((m) => {
    if (on) {
      next.add(permKey(m.key, action));
      if (action !== 'view') next.add(permKey(m.key, 'view'));
    } else {
      next.delete(permKey(m.key, action));
      if (action === 'view') m.actions.forEach((a) => next.delete(permKey(m.key, a)));
    }
  });
  return [...next];
};

export const sameSet = (a, b) => {
  const sa = new Set(a);
  return sa.size === new Set(b).size && [...sa].every((x) => b.includes(x));
};

/* ============ Rollar ============ */
export const ROLE_TONES = [
  { value: 'primary', label: 'Ko‘k' },
  { value: 'success', label: 'Yashil' },
  { value: 'warning', label: 'To‘q sariq' },
  { value: 'info', label: 'Havorang' },
  { value: 'danger', label: 'Qizil' },
  { value: 'muted', label: 'Kulrang' },
];

// { students: 'all', groups: ['view', 'edit'] } ko‘rinishidagi yozuvdan ruxsatlar ro‘yxatini yasaydi
const grant = (spec) => {
  const out = new Set();
  for (const [moduleKey, actions] of Object.entries(spec)) {
    const def = MODULES.find((m) => m.key === moduleKey);
    if (!def) continue;
    const list = actions === 'all' ? def.actions : actions.filter((a) => def.actions.includes(a));
    list.forEach((a) => out.add(permKey(moduleKey, a)));
    if (list.length) out.add(permKey(moduleKey, 'view'));
  }
  return [...out];
};

const allModules = (except = {}) =>
  Object.fromEntries(MODULES.map((m) => [m.key, except[m.key] ?? 'all']));

// Tizim rollari: o‘chirib bo‘lmaydi; "Super admin" ruxsatlari o‘zgarmaydi (locked)
const SYSTEM_ROLES = [
  {
    id: 'owner', name: 'Super admin', tone: 'danger', locked: true,
    description: 'Tizim egasi: barcha bo‘limlar, sozlamalar va foydalanuvchilarga to‘liq kirish',
    permissions: () => ALL_PERMISSIONS,
  },
  {
    id: 'admin', name: 'Administrator', tone: 'primary',
    description: 'Barcha bo‘limlar bilan ishlaydi, lekin foydalanuvchi va rollarni faqat ko‘ra oladi',
    permissions: () => grant(allModules({ 'users-roles': ['view'] })),
  },
  {
    id: 'manager', name: 'Menejer', tone: 'success',
    description: 'O‘quv jarayoni: talabalar, guruhlar, jadval va davomat',
    permissions: () =>
      grant({
        dashboard: 'all', students: 'all', teachers: ['view'], 'support-teachers': ['view'], courses: ['view', 'edit'],
        groups: 'all', schedule: 'all', attendance: 'all', reports: 'all', notifications: 'all',
      }),
  },
  {
    id: 'accountant', name: 'Buxgalter', tone: 'warning',
    description: 'Moliya: to‘lovlar, qarzdorlik, xarajatlar va moliyaviy hisobotlar',
    permissions: () =>
      grant({
        dashboard: 'all', students: ['view', 'export'], finance: 'all', payments: 'all', debts: 'all', expenses: 'all', reports: 'all',
      }),
  },
  {
    id: 'reception', name: 'Qabul xodimi', tone: 'info',
    description: 'Yangi talabalarni ro‘yxatga oladi va to‘lovlarni qabul qiladi',
    permissions: () =>
      grant({
        dashboard: 'all', students: ['view', 'create', 'edit'], groups: ['view'], courses: ['view'], schedule: ['view'], attendance: ['view', 'edit'],
        payments: ['view', 'create', 'delete', 'export'], debts: ['view'],
      }),
  },
  {
    id: 'teacher', name: 'Ustoz', tone: 'muted',
    description: 'O‘z o‘quvchilari, jadvali, davomat, to‘lov holati va ish haqi',
    permissions: () =>
      grant({ dashboard: ['view'], students: ['view'], schedule: ['view'], attendance: ['view'], payments: ['view'], salaries: ['view'] }),
  },
];

export const createDefaultRoles = () =>
  SYSTEM_ROLES.map(({ permissions, ...role }) => ({ ...role, system: true, permissions: permissions() }));

/** Tizim rolining boshlang‘ich ruxsatlari ("Asl holatga qaytarish" uchun). Maxsus rolda — null. */
export const defaultPermissions = (roleId) => SYSTEM_ROLES.find((r) => r.id === roleId)?.permissions() ?? null;

/** Saqlangan rollarni tekshiradi: eskirgan ruxsatlar olib tashlanadi, Super admin doim to‘liq ruxsatli. */
export const normalizeRoles = (roles) => {
  const cleaned = roles
    .filter((r) => r && typeof r.id === 'string' && typeof r.name === 'string')
    .map((r) => ({
      ...r,
      description: r.description ?? '',
      tone: r.tone ?? 'primary',
      system: Boolean(r.system),
      locked: r.id === 'owner',
      permissions: r.id === 'owner' ? ALL_PERMISSIONS : (r.permissions ?? []).filter((p) => VALID_PERMISSIONS.has(p)),
    }));
  return cleaned.some((r) => r.id === 'owner') ? cleaned : [...createDefaultRoles().filter((r) => r.id === 'owner'), ...cleaned];
};

export const roleHas = (role, moduleKey, action = 'view') => Boolean(role?.permissions.includes(permKey(moduleKey, action)));

/** Rolning ruxsatlari bo‘limlar bo‘yicha: profil panelida ko‘rsatish uchun. */
export const summarizePermissions = (role) => {
  const set = new Set(role?.permissions ?? []);
  const modules = MODULES.filter((m) => set.has(permKey(m.key, 'view'))).map((m) => ({
    key: m.key,
    label: m.label,
    icon: m.icon,
    actions: m.actions.filter((a) => set.has(permKey(m.key, a))).map((a) => ACTION_LABEL[a]),
    full: m.actions.every((a) => set.has(permKey(m.key, a))),
  }));
  return { count: set.size, total: ALL_PERMISSIONS.length, modules };
};

/* ============ Foydalanuvchilar ============ */
export const USER_STATUSES = {
  active: { label: 'Faol', tone: 'success' },
  blocked: { label: 'Bloklangan', tone: 'danger' },
};
export const USER_STATUS_OPTIONS = Object.entries(USER_STATUSES).map(([value, { label }]) => ({ value, label }));

export const userName = (u) => `${u.lastName} ${u.firstName}`;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Faol Super adminlar soni — tizim "qulflanib" qolmasligi uchun kamida bittasi bo‘lishi shart. */
export const activeOwnerCount = (users) => users.filter((u) => u.roleId === 'owner' && u.status === 'active').length;

export const createDemoUsers = () => [
  { id: 'U-0001', firstName: 'Anvar', lastName: 'Karimov', email: 'anvar@educontrol.uz', phone: '998901112233', roleId: 'owner', status: 'active', createdAt: '2025-01-10', lastLoginAt: '2026-10-27 08:42', note: 'Markaz direktori' },
  { id: 'U-0002', firstName: 'Dilnoza', lastName: 'Rahimova', email: 'dilnoza@educontrol.uz', phone: '998901112244', roleId: 'admin', status: 'active', createdAt: '2025-02-03', lastLoginAt: '2026-10-27 09:15', note: '' },
  { id: 'U-0003', firstName: 'Sardor', lastName: 'Yusupov', email: 'sardor@educontrol.uz', phone: '998931234567', roleId: 'manager', status: 'active', createdAt: '2025-03-18', lastLoginAt: '2026-10-26 17:30', note: 'O‘quv bo‘limi mudiri' },
  { id: 'U-0004', firstName: 'Madina', lastName: 'Qodirova', email: 'madina@educontrol.uz', phone: '998941234500', roleId: 'accountant', status: 'active', createdAt: '2025-04-07', lastLoginAt: '2026-10-26 16:05', note: '' },
  { id: 'U-0005', firstName: 'Jasur', lastName: 'Toshpulatov', email: 'jasur@educontrol.uz', phone: '998971110022', roleId: 'reception', status: 'active', createdAt: '2025-06-21', lastLoginAt: '2026-10-25 12:48', note: '' },
  { id: 'U-0006', firstName: 'Nigora', lastName: 'Ergasheva', email: 'nigora@educontrol.uz', phone: '998901230099', roleId: 'reception', status: 'active', createdAt: '2025-09-01', lastLoginAt: '2026-10-27 08:58', note: 'Ikkinchi smena' },
  { id: 'U-0007', firstName: 'Bobur', lastName: 'Mirzaev', email: 'bobur@educontrol.uz', phone: '998911112288', roleId: 'teacher', status: 'active', createdAt: '2025-09-12', lastLoginAt: '2026-10-24 19:20', note: '' },
  { id: 'U-0008', firstName: 'Shahnoza', lastName: 'Abdullayeva', email: 'shahnoza@educontrol.uz', phone: '998901119900', roleId: 'teacher', status: 'active', createdAt: '2026-10-22', lastLoginAt: '', note: '' },
  { id: 'U-0009', firstName: 'Otabek', lastName: 'Nazarov', email: 'otabek@educontrol.uz', phone: '', roleId: 'accountant', status: 'blocked', createdAt: '2025-05-14', lastLoginAt: '2026-08-02 11:10', note: 'Ishdan ketgan' },
];
