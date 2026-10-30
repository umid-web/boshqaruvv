import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, CalendarDays, CheckCircle2, Clock3, CreditCard, GraduationCap, MapPin, Search, Users } from 'lucide-react';
import Card from '../admin/components/Card';
import StatCard from '../admin/components/StatCard';
import Avatar from '../admin/components/ui/Avatar';
import { findTeacherByGroup, loadTeachers } from '../admin/pages/teachers/teachersStore';
import { loadUsers } from '../admin/pages/users-roles/usersStore';
import { loadGroups } from '../admin/pages/groups/groupsStore';
import { useStudents } from '../admin/pages/students/useStudents';
import { getTeacherStats, teacherName } from '../admin/pages/teachers/teachersData';
import { weekdayShort } from '../admin/pages/students/studentsData';
import { getPaymentStatus, PAYMENT_STATUSES } from '../admin/pages/students/studentsData';
import { isoDate, usePayments } from '../admin/pages/finance/financeStore';
import { formatSom } from '../admin/utils/format';
import { calcSalary, KINDS, SALARY_STATUSES, useSalary } from '../admin/pages/finance/salaryStore';
import './TeacherPages.scss';

const teacherId = () => sessionStorage.getItem('educontrol_teacher_id');
const DAY_NAMES = { 1: 'Dushanba', 2: 'Seshanba', 3: 'Chorshanba', 4: 'Payshanba', 5: 'Juma', 6: 'Shanba', 0: 'Yakshanba' };
const dateLabel = new Intl.DateTimeFormat('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
const courseTone = (name = '') => ['blue', 'mint', 'amber', 'violet', 'rose'][[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5];

function TeacherPages({ view }) {
  const teacher = useMemo(() => {
    const teachers = loadTeachers();
    const linked = teachers.find((item) => item.id === teacherId());
    if (linked) return linked;
    const account = loadUsers().find((item) => item.id === sessionStorage.getItem('educontrol_user_id'));
    if (!account) return null;
    return teachers.find((item) => item.status === 'active'
      && item.firstName.trim().toLocaleLowerCase('uz') === account.firstName.trim().toLocaleLowerCase('uz')
      && item.lastName.trim().toLocaleLowerCase('uz') === account.lastName.trim().toLocaleLowerCase('uz'))
      || { id: account.id, firstName: account.firstName, lastName: account.lastName, subjects: [], groups: [], salary: 0 };
  }, []);
  const allTeachers = useMemo(() => loadTeachers(), []);
  const groups = useMemo(() => loadGroups().filter((group) => group.status === 'active' && teacher?.groups.includes(group.code)), [teacher]);
  const allActiveGroups = useMemo(() => loadGroups().filter((group) => group.status === 'active'), []);
  const { students } = useStudents();
  const { payments } = usePayments(students);
  const { entries: salaryEntries } = useSalary();
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [salaryMonth, setSalaryMonth] = useState(() => isoDate(new Date()).slice(0, 7));
  const today = new Date().getDay();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const roster = students.filter((student) => groups.some((group) => group.code === student.group) && student.status === 'active');
  const todayLessons = groups.filter((group) => group.days.includes(today)).sort((a, b) => a.start.localeCompare(b.start));
  const weekLessons = allActiveGroups.flatMap((group) => group.days.map((day) => ({ ...group, day, mainTeacher: findTeacherByGroup(allTeachers, group.code) }))).sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  const scheduleDays = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  });
  const scheduleTimes = [...new Set(weekLessons.map((lesson) => lesson.start))].sort();
  const monthKey = isoDate(new Date()).slice(0, 7);
  const studentIds = new Set(roster.map((student) => student.id));
  const monthPayments = payments.filter((payment) => studentIds.has(payment.studentId) && (payment.period || payment.date?.slice(0, 7)) === monthKey);
  const paidThisMonth = monthPayments.reduce((total, payment) => total + Number(payment.amount || 0), 0);
  const personalSalaryEntries = salaryEntries.filter((entry) => entry.teacherId === teacher?.id && entry.month === salaryMonth);
  const personalSalary = teacher ? calcSalary(getTeacherStats(teacher, students).salary, personalSalaryEntries) : null;
  const visibleStudents = roster.filter((student) => {
    const groupMatch = groupFilter === 'all' || student.group === groupFilter;
    const search = `${student.firstName} ${student.lastName} ${student.id} ${student.group}`.toLocaleLowerCase('uz');
    return groupMatch && search.includes(query.trim().toLocaleLowerCase('uz'));
  });

  if (!teacher) return <div className="teacher-empty"><span><GraduationCap size={25}/></span><h2>Ustoz profili topilmadi</h2><p>Administrator foydalanuvchilar bo‘limida xodimni ustoz profiliga bog‘lashi kerak.</p></div>;

  if (view === 'payments') return (
    <div className="teacher-page">
      <header className="teacher-page__heading"><div><span className="teacher-eyebrow">FAQAT KO‘RISH</span><h1>Oylik to‘lovlar</h1><p>Biriktirilgan guruhlaringizdagi o‘quvchilarning joriy oylik to‘lov holati</p></div><div className="teacher-page__date"><CalendarDays size={17}/>{monthKey}</div></header>
      <section className="teacher-stats teacher-stats--payments"><StatCard title="O‘quvchilar" value={roster.length} icon={Users} tone="primary"/><StatCard title="Joriy oyda to‘langan" value={formatSom(paidThisMonth)} icon={CreditCard} tone="success"/><StatCard title="To‘lov kutilmoqda" value={roster.filter((student) => getPaymentStatus(student) !== 'paid').length} icon={CreditCard} tone="warning"/></section>
      <Card className="teacher-card" title="O‘quvchilar to‘lov holati" subtitle="To‘lov belgilash va qabul qilish ustoz hisobida mavjud emas">
        <div className="teacher-payment-list">{roster.map((student) => {
          const paid = monthPayments.filter((payment) => payment.studentId === student.id).reduce((total, payment) => total + Number(payment.amount || 0), 0);
          const status = PAYMENT_STATUSES[getPaymentStatus(student)];
          return <article className="teacher-payment" key={student.id}><Avatar firstName={student.firstName} lastName={student.lastName}/><div className="teacher-payment__student"><strong>{student.lastName} {student.firstName}</strong><span>{student.group} · {student.id}</span></div><div className="teacher-payment__amount"><small>Oylik to‘lov</small><strong>{formatSom(student.monthlyFee)}</strong></div><div className="teacher-payment__amount"><small>Shu oy to‘lagan</small><strong>{formatSom(paid)}</strong></div><span className={`badge badge--${status.tone}`}>{status.label}</span></article>;
        })}{!roster.length && <div className="teacher-empty teacher-empty--compact"><strong>Biriktirilgan faol o‘quvchi yo‘q</strong></div>}</div>
      </Card>
    </div>
  );

  if (view === 'salaries') return (
    <div className="teacher-page">
      <header className="teacher-page__heading"><div><span className="teacher-eyebrow">SHAXSIY MA’LUMOT</span><h1>Mening ish haqim</h1><p>Faqat o‘zingizga tegishli oylik hisob-kitob va to‘lovlar tarixi</p></div><label className="teacher-page__date"><CalendarDays size={17}/><select className="teacher-salary-month" aria-label="Ish haqi oyi" value={salaryMonth} onChange={(event) => setSalaryMonth(event.target.value)}>{Array.from({ length: 12 }, (_, index) => { const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - index); const value = isoDate(date).slice(0, 7); return <option key={value} value={value}>{new Intl.DateTimeFormat('uz-UZ', { month: 'long', year: 'numeric' }).format(date)}</option>; })}</select></label></header>
      <section className="teacher-stats teacher-stats--salary"><StatCard title="Hisoblangan jami" value={formatSom(personalSalary.due)} icon={Banknote} tone="primary"/><StatCard title="To‘langan" value={formatSom(personalSalary.paid)} icon={CreditCard} tone="success"/><StatCard title="Qolgan summa" value={formatSom(personalSalary.left)} icon={Banknote} tone="warning"/></section>
      <Card className="teacher-card" title="Oylik hisob-kitob" subtitle={`${teacherName(teacher)} · ${salaryMonth}`}>
        <div className="teacher-salary-progress"><div className="teacher-salary-progress__labels"><span>To‘lov bajarilishi</span><strong>{personalSalary.pct}%</strong></div><div className="teacher-salary-progress__track"><span style={{ width: `${personalSalary.pct}%` }}/></div><div className="teacher-salary-breakdown"><div><span>Asosiy oylik</span><strong>{formatSom(personalSalary.base)}</strong></div><div><span>Bonus</span><strong>{formatSom(personalSalary.bonus)}</strong></div><div><span>Ushlanma</span><strong>{formatSom(personalSalary.penalty)}</strong></div><div><span>Holat</span><strong><span className={`badge badge--${SALARY_STATUSES[personalSalary.status].tone}`}>{SALARY_STATUSES[personalSalary.status].label}</span></strong></div></div></div>
      </Card>
      <Card className="teacher-card" title="Shu oydagi amallar" subtitle="Maosh to‘lovlari, avans va qo‘shimcha hisoblar">
        <div className="teacher-salary-history">{[...personalSalaryEntries].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => <article className="teacher-salary-history__item" key={entry.id}><span className={`teacher-salary-history__icon is-${KINDS[entry.kind]?.tone || 'muted'}`}><Banknote size={17}/></span><div><strong>{KINDS[entry.kind]?.label || 'Ish haqi amali'}</strong><small>{entry.date}{entry.method ? ` · ${entry.method}` : ''}{entry.note ? ` · ${entry.note}` : ''}</small></div><b>{formatSom(entry.amount)}</b></article>)}{!personalSalaryEntries.length && <div className="teacher-empty teacher-empty--compact"><span><Banknote size={22}/></span><strong>Bu oy uchun amal kiritilmagan</strong><p>Oylik to‘lov kiritilgach, bu yerda ko‘rinadi.</p></div>}</div>
      </Card>
    </div>
  );

  if (view === 'students') return (
    <div className="teacher-page">
      <header className="teacher-page__heading"><div><span className="teacher-eyebrow">O‘QUV JARAYONI</span><h1>Mening o‘quvchilarim</h1><p>Faqat sizga biriktirilgan guruhlardagi faol o‘quvchilar</p></div><div className="teacher-page__date"><CalendarDays size={17}/>{dateLabel}</div></header>
      <div className="teacher-summary"><span><Users size={18}/>{groups.length} ta guruh</span><span><GraduationCap size={18}/>{roster.length} nafar o‘quvchi</span></div>
      <Card className="teacher-card" title="O‘quvchilar ro‘yxati" subtitle={`${visibleStudents.length} nafar o‘quvchi ko‘rsatilmoqda`}>
        <div className="teacher-toolbar"><label className="teacher-search"><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ism, familiya yoki ID bo‘yicha qidirish" /></label><select className="input teacher-group-filter" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} aria-label="Guruh bo‘yicha saralash"><option value="all">Barcha guruhlar</option>{groups.map((group) => <option key={group.code} value={group.code}>{group.code}</option>)}</select></div>
        {visibleStudents.length ? <div className="teacher-student-grid">{visibleStudents.map((student) => <article className="teacher-student" key={student.id}><Avatar firstName={student.firstName} lastName={student.lastName} /><div className="teacher-student__identity"><strong>{student.lastName} {student.firstName}</strong><span>{student.id}</span></div><span className="teacher-tag">{student.group}</span></article>)}</div> : <div className="teacher-empty teacher-empty--compact"><span><Search size={22}/></span><strong>O‘quvchilar topilmadi</strong><p>Qidiruv yoki guruh filtrini o‘zgartiring.</p></div>}
      </Card>
    </div>
  );

  if (view === 'schedule') return (
    <div className="teacher-page">
      <header className="teacher-page__heading"><div><span className="teacher-eyebrow">MARKAZ JADVALI</span><h1>Barcha dars jadvallari</h1><p>Markazdagi barcha faol guruhlar, dars vaqtlari, xonalar va ustozlar</p></div><div className="teacher-page__date"><CalendarDays size={17}/>{dateLabel}</div></header>
      <Card className="teacher-card teacher-calendar-card" title="Haftalik darslar" subtitle={`${weekLessons.length} ta dars · hafta kunlari va boshlanish vaqti bo‘yicha`}>
        {weekLessons.length ? <div className="teacher-calendar-scroll"><div className="teacher-calendar" style={{ '--calendar-columns': scheduleDays.length }}>
          <div className="teacher-calendar__corner"><Clock3 size={15}/><span>Vaqt</span></div>
          {scheduleDays.map((date) => { const day = date.getDay(); const count = weekLessons.filter((lesson) => lesson.day === day).length; return <div key={day} className={`teacher-calendar__day${day === today ? ' is-today' : ''}`}><span>{DAY_NAMES[day]}</span><strong>{String(date.getDate()).padStart(2, '0')}.{String(date.getMonth() + 1).padStart(2, '0')}</strong><small>{count} ta dars</small></div>; })}
          {scheduleTimes.map((time) => <div className="teacher-calendar__row" key={time}><div className="teacher-calendar__time">{time}</div>{scheduleDays.map((date) => { const lessons = weekLessons.filter((lesson) => lesson.day === date.getDay() && lesson.start === time); return <div className={`teacher-calendar__cell${date.getDay() === today ? ' is-today' : ''}`} key={`${date.getDay()}-${time}`}>{lessons.map((lesson) => <article className={`teacher-event teacher-event--${courseTone(lesson.course)}`} key={lesson.code} title={`${lesson.course} · ${lesson.code} · ${lesson.room}`}><span className="teacher-event__time">{lesson.start}–{lesson.end}</span><strong>{lesson.course}</strong><span className="teacher-event__group">{lesson.code}</span><span className="teacher-event__meta"><MapPin size={12}/>{lesson.room}</span><span className="teacher-event__teacher">{lesson.mainTeacher ? teacherName(lesson.mainTeacher) : 'Ustoz biriktirilmagan'}</span></article>)}</div>; })}</div>)}
        </div></div> : <div className="teacher-empty teacher-empty--compact"><span><CalendarDays size={22}/></span><strong>Jadval hozircha bo‘sh</strong><p>Faol guruhlar qo‘shilgach, darslar shu yerda chiqadi.</p></div>}
      </Card>
    </div>
  );

  return <div className="teacher-page teacher-dashboard">
    <section className="teacher-welcome teacher-welcome--compact"><div className="teacher-welcome__copy"><span className="teacher-eyebrow">USTOZ PANELI</span><h1>Assalomu alaykum, {teacher.firstName}!</h1><p>Bugungi darslaringiz va o‘quvchilaringiz haqidagi qisqa ma’lumot.</p><div className="teacher-welcome__subjects">{teacher.subjects.slice(0, 3).map((subject) => <span key={subject}>{subject}</span>)}<span className="teacher-welcome__status"><i/> Faol ustoz</span></div></div><div className="teacher-welcome__actions"><span className="teacher-page__date"><CalendarDays size={16}/>{dateLabel}</span></div></section>
    <section className="teacher-stats" aria-label="Ustoz ko‘rsatkichlari"><StatCard title="Biriktirilgan guruhlar" value={groups.length} icon={Users} tone="primary"/><StatCard title="Faol o‘quvchilar" value={roster.length} icon={GraduationCap} tone="success"/><StatCard title="Bugungi darslar" value={todayLessons.length} icon={CalendarDays} tone="warning"/></section>
    <section className="teacher-dashboard__grid"><Card className="teacher-card teacher-today" title="Bugungi darslar" subtitle={DAY_NAMES[today]}>{todayLessons.length ? <div className="teacher-today__list">{todayLessons.map((group) => <article className="teacher-today__lesson" key={group.code}><span className="teacher-today__icon"><CalendarDays size={18}/></span><span className="teacher-today__details"><strong>{group.course}</strong><small>{group.code} · {group.room}</small></span><span className="teacher-today__time">{group.start}<small>{group.end} gacha</small></span></article>)}</div> : <div className="teacher-no-lessons"><CheckCircle2 size={21}/><div><strong>Bugun dars yo‘q</strong><span>Yaxshi dam oling, ustoz!</span></div></div>}<Link className="teacher-text-link" to="/teacher/schedule">To‘liq jadvalni ko‘rish <ArrowRight size={15}/></Link></Card>
      <Card className="teacher-card teacher-shortcuts" title="Tezkor amallar" subtitle="Kerakli bo‘limga tez o‘ting"><Link to="/teacher/students"><span className="teacher-shortcuts__icon is-green"><GraduationCap size={19}/></span><span><strong>O‘quvchilarim</strong><small>Guruhlar va o‘quvchilar ro‘yxati</small></span><ArrowRight size={17}/></Link><Link to="/teacher/schedule"><span className="teacher-shortcuts__icon is-orange"><CalendarDays size={19}/></span><span><strong>Dars jadvali</strong><small>Haftalik darslarni ko‘ring</small></span><ArrowRight size={17}/></Link><Link to="/teacher/payments"><span className="teacher-shortcuts__icon is-violet"><CreditCard size={19}/></span><span><strong>To‘lov holati</strong><small>Oylik to‘lovlarni ko‘ring</small></span><ArrowRight size={17}/></Link><Link to="/teacher/salaries"><span className="teacher-shortcuts__icon is-green"><Banknote size={19}/></span><span><strong>Ish haqi</strong><small>Oylik hisob va to‘lovlar</small></span><ArrowRight size={17}/></Link></Card>
    </section>
    <Card className="teacher-salary-glance" title="Shu oydagi ish haqi" subtitle="Shaxsiy hisob-kitob"><div className="teacher-salary-glance__amounts"><div><small>Hisoblangan</small><strong>{formatSom(personalSalary.due)}</strong></div><div><small>To‘langan</small><strong>{formatSom(personalSalary.paid)}</strong></div><div><small>Qoldiq</small><strong>{formatSom(personalSalary.left)}</strong></div></div><div className="teacher-salary-glance__bar"><span style={{ width: `${personalSalary.pct}%` }}/></div><Link className="teacher-text-link" to="/teacher/salaries">Batafsil ma’lumot <ArrowRight size={15}/></Link></Card>
  </div>;
}

export default TeacherPages;
