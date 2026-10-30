import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { GraduationCap, LogOut, X } from 'lucide-react'
import { navSections } from '../admin/navigation'
import { loadRoles } from '../admin/pages/users-roles/usersStore'
import Header from '../admin/components/Header'
import { syncSystemAlerts } from '../admin/activity/systemAlerts'
import './ReceptionLayout.scss'

export default function ReceptionLayout() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    syncSystemAlerts()
  }, [])
  const roleId = sessionStorage.getItem('educontrol_role')
  const username = sessionStorage.getItem('educontrol_username') || 'Qabul xodimi'
  const role = useMemo(() => loadRoles().find((item) => item.id === roleId), [roleId])
  const visibleSections = navSections.map((section) => ({
    ...section,
    items: section.items.filter(({ path }) => role?.permissions?.includes(`${path || 'dashboard'}.view`)),
  })).filter((section) => section.items.length)

  const logout = () => {
    sessionStorage.removeItem('educontrol_logged_in')
    sessionStorage.removeItem('educontrol_username')
    sessionStorage.removeItem('educontrol_role')
    navigate('/login', { replace: true })
  }

  return (
    <div className="reception-shell">
      <div className={menuOpen ? 'reception-shell__overlay is-open' : 'reception-shell__overlay'} onClick={() => setMenuOpen(false)} />
      <aside className={menuOpen ? 'reception-sidebar is-open' : 'reception-sidebar'}>
        <div className="reception-sidebar__brand"><span><GraduationCap size={19}/></span><div><b>EduControl</b><small>QABULXONA</small></div><button onClick={() => setMenuOpen(false)} aria-label="Menyuni yopish"><X size={19}/></button></div>
        <div className="reception-sidebar__profile"><span className="reception-sidebar__avatar">{(sessionStorage.getItem('educontrol_username') || 'Q').slice(0, 1).toUpperCase()}</span><div><b>{sessionStorage.getItem('educontrol_username') || 'Qabul xodimi'}</b><small>{role?.name || 'Qabul xodimi'}</small></div><i /></div>
        <nav className="reception-sidebar__nav" aria-label="Ruxsat berilgan bo‘limlar">
          {visibleSections.map((section) => <div className="reception-sidebar__group" key={section.title}><p>{section.title}</p>{section.items.map(({ path, label, icon: Icon }) => <NavLink key={path || 'dashboard'} to={`/reception${path ? `/${path}` : ''}`} end={!path} onClick={() => setMenuOpen(false)} className={({ isActive }) => `reception-sidebar__link${isActive ? ' is-active' : ''}`}><Icon size={17}/><span>{label}</span></NavLink>)}</div>)}
        </nav>
        <button className="reception-sidebar__logout" onClick={logout}><LogOut size={17}/> Tizimdan chiqish</button>
      </aside>
      <div className="reception-shell__main">
        <Header onMenuClick={() => setMenuOpen(true)} userName={username} roleName={role?.name || 'Qabul xodimi'} />
        <div className="reception-shell__content"><Outlet /></div>
      </div>
    </div>
  )
}
