import {
  Banknote,
  BookOpen,
  Cake,
  CalendarDays,
  ClipboardCheck,
  Cog,
  CreditCard,
  Download,
  GraduationCap,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Undo2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';

// Faoliyat tarixi va bildirishnomalar uchun yagona ma'lumotnoma (yorliq, ikonka, rang).
// Ranglar admin.scss dagi tonlarga mos: primary | success | warning | danger | info | muted.

/** Bo‘limlar (faoliyat qaysi sahifada sodir bo‘lgani). path — /admin ga nisbatan. */
export const MODULES = {
  students: { label: 'Talabalar', icon: GraduationCap, tone: 'primary', path: 'students' },
  teachers: { label: 'Ustozlar', icon: UserCheck, tone: 'success', path: 'teachers' },
  support: { label: 'Qo‘shimcha ustozlar', icon: UserPlus, tone: 'info', path: 'support-teachers' },
  courses: { label: 'Kurslar', icon: BookOpen, tone: 'warning', path: 'courses' },
  groups: { label: 'Guruhlar', icon: Users, tone: 'primary', path: 'groups' },
  schedule: { label: 'Dars jadvali', icon: CalendarDays, tone: 'info', path: 'schedule' },
  attendance: { label: 'Davomat', icon: ClipboardCheck, tone: 'success', path: 'attendance' },
  payments: { label: 'To‘lovlar', icon: CreditCard, tone: 'success', path: 'payments' },
  expenses: { label: 'Xarajatlar', icon: Banknote, tone: 'warning', path: 'expenses' },
  salaries: { label: 'Ish haqi', icon: Banknote, tone: 'primary', path: 'salaries' },
  users: { label: 'Foydalanuvchilar', icon: ShieldCheck, tone: 'danger', path: 'users-roles' },
  roles: { label: 'Rollar', icon: KeyRound, tone: 'danger', path: 'users-roles' },
  settings: { label: 'Sozlamalar', icon: Settings, tone: 'muted', path: 'settings' },
  system: { label: 'Tizim', icon: Cog, tone: 'muted', path: '' },
};

export const MODULE_OPTIONS = Object.entries(MODULES).map(([value, m]) => ({ value, label: m.label }));
export const moduleOf = (key) => MODULES[key] ?? MODULES.system;

/** Amal turlari. */
export const ACTIONS = {
  create: { label: 'Yaratildi', icon: Plus, tone: 'success' },
  update: { label: 'Tahrirlandi', icon: Pencil, tone: 'primary' },
  delete: { label: 'O‘chirildi', icon: Trash2, tone: 'danger' },
  restore: { label: 'Qaytarildi', icon: Undo2, tone: 'info' },
  status: { label: 'Holat o‘zgardi', icon: RefreshCw, tone: 'warning' },
  payment: { label: 'To‘lov', icon: CreditCard, tone: 'success' },
  save: { label: 'Saqlandi', icon: Save, tone: 'primary' },
  export: { label: 'Eksport', icon: Download, tone: 'info' },
  security: { label: 'Xavfsizlik', icon: ShieldAlert, tone: 'danger' },
  system: { label: 'Tizim', icon: Cog, tone: 'muted' },
};

export const ACTION_OPTIONS = Object.entries(ACTIONS).map(([value, a]) => ({ value, label: a.label }));
export const actionOf = (key) => ACTIONS[key] ?? ACTIONS.system;

/** Bildirishnoma toifalari. */
export const CATEGORIES = {
  payment: { label: 'To‘lovlar', icon: CreditCard, tone: 'success' },
  student: { label: 'Talabalar', icon: GraduationCap, tone: 'primary' },
  attendance: { label: 'Davomat', icon: ClipboardCheck, tone: 'warning' },
  birthday: { label: 'Tug‘ilgan kunlar', icon: Cake, tone: 'info' },
  security: { label: 'Xavfsizlik', icon: ShieldAlert, tone: 'danger' },
  system: { label: 'Tizim', icon: Cog, tone: 'muted' },
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORIES).map(([value, c]) => ({ value, label: c.label }));
export const categoryOf = (key) => CATEGORIES[key] ?? CATEGORIES.system;

/** Muhimlik darajalari. */
export const PRIORITIES = {
  high: { label: 'Muhim', tone: 'danger' },
  normal: { label: 'Oddiy', tone: 'info' },
  low: { label: 'Past', tone: 'muted' },
};

export const PRIORITY_OPTIONS = Object.entries(PRIORITIES).map(([value, p]) => ({ value, label: p.label }));
