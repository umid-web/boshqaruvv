import { useMemo, useState } from 'react';
import { Banknote, Download, History, Plus, Search, Trash2, Users, Wallet, AlertTriangle } from 'lucide-react';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/useToast';
import { downloadCsv } from '../../utils/csv';
import { formatDate, formatMoney, formatSom } from '../../utils/format';
import { useStudents } from '../students/useStudents';
import { loadTeachers } from '../teachers/teachersStore';
import { getTeacherStats, teacherName } from '../teachers/teachersData';
import { logActivity } from '../../activity/activityStore';
import { FinTabs } from './Finance';
import { METHODS, isoDate } from './financeStore';
import { KINDS, SALARY_STATUSES, calcSalary, useSalary } from './salaryStore';
import '../students/Students.scss';
import './Finance.scss';

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];

const Salaries = () => {
  const toast = useToast();
  const { students } = useStudents();
  const teachers = useMemo(() => loadTeachers().filter((t) => t.status !== 'left'), []);
  const { entries, add, remove, restore } = useSalary();
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: isoDate(d).slice(0, 7), label: `${d.getFullYear()}, ${MONTHS[d.getMonth()]}` };
  });
  const [month, setMonth] = useState(months[0].value);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [payFor, setPayFor] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);

  const rows = useMemo(() => teachers.map((t) => {
    const mine = entries.filter((e) => e.teacherId === t.id && e.month === month);
    return { t, mine, ...calcSalary(getTeacherStats(t, students).salary, mine) };
  }), [teachers, entries, month, students]);

  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  const visible = rows.filter((r) => (status === 'all' || r.status === status) && teacherName(r.t).toLowerCase().includes(q.trim().toLowerCase()));
  const count = (s) => rows.filter((r) => r.status === s).length;
  const monthLabel = months.find((m) => m.value === month)?.label;
  const current = (id) => rows.find((r) => r.t.id === id);

  const submit = (data) => {
    add({ ...data, month });
    const t = teachers.find((x) => x.id === data.teacherId);
    logActivity({
      module: 'salaries', action: 'create', severity: data.kind === 'penalty' ? 'warning' : 'success',
      title: `${KINDS[data.kind].label}: ${teacherName(t)} — ${formatSom(data.amount)} (${monthLabel})`,
      entityId: t.id, entityName: teacherName(t), meta: { month, method: data.method, note: data.note },
    });
    toast.success(`${KINDS[data.kind].label}: ${formatSom(data.amount)} saqlandi`);
    setPayFor(null);
  };
  const del = (e) => {
    remove(e.id);
    const t = teachers.find((x) => x.id === e.teacherId);
    logActivity({ module: 'salaries', action: 'delete', severity: 'warning', title: `${KINDS[e.kind].label} o‘chirildi: ${teacherName(t)} — ${formatSom(e.amount)}`, entityId: e.teacherId, entityName: teacherName(t) });
    toast.info('Yozuv o‘chirildi', { action: { label: 'Qaytarish', onClick: () => restore(e) } });
  };

  return (
    <div className="students-page">
      <div className="page-head">
        <div><h1>Ustozlar ish haqi</h1><p>Oylik hisob, avans, mukofot va to‘lovlar nazorati</p></div>
        <div className="page-head__actions">
          <select className="input" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Oy">{months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
          <button type="button" className="btn btn--secondary" onClick={() => downloadCsv(`ish-haqi-${month}.csv`, [['Ustoz', 'Hisoblangan', 'Bonus', 'Ushlanma', 'Jami', 'To‘langan', 'Qoldiq', 'Holat'], ...rows.map((r) => [teacherName(r.t), r.base, r.bonus, r.penalty, r.due, r.paid, r.left, SALARY_STATUSES[r.status].label])])}><Download size={16} /> CSV</button>
        </div>
      </div>
      <FinTabs />

      <div className="students-stats">
        <StatCard title="Jami hisoblangan" value={formatMoney(sum('due'))} icon={Wallet} tone="primary" />
        <StatCard title="To‘langan" value={formatMoney(sum('paid'))} icon={Banknote} tone="success" />
        <StatCard title="Qoldiq" value={formatMoney(sum('left'))} icon={AlertTriangle} tone="warning" />
        <StatCard title="Maosh olmaganlar" value={`${count('unpaid')} / ${rows.length}`} icon={Users} tone="danger" />
      </div>

      <Card className="students-card" title={`${monthLabel} · ish haqi qaydnomasi`}>
        <div className="toolbar">
          <div className="status-tabs">
            {[['all', 'Hammasi', rows.length], ...Object.entries(SALARY_STATUSES).map(([k, v]) => [k, v.label, count(k)])].map(([v, l, n]) => (
              <button key={v} type="button" className={status === v ? 'status-tab is-active' : 'status-tab'} onClick={() => setStatus(v)}>{l}<span className="status-tab__count">{n}</span></button>
            ))}
          </div>
          <div className="toolbar__search"><Search size={16} className="toolbar__search-icon" aria-hidden="true" /><input className="input" placeholder="Ustoz qidirish…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Ustoz</th><th>Hisob-kitob</th><th style={{ minWidth: 190 }}>To‘langan</th><th>Holat</th><th style={{ textAlign: 'right' }}>Qoldiq</th><th><span className="sr-only">Amallar</span></th></tr></thead>
            <tbody>
              {visible.map((r) => {
                const st = SALARY_STATUSES[r.status];
                return (
                  <tr key={r.t.id}>
                    <td><div className="sal-person"><Avatar firstName={r.t.firstName} lastName={r.t.lastName} /><div><strong>{teacherName(r.t)}</strong><span className="data-table__muted">{r.t.subjects.join(', ')} · {r.t.salaryType === 'percent' ? `${r.t.salaryValue}%` : 'fiksirlangan'}</span></div></div></td>
                    <td className="sal-calc">
                      <strong>{formatSom(r.due)}</strong>
                      <span className="data-table__muted">{formatMoney(r.base)}{r.bonus > 0 && <em className="sal-plus"> +{formatMoney(r.bonus)}</em>}{r.penalty > 0 && <em className="debt"> −{formatMoney(r.penalty)}</em>}</span>
                    </td>
                    <td>
                      <div className="sal-progress" role="progressbar" aria-valuenow={r.pct} aria-valuemin={0} aria-valuemax={100} aria-label="To‘langan ulush"><span className={`sal-progress__bar sal-progress__bar--${r.status}`} style={{ width: `${r.pct}%` }} /></div>
                      <span className="sal-paid">{formatSom(r.paid)} <span className="data-table__muted">· {r.pct}%</span></span>
                    </td>
                    <td><span className={`badge badge--${st.tone}`}>{st.label}</span></td>
                    <td style={{ textAlign: 'right' }}>{r.left > 0 ? <span className="debt">{formatSom(r.left)}</span> : <span className="data-table__muted">—</span>}</td>
                    <td className="fin-actions">
                      <button type="button" className="icon-btn" aria-label="Tarix" onClick={() => setHistoryFor(r.t.id)}><History size={16} /></button>
                      <button type="button" className="btn btn--primary btn--sm" onClick={() => setPayFor(r.t.id)}><Plus size={14} /> Amal</button>
                    </td>
                  </tr>
                );
              })}
              {!visible.length && <tr><td colSpan={6} className="empty-text">Ustoz topilmadi</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {payFor && <SalaryModal key={payFor} row={current(payFor)} onClose={() => setPayFor(null)} onSubmit={(d) => submit({ ...d, teacherId: payFor })} />}
      <Modal open={Boolean(historyFor)} onClose={() => setHistoryFor(null)} title={historyFor ? teacherName(current(historyFor).t) : ''} subtitle={`${monthLabel} · amallar tarixi`} size="sm">
        {historyFor && (
          <ul className="sal-history">
            {current(historyFor).mine.sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
              <li key={e.id}>
                <span className={`sal-dot sal-dot--${KINDS[e.kind].tone}`} />
                <div><strong>{KINDS[e.kind].label}</strong><span className="data-table__muted">{formatDate(e.date)} · {e.method}{e.note && ` · ${e.note}`}</span></div>
                <b className={KINDS[e.kind].sign < 0 ? 'sal-plus' : ''}>{formatSom(e.amount)}</b>
                <button type="button" className="icon-btn" aria-label="O‘chirish" onClick={() => del(e)}><Trash2 size={15} /></button>
              </li>
            ))}
            {!current(historyFor).mine.length && <li className="empty-text">Bu oyda amal yo‘q</li>}
          </ul>
        )}
      </Modal>
    </div>
  );
};

