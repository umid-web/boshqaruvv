import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Clock, FileText, Save, Search, Users, X } from 'lucide-react';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Avatar from '../../components/ui/Avatar';
import { useToast } from '../../components/ui/useToast';
import { formatLongDate, formatSom } from '../../utils/format';
import { logActivity } from '../../activity/activityStore';
import { useStudents } from '../students/useStudents';
import { PAYMENT_STATUSES, getPaymentStatus } from '../students/studentsData';
import { loadGroups } from '../groups/groupsStore';
import { formatGroupSchedule } from '../groups/groupsData';
import { parseIso } from '../students/billing';
import { isoDate } from '../finance/financeStore';
import '../students/Students.scss';
import './Attendance.scss';

const KEY = 'edu-attendance-v1';
export const MARKS = {
  p: { label: 'Keldi', icon: Check, tone: 'success' },
  l: { label: 'Kechikdi', icon: Clock, tone: 'warning' },
  e: { label: 'Sababli', icon: FileText, tone: 'info' },
  a: { label: 'Kelmadi', icon: X, tone: 'danger' },
};

const loadRecords = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
};

const Attendance = () => {
  const toast = useToast();
  const { students } = useStudents();
  const groups = useMemo(() => loadGroups().filter((g) => g.status === 'active'), []);
  const [code, setCode] = useState(groups[0]?.code ?? '');
  const [date, setDate] = useState(isoDate(new Date()));
  const [records, setRecords] = useState(loadRecords);
  const [draft, setDraft] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(records));
    } catch {
      /* e'tiborsiz */
    }
  }, [records]);

  const group = groups.find((g) => g.code === code);
  const key = `${code}|${date}`;
  const roster = useMemo(
    () => students.filter((s) => s.group === code && s.status === 'active').sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'uz')),
    [students, code],
  );
  const current = draft?.key === key ? draft.map : records[key] ?? {};
  const dirty = draft?.key === key;
  const isLessonDay = group?.days.includes(parseIso(date).getDay());

  const monthPct = useMemo(() => {
    const prefix = `${code}|${date.slice(0, 7)}`;
    const entries = Object.entries(records).filter(([k]) => k.startsWith(prefix));
    const out = {};
    for (const s of roster) {
      const marks = entries.map(([, m]) => m[s.id]).filter(Boolean);
      out[s.id] = marks.length ? Math.round((marks.filter((m) => m === 'p' || m === 'l').length / marks.length) * 100) : null;
    }
    return out;
  }, [records, roster, code, date]);

  const count = (m) => roster.filter((s) => current[s.id] === m).length;
  const marked = roster.filter((s) => current[s.id]).length;
  const debtors = roster.filter((s) => getPaymentStatus(s) !== 'paid').length;
  const rows = roster.filter((s) => `${s.lastName} ${s.firstName} ${s.id}`.toLowerCase().includes(q.trim().toLowerCase()));

  const mark = (id, m) => setDraft({ key, map: { ...current, [id]: m } });
  const markAll = (m) => setDraft({ key, map: Object.fromEntries(roster.map((s) => [s.id, m])) });
  const save = () => {
    const wasSaved = Boolean(records[key]);
    const absent = roster.filter((s) => current[s.id] === 'a').length;
    logActivity({
      module: 'attendance',
      action: 'save',
      severity: 'success',
      title: `${code} · ${date} davomati ${wasSaved ? 'yangilandi' : 'saqlandi'} (${marked}/${roster.length})`,
      entityId: code,
      entityName: code,
      meta: { Sana: date, Belgilangan: `${marked}/${roster.length}`, Kelganlar: count('p'), Kechikkan: count('l'), Sababli: count('e'), Kelmaganlar: absent },
      // Ko‘pchilik kelmagan bo‘lsa — muhim ogohlantirish
      notify: roster.length > 0 && absent / roster.length >= 0.4
        ? { category: 'attendance', priority: 'high', title: `${code}: kelmaganlar ko‘p`, message: `${date} sanasida ${absent}/${roster.length} talaba kelmadi`, link: '/admin/attendance' }
        : null,
    });
    setRecords((r) => ({ ...r, [key]: current }));
    setDraft(null);
    toast.success(`${code} · davomat saqlandi (${marked}/${roster.length})`);
  };
  const shift = (n) => {
    const d = parseIso(date);
    d.setDate(d.getDate() + n);
    setDate(isoDate(d));
  };

  return (
    <div className="students-page">
      <div className="page-head">
        <div>
          <h1>Davomat</h1>
          <p>{formatLongDate(parseIso(date))}</p>
        </div>
        <div className="page-head__actions att-date">
          <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Oldingi kun"><ChevronLeft size={18} /></button>
          <input type="date" className="input" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Keyingi kun"><ChevronRight size={18} /></button>
          <button type="button" className="btn btn--secondary" onClick={() => setDate(isoDate(new Date()))}>Bugun</button>
        </div>
      </div>

      <div className="att-layout">
        <aside className="att-groups" aria-label="Guruhlar">
          {groups.map((g) => {
            const n = students.filter((s) => s.group === g.code && s.status === 'active').length;
            const done = Boolean(records[`${g.code}|${date}`]);
            const today = g.days.includes(parseIso(date).getDay());
            return (
              <button key={g.code} type="button" className={`att-group${g.code === code ? ' is-active' : ''}`} onClick={() => setCode(g.code)}>
                <span className="att-group__top">
                  <strong>{g.code}</strong>
                  {done ? <span className="badge badge--success">Belgilangan</span> : today ? <span className="badge badge--warning">Kutilmoqda</span> : <span className="badge badge--muted">Dars yo‘q</span>}
                </span>
                <span className="att-group__meta">{g.course} · {g.start}–{g.end}</span>
                <span className="att-group__meta"><Users size={13} /> {n} talaba · {g.room}</span>
              </button>
            );
          })}
        </aside>

        <div className="att-main">
          <div className="students-stats">
            <StatCard title="Keldi" value={String(count('p'))} icon={Check} tone="success" />
            <StatCard title="Kechikdi" value={String(count('l'))} icon={Clock} tone="warning" />
            <StatCard title="Kelmadi" value={String(count('a'))} icon={X} tone="danger" />
            <StatCard title="Qarzdor talabalar" value={String(debtors)} icon={AlertTriangle} tone="danger" />
          </div>

          <Card
            className="students-card"
            title={group ? `${group.code} · ${group.course}` : 'Guruh tanlang'}
            subtitle={group ? formatGroupSchedule(group) : ''}
            actions={
              <>
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => markAll('p')}>Hammasi keldi</button>
                <button type="button" className="btn btn--primary btn--sm" disabled={!dirty} onClick={save}><Save size={15} /> Saqlash</button>
              </>
            }
          >
            {!isLessonDay && group && (
              <div className="att-note"><AlertTriangle size={16} /> Bu kun guruhning dars kuni emas — baribir belgilash mumkin.</div>
            )}
            <div className="toolbar">
              <div className="toolbar__search">
                <Search size={16} className="toolbar__search-icon" aria-hidden="true" />
                <input className="input" placeholder="Talaba qidirish…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <span className="att-progress">{marked}/{roster.length} belgilandi{dirty && ' · saqlanmagan'}</span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Talaba</th><th>To‘lov holati</th><th className="col-md">Oylik davomat</th><th>Davomat</th></tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const pay = getPaymentStatus(s);
                    const pct = monthPct[s.id];
                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="att-student">
                            <Avatar firstName={s.firstName} lastName={s.lastName} />
                            <div><strong>{s.lastName} {s.firstName}</strong><span className="data-table__muted">{s.id}</span></div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge--${PAYMENT_STATUSES[pay].tone}`}>{PAYMENT_STATUSES[pay].label}</span>
                          {s.debt > 0 && <span className="debt att-debt">{formatSom(s.debt)}</span>}
                        </td>
                        <td className="col-md">{pct == null ? <span className="data-table__muted">—</span> : <span className={pct < 70 ? 'debt' : ''}>{pct}%</span>}</td>
                        <td>
                          <div className="att-marks" role="group" aria-label={`${s.lastName} ${s.firstName} davomati`}>
                            {Object.entries(MARKS).map(([m, { label, icon: Icon, tone }]) => (
                              <button key={m} type="button" title={label} aria-pressed={current[s.id] === m} className={`att-mark att-mark--${tone}${current[s.id] === m ? ' is-on' : ''}`} onClick={() => mark(s.id, m)}>
                                <Icon size={15} /><span>{label}</span>
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!rows.length && <tr><td colSpan={4} className="empty-text">Bu guruhda talaba topilmadi</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
