import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, AlertTriangle, Banknote, Download, Plus, Receipt, Search, TrendingUp, Wallet } from 'lucide-react';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/useToast';
import { downloadCsv } from '../../utils/csv';
import { formatDate, formatMoney, formatPhone, formatSom } from '../../utils/format';
import { useStudents } from '../students/useStudents';
import { PAYMENT_STATUSES, getPaymentStatus } from '../students/studentsData';
import { EXPENSE_CATEGORIES, METHODS, categoryLabel, isoDate, useExpenses, usePayments } from './financeStore';
import '../students/Students.scss';
import './Finance.scss';

export const TABS = [
  { to: '/admin/finance', label: 'Umumiy ko‘rinish', icon: Wallet, end: true },
  { to: '/admin/payments', label: 'To‘lovlar', icon: Receipt },
  { to: '/admin/debts', label: 'Qarzdorlik', icon: AlertTriangle },
  { to: '/admin/expenses', label: 'Xarajatlar', icon: Banknote },
  { to: '/admin/salaries', label: 'Ish haqi', icon: Users },
];
const MONTHS = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
const sum = (list) => list.reduce((t, x) => t + (x.amount || 0), 0);
const fullName = (s) => `${s.lastName} ${s.firstName}`;

export const FinTabs = ({ onNavigate }) => (
  <nav className="fin-tabs" aria-label="Moliya bo‘limlari">
    {TABS.map(({ to, label, icon: Icon, end }) => (
      <NavLink key={to} to={to} end={end} className={({ isActive }) => `fin-tab${isActive ? ' is-active' : ''}`} onClick={onNavigate}><Icon size={16} /> {label}</NavLink>
    ))}
  </nav>
);