const SalaryModal = ({ row, onClose, onSubmit }) => {
  const [kind, setKind] = useState('pay');
  const [amount, setAmount] = useState(String(row.left || ''));
  const [method, setMethod] = useState(METHODS[0]);
  const [date, setDate] = useState(isoDate(new Date()));
  const [note, setNote] = useState('');
  const value = Number(amount) || 0;
  const pays = KINDS[kind].sign < 0;
  const over = pays && value > row.left;
  const after = pays ? row.left - value : row.left + (kind === 'bonus' ? value : -value);
  const pick = (k) => { setKind(k); setAmount(KINDS[k].sign < 0 ? String(row.left || '') : ''); };
  return (
    <Modal open onClose={onClose} title={teacherName(row.t)} subtitle="Ish haqi bo‘yicha amal" size="sm"
      footer={<><button type="button" className="btn btn--secondary" onClick={onClose}>Bekor qilish</button><button type="button" className="btn btn--primary" disabled={value <= 0} onClick={() => onSubmit({ kind, amount: value, method, date, note: note.trim() })}>Saqlash</button></>}>
      <div className="fin-form">
        <div className="status-tabs" role="tablist">{Object.entries(KINDS).map(([k, v]) => <button key={k} type="button" className={kind === k ? 'status-tab is-active' : 'status-tab'} onClick={() => pick(k)}>{v.label.split(' ')[0]}</button>)}</div>
        <div className="sal-summary"><div><span>Hisoblangan</span><strong>{formatSom(row.due)}</strong></div><div><span>To‘langan</span><strong>{formatSom(row.paid)}</strong></div><div><span>Qoldiq</span><strong>{formatSom(row.left)}</strong></div></div>
        <label>Summa (so‘m)<input className="input" type="number" min="1000" step="1000" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        {over && <p className="fin-hint fin-hint--warn">Summa qoldiqdan katta — ortiqcha to‘lov bo‘ladi.</p>}
        {value > 0 && <p className="fin-hint">Amaldan keyin qoldiq: <strong>{formatSom(Math.max(0, after))}</strong></p>}
        {pays && <label>To‘lov usuli<select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>}
        <label>Sana<input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label>Izoh (ixtiyoriy)<input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'penalty' ? 'Ushlanma sababi' : ''} /></label>
      </div>
    </Modal>
  );
};

export default Salaries;
