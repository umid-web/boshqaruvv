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
                <Route path="/" element={<Navigate to={sessionStorage.getItem('educontrol_role') === 'teacher' ? '/teacher' : '/admin'} replace />} />
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
                  <Route path="groups" element={<RequireReceptionPermission module="groups"><ReceptionGroups /></RequireReceptionPermission>} />
                  <Route path="courses" element={<RequireReceptionPermission module="courses"><ReceptionCourses /></RequireReceptionPermission>} />
                  <Route path="schedule" element={<RequireReceptionPermission module="schedule"><ReceptionSchedule /></RequireReceptionPermission>} />
                  <Route path="attendance" element={<RequireReceptionPermission module="attendance"><ReceptionAttendance /></RequireReceptionPermission>} />
                  <Route path="payments" element={<RequireReceptionPermission module="payments"><ReceptionPayments /></RequireReceptionPermission>} />
                  <Route path="debts" element={<RequireReceptionPermission module="debts"><Finance view="debts" /></RequireReceptionPermission>} />
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

                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="students" element={<Students />} />
                  <Route path="teachers" element={<Teachers />} />
                  <Route
                    path="support-teachers"
                    element={<SupportTeachers />}
                  />
                  <Route path="courses" element={<Courses />} />
                  <Route path="groups" element={<Groups />} />
                  <Route path="schedule" element={<Schedule />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="finance" element={<Finance />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="debts" element={<Finance view="debts" />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="salaries" element={<Salaries />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="users-roles" element={<UsersRoles />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="activity-log" element={<ActivityLog />} />
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