const Finance = ({ view = 'overview' }) => {
  const toast = useToast();
  const { students, update } = useStudents();
  const { payments, add: addPayment } = usePayments(students);
  const { expenses, add: addExpense } = useExpenses();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [payFor, setPayFor] = useState(null); // null | '' | studentId
  const [expOpen, setExpOpen] = useState(false);
  const [limit, setLimit] = useState(20);

  const now = new Date();
  const monthKey = isoDate(now).slice(0, 7);
  const debtors = useMemo(
    () => students.filter((s) => s.debt > 0 && (s.status === 'active' || s.status === 'dropped')).sort((a, b) => b.debt - a.debt),
    [students],
  );
  const totalDebt = sum(debtors.map((s) => ({ amount: s.debt })));
  const monthIncome = sum(payments.filter((p) => p.date.startsWith(monthKey)));
  const monthExpense = sum(expenses.filter((e) => e.date.startsWith(monthKey)));

  const chart = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const k = isoDate(d).slice(0, 7);
        return { name: MONTHS[d.getMonth()], Tushum: sum(payments.filter((p) => p.date.startsWith(k))), Xarajat: sum(expenses.filter((e) => e.date.startsWith(k))) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [payments, expenses],
  );
  const byCategory = useMemo(() => {
    const month = expenses.filter((e) => e.date.startsWith(monthKey));
    const total = sum(month) || 1;
    return EXPENSE_CATEGORIES.map((c) => ({ ...c, amount: sum(month.filter((e) => e.category === c.value)) })).filter((c) => c.amount).map((c) => ({ ...c, pct: Math.round((c.amount / total) * 100) }));
  }, [expenses, monthKey]);

  const match = (text) => text.toLowerCase().includes(q.trim().toLowerCase());
  const payRows = payments.filter((p) => (filter === 'all' || p.method === filter) && match(`${p.name} ${p.studentId} ${p.group}`));
  const debtRows = debtors.filter((s) => (filter === 'all' || getPaymentStatus(s) === filter) && match(`${fullName(s)} ${s.id} ${s.group}`));
  const expRows = expenses.filter((e) => (filter === 'all' || e.category === filter) && match(`${e.title} ${categoryLabel(e.category)}`));

  const submitPayment = (data) => {
    const s = students.find((x) => x.id === data.studentId);
    addPayment({ ...data, name: fullName(s), group: s.group, period: data.date.slice(0, 7) });
    update(s.id, { debt: Math.max(0, s.debt - data.amount) });
    toast.success(`${fullName(s)} · ${formatSom(data.amount)} to‘lov qabul qilindi`);
    setPayFor(null);
  };
  const submitExpense = (data) => {
    addExpense(data);
    toast.success('Xarajat qo‘shildi');
    setExpOpen(false);
  };
  const switchFilter = (v) => { setFilter(v); setLimit(20); };

  const titles = { overview: 'Moliya', payments: 'To‘lovlar', debts: 'Qarzdorlik', expenses: 'Xarajatlar' };
  const Toolbar = ({ options, placeholder }) => (
    <div className="toolbar">
      <div className="status-tabs">
        {options.map(([v, l]) => (
          <button key={v} type="button" className={filter === v ? 'status-tab is-active' : 'status-tab'} onClick={() => switchFilter(v)}>{l}</button>
        ))}
      </div>
      <div className="toolbar__search">
        <Search size={16} className="toolbar__search-icon" aria-hidden="true" />
        <input className="input" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
    </div>
  );

  return (
    <div className="students-page">
      <div className="page-head">
        <div><h1>{titles[view]}</h1><p>Tushum, qarzdorlik va xarajatlar nazorati</p></div>
        <div className="page-head__actions">
          {view === 'overview' || view === 'expenses' ? <button type="button" className="btn btn--secondary" onClick={() => setExpOpen(true)}><Plus size={16} /> Xarajat</button> : null}
          <button type="button" className="btn btn--primary" onClick={() => setPayFor('')}><Plus size={16} /> To‘lov qabul qilish</button>
        </div>
      </div>

      <nav className="fin-tabs" aria-label="Moliya bo‘limlari">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `fin-tab${isActive ? ' is-active' : ''}`} onClick={() => { setFilter('all'); setQ(''); setLimit(20); }}><Icon size={16} /> {label}</NavLink>
        ))}
      </nav>

      <div className="students-stats">
        <StatCard title="Oylik tushum" value={formatMoney(monthIncome)} icon={Wallet} tone="success" />
        <StatCard title="Oylik xarajat" value={formatMoney(monthExpense)} icon={Banknote} tone="warning" />
        <StatCard title="Sof foyda" value={formatMoney(monthIncome - monthExpense)} icon={TrendingUp} tone={monthIncome >= monthExpense ? 'primary' : 'danger'} />
        <StatCard title={`Jami qarz (${debtors.length} talaba)`} value={formatMoney(totalDebt)} icon={AlertTriangle} tone="danger" />
      </div>

      {view === 'overview' && (
        <div className="fin-grid">
          <Card title="Tushum va xarajat" subtitle="So‘nggi 6 oy">
            <div className="fin-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} width={44} />
                  <Tooltip formatter={(v) => formatSom(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }} cursor={{ fill: 'var(--surface-2)' }} />
                  <Legend />
                  <Bar dataKey="Tushum" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Xarajat" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Xarajatlar tarkibi" subtitle="Joriy oy">
            <ul className="fin-split">
              {byCategory.map((c) => (
                <li key={c.value}>
                  <div><span>{c.label}</span><strong>{formatMoney(c.amount)}</strong></div>
                  <span className="fin-bar"><span style={{ width: `${c.pct}%` }} /></span>
                </li>
              ))}
              {!byCategory.length && <li className="empty-text">Bu oy xarajat yo‘q</li>}
            </ul>
          </Card>
          <Card title="So‘nggi to‘lovlar">
            <ul className="fin-list">
              {payments.slice(0, 6).map((p) => (
                <li key={p.id}><div><strong>{p.name}</strong><span className="data-table__muted">{p.group} · {p.method} · {formatDate(p.date)}</span></div><span className="fin-plus">+{formatSom(p.amount)}</span></li>
              ))}
            </ul>
          </Card>
          <Card title="Eng katta qarzdorlar">
            <ul className="fin-list">
              {debtors.slice(0, 6).map((s) => (
                <li key={s.id}><div><strong>{fullName(s)}</strong><span className="data-table__muted">{s.group} · {formatPhone(s.parentPhone)}</span></div><span className="debt">{formatSom(s.debt)}</span></li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {view === 'debts' && (
        <Card className="students-card" title="Qarzdor talabalar" actions={<button type="button" className="btn btn--secondary btn--sm" onClick={() => downloadCsv('qarzdorlar.csv', [['Talaba', 'Guruh', 'Ota-ona tel.', 'Qarz'], ...debtRows.map((s) => [fullName(s), s.group, formatPhone(s.parentPhone), s.debt])])}><Download size={15} /> CSV</button>}>
          <Toolbar options={[['all', 'Hammasi'], ['unpaid', 'Qarzdor'], ['partial', 'Qisman']]} placeholder="Talaba yoki guruh…" />
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Talaba</th><th>Guruh</th><th>Ota-ona tel.</th><th>Holat</th><th style={{ textAlign: 'right' }}>Qarz</th><th><span className="sr-only">Amal</span></th></tr></thead>
              <tbody>
                {debtRows.slice(0, limit).map((s) => {
                  const st = PAYMENT_STATUSES[getPaymentStatus(s)];
                  return (
                    <tr key={s.id}>
                      <td><strong>{fullName(s)}</strong> <span className="data-table__muted">{s.id}</span></td><td>{s.group}</td><td className="data-table__muted">{formatPhone(s.parentPhone)}</td>
                      <td><span className={`badge badge--${st.tone}`}>{st.label}</span></td><td style={{ textAlign: 'right' }}><span className="debt">{formatSom(s.debt)}</span></td>
                      <td><button type="button" className="btn btn--secondary btn--sm" onClick={() => setPayFor(s.id)}>To‘lov</button></td>
                    </tr>
                  );
                })}
                {!debtRows.length && <tr><td colSpan={6} className="empty-text">Qarzdor talaba yo‘q</td></tr>}
              </tbody>
            </table>
          </div>
          {debtRows.length > limit && <button type="button" className="btn btn--ghost fin-more" onClick={() => setLimit(limit + 20)}>Yana ko‘rsatish ({debtRows.length - limit})</button>}
        </Card>
      )}

      {payFor !== null && <PaymentModal key={payFor} students={students} initial={payFor} onClose={() => setPayFor(null)} onSubmit={submitPayment} />}
      {expOpen && <ExpenseModal onClose={() => setExpOpen(false)} onSubmit={submitExpense} />}
    </div>
  );
};

export const PaymentModal = ({ students, initial, onClose, onSubmit }) => {
  const list = useMemo(() => students.filter((s) => s.status === 'active' || s.debt > 0).sort((a, b) => (b.debt > 0) - (a.debt > 0) || fullName(a).localeCompare(fullName(b), 'uz')), [students]);
  const [studentId, setStudentId] = useState(initial);
  const [amount, setAmount] = useState(initial ? String(students.find((s) => s.id === initial)?.debt || '') : '');
  const [method, setMethod] = useState(METHODS[0]);
  const [date, setDate] = useState(isoDate(new Date()));
  const student = students.find((s) => s.id === studentId);
  const value = Number(amount) || 0;
  const valid = student && value > 0;
  return (
    <Modal open onClose={onClose} title="To‘lov qabul qilish" subtitle="To‘lov talabaning qarzidan avtomatik ayriladi" size="sm"
      footer={<><button type="button" className="btn btn--secondary" onClick={onClose}>Bekor qilish</button><button type="button" className="btn btn--primary" disabled={!valid} onClick={() => onSubmit({ studentId, amount: value, method, date })}>Qabul qilish</button></>}>
      <div className="fin-form">
        <label>Talaba
          <select className="input" value={studentId} onChange={(e) => { setStudentId(e.target.value); setAmount(String(students.find((s) => s.id === e.target.value)?.debt || '')); }}>
            <option value="">Tanlang…</option>
            {list.map((s) => <option key={s.id} value={s.id}>{fullName(s)} · {s.group}{s.debt ? ` · qarz ${formatSom(s.debt)}` : ''}</option>)}
          </select>
        </label>
        <label>Summa (so‘m)<input className="input" type="number" min="1000" step="1000" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        {student && <p className="fin-hint">Joriy qarz: <strong>{formatSom(student.debt)}</strong> → to‘lovdan keyin: <strong>{formatSom(Math.max(0, student.debt - value))}</strong></p>}
        <label>To‘lov usuli<select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
        <label>Sana<input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      </div>
    </Modal>
  );
};

export const ExpenseModal = ({ initial, onClose, onSubmit }) => {
  const [f, setF] = useState(initial ?? { title: '', category: 'other', amount: '', date: isoDate(new Date()), note: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.title.trim() && Number(f.amount) > 0;
  return (
    <Modal open onClose={onClose} title={initial ? 'Xarajatni tahrirlash' : 'Xarajat qo‘shish'} size="sm"
      footer={<><button type="button" className="btn btn--secondary" onClick={onClose}>Bekor qilish</button><button type="button" className="btn btn--primary" disabled={!valid} onClick={() => onSubmit({ ...f, title: f.title.trim(), amount: Number(f.amount) })}>Saqlash</button></>}>
      <div className="fin-form">
        <label>Nomi<input className="input" value={f.title} onChange={set('title')} placeholder="Masalan: Bino ijarasi" /></label>
        <label>Toifa<select className="input" value={f.category} onChange={set('category')}>{EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
        <label>Summa (so‘m)<input className="input" type="number" min="1000" step="1000" value={f.amount} onChange={set('amount')} /></label>
        <label>Sana<input className="input" type="date" value={f.date} onChange={set('date')} /></label>
        <label>Izoh (ixtiyoriy)<input className="input" value={f.note ?? ''} onChange={set('note')} /></label>
      </div>
    </Modal>
  );
};

export default Finance;
