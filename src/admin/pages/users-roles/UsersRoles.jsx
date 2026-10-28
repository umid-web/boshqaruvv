import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, ShieldCheck, UserCheck, Users } from 'lucide-react';
import StatCard from '../../components/StatCard';
import { formatNumber } from '../../utils/format';
import UsersTab from './UsersTab';
import RolesTab from './RolesTab';
import { useAccess } from './usersStore';
import '../students/Students.scss';
import './UsersRoles.scss';

const TABS = [
  { id: 'users', label: 'Foydalanuvchilar', icon: Users },
  { id: 'roles', label: 'Rollar va ruxsatlar', icon: ShieldCheck },
];

/**
 * Foydalanuvchilar va rollar. Ikkala bo‘lim bir xil ma'lumotlarga tayanadi (rol o‘chirilganda,
 * foydalanuvchi soni va h.k.), shuning uchun store bu yerda bir marta yaratiladi.
 * Bo‘limlar yashirinadi, lekin o‘chirilmaydi — filtr va saqlanmagan ruxsatlar tab almashganda yo‘qolmaydi.
 */
const UsersRoles = () => {
  const access = useAccess();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'roles' ? 'roles' : 'users';

  const summary = useMemo(() => {
    const { users, roles } = access;
    return {
      total: users.length,
      active: users.filter((u) => u.status === 'active').length,
      pending: users.filter((u) => u.status === 'invited').length,
      blocked: users.filter((u) => u.status === 'blocked').length,
      roles: roles.length,
    };
  }, [access]);

  const changeTab = (id) => setParams(id === 'users' ? {} : { tab: id }, { replace: true });

  return (
    <div className="students-page users-page">
      <header className="page-head">
        <div>
          <h1>Foydalanuvchilar va rollar</h1>
          <p>Tizimga kiruvchi xodimlar va ularning bo‘limlar bo‘yicha ruxsatlarini boshqaring</p>
        </div>
      </header>

      <section className="students-stats" aria-label="Ko‘rsatkichlar">
        <StatCard title="Jami foydalanuvchilar" value={formatNumber(summary.total)} icon={Users} tone="primary" />
        <StatCard title="Faol foydalanuvchilar" value={formatNumber(summary.active)} icon={UserCheck} tone="success" />
        <StatCard title="Kutilmoqda va bloklangan" value={formatNumber(summary.pending + summary.blocked)} icon={Ban} tone="warning" />
        <StatCard title="Rollar soni" value={formatNumber(summary.roles)} icon={ShieldCheck} tone="danger" />
      </section>

      <div className="page-tabs" role="tablist" aria-label="Bo‘limlar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`access-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`access-panel-${id}`}
            className={tab === id ? 'page-tab is-active' : 'page-tab'}
            onClick={() => changeTab(id)}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div id="access-panel-users" role="tabpanel" aria-labelledby="access-tab-users" hidden={tab !== 'users'} className="users-panel">
        <UsersTab access={access} />
      </div>
      <div id="access-panel-roles" role="tabpanel" aria-labelledby="access-tab-roles" hidden={tab !== 'roles'} className="users-panel">
        <RolesTab access={access} />
      </div>
    </div>
  );
};

export default UsersRoles;
