import { GraduationCap, Users, CreditCard, UserCheck, Activity } from 'lucide-react';
import { formatDateTime } from '../utils/format';
import { moduleOf } from '../activity/meta';
import './RecentActivities.scss';

const TYPES = {
  newStudent: { icon: GraduationCap, tone: 'primary' },
  newGroup: { icon: Users, tone: 'primary' },
  payment: { icon: CreditCard, tone: 'success' },
  teacherAssign: { icon: UserCheck, tone: 'warning' },
};

const SEVERITY_TONE = { success: 'success', danger: 'danger', warning: 'warning', info: 'info' };

/**
 * So‘nggi faoliyatlar. activities: [{ id, type, description, time }]
 * Haqiqiy faoliyat tarixidan kelganda: type — bo‘lim kaliti (students, payments...), tone — muhimlik darajasi.
 */
const RecentActivities = ({ activities = [] }) => {
  if (activities.length === 0) {
    return <p className="empty-text">Faoliyatlar topilmadi</p>;
  }

  return (
    <ul className="recent-activities">
      {activities.map((act) => {
        const fallback = TYPES[act.type] ?? { icon: moduleOf(act.type).icon ?? Activity, tone: 'primary' };
        const Icon = fallback.icon;
        const tone = SEVERITY_TONE[act.tone] ?? fallback.tone;
        return (
          <li key={act.id} className="activity-item">
            <span className={`activity-item__icon activity-item__icon--${tone}`}>
              <Icon size={16} />
            </span>
            <div className="activity-item__text">
              <span className="activity-item__desc">{act.description}</span>
              <time className="activity-item__time">{formatDateTime(act.time)}</time>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default RecentActivities;
