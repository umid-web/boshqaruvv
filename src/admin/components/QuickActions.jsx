import { Link } from 'react-router-dom';
import { UserPlus, BookOpen, Users, CreditCard, FileText } from 'lucide-react';
import './QuickActions.scss';

const actions = [
  { label: 'Yangi talaba', to: '/admin/students', icon: UserPlus, tone: 'primary' },
  { label: 'Yangi ustoz', to: '/admin/teachers', icon: BookOpen, tone: 'warning' },
  { label: 'Yangi guruh', to: '/admin/groups', icon: Users, tone: 'primary' },
  { label: 'To‘lov qo‘shish', to: '/admin/payments', icon: CreditCard, tone: 'success' },
  { label: 'Hisobot', to: '/admin/reports', icon: FileText, tone: 'warning' },
];

/** Tezkor amallar — tegishli (hozircha placeholder) sahifalarga o‘tadi. */
const QuickActions = () => (
  <div className="quick-actions">
    {actions.map(({ label, to, icon: Icon, tone }) => (
      <Link key={to} to={to} className="action-card">
        <span className={`action-card__icon action-card__icon--${tone}`}>
          <Icon size={20} />
        </span>
        <span className="action-card__label">{label}</span>
      </Link>
    ))}
  </div>
);

export default QuickActions;
