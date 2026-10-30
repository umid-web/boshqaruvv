import { CalendarClock, CalendarDays, DoorOpen, Edit3, Trash2, UserPlus } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import { formatDate, formatNumber, formatPhone, formatSom } from '../../utils/format';
import { SUPPORT_ROLES } from '../support-teachers/supportData';
import { GROUP_STATUSES, formatGroupSchedule, getGroupStats, getGroupTeam, teacherName } from './groupsData';

const Row = ({ icon: Icon, label, children }) => (
  <div className="profile__row">
    <span className="profile__row-icon"><Icon size={16} /></span>
    <div>
      <div className="profile__row-label">{label}</div>
      <div className="profile__row-value">{children}</div>
    </div>
  </div>
);

const PersonRow = ({ person, caption }) => (
  <li className="team-row">
    <Avatar firstName={person.firstName} lastName={person.lastName} size={36} />
    <div className="team-row__text">
      <strong>{teacherName(person)}</strong>
      <span>{caption}</span>
    </div>
    <span className="team-row__phone">{formatPhone(person.phone)}</span>
  </li>
);

/** Guruh profili — yon panel: jadval, ustozlar jamoasi (asosiy + qo‘shimcha) va talabalar. */
const GroupDrawer = ({ group, students, teachers, supportTeachers, onClose, onEdit, onDelete, onAssign }) => {
  if (!group) return null;

  const status = GROUP_STATUSES[group.status];
  const stats = getGroupStats(group, students);
  const team = getGroupTeam(group.code, teachers, supportTeachers);
  const members = students.filter((s) => s.group === group.code && s.status === 'active');
  const shown = members.slice(0, 8);

  return (
    <Modal
      open
      variant="drawer"
      onClose={onClose}
      title="Guruh profili"
      footer={
        <>
          {onDelete && <button type="button" className="btn btn--ghost" onClick={() => onDelete(group)} style={{ marginRight: 'auto', color: 'var(--danger)' }}>
            <Trash2 size={16} /> O‘chirish
          </button>}
          {onAssign && <button type="button" className="btn btn--secondary" onClick={() => onAssign(group)} disabled={group.status === 'archived'}>
            <UserPlus size={16} /> Ustozlar
          </button>}
          {onEdit && <button type="button" className="btn btn--primary" onClick={() => onEdit(group)}>
            <Edit3 size={16} /> Tahrirlash
          </button>}
        </>
      }
    >
      <div className="profile">
        <div className="profile__hero">
          <span className="group-badge" aria-hidden="true">{group.code.split('-')[0]}</span>
          <div>
            <h3 className="profile__name">{group.code}</h3>
            <div className="profile__meta">
              <span className="profile__id">{group.course}</span>
              <span className={`badge badge--dot badge--${status.tone}`}>{status.label}</span>
            </div>
          </div>
        </div>

        <div className="profile__kpis">
          <div className="profile__kpi">
            <span>Talabalar</span>
            <strong>{stats.activeStudents} / {group.capacity}</strong>
          </div>
          <div className="profile__kpi">
            <span>Davomat</span>
            <strong>{stats.activeStudents ? `${stats.avgAttendance}%` : '—'}</strong>
          </div>
          <div className="profile__kpi">
            <span>Oylik tushum</span>
            <strong>{formatSom(stats.revenue)}</strong>
          </div>
        </div>

        <section className="profile__section">
          <h4>Dars jadvali</h4>
          <Row icon={CalendarClock} label="Kunlar va vaqt">{formatGroupSchedule(group)}</Row>
          <Row icon={DoorOpen} label="Xona">{group.room}</Row>
          <Row icon={CalendarDays} label="Boshlangan sana">{formatDate(group.startDate)}</Row>
        </section>

        {group.note && (
          <section className="profile__section">
            <h4>Izoh</h4>
            <p className="profile__note">{group.note}</p>
          </section>
        )}

        <section className="profile__section">
          <h4>Asosiy ustoz</h4>
          {team.main ? (
            <ul className="team-list">
              <PersonRow person={team.main} caption={`${team.main.subjects.join(', ')}${team.main.status === 'vacation' ? ' · ta‘tilda' : ''}`} />
            </ul>
          ) : (
            <p className="empty-text">Asosiy ustoz biriktirilmagan</p>
          )}
        </section>

        <section className="profile__section">
          <h4>Qo‘shimcha ustozlar</h4>
          {team.support.length === 0 ? (
            <p className="empty-text">Qo‘shimcha ustoz biriktirilmagan</p>
          ) : (
            <ul className="team-list">
              {team.support.map((p) => (
                <PersonRow key={p.id} person={p} caption={`${SUPPORT_ROLES[p.role]?.label}${p.status === 'vacation' ? ' · ta‘tilda' : ''}`} />
              ))}
            </ul>
          )}
        </section>

        <section className="profile__section">
          <h4>Talabalar ({formatNumber(members.length)})</h4>
          {members.length === 0 ? (
            <p className="empty-text">Guruhda faol talaba yo‘q</p>
          ) : (
            <ul className="team-list">
              {shown.map((s) => (
                <li key={s.id} className="team-row">
                  <Avatar firstName={s.firstName} lastName={s.lastName} size={32} />
                  <div className="team-row__text">
                    <strong>{s.lastName} {s.firstName}</strong>
                    <span>{s.id}</span>
                  </div>
                  {s.debt > 0 && <span className="badge badge--danger">Qarzdor</span>}
                </li>
              ))}
              {members.length > shown.length && <li className="empty-text">…va yana {members.length - shown.length} ta talaba</li>}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
};

export default GroupDrawer;
