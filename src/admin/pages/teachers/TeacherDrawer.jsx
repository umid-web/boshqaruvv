import { useMemo } from 'react';
import {
  Banknote,
  BookOpen,
  CalendarDays,
  Edit3,
  GraduationCap,
  MapPin,
  Phone,
  Trash2,
  UserRound,
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import { formatDate, formatNumber, formatPhone, formatSom } from '../../utils/format';
import { GROUPS, formatSchedule, weekdayShort } from '../students/studentsData';
import { SALARY_TYPES, TEACHER_STATUSES, getTeacherStats, teacherName } from './teachersData';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

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

/** Ustoz profili — yon panel: ma'lumotlar, haftalik jadval, guruhlar va ish haqi hisobi. */
const TeacherDrawer = ({ teacher, students, onClose, onEdit, onDelete }) => {
  // Haftaning har kuni uchun shu ustozning darslari (vaqt bo‘yicha tartiblangan)
  const timetable = useMemo(() => {
    if (!teacher) return [];
    return WEEK_ORDER.map((day) => ({
      day,
      lessons: teacher.groups
        .filter((code) => GROUPS[code]?.days.includes(day))
        .map((code) => ({ code, ...GROUPS[code] }))
        .sort((a, b) => a.start.localeCompare(b.start)),
    })).filter((d) => d.lessons.length > 0);
  }, [teacher]);

  if (!teacher) return null;

  const status = TEACHER_STATUSES[teacher.status];
  const stats = getTeacherStats(teacher, students);
  const years = age(teacher.birthDate);
  const salaryLabel = SALARY_TYPES.find((t) => t.value === teacher.salaryType)?.label;

  return (
    <Modal
      open
      variant="drawer"
      onClose={onClose}
      title="Ustoz profili"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={() => onDelete(teacher)} style={{ marginRight: 'auto', color: 'var(--danger)' }}>
            <Trash2 size={16} /> O‘chirish
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onEdit(teacher)}>
            <Edit3 size={16} /> Tahrirlash
          </button>
        </>
      }
    >
      <div className="profile">
        <div className="profile__hero">
          <Avatar firstName={teacher.firstName} lastName={teacher.lastName} size={64} />
          <div>
            <h3 className="profile__name">{teacherName(teacher)}</h3>
            <div className="profile__meta">
              <span className="profile__id">{teacher.id}</span>
              <span className={`badge badge--dot badge--${status.tone}`}>{status.label}</span>
            </div>
          </div>
        </div>

        <div className="profile__kpis">
          <div className="profile__kpi">
            <span>Talabalar</span>
            <strong>{formatNumber(stats.studentCount)} ta</strong>
          </div>
          <div className="profile__kpi">
            <span>Guruhlar</span>
            <strong>{teacher.groups.length} ta</strong>
          </div>
          <div className="profile__kpi">
            <span>Haftalik dars</span>
            <strong>{stats.weeklyLessons} ta</strong>
          </div>
        </div>

        <section className="profile__section">
          <h4>Ma'lumotlar</h4>
          <Row icon={UserRound} label="Jinsi / yoshi">
            {teacher.gender === 'female' ? 'Ayol' : 'Erkak'}{years !== null && ` · ${years} yosh`}
          </Row>
          <Row icon={Phone} label="Telefon">{formatPhone(teacher.phone)}</Row>
          <Row icon={MapPin} label="Manzil">{teacher.address || '—'}</Row>
          <Row icon={BookOpen} label="Fanlari">{teacher.subjects.join(', ')}</Row>
          <Row icon={GraduationCap} label="Ma'lumoti va tajribasi">
            {teacher.education} · {teacher.experience} yil tajriba
          </Row>
          <Row icon={CalendarDays} label="Ishga kirgan sana">{formatDate(teacher.hiredAt)}</Row>
        </section>

        {teacher.note && (
          <section className="profile__section">
            <h4>Izoh</h4>
            <p className="profile__note">{teacher.note}</p>
          </section>
        )}

        <section className="profile__section">
          <h4>Haftalik dars jadvali</h4>
          {timetable.length === 0 ? (
            <p className="empty-text">Hozircha guruh biriktirilmagan</p>
          ) : (
            <ul className="timetable">
              {timetable.map(({ day, lessons }) => (
                <li key={day}>
                  <span className="timetable__day">{weekdayShort(day)}</span>
                  <div className="timetable__lessons">
                    {lessons.map((l) => (
                      <span key={l.code} className="timetable__lesson">
                        <strong>{l.start}–{l.end}</strong> {l.code} · {l.room}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="profile__section">
          <h4>Guruhlar</h4>
          {teacher.groups.length === 0 ? (
            <p className="empty-text">Hozircha guruh biriktirilmagan</p>
          ) : (
            <ul className="profile__payments">
              {teacher.groups.map((code) => {
                const count = students.filter((s) => s.group === code && s.status === 'active').length;
                return (
                  <li key={code}>
                    <div>
                      <strong>{code} · {GROUPS[code]?.course}</strong>
                      <span>{formatSchedule(code)}</span>
                    </div>
                    <div className="profile__payments-sum">
                      <strong>{count} ta talaba</strong>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="profile__section">
          <h4>Ish haqi hisobi <span className="badge badge--muted">Taxminiy</span></h4>
          <Row icon={Banknote} label="Hisoblash usuli">
            {salaryLabel}
            {teacher.salaryType === 'percent' ? ` · ${teacher.salaryValue}%` : ` · ${formatSom(teacher.salaryValue)}`}
          </Row>
          {teacher.salaryType === 'percent' && (
            <Row icon={Banknote} label="Guruhlar oylik tushumi (faol talabalar)">{formatSom(stats.revenue)}</Row>
          )}
          <div className="salary-total">
            <span>Oylik ish haqi</span>
            <strong>{formatSom(stats.salary)}</strong>
          </div>
        </section>
      </div>
    </Modal>
  );
};

export default TeacherDrawer;
