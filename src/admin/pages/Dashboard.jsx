import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote,
  CreditCard,
  Wallet,
  Receipt,
} from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import SegmentedControl from '../components/SegmentedControl';
import RevenueChart from '../components/RevenueChart';
import StudentStatsChart from '../components/StudentStatsChart';
import CourseDistributionChart from '../components/CourseDistributionChart';
import PaymentsStatusChart from '../components/PaymentsStatusChart';
import RecentActivities from '../components/RecentActivities';
import { useActivities } from '../activity/activityStore';
import { toLocalStamp } from '../activity/time';
import TodaySchedule from '../components/TodaySchedule';
import Alerts from '../components/Alerts';
import QuickActions from '../components/QuickActions';
import {
  getStats,
  getStudentStats,
  getCourseDistribution,
  getPaymentsStatus,
  getRecentActivities,
  getTodaySchedule,
  getAlerts,
  getPeriodLabel,
  REVENUE_PERIODS,
} from '../data/dashboardDemoData';
import { formatNumber, formatMoney } from '../utils/format';
import { loadGroups } from './groups/groupsStore';
import { useStudents } from './students/useStudents';
import { isoDate, usePayments } from './finance/financeStore';
import './Dashboard.scss';

const loadData = (period) => ({
  stats: getStats(period),
  studentStats: getStudentStats(),
  courseDist: getCourseDistribution(),
  paymentStatus: getPaymentsStatus(),
  activities: getRecentActivities(),
  schedule: getTodaySchedule(),
  alerts: getAlerts(),
});

const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;

/**
 * Dashboard sahifasi: ko‘rsatkichlar, tezkor amallar, grafiklar, jadval va ogohlantirishlar.
 * Barcha ma'lumotlar DEMO — keyinchalik backend bilan almashtiriladi.
 */
const Dashboard = () => {
  const [period, setPeriod] = useState('month');
  const [revenuePeriod, setRevenuePeriod] = useState('month');
  const [data, setData] = useState(() => loadData('month'));
  const { students } = useStudents();
  const { payments } = usePayments(students);

  // So‘nggi faoliyatlar — haqiqiy faoliyat tarixidan (bo‘sh bo‘lsa, DEMO ro‘yxat)
  const live = useActivities();
  const recent = useMemo(
    () => live.slice(0, 6).map((a) => ({ id: a.id, type: a.module, tone: a.severity, description: a.title, time: toLocalStamp(a.at) })),
    [live],
  );

  const handlePeriodChange = (next) => {
    setPeriod(next);
    setData(loadData(next));
  };

  // Backend ulanganda bu yerda qayta so‘rov yuboriladi
  const handleRefresh = () => setData(loadData(period));

  const { stats } = data;
  const todayKey = isoDate(new Date());
  const monthKey = todayKey.slice(0, 7);
  const todayPayments = payments.filter((payment) => payment.date === todayKey);
  const monthPayments = payments.filter((payment) => payment.date?.startsWith(monthKey));
  const paymentTotal = (list) => list.reduce((total, payment) => total + Number(payment.amount || 0), 0);
  const averagePayment = payments.length ? paymentTotal(payments) / payments.length : 0;
  const scheduleGroups = loadGroups();
  const availableRooms = [...new Set(scheduleGroups.map((group) => group.room).filter(Boolean))];
  const today = new Date().getDay();
  const occupiedRooms = new Set(scheduleGroups.filter((group) => group.status === 'active' && group.days?.includes(today)).map((group) => group.room));
  const periodLabel = getPeriodLabel(period);

  const handleExport = () => {
    const rows = [
      ['Ko‘rsatkich', 'Qiymat'],
      ['Jami talabalar', stats.totalStudents],
      ['Faol talabalar', stats.activeStudents],
      ['Ustozlar', stats.totalTeachers],
      ['Qo‘shimcha ustozlar', stats.extraTeachers],
      ['Faol guruhlar', stats.activeGroups],
      ['Bugungi tushum (DEMO)', formatMoney(stats.todayIncome)],
      [`Tushum — ${periodLabel} (DEMO)`, formatMoney(stats.periodIncome)],
      ['Qarzdorlik (DEMO)', formatMoney(stats.unpaidDebts)],
    ];
    // BOM (\uFEFF) — Excel o‘zbekcha belgilarni (‘, ʻ) to‘g‘ri ochishi uchun
    const csv = '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dashboard_statistika_demo.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="dashboard-page">
      <DashboardHeader
        period={period}
        setPeriod={handlePeriodChange}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />

      <section className="stats-grid" aria-label="To‘lovlar ko‘rsatkichlari">
        <StatCard title="Bugungi tushum" value={formatMoney(paymentTotal(todayPayments))} icon={Wallet} tone="success" />
        <StatCard title="Joriy oy" value={formatMoney(paymentTotal(monthPayments))} icon={Banknote} tone="primary" />
        <StatCard title={`Tanlangan (${payments.length} ta)`} value={formatMoney(paymentTotal(payments))} icon={Receipt} tone="warning" />
        <StatCard title="O‘rtacha to‘lov" value={formatMoney(averagePayment)} icon={CreditCard} tone="primary" />
      </section>

      <section aria-label="Tezkor amallar">
        <h2 className="section-title">Tezkor amallar</h2>
        <QuickActions />
      </section>

      <section className="grid" aria-label="Grafiklar">
        <Card
          className="span-8"
          title="Daromad va xarajat"
          subtitle="Million so‘mda"
          demo
          actions={
            <SegmentedControl
              label="Grafik davri"
              options={REVENUE_PERIODS}
              value={revenuePeriod}
              onChange={setRevenuePeriod}
            />
          }
        >
          <RevenueChart period={revenuePeriod} />
        </Card>

        <Card className="span-4" title="To‘lovlar holati" subtitle="Talabalar ulushi, %" demo>
          <PaymentsStatusChart data={data.paymentStatus} />
        </Card>

        <Card className="span-6" title="O‘quvchilar statistikasi" subtitle="Haftalar kesimida" demo>
          <StudentStatsChart data={data.studentStats} />
        </Card>

        <Card className="span-6" title="Kurslar bo‘yicha taqsimot" subtitle="Talabalar soni" demo>
          <CourseDistributionChart data={data.courseDist} />
        </Card>
      </section>

      <section className="grid" aria-label="Bugungi ma'lumotlar">
        <Card className="span-8" title="Bugungi darslar" demo>
          <TodaySchedule schedule={data.schedule} availableRooms={availableRooms} occupiedRooms={occupiedRooms} />
        </Card>

        <div className="span-4 stack">
          <Card title="Ogohlantirishlar" demo>
            <Alerts alerts={data.alerts} />
          </Card>
          <Card
            title="So‘nggi faoliyatlar"
            demo={recent.length === 0}
            actions={<Link to="/admin/activity" className="btn btn--ghost btn--sm">Barchasi</Link>}
          >
            <RecentActivities activities={recent.length ? recent : data.activities} />
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
