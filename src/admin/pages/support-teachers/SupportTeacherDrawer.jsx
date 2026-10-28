import { useMemo } from 'react';
import { Banknote, BookOpen, CalendarCheck, CalendarDays, Edit3, MapPin, Phone, Trash2, UserRound } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import { formatDate, formatNumber, formatPhone, formatSom } from '../../utils/format';
import { GROUPS, formatSchedule, weekdayShort } from '../students/studentsData';
import { loadTeachers, findTeacherByGroup } from '../teachers/teachersStore';
import { PAY_TYPES, SUPPORT_ROLES, SUPPORT_STATUSES, getSupportStats, teacherName } from './supportData';

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

/** Qo‘shimcha ustoz profili — yon panel: ma'lumotlar, haftalik jadval, guruhlar va to‘lov hisobi. */
const SupportTeacherDrawer = ({ person, students, onClose, onEdit, onDelete }) => {
  const mainTeachers = useMemo(loadTeachers, []);

  const timetable = useMemo(() => {
    if (!person) return [];
    return WEEK_ORDER.map((day) => ({
      day,
      lessons: person.groups
        .filter((code) => GROUPS[code]?.days.includes(day))
        .map((code) => ({ code, ...GROUPS[code] }))
        .sort((a, b) => a.start.localeCompare(b.start)),
    })).filter((d) => d.lessons.length > 0);
  }, [person]);

  if (!person) return null;

  const status = SUPPORT_STATUSES[person.status];
  const role = SUPPORT_ROLES[person.role];
  const stats = getSupportStats(person, students);
  const years = age(person.birthDate);
  const payLabel = PAY_TYPES.find((t) => t.value === person.payType)?.label;

  return (
    <Modal
      open
      variant="drawer"
      onClose={onClose}
      title="Qo‘shimcha ustoz profili"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={() => onDelete(person)} style={{ marginRight: 'auto', color: 'var(--danger)' }}>
            <Trash2 size={16} /> O‘chirish
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onEdit(person)}>
            <Edit3 size={16} /> Tahrirlash
          </button>
        </>
      }
    >
      <div className="profile">
        <div className="profile__hero">
          <Avatar firstName={person.firstName} lastName={person.lastName} size={64} />
          <div>
            <h3 className="profile__name">{teacherName(person)}</h3>
            <div className="profile__meta">
              <span className="profile__id">{person.id}</span>
              <span className={`badge badge--${role.tone}`}>{role.label}</span>
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
            <strong>{person.groups.length} ta</strong>
          </div>
          <div className="profile__kpi">
            <span>Haftalik dars</span>
            <strong>{stats.weeklyLessons} ta</strong>
          </div>
        </div>

        <section className="profile__section">
          <h4>Ma'lumotlar</h4>
          <Row icon={UserRound} label="Jinsi / yoshi">
            {person.gender === 'female' ? 'Ayol' : 'Erkak'}{years !== null && ` · ${years} yosh`}
          </Row>
          <Row icon={Phone} label="Telefon">{formatPhone(person.phone)}</Row>
          <Row icon={MapPin} label="Manzil">{person.address || '—'}</Row>
          <Row icon={BookOpen} label="Fanlari">{person.subjects.join(', ')}</Row>
          <Row icon={CalendarCheck} label="Ish kunlari">
            {person.availableDays.length ? person.availableDays.map(weekdayShort).join(' · ') : 'Istalgan kun'}
          </Row>
          <Row icon={CalendarDays} label="Ishga kirgan sana">{formatDate(person.startedAt)}</Row>
        </section>

        {person.note && (
          <section className="profile__section">
            <h4>Izoh</h4>
            <p className="profile__note">{person.note}</p>
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
          {person.groups.length === 0 ? (
            <p className="empty-text">Hozircha guruh biriktirilmagan</p>
          ) : (
            <ul className="profile__payments">
              {person.groups.map((code) => {
                const count = students.filter((s) => s.group === code && s.status === 'active').length;
                const main = findTeacherByGroup(mainTeachers, code);
                return (
                  <li key={code}>
                    <div>
                      <strong>{code} · {GROUPS[code]?.course}</strong>
                      <span>{formatSchedule(code)}</span>
                      <span>{main ? `Asosiy ustoz: ${teacherName(main)}` : 'Asosiy ustoz yo‘q'}</span>
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
          <h4>To‘lov hisobi <span className="badge badge--muted">Taxminiy</span></h4>
          <Row icon={Banknote} label="Hisoblash usuli">
            {payLabel} · {formatSom(person.payValue)}
          </Row>
          {person.payType === 'perLesson' && (
            <Row icon={CalendarDays} label="Oydagi darslar (haftasiga × 4)">{formatNumber(stats.monthlyLessons)} ta</Row>
          )}
          <div className="salary-total">
            <span>Oylik to‘lov</span>
            <strong>{formatSom(stats.pay)}</strong>
          </div>
        </section>
      </div>
    </Modal>
  );
};

export default SupportTeacherDrawer;
