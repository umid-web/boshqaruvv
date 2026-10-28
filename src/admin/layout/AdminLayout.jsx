import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { navItems } from '../navigation';
import { useNotifications } from '../activity/notificationStore';
import { syncSystemAlerts } from '../activity/systemAlerts';
import './AdminLayout.scss';

const APP_NAME = 'EduControl Pro';

const AdminLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const { unread } = useNotifications();

  // Tizim eslatmalari (qarzdorlik, davomat, tug‘ilgan kun) — ilova ochilganda, kuniga bir martadan
  useEffect(() => {
    syncSystemAlerts();
  }, []);

  // Sahifa sarlavhasini joriy marshrutga moslab yangilaydi; o‘qilmaganlar soni — "(3)" ko‘rinishida
  useEffect(() => {
    const segment = pathname.replace(/^\/admin\/?/, '').split('/')[0];
    const current = navItems.find((item) => item.path === segment);
    const title = current ? `${current.label} · ${APP_NAME}` : APP_NAME;
    document.title = unread > 0 ? `(${unread}) ${title}` : title;
  }, [pathname, unread]);

  return (
    <div className="admin-container">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="main-content">
        <Header onMenuClick={() => setMenuOpen(true)} />
        <main className="page">
          <Suspense fallback={<p className="page__loading">Yuklanmoqda…</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
