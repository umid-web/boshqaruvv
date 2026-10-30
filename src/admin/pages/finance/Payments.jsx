import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Banknote, ChevronsUpDown, Download, Plus, Printer, Receipt, Search, Undo2, Wallet } from 'lucide-react';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/useToast';
import { downloadCsv } from '../../utils/csv';
import { formatDate, formatMoney, formatSom } from '../../utils/format';
import { useStudents } from '../students/useStudents';
import { FinTabs, PaymentModal } from './Finance';
import { METHODS, isoDate, usePayments } from './financeStore';
import useReceptionPermissions from '../../../Reception/useReceptionPermissions';
import '../students/Students.scss';
import './Finance.scss';

const sum = (l) => l.reduce((t, p) => t + p.amount, 0);
const COLS = [['date', 'Sana'], ['name', 'Talaba'], ['group', 'Guruh'], ['method', 'Usul'], ['amount', 'Summa']];

const printReceipt = (p) => {
  const w = window.open('', '_blank', 'width=420,height=560');
  if (!w) return;
  w.document.write(`<title>Chek ${p.id}</title><body style="font-family:sans-serif;padding:24px"><h2>EduControl Pro</h2><p>To‘lov cheki № ${p.id}</p><hr><p>Talaba: <b>${p.name}</b> (${p.studentId})</p><p>Guruh: ${p.group}</p><p>Sana: ${formatDate(p.date)}</p><p>Usul: ${p.method}</p><h3>Summa: ${formatSom(p.amount)}</h3><hr><p>Rahmat!</p>`);
  w.document.close();
  w.print();
};

