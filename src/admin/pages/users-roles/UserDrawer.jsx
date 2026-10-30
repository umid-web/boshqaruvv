import { useMemo } from 'react';
import { Ban, CalendarDays, Clock, Edit3, KeyRound, Mail, Phone, ShieldCheck, StickyNote, Trash2, UserCheck } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import { formatDate, formatDateTime, formatPhone } from '../../utils/format';
import { USER_STATUSES, summarizePermissions, userName } from './usersData';

const Row = ({ icon: Icon, label, children }) => (
  <div className="profile__row">
    <span className="profile__row-icon"><Icon size={16} /></span>
    <div>
      <div className="profile__row-label">{label}</div>
      <div className="profile__row-value">{children}</div>
    </div>
  </div>
);

/** Foydalanuvchi profili — yon panel: ma'lumotlar, rol ruxsatlari va tezkor amallar. */
const UserDrawer = ({ user, role, onClose, onEdit, onDelete, onToggleBlock, onResetPassword }) => {
  const summary = useMemo(() => summarizePermissions(role), [role]);
  if (!user) return null;

  const status = USER_STATUSES[user.status];
  const blocked = user.status === 'blocked';

  return (
    <Modal
      open
      variant="drawer"
      onClose={onClose}
      title="Foydalanuvchi profili"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={() => onDelete(user)} style={{ marginRight: 'auto', color: 'var(--danger)' }}>
            <Trash2 size={16} /> O‘chirish
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onEdit(user)}>
            <Edit3 size={16} /> Tahrirlash
          </button>
        </>
      }
    >
      <div className="profile">
        <div className="profile__hero">
          <Avatar firstName={user.firstName} lastName={user.lastName} size={64} />
          <div>
            <h3 className="profile__name">{userName(user)}</h3>
            <div className="profile__meta">
              <span className="profile__id">{user.id}</span>
              {role && <span className={`badge badge--${role.tone}`}>{role.name}</span>}
              <span className={`badge badge--dot badge--${status.tone}`}>{status.label}</span>
            </div>
          </div>
        </div>

        <div className="profile__actions">
          {user.status !== 'blocked' && (
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => onResetPassword(user)}>
              <KeyRound size={14} /> Parolni tiklash
            </button>
          )}
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => onToggleBlock(user)}>
            {blocked ? <UserCheck size={14} /> : <Ban size={14} />}
            {blocked ? 'Faollashtirish' : 'Bloklash'}
          </button>
        </div>

        <section className="profile__section">
          <h4>Ma'lumotlar</h4>
          <Row icon={Mail} label="Login">{user.login || user.email?.split('@')[0] || '—'}</Row>
          <Row icon={Phone} label="Telefon">{formatPhone(user.phone)}</Row>
          <Row icon={CalendarDays} label="Qo‘shilgan sana">{formatDate(user.createdAt)}</Row>
          <Row icon={Clock} label="Oxirgi kirish">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Hali kirmagan'}</Row>
          {user.note && <Row icon={StickyNote} label="Izoh">{user.note}</Row>}
        </section>

        <section className="profile__section">
          <h4>Rol ruxsatlari</h4>
          {role ? (
            <>
              <Row icon={ShieldCheck} label={role.name}>
                {summary.count} / {summary.total} ruxsat · {summary.modules.length} ta bo‘lim
              </Row>
              <ul className="access-list">
                {summary.modules.map((m) => (
                  <li key={m.key}>
                    <span className="access-list__name"><m.icon size={14} /> {m.label}</span>
                    <span className="access-list__actions">{m.full && m.actions.length > 1 ? 'To‘liq' : m.actions.join(', ')}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="empty-text">Rol topilmadi</p>
          )}
        </section>
      </div>
    </Modal>
  );
};

export default UserDrawer;
