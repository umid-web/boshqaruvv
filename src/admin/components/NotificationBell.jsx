import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, BellOff, CheckCheck } from 'lucide-react';
import { categoryOf } from '../activity/meta';
import { markAllRead, markRead, useNotifications } from '../activity/notificationStore';
import { timeAgo } from '../activity/time';
import './NotificationBell.scss';

const LIMIT = 8;

/** Sarlavhadagi qo‘ng‘iroqcha: o‘qilmaganlar soni va so‘nggi bildirishnomalar paneli. */
const NotificationBell = () => {
  const { items, unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('all');
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();
  const navigate = useNavigate();
  const isReception = sessionStorage.getItem('educontrol_role') === 'reception';
  const notificationPath = (path) => {
    if (!isReception || !path?.startsWith('/admin/')) return path;
    const section = path.slice('/admin/'.length).split('/')[0];
    const receptionSections = new Set(['debts', 'attendance', 'students', 'payments', 'groups', 'courses', 'schedule']);
    return receptionSections.has(section) ? `/reception/${section}` : '/reception';
  };

  // Tashqariga bosilganda yoki Esc bosilganda yopiladi
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const list = (tab === 'unread' ? items.filter((n) => !n.read) : items).slice(0, LIMIT);
  const badge = unread > 99 ? '99+' : String(unread);

  const openItem = (n) => {
    markRead(n.id);
    setOpen(false);
    if (n.link) navigate(notificationPath(n.link));
  };

  return (
    <div className="bell" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Bildirishnomalar, ${unread} ta o‘qilmagan` : 'Bildirishnomalar'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        <Bell size={18} />
        {unread > 0 && <span className="bell__badge" aria-hidden="true">{badge}</span>}
      </button>

      {open && (
        <div className="bell__panel" id={panelId} role="dialog" aria-label="Bildirishnomalar">
          <header className="bell__head">
            <div>
              <h2 className="bell__title">Bildirishnomalar</h2>
              <p className="bell__sub">{unread ? `${unread} ta o‘qilmagan` : 'Hammasi o‘qilgan'}</p>
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={markAllRead}
              disabled={unread === 0}
              title="Hammasini o‘qilgan deb belgilash"
            >
              <CheckCheck size={15} /> O‘qildi
            </button>
          </header>

          <div className="bell__tabs" role="tablist" aria-label="Filtr">
            {[
              { value: 'all', label: 'Barchasi' },
              { value: 'unread', label: 'O‘qilmagan' },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                className={tab === t.value ? 'bell__tab is-active' : 'bell__tab'}
                onClick={() => setTab(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <div className="bell__empty">
              <BellOff size={26} aria-hidden="true" />
              <p>{tab === 'unread' ? 'O‘qilmagan bildirishnoma yo‘q' : 'Hozircha bildirishnomalar yo‘q'}</p>
            </div>
          ) : (
            <ul className="bell__list">
              {list.map((n) => {
                const { icon: Icon, tone } = categoryOf(n.category);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={n.read ? 'bell-item' : 'bell-item is-unread'}
                      onClick={() => openItem(n)}
                    >
                      <span className={`bell-item__icon bell-item__icon--${tone}`}>
                        <Icon size={16} />
                      </span>
                      <span className="bell-item__text">
                        <span className="bell-item__title">{n.title}</span>
                        {n.message && <span className="bell-item__msg">{n.message}</span>}
                        <time className="bell-item__time" dateTime={n.at}>{timeAgo(n.at)}</time>
                      </span>
                      {!n.read && <span className="bell-item__dot" aria-label="O‘qilmagan" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <footer className="bell__foot">
            <Link to={isReception ? '/reception' : '/admin/notifications'} onClick={() => setOpen(false)}>
              {isReception ? 'Panelga o‘tish' : 'Barchasini ko‘rish'}
            </Link>
          </footer>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
