import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './admin/ThemeContext.jsx';
import { SettingsProvider } from './admin/pages/settings/SettingsContext.jsx';
import { ToastProvider } from './admin/components/ui/ToastProvider';
import AdminLayout from './admin/layout/AdminLayout';
import PlaceholderPage from './admin/pages/PlaceholderPage';
import NotFound from './admin/pages/NotFound';
import { navItems } from './admin/navigation';
// Guruhlar do‘konini darhol yuklaymiz: u umumiy guruh ro‘yxatlarini (GROUPS, kurslar) saqlangan ma'lumotlar bilan
// moslashtiradi — lazy sahifalar ochilishidan oldin tayyor bo‘lishi shart.
import './admin/pages/groups/groupsStore';

// Grafiklar kutubxonasi (recharts) faqat dashboard ochilganda yuklanadi
const Dashboard = lazy(() => import('./admin/pages/Dashboard'));
const Students = lazy(() => import('./admin/pages/students/Students'));
const Teachers = lazy(() => import('./admin/pages/teachers/Teachers'));
const SupportTeachers = lazy(() => import('./admin/pages/support-teachers/SupportTeachers'));
const Courses = lazy(() => import('./admin/pages/courses/Courses'));
const Groups = lazy(() => import('./admin/pages/groups/Groups'));
const Schedule = lazy(() => import('./admin/pages/schedule/Schedule'));
const Attendance = lazy(() => import('./admin/pages/attendance/Attendance'));
const Finance = lazy(() => import('./admin/pages/finance/Finance'));
const Payments = lazy(() => import('./admin/pages/finance/Payments'));
const Expenses = lazy(() => import('./admin/pages/finance/Expenses'));
const Salaries = lazy(() => import('./admin/pages/finance/Salaries'));
const Settings = lazy(() => import('./admin/pages/settings/Settings'));
const Reports = lazy(() => import('./admin/pages/reports/Reports'));
const UsersRoles = lazy(() => import('./admin/pages/users-roles/UsersRoles'));
const Notifications = lazy(() => import('./admin/pages/notifications/Notifications'));
const ActivityLog = lazy(() => import('./admin/pages/activity/ActivityLog'));

// To‘liq tayyor sahifalar — ularga placeholder yaratilmaydi
const READY_PATHS = new Set(['students', 'teachers', 'support-teachers', 'courses', 'groups', 'schedule', 'attendance', 'finance', 'payments', 'debts', 'expenses', 'salaries', 'settings', 'reports', 'users-roles', 'notifications', 'activity']);

function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/admin/reports" replace />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="teachers" element={<Teachers />} />
              <Route path="support-teachers" element={<SupportTeachers />} />
              <Route path="courses" element={<Courses />} />
              <Route path="groups" element={<Groups />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="finance" element={<Finance view="overview" />} />
              <Route path="payments" element={<Payments />} />
              <Route path="debts" element={<Finance view="debts" />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="salaries" element={<Salaries />} />
              <Route path="settings" element={<Settings />} />
              <Route path="reports" element={<Reports />} />
              <Route path="users-roles" element={<UsersRoles />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="activity" element={<ActivityLog />} />
              {/* Sidebar menyusidagi sahifalar (hozircha placeholder) navigation.js dan olinadi */}
              {navItems
                .filter((item) => item.path && !READY_PATHS.has(item.path))
                .map((item) => (
                  <Route
                    key={item.path}
                    path={item.path}
                    element={<PlaceholderPage title={item.label} />}
                  />
                ))}
              <Route path="*" element={<NotFound />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </ToastProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
