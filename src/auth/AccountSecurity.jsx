import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import Card from '../admin/components/Card';
import { hashPassword, verifyPassword } from './passwords';

export default function AccountSecurity() {
  const navigate = useNavigate();
  const userId = sessionStorage.getItem('educontrol_user_id');
  const login = sessionStorage.getItem('educontrol_username') || '';
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const back = () => navigate(sessionStorage.getItem('educontrol_role') === 'teacher' ? '/teacher' : sessionStorage.getItem('educontrol_role') === 'reception' ? '/reception' : '/admin');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSaved(false);
    if (!userId) return setError('Bu hisob xodimlar ro‘yxatiga ulanmagan. Administrator foydalanuvchi hisobini sozlashi kerak.');
    if (next.length < 6) return setError('Yangi parol kamida 6 ta belgidan iborat bo‘lsin.');
    if (next !== confirm) return setError('Yangi parollar mos kelmadi.');
    const users = JSON.parse(localStorage.getItem('edu-users-v1') || '[]');
    const user = users.find((item) => item.id === userId);
    if (!user?.passwordHash || !await verifyPassword(current, user.passwordHash)) return setError('Joriy parol noto‘g‘ri.');
    const passwordHash = await hashPassword(next);
    localStorage.setItem('edu-users-v1', JSON.stringify(users.map((item) => item.id === userId ? { ...item, passwordHash } : item)));
    setCurrent(''); setNext(''); setConfirm(''); setSaved(true);
  };

  return <main className="page" style={{ maxWidth: 760, margin: '0 auto' }}>
    <header className="page-head"><div><h1>Hisob xavfsizligi</h1><p>{login} · login va parol sozlamalari</p></div><button type="button" className="btn btn--secondary" onClick={back}><ArrowLeft size={16}/> Orqaga</button></header>
    <Card title="Parolni o‘zgartirish" subtitle="Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak.">
      <form className="student-form" onSubmit={submit}>
        <label className="field"><span className="field__label">Joriy parol</span><input className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required /></label>
        <label className="field"><span className="field__label">Yangi parol</span><input className="input" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required /></label>
        <label className="field"><span className="field__label">Yangi parolni tasdiqlang</span><input className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>
        {error && <p className="field__error" role="alert">{error}</p>}
        {saved && <p className="field__hint" role="status">Parol muvaffaqiyatli o‘zgartirildi.</p>}
        <button type="submit" className="btn btn--primary"><KeyRound size={16}/> Parolni saqlash</button>
      </form>
    </Card>
    <p className="data-table__muted" style={{ display: 'flex', gap: 8, marginTop: 16 }}><ShieldCheck size={16}/> Parol xavfsiz xesh ko‘rinishida saqlanadi.</p>
  </main>;
}
