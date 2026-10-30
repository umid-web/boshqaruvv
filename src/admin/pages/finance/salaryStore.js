import { useCallback, useEffect, useState } from 'react';
import { createDemoStudents } from '../students/studentsData';
import { createDemoTeachers, getTeacherStats } from '../teachers/teachersData';
import { isoDate } from './financeStore';

// DEMO: localStorage. Backend ulanganda faqat shu fayl almashtiriladi.
const KEY = 'edu-salary-v1';

export const KINDS = {
  pay: { label: 'Maosh to‘lovi', sign: -1, tone: 'success' },
  advance: { label: 'Avans', sign: -1, tone: 'info' },
  bonus: { label: 'Mukofot (bonus)', sign: 1, tone: 'primary' },
  penalty: { label: 'Ushlanma (jarima)', sign: 1, tone: 'danger' },
};
export const SALARY_STATUSES = {
  paid: { label: 'To‘langan', tone: 'success' },
  partial: { label: 'Qisman', tone: 'warning' },
  unpaid: { label: 'Berilmagan', tone: 'danger' },
};

export const calcSalary = (base, entries) => {
  const sum = (kinds) => entries.filter((e) => kinds.includes(e.kind)).reduce((t, e) => t + e.amount, 0);
  const bonus = sum(['bonus']);
  const penalty = sum(['penalty']);
  const paid = sum(['pay', 'advance']);
  const due = Math.max(0, base + bonus - penalty);
  const left = due - paid;
  const status = paid > 0 && paid >= due ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
  return { base, bonus, penalty, due, paid, left, status, pct: due ? Math.min(100, Math.round((paid / due) * 100)) : 0 };
};

const seed = () => {
  const students = createDemoStudents();
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const out = createDemoTeachers().filter((t) => t.status !== 'left').map((t, i) => ({
    id: `SAL-S${i}`, teacherId: t.id, month: isoDate(prev).slice(0, 7), kind: 'pay', amount: getTeacherStats(t, students).salary,
    method: i % 2 ? 'Karta' : 'Naqd', date: isoDate(new Date(prev.getFullYear(), prev.getMonth() + 1, 3)), note: '',
  }));
  return out;
};

export const useSalary = () => {
  const [entries, setEntries] = useState(() => {
    try {
      const p = JSON.parse(localStorage.getItem(KEY));
      if (Array.isArray(p)) return p;
    } catch { /* buzilgan ma'lumot */ }
    return seed();
  });
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch { /* e'tiborsiz */ }
  }, [entries]);
  const add = useCallback((e) => setEntries((l) => [{ ...e, id: `SAL-${Date.now()}` }, ...l]), []);
  const remove = useCallback((id) => setEntries((l) => l.filter((e) => e.id !== id)), []);
  const restore = useCallback((e) => setEntries((l) => [e, ...l]), []);
  return { entries, add, remove, restore };
};
