import { Info, TriangleAlert, OctagonX } from 'lucide-react';
import './Alerts.scss';

const LEVELS = {
  warning: TriangleAlert,
  error: OctagonX,
  info: Info,
};

/** Ogohlantirishlar ro‘yxati. alerts: [{ id, level: 'info'|'warning'|'error', message }] */
const Alerts = ({ alerts = [] }) => {
  if (alerts.length === 0) {
    return <p className="empty-text">Ogohlantirishlar yo‘q</p>;
  }

  return (
    <ul className="alerts-list">
      {alerts.map((a) => {
        const level = LEVELS[a.level] ? a.level : 'info';
        const Icon = LEVELS[level];
        return (
          <li key={a.id} className={`alert-item alert-item--${level}`}>
            <Icon size={18} className="alert-item__icon" />
            <span>{a.message}</span>
          </li>
        );
      })}
    </ul>
  );
};

export default Alerts;
