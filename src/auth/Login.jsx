import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import './Login.scss'
import { loadUsers, loadRoles } from '../admin/pages/users-roles/usersStore'
import { loadTeachers } from '../admin/pages/teachers/teachersStore'
import { verifyPassword } from './passwords'

const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = 'admin'
const RECEPTION_USERNAME = 'reception'
const RECEPTION_PASSWORD = 'reception'

function Login() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (loading) return

    setError('')

    const trimmedUsername = username.trim()

    if (!trimmedUsername || !password) {
      setError('Login va parolni kiriting.')
      return
    }

    setLoading(true)

    // Kichik kechikish — "Tekshirilmoqda..." holatini ko‘rinadigan qilish uchun
    window.setTimeout(async () => {
      const isAdmin = trimmedUsername === ADMIN_USERNAME && password === ADMIN_PASSWORD
      const isReception = trimmedUsername === RECEPTION_USERNAME && password === RECEPTION_PASSWORD

      if (isAdmin || isReception) {
        sessionStorage.setItem('educontrol_logged_in', 'true')
        sessionStorage.setItem('educontrol_username', trimmedUsername)
        sessionStorage.setItem('educontrol_role', isReception ? 'reception' : 'admin')

        navigate(isReception ? '/reception' : '/admin/dashboard', { replace: true })
        return
      }

      const users = loadUsers();
      const account = users.find((user) => user.login?.toLowerCase() === trimmedUsername.toLowerCase() && user.status === 'active');
      const linkedTeacher = account?.roleId === 'teacher' && loadTeachers().find((teacher) => teacher.status === 'active' && (
        (account.teacherId && teacher.id === account.teacherId)
        || (teacher.firstName.trim().toLocaleLowerCase('uz') === account.firstName.trim().toLocaleLowerCase('uz')
          && teacher.lastName.trim().toLocaleLowerCase('uz') === account.lastName.trim().toLocaleLowerCase('uz'))
      ));
      if (account?.passwordHash && await verifyPassword(password, account.passwordHash)) {
        const lastLoginAt = new Date().toLocaleString('sv-SE').slice(0, 16);
        localStorage.setItem('edu-users-v1', JSON.stringify(users.map((user) => user.id === account.id ? { ...user, lastLoginAt } : user)));
        sessionStorage.setItem('educontrol_logged_in', 'true');
        sessionStorage.setItem('educontrol_username', account.login);
        sessionStorage.setItem('educontrol_role', account.roleId);
        sessionStorage.setItem('educontrol_user_id', account.id);
        if (linkedTeacher) sessionStorage.setItem('educontrol_teacher_id', linkedTeacher.id);
        const destination = account.roleId === 'reception' ? '/reception' : account.roleId === 'teacher' ? '/teacher' : '/admin';
        navigate(destination, { replace: true });
        return;
      }

      setError('Login yoki parol noto‘g‘ri.')
      setLoading(false)
    }, 450)
  }

  const handleUsernameChange = (event) => {
    setUsername(event.target.value)
    if (error) setError('')
  }

  const handlePasswordChange = (event) => {
    setPassword(event.target.value)
    if (error) setError('')
  }

  return (
    <main className="login-page">
      <span
        className="login-page__glow login-page__glow--one"
        aria-hidden="true"
      />
      <span
        className="login-page__glow login-page__glow--two"
        aria-hidden="true"
      />

      <section className="login-card" aria-labelledby="login-title">
        <header className="login-brand">
          <div className="login-brand__icon">
            <ShieldCheck size={26} strokeWidth={2.2} />
          </div>

          <div className="login-brand__text">
            <h1>EduControl Pro</h1>
            <p>TA’LIM BOSHQARUV TIZIMI</p>
          </div>
        </header>

        <div className="login-heading">
          <h2 id="login-title">Xush kelibsiz</h2>
          <p>Boshqaruv paneliga kirish uchun ma’lumotlaringizni kiriting.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="username">Login</label>

            <div className="login-input">
              <UserRound
                size={18}
                className="login-input__icon"
                aria-hidden="true"
              />

              <input
                id="username"
                name="username"
                type="text"
                placeholder="Loginingizni kiriting"
                autoComplete="username"
                spellCheck="false"
                value={username}
                onChange={handleUsernameChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="password">Parol</label>

            <div className="login-input">
              <LockKeyhole
                size={18}
                className="login-input__icon"
                aria-hidden="true"
              />

              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Parolni kiriting"
                autoComplete="current-password"
                value={password}
                onChange={handlePasswordChange}
                disabled={loading}
              />

              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={
                  showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'
                }
                aria-pressed={showPassword}
                title={
                  showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'
                }
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="login-message" role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2
                  size={18}
                  className="login-submit__spinner"
                  aria-hidden="true"
                />
                <span>Tekshirilmoqda...</span>
              </>
            ) : (
              <>
                <span>Tizimga kirish</span>
                <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <footer className="login-footer">
          <span className="login-footer__dot" aria-hidden="true" />
          <p>Xavfsiz ulanish · EduControl Pro © {new Date().getFullYear()}</p>
        </footer>
      </section>
    </main>
  )
}

export default Login
