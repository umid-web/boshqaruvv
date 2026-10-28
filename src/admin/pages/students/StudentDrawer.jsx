import { useMemo } from 'react';
import { CalendarClock, CalendarDays, Edit3, MapPin, Phone, Receipt, Trash2, UserCheck, UserRound } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import { formatDate, formatNumber, formatPhone, formatSom } from '../../utils/format';
import { findTeacherByGroup, loadTeachers } from '../teachers/teachersStore';
import {
  GENDERS,
  PAYMENT_STATUSES,
  STATUSES,
  formatSchedule,
  getPaymentHistory,
  getPaymentStatus,
} from './studentsData';

const age = (birthDate) => {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  if (now < new Date(now.getFullYear(), born.getMonth(), born.getDate())) years -= 1;
  return years;
};

const Row = ({ icon: Icon, label, children }) => (
  <div className="profile__row">
    <span className="profile__row-icon"><Icon size={16} /></span>
    <div>
      <div className="profile__row-label">{label}</div>
      <div className="profile__row-value">{children}</div>
    </div>
  </div>
);

/** Talaba profili — yon panel: asosiy ma'lumotlar, to‘lov holati va to‘lovlar tarixi. */
const StudentDrawer = ({ student, onClose, onEdit, onDelete }) => {
  const teachers = useMemo(loadTeachers, []);
  if (!student) return null;
  const status = STATUSES[student.status];
  const payment = PAYMENT_STATUSES[getPaymentStatus(student)];
  const history = getPaymentHistory(student);
  const years = age(student.birthDate);
  const gender = GENDERS.find((g) => g.value === student.gender)?.label;
  const teacher = findTeacherByGroup(teachers, student.group);
  const attendanceTone = student.attendance >= 85 ? 'success' : student.attendance >= 70 ? 'warning' : 'danger';

  return (
    <Modal
      open
      variant="drawer"
      onClose={onClose}
      title="Talaba profili"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={() => onDelete(student)} style={{ marginRight: 'auto', color: 'var(--danger)' }}>
            <Trash2 size={16} /> O‘chirish
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onEdit(student)}>
            <Edit3 size={16} /> Tahrirlash
          </button>
        </>
      }
    >
      <div className="profile">
        <div className="profile__hero">
          <Avatar firstName={student.firstName} lastName={student.lastName} size={64} />
          <div>
            <h3 className="profile__name">{student.lastName} {student.firstName}</h3>
            <div className="profile__meta">
              <span className="profile__id">{student.id}</span>
              <span className={`badge badge--dot badge--${status.tone}`}>{status.label}</span>
            </div>
          </div>
        </div>

        <div className="profile__kpis">
          <div className="profile__kpi">
            <span>Oylik to‘lov</span>
            <strong>{formatSom(student.monthlyFee)}</strong>
          </div>
          <div className="profile__kpi">
            <span>Qarz</span>
            <strong style={{ color: student.debt ? 'var(--danger)' : 'var(--success)' }}>
              {student.debt ? formatSom(student.debt) : 'Yo‘q'}
            </strong>
          </div>
          <div className="profile__kpi">
            <span>Davomat</span>
            <strong style={{ color: `var(--${attendanceTone})` }}>{student.attendance}%</strong>
          </div>
        </div>

        <div
          className="profile__bar"
          role="progressbar"
          aria-valuenow={student.attendance}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Davomat"
        >
          <span style={{ width: `${student.attendance}%`, background: `var(--${attendanceTone})` }} />
        </div>

        <section className="profile__section">
          <h4>Ma'lumotlar</h4>
          <Row icon={UserRound} label="Jinsi / yoshi">
            {gender}{years !== null && ` · ${years} yosh`}
          </Row>
          <Row icon={Phone} label="Telefon">{formatPhone(student.phone)}</Row>
          <Row icon={Phone} label="Ota-ona telefoni">{formatPhone(student.parentPhone)}</Row>
          <Row icon={MapPin} label="Manzil">{student.address || '—'}</Row>
          <Row icon={CalendarDays} label="Kurs va guruh">
            {student.course} · {student.group}
          </Row>
          <Row icon={UserCheck} label="Ustoz">
            {teacher ? `${teacher.lastName} ${teacher.firstName}` : 'Biriktirilmagan'}
          </Row>
          <Row icon={CalendarClock} label="Dars jadvali">{formatSchedule(student.group)}</Row>
          <Row icon={CalendarDays} label="Qo‘shilgan sana">{formatDate(student.enrolledAt)}</Row>
          {student.firstCharge != null && student.firstTotal > 0 && (
            <Row icon={Receipt} label="Birinchi oy hisobi">
              {student.firstLessons} / {student.firstTotal} ta dars · {formatSom(student.firstCharge)}
              {student.firstLessons < student.firstTotal && ' (oy o‘rtasida qo‘shilgan)'}
            </Row>
          )}
        </section>

        {student.note && (
          <section className="profile__section">
            <h4>Izoh</h4>
            <p className="profile__note">{student.note}</p>
          </section>
        )}

        <section className="profile__section">
          <h4>
            To‘lovlar tarixi <span className={`badge badge--${payment.tone}`}>{payment.label}</span>
            <span className="badge badge--muted">DEMO</span>
          </h4>
          {history.length === 0 ? (
            <p className="empty-text">To‘lovlar hali mavjud emas</p>
          ) : (
            <ul className="profile__payments">
              {history.map((p) => (
                <li key={p.id}>
                  <div>
                    <strong>{p.period}</strong>
                    <span>{formatDate(p.date)} · {p.method}</span>
                  </div>
                  <div className="profile__payments-sum">
                    <strong>{formatNumber(p.amount)} so‘m</strong>
                    {p.partial && <span className="badge badge--warning">Qisman</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
};

export default StudentDrawer;
