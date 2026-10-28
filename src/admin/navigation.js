import {
  LayoutDashboard,
  GraduationCap,
  UserCheck,
  UserPlus,
  BookOpen,
  Users,
  CalendarDays,
  ClipboardCheck,
  Wallet,
  CreditCard,
  Receipt,
  Banknote,
  FileText,
  Bell,
  ShieldCheck,
  Settings,
  History,
} from 'lucide-react';

// Yagona manba: Sidebar menyusi ham, App marshrutlari ham shu yerdan olinadi.
// `path` — /admin ga nisbatan; bo‘sh qator — dashboard (index) sahifa.
export const navSections = [
  {
    title: 'Asosiy',
    items: [{ path: '', label: 'Boshqaruv paneli', icon: LayoutDashboard }],
  },
  {
    title: 'O‘quv jarayoni',
    items: [
      { path: 'students', label: 'Talabalar', icon: GraduationCap },
      { path: 'teachers', label: 'Ustozlar', icon: UserCheck },
      { path: 'support-teachers', label: 'Qo‘shimcha ustozlar', icon: UserPlus },
      { path: 'courses', label: 'Kurslar', icon: BookOpen },
      { path: 'groups', label: 'Guruhlar', icon: Users },
      { path: 'schedule', label: 'Dars jadvali', icon: CalendarDays },
      { path: 'attendance', label: 'Davomat', icon: ClipboardCheck },
    ],
  },
  {
    title: 'Moliya',
    items: [
      { path: 'finance', label: 'Moliya', icon: Wallet },
      { path: 'payments', label: 'To‘lovlar', icon: CreditCard },
      { path: 'debts', label: 'Qarzdorlik', icon: Receipt },
      { path: 'expenses', label: 'Xarajatlar', icon: Banknote },
    ],
  },
  {
    title: 'Tizim',
    items: [
      { path: 'reports', label: 'Hisobotlar', icon: FileText },
      { path: 'notifications', label: 'Bildirishnomalar', icon: Bell },
      { path: 'users-roles', label: 'Foydalanuvchilar va rollar', icon: ShieldCheck },
      { path: 'settings', label: 'Sozlamalar', icon: Settings },
      { path: 'activity', label: 'Faoliyat tarixi', icon: History },
    ],
  },
];

export const navItems = navSections.flatMap((s) => s.items);
