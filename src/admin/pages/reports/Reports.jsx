import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Banknote,
  ClipboardCheck,
  Download,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Printer,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import { useToast } from '../../components/ui/useToast';
import { downloadCsv } from '../../utils/csv';
import { formatDate, formatMoney, formatSom } from '../../utils/format';
import { useStudents } from '../students/useStudents';
import { PAYMENT_STATUSES, STATUSES, getPaymentStatus } from '../students/studentsData';
import { loadGroups, useGroups } from '../groups/groupsStore';
import { getGroupStats } from '../groups/groupsData';
import { EXPENSE_CATEGORIES, isoDate, useExpenses, usePayments } from '../finance/financeStore';
import { useAppSettings } from '../settings/useAppSettings';
import {
  PERIODS,
  fullName,
  inRange,
  loadAttendance,
  monthsInRange,
  pctChange,
  previousRange,
  rangeFromPreset,
  sumAmt,
} from './reportsUtils';
import '../students/Students.scss';
import './Reports.scss';

const SECTIONS = [
  { id: 'overview', label: 'Umumiy', hint: 'Asosiy ko‘rsatkichlar', icon: LayoutDashboard },
  { id: 'finance', label: 'Moliya', hint: 'Tushum, xarajat, foyda', icon: Wallet },
  { id: 'students', label: 'Talabalar', hint: 'Holat, qarz, qabul', icon: GraduationCap },
  { id: 'attendance', label: 'Davomat', hint: 'Kelish foizi', icon: ClipboardCheck },
  { id: 'groups', label: 'Guruhlar', hint: 'To‘liqlik va tushum', icon: Users },
];

const PIE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--primary)'];
const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 };

const ChartTip = ({ active, payload, label, money = true }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...tooltipStyle, padding: '0.55rem 0.75rem' }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, fontSize: 13 }}>
          {p.name}: {money ? formatSom(p.value) : p.value}
        </div>
      ))}
    </div>
  );
};

