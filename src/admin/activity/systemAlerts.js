import { createDemoStudents } from '../pages/students/studentsData';
import { loadSettings } from '../pages/settings/settingsStore';
import { formatMoney } from '../utils/format';
import { pushNotification } from './notificationStore';
import { toDayKey } from './time';

// Tizim o‘zi hosil qiladigan eslatmalar (qarzdorlik, tug‘ilgan kun, past davomat).
// Har biri `key` bilan — bir kunda (yoki oyda) faqat bir marta yaratiladi.
// Backend ulanganda bu hisob-kitoblar serverda bajariladi va bildirishnoma tayyor keladi.

const STUDENTS_KEY = 'edu-students-v1';
const LOW_ATTENDANCE = 70;

const loadStudents = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STUDENTS_KEY));
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* buzilgan yoki mavjud bo‘lmagan ma'lumot */
  }
  return createDemoStudents();
};

const fullName = (s) => `${s.lastName} ${s.firstName}`;

const namesLine = (list, max = 3) => {
  const names = list.slice(0, max).map(fullName).join(', ');
  return list.length > max ? `${names} va yana ${list.length - max} nafar` : names;
};

export const syncSystemAlerts = () => {
  const prefs = loadSettings().notifications;
  const students = loadStudents();
  const day = toDayKey(Date.now());
  const month = day.slice(0, 7);

  if (prefs.paymentReminders) {
    const debtors = students.filter((s) => s.status === 'active' && s.debt > 0);
    if (debtors.length) {
      const sum = debtors.reduce((total, s) => total + s.debt, 0);
      pushNotification({
        key: `debts:${day}`,
        category: 'payment',
        priority: 'high',
        title: 'To‘lov muddati o‘tgan talabalar',
        message: `${debtors.length} nafar talaba, jami ${formatMoney(sum)} qarz`,
        link: '/admin/debts',
      });
    }
  }

  if (prefs.attendanceAlerts) {
    const low = students.filter((s) => s.status === 'active' && s.attendance < LOW_ATTENDANCE);
    if (low.length) {
      pushNotification({
        key: `low-attendance:${month}`,
        category: 'attendance',
        priority: 'normal',
        title: 'Davomat past',
        message: `${low.length} nafar faol talabaning davomati ${LOW_ATTENDANCE}% dan past`,
        link: '/admin/attendance',
      });
    }
  }

  if (prefs.birthdayReminders) {
    const mmdd = day.slice(5);
    const today = students.filter((s) => s.status === 'active' && String(s.birthDate ?? '').slice(5) === mmdd);
    if (today.length) {
      pushNotification({
        key: `birthday:${day}`,
        category: 'birthday',
        priority: 'low',
        title: 'Bugun tug‘ilgan kun',
        message: namesLine(today),
        link: '/admin/students',
      });
    }
  }
};
