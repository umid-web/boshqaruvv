import { useCallback, useEffect, useRef, useState } from 'react';
import { diffObjects, logActivity } from '../../activity/activityStore';
import { formatSom } from '../../utils/format';
import { getPaymentHistory } from '../students/studentsData';

// DEMO: localStorage. Backend ulanganda faqat shu fayl API so‘rovlariga almashtiriladi.
const PAY_KEY = 'edu-payments-v1';
const EXP_KEY = 'edu-expenses-v1';

export const METHODS = ['Naqd', 'Karta', 'Payme', 'Click'];
export const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Ijara' },
  { value: 'salary', label: 'Ish haqi' },
  { value: 'utilities', label: 'Kommunal' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'supplies', label: 'Jihozlar' },
  { value: 'other', label: 'Boshqa' },
];
export const categoryLabel = (v) => EXPENSE_CATEGORIES.find((c) => c.value === v)?.label ?? v;

export const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const read = (key, seed) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* buzilgan ma'lumot */
  }
  return seed();
};

const useSaved = (key, seed) => {
  const [list, setList] = useState(() => read(key, seed));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(list));
    } catch {
      /* e'tiborsiz */
    }
  }, [key, list]);
  return [list, setList];
};

const payTitle = (p) => `${p.name} — ${formatSom(p.amount)}`;
const expTitle = (e) => `${e.title} — ${formatSom(e.amount)}`;

export const usePayments = (students) => {
  const [payments, setPayments] = useSaved(PAY_KEY, () =>
    students
      .flatMap((s) => getPaymentHistory(s).map((p) => ({ ...p, studentId: s.id, name: `${s.lastName} ${s.firstName}`, group: s.group })))
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
  const latest = useRef(payments);
  useEffect(() => {
    latest.current = payments;
  }, [payments]);

  const add = useCallback((p) => {
    const created = { ...p, id: `PAY-${Date.now()}` };
    setPayments((l) => [created, ...l]);
    logActivity({
      module: 'payments',
      action: 'payment',
      severity: 'success',
      title: `To‘lov qabul qilindi: ${payTitle(created)}`,
      entityId: created.id,
      entityName: created.name,
      meta: { Usul: created.method, Guruh: created.group, Davr: created.period ?? created.date?.slice(0, 7), Sana: created.date },
      notify: { category: 'payment', priority: 'normal', title: 'To‘lov qabul qilindi', message: `${created.name} · ${formatSom(created.amount)}${created.method ? ` (${created.method})` : ''}`, link: '/admin/payments' },
    });
    return created;
  }, [setPayments]);
  const remove = useCallback((id) => {
    const removed = latest.current.find((p) => p.id === id);
    setPayments((l) => l.filter((p) => p.id !== id));
    if (removed) {
      logActivity({
        module: 'payments',
        action: 'delete',
        severity: 'danger',
        title: `To‘lov bekor qilindi: ${payTitle(removed)}`,
        entityId: removed.id,
        entityName: removed.name,
        meta: { Usul: removed.method, Guruh: removed.group, Sana: removed.date },
        notify: { category: 'payment', priority: 'high', title: 'To‘lov bekor qilindi', message: `${payTitle(removed)} — summa qarzga qaytarildi`, link: '/admin/payments' },
      });
    }
  }, [setPayments]);
  const restore = useCallback((p) => {
    setPayments((l) => [p, ...l].sort((a, b) => b.date.localeCompare(a.date)));
    logActivity({ module: 'payments', action: 'restore', severity: 'info', title: `To‘lov qaytarildi: ${payTitle(p)}`, entityId: p.id, entityName: p.name });
  }, [setPayments]);
  return { payments, add, remove, restore };
};

export const useExpenses = () => {
  const [expenses, setExpenses] = useSaved(EXP_KEY, () => {
    const out = [];
    const now = new Date();
    for (let k = 0; k < 6; k++) {
      const m = new Date(now.getFullYear(), now.getMonth() - k, 1);
      const d = (day) => isoDate(new Date(m.getFullYear(), m.getMonth(), day));
      out.push(
        { id: `E${k}1`, title: 'Bino ijarasi', category: 'rent', amount: 12_000_000, date: d(2), note: '' },
        { id: `E${k}2`, title: 'Ustozlar ish haqi', category: 'salary', amount: 30_000_000 + ((k * 37) % 5) * 1_200_000, date: d(5), note: '' },
        { id: `E${k}3`, title: 'Elektr va internet', category: 'utilities', amount: 2_100_000 + ((k * 13) % 4) * 250_000, date: d(8), note: '' },
        { id: `E${k}4`, title: 'Reklama (Instagram, Telegram)', category: 'marketing', amount: 2_500_000 + ((k * 7) % 3) * 500_000, date: d(12), note: '' },
        { id: `E${k}5`, title: 'Marker, qog‘oz, jihozlar', category: 'supplies', amount: 900_000 + ((k * 11) % 3) * 300_000, date: d(15), note: '' },
      );
    }
    return out.filter((e) => e.date <= isoDate(now)).sort((a, b) => b.date.localeCompare(a.date));
  });
  const latest = useRef(expenses);
  useEffect(() => {
    latest.current = expenses;
  }, [expenses]);

  const add = useCallback((e) => {
    const created = { ...e, id: `EXP-${Date.now()}` };
    setExpenses((l) => [created, ...l].sort((a, b) => b.date.localeCompare(a.date)));
    logActivity({
      module: 'expenses',
      action: 'create',
      severity: 'success',
      title: `Xarajat qo‘shildi: ${expTitle(created)}`,
      entityId: created.id,
      entityName: created.title,
      meta: { Toifa: categoryLabel(created.category), Sana: created.date },
    });
  }, [setExpenses]);
  const remove = useCallback((id) => {
    const removed = latest.current.find((e) => e.id === id);
    setExpenses((l) => l.filter((e) => e.id !== id));
    if (removed) {
      logActivity({ module: 'expenses', action: 'delete', severity: 'danger', title: `Xarajat o‘chirildi: ${expTitle(removed)}`, entityId: removed.id, entityName: removed.title });
    }
  }, [setExpenses]);
  const update = useCallback((id, patch) => {
    const before = latest.current.find((e) => e.id === id);
    if (before) {
      const changes = diffObjects(before, patch);
      if (changes.length) {
        logActivity({ module: 'expenses', action: 'update', title: `Xarajat tahrirlandi: ${patch.title ?? before.title}`, entityId: id, entityName: patch.title ?? before.title, changes });
      }
    }
    setExpenses((l) => l.map((e) => (e.id === id ? { ...e, ...patch } : e)).sort((a, b) => b.date.localeCompare(a.date)));
  }, [setExpenses]);
  const restore = useCallback((e) => {
    setExpenses((l) => [e, ...l].sort((a, b) => b.date.localeCompare(a.date)));
    logActivity({ module: 'expenses', action: 'restore', severity: 'info', title: `Xarajat qaytarildi: ${expTitle(e)}`, entityId: e.id, entityName: e.title });
  }, [setExpenses]);
  return { expenses, add, remove, update, restore };
};