const Reports = () => {
  const toast = useToast();
  const { settings } = useAppSettings();
  const { students } = useStudents();
  const { groups } = useGroups();
  const { payments } = usePayments(students);
  const { expenses } = useExpenses();

  const [section, setSection] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return SECTIONS.some((s) => s.id === hash) ? hash : 'overview';
  });
  const [preset, setPreset] = useState('this-month');
  const [from, setFrom] = useState(() => rangeFromPreset('this-month').from);
  const [to, setTo] = useState(() => rangeFromPreset('this-month').to);

  const orgName = settings.org?.name?.trim() || 'EduControl Pro';
  const applyPreset = (id) => {
    setPreset(id);
    if (id === 'custom') return;
    const next = rangeFromPreset(id, new Date(), settings.finance?.fiscalYearStart);
    setFrom(next.from);
    setTo(next.to);
  };
  const setCustomFrom = (v) => {
    if (!v) return;
    setPreset('custom');
    setFrom(v > to ? to : v);
  };
  const setCustomTo = (v) => {
    if (!v) return;
    setPreset('custom');
    setTo(v < from ? from : v);
  };

  const go = (id) => {
    setSection(id);
    window.history.replaceState(null, '', `#${id}`);
  };

  const data = useMemo(() => {
    const safeFrom = from <= to ? from : to;
    const safeTo = to >= from ? to : from;
    const prev = previousRange(safeFrom, safeTo);
    const months = monthsInRange(safeFrom, safeTo);
    const payNow = payments.filter((p) => inRange(p.date, safeFrom, safeTo));
    const payPrev = payments.filter((p) => inRange(p.date, prev.from, prev.to));
    const expNow = expenses.filter((e) => inRange(e.date, safeFrom, safeTo));
    const expPrev = expenses.filter((e) => inRange(e.date, prev.from, prev.to));
    const income = sumAmt(payNow);
    const expense = sumAmt(expNow);
    const profit = income - expense;
    const incomePrev = sumAmt(payPrev);
    const expensePrev = sumAmt(expPrev);
    const profitPrev = incomePrev - expensePrev;

    const chart = months.map((m) => {
      const tushum = sumAmt(payments.filter((p) => p.date.startsWith(m.key) && inRange(p.date, safeFrom, safeTo)));
      const xarajat = sumAmt(expenses.filter((e) => e.date.startsWith(m.key) && inRange(e.date, safeFrom, safeTo)));
      return { ...m, Tushum: tushum, Xarajat: xarajat, Foyda: tushum - xarajat };
    });

    const byMethod = {};
    for (const p of payNow) byMethod[p.method || 'Boshqa'] = (byMethod[p.method || 'Boshqa'] || 0) + p.amount;
    const methods = Object.entries(byMethod)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const catTotal = expense || 1;
    const categories = EXPENSE_CATEGORIES.map((c) => ({
      ...c,
      amount: sumAmt(expNow.filter((e) => e.category === c.value)),
    }))
      .filter((c) => c.amount)
      .map((c) => ({ ...c, pct: Math.round((c.amount / catTotal) * 100) }))
      .sort((a, b) => b.amount - a.amount);

    const debtors = students
      .filter((s) => s.debt > 0 && (s.status === 'active' || s.status === 'dropped'))
      .sort((a, b) => b.debt - a.debt);
    const totalDebt = debtors.reduce((t, s) => t + s.debt, 0);
    const enrolled = students.filter((s) => inRange(s.enrolledAt, safeFrom, safeTo));
    const statusPie = Object.entries(STATUSES)
      .map(([value, meta]) => ({ name: meta.label, value: students.filter((s) => s.status === value).length, tone: meta.tone }))
      .filter((x) => x.value);
    const payPie = Object.entries(PAYMENT_STATUSES)
      .map(([value, meta]) => ({
        name: meta.label,
        value: students.filter((s) => s.status === 'active' && getPaymentStatus(s) === value).length,
      }))
      .filter((x) => x.value);

    const records = loadAttendance();
    const attEntries = Object.entries(records).filter(([k]) => {
      const date = k.split('|')[1];
      return inRange(date, safeFrom, safeTo);
    });
    let onTime = 0;
    let late = 0;
    let excused = 0;
    let absent = 0;
    const byGroup = {};
    for (const [k, map] of attEntries) {
      const code = k.split('|')[0];
      const bucket = (byGroup[code] ??= { present: 0, total: 0, absent: 0 });
      for (const mark of Object.values(map || {})) {
        bucket.total += 1;
        if (mark === 'p') { onTime += 1; bucket.present += 1; }
        else if (mark === 'l') { late += 1; bucket.present += 1; }
        else if (mark === 'e') excused += 1;
        else if (mark === 'a') { absent += 1; bucket.absent += 1; }
      }
    }
    const present = onTime + late;
    const marked = present + excused + absent;
    const attRate = marked ? Math.round((present / marked) * 100) : null;
    const attGroups = Object.entries(byGroup)
      .map(([code, b]) => ({
        code,
        rate: b.total ? Math.round((b.present / b.total) * 100) : 0,
        total: b.total,
        absent: b.absent,
      }))
      .sort((a, b) => a.rate - b.rate);

    const groupRows = (groups.length ? groups : loadGroups())
      .filter((g) => g.status === 'active')
      .map((g) => {
        const st = getGroupStats(g, students);
        const att = attGroups.find((x) => x.code === g.code);
        return { ...g, ...st, attRate: att?.rate ?? null, attLessons: att?.total ?? 0 };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const bestMonth = chart.reduce((best, m) => (!best || m.Foyda > best.Foyda ? m : best), null);
    const topCat = categories[0];
    const weakAtt = attGroups[0];

    return {
      from: safeFrom,
      to: safeTo,
      prev,
      months,
      chart,
      income,
      expense,
      profit,
      incomePrev,
      expensePrev,
      profitPrev,
      methods,
      categories,
      payNow,
      expNow,
      debtors,
      totalDebt,
      enrolled,
      statusPie,
      payPie,
      attRate,
      marked,
      present,
      onTime,
      late,
      excused,
      absent,
      attGroups,
      groupRows,
      bestMonth,
      topCat,
      weakAtt,
      lessons: attEntries.length,
    };
  }, [from, to, payments, expenses, students, groups]);

  const periodLabel = `${formatDate(data.from)} – ${formatDate(data.to)}`;

  const exportCsv = () => {
    const head = [['Markaz', orgName], ['Bo‘lim', SECTIONS.find((s) => s.id === section)?.label], ['Davr', periodLabel], []];
    let rows = head;
    if (section === 'finance' || section === 'overview') {
      rows = [
        ...head,
        ['Ko‘rsatkich', 'Qiymat'],
        ['Tushum', data.income],
        ['Xarajat', data.expense],
        ['Sof foyda', data.profit],
        ['Qarzdorlik', data.totalDebt],
        [],
        ['Oy', 'Tushum', 'Xarajat', 'Sof foyda'],
        ...data.chart.map((m) => [m.full, m.Tushum, m.Xarajat, m.Foyda]),
      ];
      if (section === 'finance') {
        rows.push([], ['To‘lov usuli', 'Summa'], ...data.methods.map((m) => [m.name, m.value]));
        rows.push([], ['Xarajat turi', 'Summa', '%'], ...data.categories.map((c) => [c.label, c.amount, c.pct]));
      }
    } else if (section === 'students') {
      rows = [
        ...head,
        ['Talaba', 'ID', 'Guruh', 'Holat', 'Qarz', 'Qo‘shilgan'],
        ...students.map((s) => [fullName(s), s.id, s.group, STATUSES[s.status]?.label ?? s.status, s.debt, s.enrolledAt]),
      ];
    } else if (section === 'attendance') {
      rows = [
        ...head,
        ['Guruh', 'Davomat %', 'Yozuvlar', 'Kelmadi'],
        ...data.attGroups.map((g) => [g.code, g.rate, g.total, g.absent]),
      ];
    } else {
      rows = [
        ...head,
        ['Guruh', 'Kurs', 'Faol talaba', 'Sig‘im', 'To‘liqlik %', 'Oylik tushum', 'Qarz', 'Davomat %'],
        ...data.groupRows.map((g) => [g.code, g.course, g.activeStudents, g.capacity, g.fill, g.revenue, g.debt, g.attRate ?? '']),
      ];
    }
    downloadCsv(`hisobot-${section}-${data.from}-${data.to}.csv`, rows);
    toast.success('CSV yuklab olindi');
  };

  const printReport = () => window.print();

  return (
    <div className="students-page reports-page">
      <header className="page-head">
        <div>
          <h1>Hisobotlar</h1>
          <p>{orgName} · {periodLabel}</p>
        </div>
      </header>

      <div className="reports-toolbar">
        <div className="reports-period" role="group" aria-label="Davr">
          <select className="input" value={preset} onChange={(e) => applyPreset(e.target.value)} aria-label="Davr turi">
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <input type="date" className="input" value={from} max={to} onChange={(e) => setCustomFrom(e.target.value)} aria-label="Boshlanish" />
          <input type="date" className="input" value={to} min={from} onChange={(e) => setCustomTo(e.target.value)} aria-label="Tugash" />
        </div>
        <div className="reports-toolbar__actions">
          <button type="button" className="btn btn--secondary" onClick={exportCsv}>
            <Download size={16} /> CSV
          </button>
          <button type="button" className="btn btn--primary" onClick={printReport}>
            <Printer size={16} /> Chop etish
          </button>
        </div>
      </div>

      <div className="reports-print">
        <h2>{orgName} — hisobot</h2>
        <p>{SECTIONS.find((s) => s.id === section)?.label} · {periodLabel}</p>
      </div>

      <div className="reports-layout">
        <nav className="reports-nav" aria-label="Hisobot turlari">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                className={`reports-nav__item${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => go(s.id)}
              >
                <span className="reports-nav__icon"><Icon size={18} /></span>
                <span>
                  <strong>{s.label}</strong>
                  <small>{s.hint}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="reports-main">
          {section === 'overview' && (
            <>
              <div className="students-stats">
                <StatCard title="Tushum" value={formatMoney(data.income)} icon={Wallet} tone="success" change={pctChange(data.income, data.incomePrev)} />
                <StatCard title="Xarajat" value={formatMoney(data.expense)} icon={Banknote} tone="warning" change={pctChange(data.expense, data.expensePrev)} invertChange />
                <StatCard title="Sof foyda" value={formatMoney(data.profit)} icon={TrendingUp} tone={data.profit >= 0 ? 'primary' : 'danger'} change={pctChange(data.profit, data.profitPrev)} />
                <StatCard title={`Qarzdorlik (${data.debtors.length})`} value={formatMoney(data.totalDebt)} icon={AlertTriangle} tone="danger" />
              </div>
              <div className="reports-insights">
                <article className="reports-insight">
                  <span className="reports-insight__icon"><TrendingUp size={18} /></span>
                  <div>
                    <strong>{data.bestMonth ? `${data.bestMonth.full}: ${formatMoney(data.bestMonth.Foyda)}` : 'Ma’lumot yo‘q'}</strong>
                    <p>Davrdagi eng yuqori sof foyda oyi</p>
                  </div>
                </article>
                <article className="reports-insight">
                  <span className="reports-insight__icon"><Banknote size={18} /></span>
                  <div>
                    <strong>{data.topCat ? `${data.topCat.label} · ${formatMoney(data.topCat.amount)}` : 'Xarajat yo‘q'}</strong>
                    <p>Eng katta xarajat toifasi</p>
                  </div>
                </article>
                <article className="reports-insight">
                  <span className="reports-insight__icon"><ClipboardCheck size={18} /></span>
                  <div>
                    <strong>
                      {data.attRate == null
                        ? 'Davomat yozuvi yo‘q'
                        : data.weakAtt
                          ? `${data.weakAtt.code} · ${data.weakAtt.rate}%`
                          : `O‘rtacha ${data.attRate}%`}
                    </strong>
                    <p>{data.attRate == null ? 'Davomat sahifasida belgilang' : 'Eng past davomatli guruh'}</p>
                  </div>
                </article>
              </div>
              <Card title="Tushum, xarajat va foyda" subtitle="Tanlangan davr oylari bo‘yicha">
                <div className="reports-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-muted)" tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} width={44} />
                      <Tooltip content={<ChartTip />} cursor={{ stroke: 'var(--border)' }} />
                      <Legend />
                      <Line type="monotone" dataKey="Tushum" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Xarajat" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Foyda" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}

          {section === 'finance' && (
            <>
              <div className="students-stats">
                <StatCard title="Tushum" value={formatMoney(data.income)} icon={Wallet} tone="success" change={pctChange(data.income, data.incomePrev)} />
                <StatCard title="Xarajat" value={formatMoney(data.expense)} icon={Banknote} tone="warning" change={pctChange(data.expense, data.expensePrev)} invertChange />
                <StatCard title="Sof foyda" value={formatMoney(data.profit)} icon={TrendingUp} tone={data.profit >= 0 ? 'primary' : 'danger'} />
                <StatCard title="To‘lovlar soni" value={String(data.payNow.length)} icon={FileText} tone="primary" />
              </div>
              <div className="reports-grid">
                <Card title="Oylik solishtirma" subtitle="Tushum va xarajat">
                  <div className="reports-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-muted)" tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1e6)}M`} width={44} />
                        <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--surface-2)' }} />
                        <Legend />
                        <Bar dataKey="Tushum" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Xarajat" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card title="Xarajatlar tarkibi">
                  {data.categories.length ? (
                    <ul className="reports-split">
                      {data.categories.map((c) => (
                        <li key={c.value}>
                          <div><span>{c.label}</span><strong>{formatMoney(c.amount)}</strong></div>
                          <span className="reports-bar"><span style={{ width: `${c.pct}%` }} /></span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="reports-empty">Bu davrda xarajat yo‘q</p>}
                </Card>
                <Card title="To‘lov usullari">
                  {data.methods.length ? (
                    <div className="reports-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={data.methods} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>
                            {data.methods.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => formatSom(v)} contentStyle={tooltipStyle} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <p className="reports-empty">Bu davrda to‘lov yo‘q</p>}
                </Card>
                <Card title="So‘nggi to‘lovlar">
                  <ul className="reports-list">
                    {data.payNow.slice(0, 8).map((p) => (
                      <li key={p.id}>
                        <div>
                          <strong>{p.name}</strong>
                          <span className="data-table__muted">{p.group} · {p.method} · {formatDate(p.date)}</span>
                        </div>
                        <span className="reports-plus">+{formatSom(p.amount)}</span>
                      </li>
                    ))}
                    {!data.payNow.length && <li className="empty-text">To‘lov yo‘q</li>}
                  </ul>
                </Card>
              </div>
            </>
          )}

          {section === 'students' && (
            <>
              <div className="students-stats">
                <StatCard title="Jami talaba" value={String(students.length)} icon={GraduationCap} tone="primary" />
                <StatCard title="Faol" value={String(students.filter((s) => s.status === 'active').length)} icon={Users} tone="success" />
                <StatCard title="Davrda qo‘shilgan" value={String(data.enrolled.length)} icon={FileText} tone="primary" />
                <StatCard title="Qarzdorlar" value={String(data.debtors.length)} icon={AlertTriangle} tone="danger" />
              </div>
              <div className="reports-grid">
                <Card title="Holat bo‘yicha">
                  <div className="reports-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.statusPie} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>
                          {data.statusPie.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card title="Faol talabalar to‘lovi">
                  <div className="reports-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.payPie} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2}>
                          {data.payPie.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card title="Eng katta qarzdorlar">
                  <ul className="reports-list">
                    {data.debtors.slice(0, 8).map((s) => (
                      <li key={s.id}>
                        <div>
                          <strong>{fullName(s)}</strong>
                          <span className="data-table__muted">{s.group} · {s.id}</span>
                        </div>
                        <span className="debt">{formatSom(s.debt)}</span>
                      </li>
                    ))}
                    {!data.debtors.length && <li className="empty-text">Qarzdor talaba yo‘q</li>}
                  </ul>
                </Card>
                <Card title="Davrda qo‘shilganlar">
                  <ul className="reports-list">
                    {data.enrolled.slice(0, 8).map((s) => (
                      <li key={s.id}>
                        <div>
                          <strong>{fullName(s)}</strong>
                          <span className="data-table__muted">{s.group} · {formatDate(s.enrolledAt)}</span>
                        </div>
                        <span className={`badge badge--${STATUSES[s.status]?.tone ?? 'muted'}`}>{STATUSES[s.status]?.label}</span>
                      </li>
                    ))}
                    {!data.enrolled.length && <li className="empty-text">Bu davrda yangi talaba yo‘q</li>}
                  </ul>
                </Card>
              </div>
            </>
          )}

          {section === 'attendance' && (
            <>
              <div className="students-stats">
                <StatCard title="O‘rtacha davomat" value={data.attRate == null ? '—' : `${data.attRate}%`} icon={ClipboardCheck} tone="success" />
                <StatCard title="Dars kunlari" value={String(data.lessons)} icon={FileText} tone="primary" />
                <StatCard title="Kechikish" value={String(data.late)} icon={AlertTriangle} tone="warning" />
                <StatCard title="Kelmadi" value={String(data.absent)} icon={AlertTriangle} tone="danger" />
              </div>
              <ul className="reports-meta">
                <li>Keldi: <strong>{data.onTime}</strong></li>
                <li>Kechikdi: <strong>{data.late}</strong></li>
                <li>Sababli: <strong>{data.excused}</strong></li>
                <li>Jami belgi: <strong>{data.marked}</strong></li>
              </ul>
              <Card title="Guruhlar davomati" subtitle="Faqat belgilangan darslar asosida" className="students-card">
                {data.attGroups.length ? (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Guruh</th>
                          <th>Davomat</th>
                          <th>Yozuvlar</th>
                          <th>Kelmadi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.attGroups.map((g) => (
                          <tr key={g.code}>
                            <td><strong>{g.code}</strong></td>
                            <td>
                              <span className={`badge badge--${g.rate >= 85 ? 'success' : g.rate >= 70 ? 'warning' : 'danger'}`}>{g.rate}%</span>
                            </td>
                            <td>{g.total}</td>
                            <td>{g.absent}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="reports-empty">Tanlangan davrda davomat yozuvi yo‘q. Avval Davomat sahifasida belgilang.</p>
                )}
              </Card>
            </>
          )}

          {section === 'groups' && (
            <Card title="Guruhlar samaradorligi" subtitle="Faol guruhlar · oylik to‘lov va to‘liqlik" className="students-card">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Guruh</th>
                      <th>Kurs</th>
                      <th>Talaba</th>
                      <th>To‘liqlik</th>
                      <th>Davomat</th>
                      <th style={{ textAlign: 'right' }}>Oylik tushum</th>
                      <th style={{ textAlign: 'right' }}>Qarz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.groupRows.map((g) => (
                      <tr key={g.code}>
                        <td><strong>{g.code}</strong></td>
                        <td>{g.course}</td>
                        <td>{g.activeStudents}/{g.capacity}</td>
                        <td>
                          <span className={`badge badge--${g.fill >= 80 ? 'success' : g.fill >= 50 ? 'warning' : 'danger'}`}>{g.fill}%</span>
                        </td>
                        <td>{g.attRate == null ? '—' : `${g.attRate}%`}</td>
                        <td style={{ textAlign: 'right' }}>{formatSom(g.revenue)}</td>
                        <td style={{ textAlign: 'right' }}><span className={g.debt ? 'debt' : ''}>{formatSom(g.debt)}</span></td>
                      </tr>
                    ))}
                    {!data.groupRows.length && <tr><td colSpan={7} className="empty-text">Faol guruh yo‘q</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
