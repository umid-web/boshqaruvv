import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { loadRoles } from '../admin/pages/users-roles/usersStore'

export default function useReceptionPermissions() {
  const { pathname } = useLocation()
  const isScopedRole = pathname.startsWith('/reception') || pathname.startsWith('/teacher')
  const roleId = sessionStorage.getItem('educontrol_role')
  const permissions = useMemo(() => {
    if (!isScopedRole) return null
    return new Set(loadRoles().find((role) => role.id === roleId)?.permissions ?? [])
  }, [isScopedRole, roleId])
  return (module, action = 'view') => {
    if (roleId === 'teacher' && ((module === 'attendance' && action === 'edit') || (module === 'payments' && ['create', 'edit', 'delete'].includes(action)) || (module === 'salaries' && ['create', 'edit', 'delete'].includes(action)))) return false
    return !isScopedRole || permissions.has(`${module}.${action}`)
  }
}
