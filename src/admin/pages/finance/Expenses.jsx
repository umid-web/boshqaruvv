import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Banknote, ChevronsUpDown, Download, Pencil, Plus, Search, Trash2, TrendingUp, Wallet } from 'lucide-react';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import { useToast } from '../../components/ui/useToast';
import { downloadCsv } from '../../utils/csv';
import { formatDate, formatMoney, formatSom } from '../../utils/format';
import { ExpenseModal, FinTabs } from './Finance';
import { EXPENSE_CATEGORIES, categoryLabel, isoDate, useExpenses, usePayments } from './financeStore';
import { useStudents } from '../students/useStudents';
import '../students/Students.scss';
import './Finance.scss';

const sum = (l) => l.reduce((t, e) => t + e.amount, 0);
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const COLS = [['date', 'Sana'], ['title', 'Nomi'], ['category', 'Toifa'], ['amount', 'Summa']];

const Expenses = () => {
  const toast = useToast();
  const { students } = useStudents();
  const { payments } = usePayments(students);
  const { expenses, add, remove, update, restore } = useExpenses();
  const [f, setF] = useState({ q: '', category: 'all', month: 'all' });
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [modal, setModal] = useState(null); // null | 'new' | expense

  const set = (patch) => { setF((x) => ({ ...x, ...patch }));  };
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: isoDate(d).slice(0, 7), label: `${d.getFullYear()}, ${MONTHS[d.getMonth()]}` };
  });
  const inPeriod = (e) => f.month === 'all' || e.date.startsWith(f.month);
  const period = expenses.filter(inPeriod);
  const rows = useMemo(() => {
    const q = f.q.trim().toLowerCase(), d = sort.dir === 'asc' ? 1 : -1, k = sort.key;
    return period.filter((e) => (f.category === 'all' || e.category === f.category) && (!q || `${e.title} ${e.note ?? ''}`.toLowerCase().includes(q)))
      .sort((a, b) => (k === 'amount' ? a.amount - b.amount : String(k === 'category' ? categoryLabel(a.category) : a[k]).localeCompare(String(k === 'category' ? categoryLabel(b.category) : b[k]), 'uz')) * d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, f, sort]);

  const cur = isoDate(now).slice(0, 7);
  const prev = isoDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7);
  const curTotal = sum(expenses.filter((e) => e.date.startsWith(cur)));
  const prevTotal = sum(expenses.filter((e) => e.date.startsWith(prev)));
  const change = prevTotal ? Math.round(((curTotal - prevTotal) / prevTotal) * 100) : undefined;
  const income = sum(payments.filter((p) => p.date.startsWith(cur)));
  const split = EXPENSE_CATEGORIES.map((c) => ({ ...c, total: sum(period.filter((e) => e.category === c.value)) })).filter((c) => c.total).sort((a, b) => b.total - a.total);
  const periodTotal = sum(period) || 1;
  const visible = rows;
  const toggle = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'title' || key === 'category' ? 'asc' : 'desc' }));

  const submit = (data) => {
    if (modal === 'new') { add(data); toast.success('Xarajat qo‘shildi'); }
    else { update(modal.id, data); toast.success('Xarajat yangilandi'); }
    setModal(null);
  };
  const del = (e) => { remove(e.id); toast.info(`“${e.title}” o‘chirildi`, { action: { label: 'Qaytarish', onClick: () => restore(e) } }); };

  return (
    <div className="students-page finance-page">
      <div className="page-head">
        <div><h1>Xarajatlar</h1><p>Markaz xarajatlari nazorati va tahlili</p></div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--secondary" onClick={() => downloadCsv('xarajatlar.csv', [['Sana', 'Nomi', 'Toifa', 'Summa', 'Izoh'], ...rows.map((e) => [formatDate(e.date), e.title, categoryLabel(e.category), e.amount, e.note ?? ''])])}><Download size={16} /> CSV</button>
          <button type="button" className="btn btn--primary" onClick={() => setModal('new')}><Plus size={16} /> Xarajat qo‘shish</button>
        </div>
      </div>
      <FinTabs />

      <div className="students-stats">
        <StatCard title="Joriy oy xarajati" value={formatMoney(curTotal)} icon={Banknote} tone="warning" change={change} invertChange />
        <StatCard title="Joriy oy tushumi" value={formatMoney(income)} icon={Wallet} tone="success" />
        <StatCard title="Sof foyda" value={formatMoney(income - curTotal)} icon={TrendingUp} tone={income >= curTotal ? 'primary' : 'danger'} />
        <StatCard title={`Tanlangan davr (${rows.length} ta)`} value={formatMoney(sum(rows))} icon={Banknote} tone="primary" />
      </div>

      <div className="fin-grid fin-grid--exp">
        <Card className="students-card">
          <div className="toolbar">
            <div className="status-tabs">
              {[{ value: 'all', label: 'Hammasi' }, ...EXPENSE_CATEGORIES].map((c) => (
                <button key={c.value} type="button" className={f.category === c.value ? 'status-tab is-active' : 'status-tab'} onClick={() => set({ category: c.value })}>{c.label}</button>
              ))}
            </div>
          </div>
          <div className="toolbar toolbar__filters">
            <div className="toolbar__search"><Search size={16} className="toolbar__search-icon" aria-hidden="true" /><input className="input" placeholder="Nomi yoki izoh…" value={f.q} onChange={(e) => set({ q: e.target.value })} /></div>
            <select className="input" value={f.month} onChange={(e) => set({ month: e.target.value })} aria-label="Oy"><option value="all">Barcha oylar</option>{months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {COLS.map(([k, l]) => {
                    const Icon = sort.key === k ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;
                    return <th key={k} style={k === 'amount' ? { textAlign: 'right' } : undefined}><button type="button" className="sort-btn" onClick={() => toggle(k)}>{l}<Icon size={13} /></button></th>;
                  })}
                  <th><span className="sr-only">Amallar</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDate(e.date)}</td>
                    <td><strong>{e.title}</strong>{e.note && <span className="data-table__muted fin-note">{e.note}</span>}</td>
                    <td><span className="badge badge--muted">{categoryLabel(e.category)}</span></td>
                    <td style={{ textAlign: 'right' }}>{formatSom(e.amount)}</td>
                    <td className="fin-actions">
                      <button type="button" className="icon-btn" aria-label="Tahrirlash" onClick={() => setModal(e)}><Pencil size={15} /></button>
                      <button type="button" className="icon-btn" aria-label="O‘chirish" onClick={() => del(e)}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={5} className="empty-text">Xarajat topilmadi</td></tr>}
              </tbody>
            </table>
          </div>
          
        </Card>

        <Card title="Toifalar bo‘yicha" subtitle={f.month === 'all' ? 'Barcha davr' : months.find((m) => m.value === f.month)?.label}>
          <ul className="fin-split">
            {split.map((c) => (
              <li key={c.value}>
                <div><span>{c.label} · {Math.round((c.total / periodTotal) * 100)}%</span><strong>{formatMoney(c.total)}</strong></div>
                <span className="fin-bar"><span style={{ width: `${(c.total / periodTotal) * 100}%` }} /></span>
              </li>
            ))}
            {!split.length && <li className="empty-text">Ma'lumot yo‘q</li>}
          </ul>
        </Card>
      </div>

      {modal && <ExpenseModal key={modal === 'new' ? 'new' : modal.id} initial={modal === 'new' ? undefined : modal} onClose={() => setModal(null)} onSubmit={submit} />}
    </div>
  );
};

export default Expenses;