const Payments = () => {
  const toast = useToast();
  const can = useReceptionPermissions();
  const canCreate = can('payments', 'create');
  const canDelete = can('payments', 'delete');
  const canExport = can('payments', 'export');
  const { students, update } = useStudents();
  const { payments, add, remove, restore } = usePayments(students);
  const [f, setF] = useState({ q: '', method: 'all', group: 'all', from: '', to: '' });
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [payOpen, setPayOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [cancel, setCancel] = useState(null);

  const set = (patch) => { setF((x) => ({ ...x, ...patch }));  };
  const groups = useMemo(() => [...new Set(payments.map((p) => p.group))].sort(), [payments]);
  const rows = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const list = payments.filter((p) =>
      (f.method === 'all' || p.method === f.method) && (f.group === 'all' || p.group === f.group) &&
      (!f.from || p.date >= f.from) && (!f.to || p.date <= f.to) && (!q || `${p.name} ${p.studentId} ${p.id}`.toLowerCase().includes(q)));
    const k = sort.key, d = sort.dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => (k === 'amount' ? a.amount - b.amount : String(a[k]).localeCompare(String(b[k]), 'uz')) * d);
  }, [payments, f, sort]);

  const today = isoDate(new Date());
  const month = today.slice(0, 7);
  const visible = rows;
  const toggle = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'amount' || key === 'date' ? 'desc' : 'asc' }));
  const byMethod = METHODS.map((m) => ({ m, total: sum(rows.filter((p) => p.method === m)) }));

  const submit = (data) => {
    if (!canCreate) return;
    const s = students.find((x) => x.id === data.studentId);
    add({ ...data, name: `${s.lastName} ${s.firstName}`, group: s.group, period: data.date.slice(0, 7) });
    update(s.id, { debt: Math.max(0, s.debt - data.amount) });
    toast.success(`${s.lastName} ${s.firstName} · ${formatSom(data.amount)} qabul qilindi`);
    setPayOpen(false);
  };
  const doCancel = () => {
    if (!canDelete) return;
    const p = cancel;
    const s = students.find((x) => x.id === p.studentId);
    remove(p.id);
    if (s) update(s.id, { debt: s.debt + p.amount });
    setCancel(null);
    setReceipt(null);
    toast.info('To‘lov bekor qilindi, summa qarzga qaytarildi', {
      action: { label: 'Qaytarish', onClick: () => { restore(p); if (s) update(s.id, { debt: Math.max(0, s.debt) }); } },
    });
  };

  return (
    <div className="students-page finance-page">
      <div className="page-head">
        <div><h1>To‘lovlar</h1><p>Qabul qilingan to‘lovlar tarixi va cheklar</p></div>
        <div className="page-head__actions">
          {canExport && <button type="button" className="btn btn--secondary" onClick={() => downloadCsv('tolovlar.csv', [['Chek', 'Sana', 'Talaba', 'Guruh', 'Usul', 'Summa'], ...rows.map((p) => [p.id, formatDate(p.date), p.name, p.group, p.method, p.amount])])}><Download size={16} /> CSV</button>}
          {canCreate && <button type="button" className="btn btn--primary" onClick={() => setPayOpen(true)}><Plus size={16} /> To‘lov qabul qilish</button>}
        </div>
      </div>
      <FinTabs />

      <div className="students-stats">
        <StatCard title="Bugungi tushum" value={formatMoney(sum(payments.filter((p) => p.date === today)))} icon={Wallet} tone="success" />
        <StatCard title="Joriy oy" value={formatMoney(sum(payments.filter((p) => p.date.startsWith(month))))} icon={Banknote} tone="primary" />
        <StatCard title={`Tanlangan (${rows.length} ta)`} value={formatMoney(sum(rows))} icon={Receipt} tone="warning" />
        <StatCard title="O‘rtacha to‘lov" value={formatMoney(rows.length ? sum(rows) / rows.length : 0)} icon={Wallet} tone="primary" />
      </div>

      <Card className="students-card">
        <div className="toolbar">
          <div className="status-tabs">
            {[['all', 'Hammasi', sum(rows)], ...byMethod.map((x) => [x.m, x.m, x.total])].map(([v, l, t]) => (
              <button key={v} type="button" className={f.method === v ? 'status-tab is-active' : 'status-tab'} onClick={() => set({ method: v })}>{l}<span className="status-tab__count">{formatMoney(t)}</span></button>
            ))}
          </div>
        </div>
        <div className="toolbar toolbar__filters payment-filters">
          <div className="toolbar__search"><Search size={16} className="toolbar__search-icon" aria-hidden="true" /><input className="input" placeholder="Talaba, ID yoki chek raqami…" value={f.q} onChange={(e) => set({ q: e.target.value })} /></div>
          <select className="input" value={f.group} onChange={(e) => set({ group: e.target.value })} aria-label="Guruh"><option value="all">Barcha guruhlar</option>{groups.map((g) => <option key={g}>{g}</option>)}</select>
          <input className="input" type="date" value={f.from} max={f.to || undefined} onChange={(e) => set({ from: e.target.value })} aria-label="Dan" />
          <input className="input" type="date" value={f.to} min={f.from || undefined} onChange={(e) => set({ to: e.target.value })} aria-label="Gacha" />
          {(f.q || f.group !== 'all' || f.from || f.to) && <button type="button" className="btn btn--ghost btn--sm" onClick={() => set({ q: '', group: 'all', from: '', to: '' })}>Tozalash</button>}
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
              {visible.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.date)}</td>
                  <td><strong>{p.name}</strong> <span className="data-table__muted">{p.studentId}</span></td>
                  <td>{p.group}</td>
                  <td><span className="badge badge--info">{p.method}</span></td>
                  <td style={{ textAlign: 'right' }} className="fin-plus">{formatSom(p.amount)}</td>
                  <td><button type="button" className="btn btn--secondary btn--sm" onClick={() => setReceipt(p)}><Receipt size={14} /> Chek</button></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="empty-text">To‘lov topilmadi</td></tr>}
            </tbody>
          </table>
        </div>
        
      </Card>

      {payOpen && <PaymentModal students={students} initial="" onClose={() => setPayOpen(false)} onSubmit={submit} />}
      <Modal open={Boolean(receipt)} onClose={() => setReceipt(null)} title="To‘lov cheki" subtitle={receipt?.id} size="sm"
        footer={receipt && <>{canDelete && <button type="button" className="btn btn--danger btn--sm" onClick={() => setCancel(receipt)}><Undo2 size={14} /> Bekor qilish</button>}<button type="button" className="btn btn--primary" onClick={() => printReceipt(receipt)}><Printer size={16} /> Chop etish</button></>}>
        {receipt && (
          <dl className="fin-receipt">
            <div><dt>Talaba</dt><dd>{receipt.name} · {receipt.studentId}</dd></div>
            <div><dt>Guruh</dt><dd>{receipt.group}</dd></div>
            <div><dt>Sana</dt><dd>{formatDate(receipt.date)}</dd></div>
            <div><dt>Usul</dt><dd>{receipt.method}</dd></div>
            <div className="fin-receipt__total"><dt>Summa</dt><dd>{formatSom(receipt.amount)}</dd></div>
          </dl>
        )}
      </Modal>
      <ConfirmDialog open={Boolean(cancel)} title="To‘lovni bekor qilish" message={cancel ? `${formatSom(cancel.amount)} to‘lov ro‘yxatdan o‘chiriladi va talabaning qarziga qaytariladi.` : ''} confirmLabel="Bekor qilish" cancelLabel="Yopish" onConfirm={doCancel} onCancel={() => setCancel(null)} />
    </div>
  );
};

export default Payments;
