import { NavLink } from 'react-router-dom';
import { GraduationCap, X } from 'lucide-react';
import { navSections } from '../navigation';
import { useAppSettings } from '../pages/settings/useAppSettings';
import { useNotifications } from '../activity/notificationStore';
import './Sidebar.scss';

const Sidebar = ({ open = false, onClose = () => {} }) => {
  const { settings } = useAppSettings();
  const { unread } = useNotifications();
  const orgName = settings?.org?.name?.trim() || 'EduControl Pro';
  const logo = settings?.org?.logo;

  return (
  <>
    <div
      className={open ? 'sidebar-overlay is-visible' : 'sidebar-overlay'}
      onClick={onClose}
      aria-hidden="true"
    />
    <aside className={open ? 'admin-sidebar is-open' : 'admin-sidebar'} aria-label="Asosiy menyu">
      <div className="admin-sidebar__brand">
        <span className={logo ? 'admin-sidebar__logo admin-sidebar__logo--image' : 'admin-sidebar__logo'}>
          {logo ? <img src={logo} alt="" /> : <GraduationCap size={20} />}
        </span>
        <span className="admin-sidebar__name">{orgName}</span>
        <button
          type="button"
          className="admin-sidebar__close"
          onClick={onClose}
          aria-label="Menyuni yopish"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="admin-sidebar__nav">
        {navSections.map((section) => (
          <div className="menu-group" key={section.title}>
            <div className="menu-group__title">{section.title}</div>
            {section.items.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path || 'dashboard'}
                to={`/admin${path ? `/${path}` : ''}`}
                end={path === ''}
                onClick={onClose}
                className={({ isActive }) => (isActive ? 'menu-item active' : 'menu-item')}
              >
                <Icon size={18} className="menu-item__icon" />
                <span className="menu-item__label">{label}</span>
                {path === 'notifications' && unread > 0 && (
                  <span className="menu-item__badge" aria-label={`${unread} ta o‘qilmagan`}>{unread > 99 ? '99+' : unread}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  </>
  );
};

export default Sidebar;
