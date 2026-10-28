// Dashboard uchun DEMO ma'lumotlar. Haqiqiy loyihada bu funksiyalar backend (API)
// so‘rovlari bilan almashtiriladi. Barcha pul qiymatlari so‘mda.

export const PERIODS = [
  { value: 'today', label: 'Bugun' },
  { value: 'week', label: '7 kun' },
  { value: 'month', label: '30 kun' },
  { value: 'year', label: '1 yil' },
  { value: 'all', label: 'Barcha vaqt' },
];

export const REVENUE_PERIODS = [
  { value: 'day', label: 'Kun' },
  { value: 'week', label: 'Hafta' },
  { value: 'month', label: 'Oy' },
  { value: 'year', label: 'Yil' },
];

// Tanlangan davr uchun tushum (DEMO)
const PERIOD_INCOME = {
  today: 12_400_000,
  week: 61_800_000,
  month: 234_000_000,
  year: 2_710_000_000,
  all: 8_950_000_000,
};

export const getPeriodLabel = (period) =>
  PERIODS.find((p) => p.value === period)?.label ?? '';

export const getStats = (period = 'month') => ({
  totalStudents: 1240,
  activeStudents: 980,
  totalTeachers: 45,
  extraTeachers: 8,
  activeGroups: 12,
  todayIncome: 12_400_000,
  periodIncome: PERIOD_INCOME[period] ?? PERIOD_INCOME.month,
  unpaidDebts: 31_500_000,
  // O‘tgan davrga nisbatan o‘zgarish, % (DEMO)
  changes: {
    totalStudents: 4.2,
    activeStudents: 2.8,
    todayIncome: 6.1,
    periodIncome: 8.4,
    unpaidDebts: -3.2,
  },
});

export const getStudentStats = () => [
  { name: '1-hafta', new: 20, active: 180, inactive: 10 },
  { name: '2-hafta', new: 30, active: 210, inactive: 5 },
  { name: '3-hafta', new: 25, active: 200, inactive: 8 },
  { name: '4-hafta', new: 22, active: 195, inactive: 7 },
];

export const getCourseDistribution = () => [
  { name: 'Matematika', value: 120 },
  { name: 'Fizika', value: 80 },
  { name: 'Ingliz tili', value: 150 },
  { name: 'Kimyo', value: 60 },
];

export const getPaymentsStatus = () => [
  { status: 'To‘langan', value: 70 },
  { status: 'Qisman to‘langan', value: 15 },
  { status: 'To‘lanmagan', value: 15 },
];

export const getRecentActivities = () => [
  { id: 1, type: 'newStudent', description: 'Aliyev A. ro‘yxatdan o‘tdi', time: '2026-10-18 10:15' },
  { id: 2, type: 'newGroup', description: 'Guruh "A" yaratildi', time: '2026-10-18 09:00' },
  { id: 3, type: 'payment', description: 'Berdiyev B. to‘lovi qabul qilindi', time: '2026-10-18 08:30' },
  { id: 4, type: 'teacherAssign', description: 'Gulova C. ustoz sifatida biriktirildi', time: '2026-10-18 07:45' },
];

// status: 'scheduled' | 'ongoing' | 'completed' | 'delayed'
export const getTodaySchedule = () => [
  { id: 1, time: '08:00', subject: 'Matematika', group: 'A', teacher: 'Aliyev A.', room: '101', status: 'completed' },
  { id: 2, time: '10:00', subject: 'Fizika', group: 'B', teacher: 'Berdiyev B.', room: '102', status: 'ongoing' },
  { id: 3, time: '13:00', subject: 'Ingliz tili', group: 'C', teacher: 'Gulova C.', room: '103', status: 'delayed' },
  { id: 4, time: '15:00', subject: 'Kimyo', group: 'D', teacher: 'Karimov D.', room: '104', status: 'scheduled' },
];

export const getAlerts = () => [
  { id: 1, level: 'warning', message: 'To‘lov muddati o‘tgan 3 nafar talaba' },
  { id: 2, level: 'error', message: 'Ustoz biriktirilmagan guruh topilmadi' },
  { id: 3, level: 'info', message: 'Bugungi darslar uchun 2 ta xona bo‘sh' },
];

// Daromad/xarajat grafigi (mln so‘m, DEMO). Deterministik — har yuklanishda o‘zgarmaydi.
export const getRevenueData = (period = 'month') => {
  switch (period) {
    case 'day':
      return [
        ['00:00', 0.2, 0.1], ['04:00', 0.4, 0.3], ['08:00', 0.6, 0.35], ['12:00', 0.8, 0.5],
        ['16:00', 1.0, 0.65], ['20:00', 1.2, 0.8], ['24:00', 1.4, 0.95],
      ].map(([label, income, expense]) => ({ label, income, expense }));
    case 'week':
      return [
        ['Du', 5.0, 4.0], ['Se', 6.0, 4.2], ['Chor', 5.5, 4.1], ['Pay', 6.2, 4.3],
        ['Ju', 7.0, 4.7], ['Sha', 4.0, 3.0], ['Yak', 4.5, 3.2],
      ].map(([label, income, expense]) => ({ label, income, expense }));
    case 'year':
      return [
        ['Yan', 20, 15], ['Fev', 21, 15.5], ['Mar', 25, 18], ['Apr', 24, 17],
        ['May', 26, 19], ['Iyn', 27, 20], ['Iyl', 28, 21], ['Avg', 29, 22],
        ['Sen', 30, 23], ['Okt', 31, 24], ['Noy', 32, 25], ['Dek', 33, 26],
      ].map(([label, income, expense]) => ({ label, income, expense }));
    default:
      return Array.from({ length: 30 }, (_, i) => ({
        label: String(i + 1),
        income: Number((6.5 + 1.4 * Math.sin(i / 2.3) + (i % 7 < 5 ? 0.6 : -0.9)).toFixed(1)),
        expense: Number((3.9 + 0.8 * Math.cos(i / 3)).toFixed(1)),
      }));
  }
};
