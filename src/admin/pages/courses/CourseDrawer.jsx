import { Archive, ArchiveRestore, Banknote, BookOpen, Clock, Edit3, Percent, Trash2, UserCheck } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { formatNumber, formatSom } from '../../utils/format';
import { formatSchedule } from '../students/studentsData';
import { findTeacherByGroup } from '../teachers/teachersStore';
import { teacherName } from '../teachers/teachersData';
import { COURSE_STATUSES } from './coursesData';

const Row = ({ icon: Icon, label, children }) => (
  <div className="profile__row">
    <span className="profile__row-icon"><Icon size={16} /></span>
    <div>
      <div className="profile__row-label">{label}</div>
      <div className="profile__row-value">{children}</div>
    </div>
  </div>
);

/** Kurs tafsilotlari — yon panel: narx, dastur, guruhlar, ustozlar va moliyaviy ko‘rsatkichlar. */
const CourseDrawer = ({ course, stats, students, teachers, onClose, onEdit, onDelete, onToggleArchive }) => {
  if (!course || !stats) return null;

  const state = COURSE_STATUSES[course.status];
  const archived = course.status === 'archived';

  return (
    <Modal
      open
      variant="drawer"
      onClose={onClose}
      title="Kurs ma'lumotlari"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={() => onDelete(course)} style={{ marginRight: 'auto', color: 'var(--danger)' }}>
            <Trash2 size={16} /> O‘chirish
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => onToggleArchive(course)}>
            {archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            {archived ? 'Faollashtirish' : 'Arxivga'}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onEdit(course)}>
            <Edit3 size={16} /> Tahrirlash
          </button>
        </>
      }
    >
      <div className="profile">
        <div className="profile__hero">
          <span className={`course-hero-icon course-hero-icon--${course.color}`} aria-hidden="true"><BookOpen size={28} /></span>
          <div>
            <h3 className="profile__name">{course.name}</h3>
            <div className="profile__meta">
              <span className="profile__id">{course.id}</span>
              <span className="badge badge--muted">{course.level}</span>
              <span className={`badge badge--dot badge--${state.tone}`}>{state.label}</span>
            </div>
          </div>
        </div>

        <div className="profile__kpis">
          <div className="profile__kpi">
            <span>Faol talabalar</span>
            <strong>{formatNumber(stats.activeStudents)} ta</strong>
          </div>
          <div className="profile__kpi">
            <span>Guruhlar</span>
            <strong>{stats.groupCount} ta</strong>
          </div>
          <div className="profile__kpi">
            <span>Haftalik dars</span>
            <strong>{stats.weeklyLessons} ta</strong>
          </div>
        </div>

        {course.description && (
          <section className="profile__section">
            <h4>Tavsif</h4>
            <p className="profile__note">{course.description}</p>
          </section>
        )}

        <section className="profile__section">
          <h4>Kurs shartlari</h4>
          <Row icon={Banknote} label="Oylik to‘lov">{formatSom(course.fee)}</Row>
          <Row icon={Clock} label="Davomiyligi">
            {course.durationMonths} oy · bir dars {course.lessonMinutes} daqiqa
          </Row>
          <Row icon={Percent} label="O‘rtacha davomat (faol talabalar)">
            {stats.activeStudents ? `${stats.avgAttendance}%` : '—'}
          </Row>
        </section>

        <section className="profile__section">
          <h4>Kurs dasturi</h4>
          {course.topics?.length ? (
            <ol className="topic-list">
              {course.topics.map((t, i) => <li key={`${i}-${t}`}>{t}</li>)}
            </ol>
          ) : (
            <p className="empty-text">Mavzular kiritilmagan</p>
          )}
        </section>

        <section className="profile__section">
          <h4>Guruhlar</h4>
          {stats.groups.length === 0 ? (
            <p className="empty-text">Bu kursda hozircha guruh yo‘q</p>
          ) : (
            <ul className="profile__payments">
              {stats.groups.map((g) => {
                const count = students.filter((s) => s.group === g.code && s.status === 'active').length;
                const main = findTeacherByGroup(teachers, g.code);
                return (
                  <li key={g.code}>
                    <div>
                      <strong>{g.code} · {g.room}</strong>
                      <span>{formatSchedule(g.code)}</span>
                      <span>{main && main.status !== 'left' ? `Ustoz: ${teacherName(main)}` : 'Ustoz biriktirilmagan'}</span>
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
          <h4>Ustozlar</h4>
          {stats.mainTeachers.length === 0 && stats.supportList.length === 0 ? (
            <p className="empty-text">Ustoz biriktirilmagan</p>
          ) : (
            <>
              {stats.mainTeachers.map((t) => (
                <Row key={t.id} icon={UserCheck} label="Asosiy ustoz">
                  {teacherName(t)} · {t.groups.filter((c) => stats.groups.some((g) => g.code === c)).join(', ')}
                </Row>
              ))}
              {stats.supportList.map((p) => (
                <Row key={p.id} icon={UserCheck} label="Qo‘shimcha ustoz">
                  {teacherName(p)} · {p.groups.filter((c) => stats.groups.some((g) => g.code === c)).join(', ')}
                </Row>
              ))}
            </>
          )}
        </section>

        <section className="profile__section">
          <h4>Moliyaviy ko‘rsatkichlar</h4>
          <div className="salary-total">
            <span>Oylik tushum (faol talabalar)</span>
            <strong>{formatSom(stats.revenue)}</strong>
          </div>
          <Row icon={Banknote} label="Jami qarzdorlik">{stats.debt ? formatSom(stats.debt) : 'Qarz yo‘q'}</Row>
        </section>
      </div>
    </Modal>
  );
};

export default CourseDrawer;
