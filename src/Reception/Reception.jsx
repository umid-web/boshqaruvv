import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Check, CheckCircle2, Clock3, CreditCard, Search, UserPlus, X } from 'lucide-react'
import { useStudents } from '../admin/pages/students/useStudents'
import { getPaymentStatus, PAYMENT_STATUSES, STATUSES } from '../admin/pages/students/studentsData'
import { usePayments, METHODS, isoDate } from '../admin/pages/finance/financeStore'
import { loadGroups } from '../admin/pages/groups/groupsStore'
import { useToast } from '../admin/components/ui/useToast'
import { loadRoles } from '../admin/pages/users-roles/usersStore'
import Card from '../admin/components/Card'
import StudentStatsChart from '../admin/components/StudentStatsChart'
import CourseDistributionChart from '../admin/components/CourseDistributionChart'
import PaymentsStatusChart from '../admin/components/PaymentsStatusChart'
import Alerts from '../admin/components/Alerts'
import { getStudentStats, getCourseDistribution, getPaymentsStatus, getAlerts } from '../admin/data/dashboardDemoData'
import './Reception.scss'

const money = (value) => new Intl.NumberFormat('uz-UZ').format(value) + ' soʻm'

export default function Reception() {
  const { students, update } = useStudents()
  const { payments, add: addPayment } = usePayments(students)
  const [query, setQuery] = useState('')
  const [payTarget, setPayTarget] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState(METHODS[0])
  const toast = useToast()
  const role = loadRoles().find((item) => item.id === sessionStorage.getItem('educontrol_role'))
  const canReceivePayment = role?.permissions?.includes('payments.create')
  const canOpen = (module) => role?.permissions?.includes(`${module}.view`)
  const active = students.filter((student) => student.status === 'active')
  const debtors = active.filter((student) => student.debt > 0)
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('uz')
    if (!normalized) return active.slice(0, 6)
    return active.filter((student) => `${student.firstName} ${student.lastName} ${student.phone} ${student.group}`.toLocaleLowerCase('uz').includes(normalized)).slice(0, 8)
  }, [active, query])
  const currentMonth = isoDate(new Date()).slice(0, 7)
  const today = isoDate(new Date())
  const todayPayments = payments.filter((payment) => payment.date === today)
  const todayRevenue = todayPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const outstanding = debtors.reduce((sum, student) => sum + Number(student.debt || 0), 0)
  const weekday = new Date().getDay()
  const allGroups = loadGroups()
  const scheduleToday = allGroups.filter((group) => group.status === 'active' && group.days?.includes(weekday)).sort((a, b) => a.start.localeCompare(b.start))
  const knownRooms = [...new Set(allGroups.map((group) => group.room).filter(Boolean))]
  const occupiedRooms = new Set(scheduleToday.map((group) => group.room))
  const freeRooms = knownRooms.filter((room) => !occupiedRooms.has(room))
  const monthPaid = (studentId) => payments
    .filter((payment) => payment.studentId === studentId && payment.date?.startsWith(currentMonth))
    .reduce((total, payment) => total + Number(payment.amount || 0), 0)

  const openPayment = (student) => {
    setPayTarget(student.id)
    setPayAmount(String(Math.min(Number(student.debt) || 0, Number(student.monthlyFee) || Number(student.debt) || 0)))
  }

  const savePayment = (student) => {
    if (!canReceivePayment) return
    const amount = Math.round(Number(payAmount))
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(student.debt)) {
      toast.error(`Summa 1 dan ${money(student.debt)} gacha bo‘lishi kerak.`)
      return
    }
    const date = isoDate(new Date())
    addPayment({ studentId: student.id, name: `${student.lastName} ${student.firstName}`, group: student.group, amount, method: payMethod, date, period: date.slice(0, 7) })
    update(student.id, { debt: Math.max(0, Number(student.debt) - amount) })
    toast.success(`${money(amount)} to‘lov qabul qilindi. Qoldiq: ${money(Math.max(0, student.debt - amount))}.`)
    setPayTarget('')
    setPayAmount('')
  }

  return (
    <main className="reception">
      <section className="reception__welcome">
        <div><span className="reception__eyebrow">QABULXONA PANELI</span><h1>Xayrli kun!</h1><p>Bugungi ishlar va talabalar bilan ishlash uchun boshqaruv oynasi.</p></div>
        <div className="reception__clock"><Clock3 size={18}/><span><b>{new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</b><small>Ish kuni davom etmoqda</small></span></div>
      </section>

      <section className="reception__quick-actions" aria-label="Tezkor amallar">
        <div className="reception__quick-heading"><div><span className="reception__eyebrow">TEZKOR AMALLAR</span><h2>Qabulxona ishlarini boshlang</h2></div></div>
        <div className="reception__action-grid">
          {canOpen('students') && <Link className="reception-action" to="/reception/students"><span className="reception-action__icon reception-action__icon--blue"><UserPlus size={19}/></span><span><b>Yangi talabani ro‘yxatga olish</b><small>Ma’lumot va kursni kiriting</small></span><ArrowRight size={16}/></Link>}
          {canOpen('attendance') && <Link className="reception-action" to="/reception/attendance"><span className="reception-action__icon reception-action__icon--green"><CheckCircle2 size={19}/></span><span><b>Davomatni belgilash</b><small>Keldi yoki kelmadi deb belgilang</small></span><ArrowRight size={16}/></Link>}
          {canOpen('payments') && <Link className="reception-action" to="/reception/payments"><span className="reception-action__icon reception-action__icon--amber"><CreditCard size={19}/></span><span><b>To‘lov qabul qilish</b><small>To‘lovlar tarixi va chek</small></span><ArrowRight size={16}/></Link>}
          {canOpen('schedule') && <Link className="reception-action" to="/reception/schedule"><span className="reception-action__icon reception-action__icon--violet"><CalendarDays size={19}/></span><span><b>Dars jadvali</b><small>Bugungi mashg‘ulotlarni ko‘ring</small></span><ArrowRight size={16}/></Link>}
        </div>
      </section>

      <section className="reception__dashboard-grid" aria-label="Boshqaruv ko‘rsatkichlari">
        <Card title="To‘lovlar holati" subtitle="Talabalar ulushi, %" demo><PaymentsStatusChart data={getPaymentsStatus()} /></Card>
        <Card title="Kurslar bo‘yicha taqsimot" subtitle="Talabalar soni" demo><CourseDistributionChart data={getCourseDistribution()} /></Card>
        <Card title="O‘quvchilar statistikasi" subtitle="Haftalar kesimida" demo><StudentStatsChart data={getStudentStats()} /></Card>
        <Card title="Ogohlantirishlar" demo><Alerts alerts={getAlerts()} /></Card>
      </section>

      <section className="reception__overview-grid">
        <article className="reception__overview-card">
          <div className="reception__overview-head"><div><span className="reception__eyebrow">BUGUNGI DARS JADVALI</span><h2>{scheduleToday.length} ta mashg‘ulot</h2></div>{canOpen('schedule') && <Link to="/reception/schedule" aria-label="To‘liq jadvalga o‘tish"><ArrowRight size={18}/></Link>}</div>
          {scheduleToday.length ? <div className="reception__agenda">{scheduleToday.slice(0, 5).map((group) => <div className="reception__agenda-row" key={group.code}><span className="reception__agenda-time">{group.start}</span><span className="reception__agenda-dot"/><span className="reception__agenda-info"><b>{group.course}</b><small>{group.code} · {group.room}</small></span><span className="reception__agenda-count">{active.filter((student) => student.group === group.code).length} talaba</span></div>)}</div> : <p className="reception__overview-empty">Bugun uchun dars rejalashtirilmagan.</p>}
          <div className="reception__free-rooms"><b>Bugun bo‘sh xonalar</b><span>{freeRooms.length ? freeRooms.join(', ') : 'Bo‘sh xona yo‘q'}</span></div>
        </article>
        <article className="reception__overview-card reception__overview-card--balance">
          <span className="reception__eyebrow">BUGUNGI TUSHUM</span><h2>{todayPayments.length} ta to‘lov</h2><div className="reception__balance-value">{money(todayRevenue)}</div><p>{debtors.length} faol talabada qarzdorlik bor · jami {money(outstanding)}</p>
          {canOpen('debts') && <Link className="reception__balance-link" to="/reception/debts">Qarzdorlik ro‘yxati <ArrowRight size={15}/></Link>}
        </article>
      </section>

      <section className="reception__directory">
        <div className="reception__section-head"><div><span className="reception__eyebrow">TEZKOR QIDIRUV</span><h2>Talabalar ro‘yxati</h2><p>Ism, familiya, telefon yoki guruh orqali qidiring.</p></div><span className="reception__count">{active.length} faol talaba</span></div>
        <label className="reception__search"><Search size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Masalan: Madina, 99890... yoki ENG-C" /><kbd>⌘ K</kbd></label>
        <div className="reception__table-wrap"><table className="reception__table"><thead><tr><th>TALABA</th><th>TELEFON</th><th>KURS / GURUH</th><th>TO‘LOV VA QOLDIQ</th></tr></thead><tbody>
          {filtered.map((student) => {
            const debt = Number(student.debt) || 0
            const paidThisMonth = monthPaid(student.id)
            const payment = getPaymentStatus(student)
            return <tr key={student.id}><td><div className="reception__student"><span className="reception__avatar">{student.firstName?.[0]}{student.lastName?.[0]}</span><span><b>{student.lastName} {student.firstName}</b><small>{student.id} · {STATUSES[student.status]?.label}</small></span></div></td><td>{student.phone || '—'}</td><td><b>{student.course}</b><small className="reception__subline">{student.group}</small></td><td>
              {debt <= 0 ? <span className="reception__paid-check" title="To‘lov to‘liq amalga oshirilgan" aria-label="To‘lov to‘liq amalga oshirilgan"><CheckCircle2 size={21}/></span> : <div className="reception__payment-cell">
                <span className={`reception__badge reception__badge--${paidThisMonth ? 'partial' : payment}`}>{paidThisMonth ? 'Qisman to‘landi' : PAYMENT_STATUSES[payment].label}</span>
                {paidThisMonth > 0 && <small className="reception__subline">To‘langan: {money(paidThisMonth)}</small>}
                <small className="reception__due">Qoldiq: <b>{money(debt)}</b></small>
                {payTarget === student.id ? <div className="reception__pay-form">
                  <label><span>To‘lov summasi</span><input type="number" min="1" max={debt} step="1000" value={payAmount} onChange={(event) => setPayAmount(event.target.value)} autoFocus /></label>
                  <label><span>To‘lov turi</span><select value={payMethod} onChange={(event) => setPayMethod(event.target.value)}>{METHODS.map((method) => <option key={method}>{method}</option>)}</select></label>
                  <div><button type="button" className="reception__pay-save" onClick={() => savePayment(student)}><Check size={15}/> Qabul qilish</button><button type="button" className="reception__pay-cancel" onClick={() => setPayTarget('')} aria-label="Bekor qilish"><X size={16}/></button></div>
                </div> : canReceivePayment && <button type="button" className="reception__pay-open" onClick={() => openPayment(student)}><CreditCard size={14}/> To‘lov kiritish</button>}
              </div>}
            </td></tr>
          })}
          {!filtered.length && <tr><td colSpan="4" className="reception__empty">{query ? 'Qidiruv bo‘yicha talaba topilmadi.' : 'Hozircha faol talabalar yo‘q.'}</td></tr>}
        </tbody></table></div>
      </section>
      <footer className="reception__footer"><span>EduControl Pro · Qabulxona</span><span>Ma’lumotlar tizim bilan sinxronlangan</span></footer>
    </main>
  )
}
