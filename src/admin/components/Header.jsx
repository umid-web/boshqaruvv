import { useEffect, useState } from 'react';
import { Sun, Moon, Search, Menu, KeyRound, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { useTheme } from '../useTheme';
import { getCurrentChatActorKey, getUnreadChatCount } from '../pages/chat/chatStore';
import './Header.scss';

const Header = ({ onMenuClick = () => {}, userName = 'Administrator', roleName = 'Admin' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const role = sessionStorage.getItem('educontrol_role');
  const chatPath = role === 'teacher' ? '/teacher/chat' : role === 'reception' ? '/reception/chat' : '/admin/chat';
  const [unreadChat, setUnreadChat] = useState(() => getUnreadChatCount(getCurrentChatActorKey()));

  useEffect(() => {
    const refresh = () => setUnreadChat(getUnreadChatCount(getCurrentChatActorKey()));
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('edu-chat-update', refresh);
    const timer = window.setInterval(refresh, 1800);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('edu-chat-update', refresh); window.clearInterval(timer); };
  }, []);

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
        <Link to={chatPath} className="icon-btn admin-header__chat-link" aria-label={unreadChat ? `Chat, ${unreadChat} ta o‘qilmagan xabar` : 'Chat'} title="Chat"><MessageCircle size={18} />{unreadChat > 0 && <span className="admin-header__chat-badge">{unreadChat > 99 ? '99+' : unreadChat}</span>}</Link>
        <Link to="/account/security" className="icon-btn" aria-label="Parol sozlamalari" title="Parolni o‘zgartirish"><KeyRound size={18} /></Link>
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
          <span className="user-info__avatar" aria-hidden="true">{userName?.trim()?.[0]?.toUpperCase() || 'U'}</span>
          <span className="user-info__text">
            <span className="user-info__name">{userName}</span>
            <span className="user-info__role">{roleName}</span>
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
