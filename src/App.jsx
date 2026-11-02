import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { ThemeProvider } from './admin/ThemeContext.jsx'
import { SettingsProvider } from './admin/pages/settings/SettingsContext.jsx'
import { ToastProvider } from './admin/components/ui/ToastProvider.jsx'

import AdminLayout from './admin/layout/AdminLayout.jsx'
import NotFound from './admin/pages/NotFound.jsx'
import Login from './auth/Login.jsx'
import { loadRoles } from './admin/pages/users-roles/usersStore.js'

// Admin sahifalari
const Dashboard = lazy(() => import('./admin/pages/Dashboard.jsx'))
const Students = lazy(() => import('./admin/pages/students/Students.jsx'))
const Teachers = lazy(() => import('./admin/pages/teachers/Teachers.jsx'))
const SupportTeachers = lazy(() => import('./admin/pages/support-teachers/SupportTeachers.jsx'))
const Courses = lazy(() => import('./admin/pages/courses/Courses.jsx'))
const Groups = lazy(() => import('./admin/pages/groups/Groups.jsx'))
const Schedule = lazy(() => import('./admin/pages/schedule/Schedule.jsx'))
const Attendance = lazy(() => import('./admin/pages/attendance/Attendance.jsx'))
const Finance = lazy(() => import('./admin/pages/finance/Finance.jsx'))
const Payments = lazy(() => import('./admin/pages/finance/Payments.jsx'))
const Expenses = lazy(() => import('./admin/pages/finance/Expenses.jsx'))
const Salaries = lazy(() => import('./admin/pages/finance/Salaries.jsx'))
const Settings = lazy(() => import('./admin/pages/settings/Settings.jsx'))
const Reports = lazy(() => import('./admin/pages/reports/Reports.jsx'))
const UsersRoles = lazy(() => import('./admin/pages/users-roles/UsersRoles.jsx'))
const Notifications = lazy(() => import('./admin/pages/notifications/Notifications.jsx'))
const ActivityLog = lazy(() => import('./admin/pages/activity/ActivityLog.jsx'))
const Chat = lazy(() => import('./admin/pages/chat/Chat.jsx'))
const Reception = lazy(() => import('./Reception/Reception.jsx'))
const ReceptionLayout = lazy(() => import('./Reception/ReceptionLayout.jsx'))
const TeacherPages = lazy(() => import('./Teacher/TeacherPages.jsx'))
const AccountSecurity = lazy(() => import('./auth/AccountSecurity.jsx'))

const ReceptionStudents = lazy(() => import('./admin/pages/students/Students.jsx'))
const ReceptionGroups = lazy(() => import('./admin/pages/groups/Groups.jsx'))
const ReceptionCourses = lazy(() => import('./admin/pages/courses/Courses.jsx'))
const ReceptionSchedule = lazy(() => import('./admin/pages/schedule/Schedule.jsx'))
const ReceptionAttendance = lazy(() => import('./admin/pages/attendance/Attendance.jsx'))
const ReceptionPayments = lazy(() => import('./admin/pages/finance/Payments.jsx'))

function RequireReceptionPermission({ module, children }) {
  const roleId = sessionStorage.getItem('educontrol_role')
  const role = loadRoles().find((item) => item.id === roleId)
  if (!role?.permissions?.includes(`${module}.view`)) {
    return module === 'dashboard' ? <NotFound /> : <Navigate to="/reception" replace />
  }
  return children
}

function RequireTeacherPermission({ module, children }) {
  const role = loadRoles().find((item) => item.id === 'teacher')
  if (!role?.permissions?.includes(`${module}.view`)) return <Navigate to="/teacher" replace />
  return children
}

function RequireAdminPermission({ module, children }) {
  const roleId = sessionStorage.getItem('educontrol_role');
  const role = loadRoles().find((item) => item.id === roleId);
  if (module === 'salaries' && !['admin', 'owner'].includes(roleId)) {
    const firstAllowed = role?.permissions?.find((permission) => permission.endsWith('.view') && permission !== 'salaries.view')?.split('.')[0];
    const destination = firstAllowed === 'activity' ? 'activity-log' : firstAllowed;
    return <Navigate to={destination ? `/admin/${destination}` : '/login'} replace />;
  }
  if (!role?.permissions?.includes(`${module}.view`)) {
    const firstAllowed = role?.permissions?.find((permission) => permission.endsWith('.view'))?.split('.')[0];
    const destination = firstAllowed === 'activity' ? 'activity-log' : firstAllowed;
    return <Navigate to={destination ? `/admin/${destination}` : '/login'} replace />;
  }
  return children;
}

