import { Sun, Moon, Search, Menu } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useTheme } from '../useTheme';
import './Header.scss';

const Header = ({ onMenuClick = () => {} }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <header className="admin-header">
      <button
        type="button"
        className="icon-btn admin-header__menu"
        onClick={onMenuClick}
        aria-label="Menyuni ochish"
      >
        <Menu size={20} />
      </button>

      <div className="admin-header__search">
        <Search size={18} className="admin-header__search-icon" aria-hidden="true" />
        <input
          type="search"
          placeholder="Qidiruv..."
          className="search-input"
          aria-label="Qidiruv"
        />
      </div>

      <div className="admin-header__actions">
        <NotificationBell />
        <button
          type="button"
          className="icon-btn"
          onClick={toggleTheme}
          aria-label={isDark ? 'Yorug‘ mavzuga o‘tish' : 'Qorong‘i mavzuga o‘tish'}
          title={isDark ? 'Yorug‘ mavzu' : 'Qorong‘i mavzu'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="user-info">
          <span className="user-info__avatar" aria-hidden="true">A</span>
          <span className="user-info__text">
            <span className="user-info__name">Administrator</span>
            <span className="user-info__role">Admin</span>
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