// Login holatini tekshirish
function RequireAuth({ children }) {
  const isLoggedIn = sessionStorage.getItem('educontrol_logged_in') === 'true'
  const role = sessionStorage.getItem('educontrol_role')

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  const path = window.location.pathname
  if (path === '/account/security') return children
  if (role === 'teacher' && !path.startsWith('/teacher')) return <Navigate to="/teacher" replace />
  if (role === 'reception' && (path.startsWith('/admin') || path.startsWith('/teacher'))) return <Navigate to="/reception" replace />
  if (role !== 'reception' && role !== 'teacher' && (path.startsWith('/reception') || path.startsWith('/teacher'))) return <Navigate to="/admin" replace />
  return children
}

// Login qilgan foydalanuvchini qayta login sahifasiga kiritmaslik
function PublicOnlyRoute({ children }) {
  const isLoggedIn = sessionStorage.getItem('educontrol_logged_in') === 'true'
  const role = sessionStorage.getItem('educontrol_role')

  if (isLoggedIn) {
    return <Navigate to={role === 'reception' ? '/reception' : role === 'teacher' ? '/teacher' : '/admin'} replace />
  }

  return children
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <SettingsProvider>
          <ToastProvider>
            <Suspense
              fallback={
                <div className="page-loading">Sahifa yuklanmoqda...</div>
              }
            >
              <Routes>
                {/* Login */}
                <Route
                  path="/login"
                  element={
                    <PublicOnlyRoute>
                      <Login />
                    </PublicOnlyRoute>
                  }
                />

                {/* Bosh sahifa */}
                <Route path="/" element={<Navigate to={sessionStorage.getItem('educontrol_role') === 'teacher' ? '/teacher' : sessionStorage.getItem('educontrol_role') === 'reception' ? '/reception' : '/admin'} replace />} />
                <Route path="/account/security" element={<RequireAuth><AccountSecurity /></RequireAuth>} />
                <Route path="/teacher" element={<RequireAuth><AdminLayout /></RequireAuth>}>
                  <Route index element={loadRoles().find((role) => role.id === 'teacher')?.permissions?.includes('dashboard.view') ? <TeacherPages view="dashboard" /> : <Navigate to="students" replace />} />
                  <Route path="students" element={<RequireTeacherPermission module="students"><TeacherPages view="students" /></RequireTeacherPermission>} />
                  <Route path="schedule" element={<RequireTeacherPermission module="schedule"><TeacherPages view="schedule" /></RequireTeacherPermission>} />
                  <Route path="payments" element={<RequireTeacherPermission module="payments"><TeacherPages view="payments" /></RequireTeacherPermission>} />
                  <Route path="salaries" element={<RequireTeacherPermission module="salaries"><TeacherPages view="salaries" /></RequireTeacherPermission>} />
                  <Route path="chat" element={<Chat />} />
                  <Route path="*" element={<Navigate to="/teacher" replace />} />
                </Route>
                <Route path="/reception" element={<RequireAuth><ReceptionLayout /></RequireAuth>}>
                  <Route index element={<RequireReceptionPermission module="dashboard"><Reception /></RequireReceptionPermission>} />
                  <Route path="students" element={<RequireReceptionPermission module="students"><ReceptionStudents /></RequireReceptionPermission>} />
                  <Route path="teachers" element={<RequireReceptionPermission module="teachers"><Teachers /></RequireReceptionPermission>} />
                  <Route path="support-teachers" element={<RequireReceptionPermission module="support-teachers"><SupportTeachers /></RequireReceptionPermission>} />
                  <Route path="groups" element={<RequireReceptionPermission module="groups"><ReceptionGroups /></RequireReceptionPermission>} />
                  <Route path="courses" element={<RequireReceptionPermission module="courses"><ReceptionCourses /></RequireReceptionPermission>} />
                  <Route path="schedule" element={<RequireReceptionPermission module="schedule"><ReceptionSchedule /></RequireReceptionPermission>} />
                  <Route path="attendance" element={<RequireReceptionPermission module="attendance"><ReceptionAttendance /></RequireReceptionPermission>} />
                  <Route path="payments" element={<RequireReceptionPermission module="payments"><ReceptionPayments /></RequireReceptionPermission>} />
                  <Route path="finance" element={<RequireReceptionPermission module="finance"><Finance /></RequireReceptionPermission>} />
                  <Route path="debts" element={<RequireReceptionPermission module="debts"><Finance view="debts" /></RequireReceptionPermission>} />
                  <Route path="expenses" element={<RequireReceptionPermission module="expenses"><Expenses /></RequireReceptionPermission>} />
                  <Route path="reports" element={<RequireReceptionPermission module="reports"><Reports /></RequireReceptionPermission>} />
                  <Route path="notifications" element={<RequireReceptionPermission module="notifications"><Notifications /></RequireReceptionPermission>} />
                  <Route path="users-roles" element={<RequireReceptionPermission module="users-roles"><UsersRoles /></RequireReceptionPermission>} />
                  <Route path="settings" element={<RequireReceptionPermission module="settings"><Settings /></RequireReceptionPermission>} />
                  <Route path="activity-log" element={<RequireReceptionPermission module="activity"><ActivityLog /></RequireReceptionPermission>} />
                  <Route path="chat" element={<Chat />} />
                  <Route path="*" element={<Navigate to="/reception" replace />} />
                </Route>

                {/* Himoyalangan admin panel */}
                <Route
                  path="/admin"
                  element={
                    <RequireAuth>
                      <AdminLayout />
                    </RequireAuth>
                  }
                >
                  {/* /admin ochilganda boshqaruv paneli ochiladi */}
                  <Route index element={<Navigate to="dashboard" replace />} />

                  <Route path="dashboard" element={<RequireAdminPermission module="dashboard"><Dashboard /></RequireAdminPermission>} />
                  <Route path="students" element={<RequireAdminPermission module="students"><Students /></RequireAdminPermission>} />
                  <Route path="teachers" element={<RequireAdminPermission module="teachers"><Teachers /></RequireAdminPermission>} />
                  <Route
                    path="support-teachers"
                    element={<RequireAdminPermission module="support-teachers"><SupportTeachers /></RequireAdminPermission>}
                  />
                  <Route path="courses" element={<RequireAdminPermission module="courses"><Courses /></RequireAdminPermission>} />
                  <Route path="groups" element={<RequireAdminPermission module="groups"><Groups /></RequireAdminPermission>} />
                  <Route path="schedule" element={<RequireAdminPermission module="schedule"><Schedule /></RequireAdminPermission>} />
                  <Route path="attendance" element={<RequireAdminPermission module="attendance"><Attendance /></RequireAdminPermission>} />
                  <Route path="finance" element={<RequireAdminPermission module="finance"><Finance /></RequireAdminPermission>} />
                  <Route path="payments" element={<RequireAdminPermission module="payments"><Payments /></RequireAdminPermission>} />
                  <Route path="debts" element={<RequireAdminPermission module="debts"><Finance view="debts" /></RequireAdminPermission>} />
                  <Route path="expenses" element={<RequireAdminPermission module="expenses"><Expenses /></RequireAdminPermission>} />
                  <Route path="salaries" element={<RequireAdminPermission module="salaries"><Salaries /></RequireAdminPermission>} />
                  <Route path="settings" element={<RequireAdminPermission module="settings"><Settings /></RequireAdminPermission>} />
                  <Route path="reports" element={<RequireAdminPermission module="reports"><Reports /></RequireAdminPermission>} />
                  <Route path="users-roles" element={<RequireAdminPermission module="users-roles"><UsersRoles /></RequireAdminPermission>} />
                  <Route path="notifications" element={<RequireAdminPermission module="notifications"><Notifications /></RequireAdminPermission>} />
                  <Route path="activity-log" element={<RequireAdminPermission module="activity"><ActivityLog /></RequireAdminPermission>} />
                  <Route path="chat" element={<Chat />} />

                  <Route path="*" element={<NotFound />} />
                </Route>

                {/* Noma'lum manzillar */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ToastProvider>
        </SettingsProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
