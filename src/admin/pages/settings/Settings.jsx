import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Building2,
  ClipboardCheck,
  Database,
  Download,
  Moon,
  Palette,
  RotateCcw,
  Save,
  ShieldCheck,
  Sun,
  Upload,
  Wallet,
} from 'lucide-react';
import Card from '../../components/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/useToast';
import { useTheme } from '../../useTheme';
import { formatDateTime, maskPhoneInput, phoneDigits } from '../../utils/format';
import { useAppSettings } from './useAppSettings';
import {
  cloneSettings,
  DEFAULT_SETTINGS,
  PAYMENT_METHODS,
  WEEK_DAYS,
  hydrateSettings,
  settingsEqual,
} from './settingsStore';
import '../students/Students.scss';
import './Settings.scss';

const SECTIONS = [
  { id: 'org', label: 'Markaz', hint: 'Nomi, aloqa, ish vaqti', icon: Building2 },
  { id: 'appearance', label: 'Ko‘rinish', hint: 'Mavzu va til', icon: Palette },
  { id: 'finance', label: 'Moliya', hint: 'To‘lov va hisob-faktura', icon: Wallet },
  { id: 'attendance', label: 'Davomat', hint: 'Kechikish qoidalari', icon: ClipboardCheck },
  { id: 'notifications', label: 'Bildirishnomalar', hint: 'Email, SMS, Telegram', icon: Bell },
  { id: 'security', label: 'Xavfsizlik', hint: 'Sessiya va parol', icon: ShieldCheck },
  { id: 'data', label: 'Ma’lumotlar', hint: 'Zaxira va tiklash', icon: Database },
];

const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGO_MAX = 400 * 1024;

const Field = ({ label, required, error, hint, children }) => (
  <label className={error ? 'field has-error' : 'field'}>
    <span className="field__label">
      {label}
      {required && <abbr title="Majburiy">*</abbr>}
    </span>
    {children}
    {error ? <span className="field__error" role="alert">{error}</span> : hint && <span className="field__hint">{hint}</span>}
  </label>
);

const Toggle = ({ checked, onChange, label, hint, disabled }) => (
  <div className={`settings-toggle${disabled ? ' is-disabled' : ''}`}>
    <span>
      <strong>{label}</strong>
      {hint && <small>{hint}</small>}
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={checked ? 'switch is-on' : 'switch'}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__knob" />
    </button>
  </div>
);

const validate = (s) => {
  const e = {};
  if (s.org.name.trim().length < 2) e['org.name'] = 'Markaz nomi kamida 2 ta belgidan iborat bo‘lsin';
  if (s.org.email && !EMAIL_RE.test(s.org.email.trim())) e['org.email'] = 'Email manzili noto‘g‘ri';
  if (s.org.phone && phoneDigits(s.org.phone).length !== 12) e['org.phone'] = 'Telefon raqamini to‘liq kiriting';
  if (s.org.inn && !/^\d{9}$/.test(s.org.inn.trim())) e['org.inn'] = 'STIR 9 ta raqamdan iborat bo‘lsin';
  if (s.org.website && s.org.website.trim() && !/^https?:\/\/.+\..+/.test(s.org.website.trim())) {
    e['org.website'] = 'Havola https:// bilan boshlansin';
  }
  if (!s.org.workDays.length) e['org.workDays'] = 'Kamida bitta ish kunini tanlang';
  if (s.org.workStart && s.org.workEnd && s.org.workStart >= s.org.workEnd) {
    e['org.workEnd'] = 'Tugash vaqti boshlanishdan keyin bo‘lsin';
  }
  if (!/^[A-Za-z0-9]{2,8}$/.test(s.finance.invoicePrefix.trim())) {
    e['finance.invoicePrefix'] = '2–8 ta lotin harf yoki raqam';
  }
  const late = Number(s.finance.lateFeePercent);
  if (!Number.isFinite(late) || late < 0 || late > 50) e['finance.lateFeePercent'] = '0 dan 50 gacha bo‘lsin';
  const due = Number(s.finance.dueDay);
  if (!Number.isInteger(due) || due < 1 || due > 28) e['finance.dueDay'] = '1–28 oralig‘ida bo‘lsin';
  if (!s.finance.paymentMethods.length) e['finance.paymentMethods'] = 'Kamida bitta to‘lov usulini tanlang';
  const lateM = Number(s.attendance.lateMinutes);
  const absM = Number(s.attendance.autoAbsentMinutes);
  if (!Number.isInteger(lateM) || lateM < 0 || lateM > 120) e['attendance.lateMinutes'] = '0–120 daqiqa';
  if (!Number.isInteger(absM) || absM < lateM || absM > 180) {
    e['attendance.autoAbsentMinutes'] = 'Kechikishdan katta va 180 dan oshmasin';
  }
  const sess = Number(s.security.sessionMinutes);
  const pmin = Number(s.security.passwordMinLength);
  if (!Number.isInteger(sess) || sess < 15 || sess > 480) e['security.sessionMinutes'] = '15–480 daqiqa';
  if (!Number.isInteger(pmin) || pmin < 6 || pmin > 16) e['security.passwordMinLength'] = '6–16 belgi';
  return e;
};

const firstErrorSection = (errors) => {
  const keys = Object.keys(errors);
  if (!keys.length) return null;
  const prefix = keys[0].split('.')[0];
  return SECTIONS.some((s) => s.id === prefix) ? prefix : 'org';
};

const Settings = () => {
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const { settings, save } = useAppSettings();
  const [draft, setDraft] = useState(() => {
    const next = cloneSettings(settings);
    next.appearance.theme = theme;
    return next;
  });
  const [section, setSection] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return SECTIONS.some((s) => s.id === hash) ? hash : 'org';
  });
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);
  const importRef = useRef(null);
  const themeAtOpen = useRef(theme);

  useEffect(() => {
    const next = cloneSettings(settings);
    next.appearance.theme = theme;
    setDraft(next);
    themeAtOpen.current = theme;
    // Saqlangan sozlamalar yangilanganda draftni sinxronlaymiz; mavzu headerdan o‘zgarsa aralashmaymiz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-density',
      draft.appearance.density === 'compact' ? 'compact' : 'comfortable',
    );
  }, [draft.appearance.density]);

  const dirty = useMemo(() => {
    const snap = (s, th) => {
      const c = cloneSettings(s);
      c.appearance.theme = th;
      c.meta = null;
      return c;
    };
    return !settingsEqual(snap(draft, theme), snap(settings, themeAtOpen.current));
  }, [draft, settings, theme]);

  const setOrg = (key, value) => setDraft((d) => ({ ...d, org: { ...d.org, [key]: value } }));
  const setApp = (key, value) => setDraft((d) => ({ ...d, appearance: { ...d.appearance, [key]: value } }));
  const setFin = (key, value) => setDraft((d) => ({ ...d, finance: { ...d.finance, [key]: value } }));
  const setAtt = (key, value) => setDraft((d) => ({ ...d, attendance: { ...d.attendance, [key]: value } }));
  const setNot = (key, value) => setDraft((d) => ({ ...d, notifications: { ...d.notifications, [key]: value } }));
  const setSec = (key, value) => setDraft((d) => ({ ...d, security: { ...d.security, [key]: value } }));

  const go = (id) => {
    setSection(id);
    window.history.replaceState(null, '', `#${id}`);
  };

  const persist = useCallback(() => {
    const next = cloneSettings(draft);
    next.appearance.theme = theme;
    next.org.phone = phoneDigits(next.org.phone);
    next.org.name = next.org.name.trim();
    next.org.email = next.org.email.trim();
    next.finance.invoicePrefix = next.finance.invoicePrefix.trim().toUpperCase();
    next.finance.lateFeePercent = Number(next.finance.lateFeePercent) || 0;
    next.finance.dueDay = Number(next.finance.dueDay) || 10;
    next.attendance.lateMinutes = Number(next.attendance.lateMinutes) || 0;
    next.attendance.autoAbsentMinutes = Number(next.attendance.autoAbsentMinutes) || 0;
    next.security.sessionMinutes = Number(next.security.sessionMinutes) || 60;
    next.security.passwordMinLength = Number(next.security.passwordMinLength) || 8;
    const errs = validate(next);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const jump = firstErrorSection(errs);
      if (jump) go(jump);
      toast.error('Ba’zi maydonlarni tekshiring');
      return false;
    }
    const stored = save(next);
    themeAtOpen.current = stored.appearance.theme;
    setDraft(cloneSettings(stored));
    toast.success('Sozlamalar saqlandi');
    return true;
  }, [draft, save, theme, toast]);

  const discard = () => {
    setTheme(themeAtOpen.current);
    const next = cloneSettings(settings);
    next.appearance.theme = themeAtOpen.current;
    setDraft(next);
    setErrors({});
    document.documentElement.setAttribute(
      'data-density',
      next.appearance.density === 'compact' ? 'compact' : 'comfortable',
    );
    toast.info('O‘zgarishlar bekor qilindi');
  };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        persist();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [persist]);

  useEffect(() => {
    const onLeave = (e) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);

  const onLogo = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Faqat rasm fayli yuklansin');
      return;
    }
    if (file.size > LOGO_MAX) {
      toast.error('Logo 400 KB dan oshmasin');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setOrg('logo', String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'educontrol-sozlamalar.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Sozlamalar yuklab olindi');
  };

  const importJson = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        if (!parsed || typeof parsed !== 'object') throw new Error('format');
        const next = hydrateSettings(parsed);
        setDraft(next);
        if (next.appearance.theme === 'light' || next.appearance.theme === 'dark') setTheme(next.appearance.theme);
        toast.info('Fayldan o‘qildi — saqlashni unutmang');
        go('org');
      } catch {
        toast.error('JSON faylni o‘qib bo‘lmadi');
      }
    };
    reader.readAsText(file);
  };

  const applyDefaults = () => {
    const next = cloneSettings(DEFAULT_SETTINGS);
    next.appearance.theme = theme;
    const stored = save(next);
    themeAtOpen.current = theme;
    setDraft(cloneSettings(stored));
    setErrors({});
    setConfirm(null);
    toast.success('Standart sozlamalar tiklandi');
  };

  const toggleDay = (value) => {
    const has = draft.org.workDays.includes(value);
    setOrg('workDays', has ? draft.org.workDays.filter((d) => d !== value) : [...draft.org.workDays, value].sort((a, b) => (a === 0 ? 8 : a) - (b === 0 ? 8 : b)));
  };

  const togglePay = (value) => {
    const has = draft.finance.paymentMethods.includes(value);
    setFin('paymentMethods', has ? draft.finance.paymentMethods.filter((m) => m !== value) : [...draft.finance.paymentMethods, value]);
  };

  const updated = settings.meta?.updatedAt;

  return (
    <div className="students-page settings-page">
      <header className="page-head">
        <div>
          <h1>Sozlamalar</h1>
          <p>
            O‘quv markazi, ko‘rinish, moliya va xavfsizlik parametrlari
            {updated ? ` · oxirgi saqlash: ${formatDateTime(updated.replace('T', ' ').slice(0, 16))}` : ''}
          </p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--secondary" onClick={discard} disabled={!dirty}>
            Bekor qilish
          </button>
          <button type="button" className="btn btn--primary" onClick={persist} disabled={!dirty}>
            <Save size={16} /> Saqlash
          </button>
        </div>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Sozlamalar bo‘limlari">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.id;
            const hasErr = Object.keys(errors).some((k) => k.startsWith(`${s.id}.`));
            return (
              <button
                key={s.id}
                type="button"
                className={`settings-nav__item${active ? ' is-active' : ''}${hasErr ? ' has-error' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => go(s.id)}
              >
                <span className="settings-nav__icon"><Icon size={18} /></span>
                <span>
                  <strong>{s.label}</strong>
                  <small>{s.hint}</small>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="settings-main">
          {section === 'org' && (
            <Card title="Markaz ma’lumotlari" subtitle="Hisobotlar, kvitansiyalar va yon menyuda ko‘rinadi.">
              <div className="settings-grid">
                <div className="settings-logo">
                  <span className="field__label">Logo</span>
                  <div className="settings-logo__row">
                    <span className="settings-logo__preview" aria-hidden="true">
                      {draft.org.logo ? <img src={draft.org.logo} alt="" /> : draft.org.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="settings-logo__actions">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          onLogo(e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                      <button type="button" className="btn btn--secondary btn--sm" onClick={() => fileRef.current?.click()}>
                        <Upload size={14} /> Yuklash
                      </button>
                      {draft.org.logo && (
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOrg('logo', '')}>Olib tashlash</button>
                      )}
                      <span className="field__hint">PNG yoki SVG, 400 KB gacha</span>
                    </div>
                  </div>
                </div>
                <Field label="Markaz nomi" required error={errors['org.name']}>
                  <input className="input" value={draft.org.name} onChange={(e) => setOrg('name', e.target.value)} />
                </Field>
                <Field label="Yuridik nomi" hint="Shartnomalar uchun">
                  <input className="input" value={draft.org.legalName} onChange={(e) => setOrg('legalName', e.target.value)} />
                </Field>
                <Field label="Telefon" error={errors['org.phone']}>
                  <input
                    className="input"
                    inputMode="tel"
                    value={maskPhoneInput(draft.org.phone)}
                    onChange={(e) => setOrg('phone', phoneDigits(e.target.value))}
                    placeholder="+998 90 123 45 67"
                  />
                </Field>
                <Field label="Email" error={errors['org.email']}>
                  <input className="input" type="email" value={draft.org.email} onChange={(e) => setOrg('email', e.target.value)} />
                </Field>
                <Field label="Veb-sayt" error={errors['org.website']}>
                  <input className="input" value={draft.org.website} onChange={(e) => setOrg('website', e.target.value)} placeholder="https://" />
                </Field>
                <Field label="STIR" error={errors['org.inn']}>
                  <input className="input" inputMode="numeric" maxLength={9} value={draft.org.inn} onChange={(e) => setOrg('inn', e.target.value.replace(/\D/g, '').slice(0, 9))} />
                </Field>
                <Field label="Direktor">
                  <input className="input" value={draft.org.director} onChange={(e) => setOrg('director', e.target.value)} />
                </Field>
                <Field label="Manzil" hint="Kvitansiyada chiqadi">
                  <input className="input" value={draft.org.address} onChange={(e) => setOrg('address', e.target.value)} />
                </Field>
                <Field label="Vaqt mintaqasi">
                  <select className="input" value={draft.org.timezone} onChange={(e) => setOrg('timezone', e.target.value)}>
                    <option value="Asia/Tashkent">O‘zbekiston (UTC+5)</option>
                    <option value="Asia/Almaty">Qozog‘iston (UTC+5)</option>
                    <option value="Asia/Dushanbe">Tojikiston (UTC+5)</option>
                  </select>
                </Field>
                <Field label="Ish boshlanishi">
                  <input type="time" className="input" value={draft.org.workStart} onChange={(e) => setOrg('workStart', e.target.value)} />
                </Field>
                <Field label="Ish tugashi" error={errors['org.workEnd']}>
                  <input type="time" className="input" value={draft.org.workEnd} onChange={(e) => setOrg('workEnd', e.target.value)} />
                </Field>
                <div className={errors['org.workDays'] ? 'field has-error settings-span' : 'field settings-span'}>
                  <span className="field__label">Ish kunlari</span>
                  <div className="chips" role="group" aria-label="Ish kunlari">
                    {WEEK_DAYS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        className={draft.org.workDays.includes(d.value) ? 'chip is-active' : 'chip'}
                        aria-pressed={draft.org.workDays.includes(d.value)}
                        title={d.full}
                        onClick={() => toggleDay(d.value)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  {errors['org.workDays'] && <span className="field__error" role="alert">{errors['org.workDays']}</span>}
                </div>
              </div>
            </Card>
          )}

          {section === 'appearance' && (
            <Card title="Ko‘rinish" subtitle="Mavzu darhol qo‘llanadi; qolganlari saqlangandan keyin.">
              <div className="settings-stack">
                <div className="field">
                  <span className="field__label">Mavzu</span>
                  <div className="theme-picks" role="group" aria-label="Mavzu">
                    <button
                      type="button"
                      className={theme === 'light' ? 'theme-pick is-active' : 'theme-pick'}
                      onClick={() => { setTheme('light'); setApp('theme', 'light'); }}
                    >
                      <span className="theme-pick__preview theme-pick__preview--light">
                        <Sun size={16} />
                      </span>
                      Yorug‘
                    </button>
                    <button
                      type="button"
                      className={theme === 'dark' ? 'theme-pick is-active' : 'theme-pick'}
                      onClick={() => { setTheme('dark'); setApp('theme', 'dark'); }}
                    >
                      <span className="theme-pick__preview theme-pick__preview--dark">
                        <Moon size={16} />
                      </span>
                      Qorong‘i
                    </button>
                  </div>
                </div>
                <div className="settings-grid">
                  <Field label="Interfeys tili" hint="DEMO — hozircha faqat o‘zbek tili">
                    <select className="input" value={draft.appearance.language} onChange={(e) => setApp('language', e.target.value)}>
                      <option value="uz">O‘zbekcha</option>
                      <option value="ru" disabled>Русский (tez orada)</option>
                      <option value="en" disabled>English (tez orada)</option>
                    </select>
                  </Field>
                  <Field label="Sana formati">
                    <select className="input" value={draft.appearance.dateFormat} onChange={(e) => setApp('dateFormat', e.target.value)}>
                      <option value="dd.mm.yyyy">24.10.2026</option>
                      <option value="yyyy-mm-dd">2026-10-24</option>
                      <option value="dd-month">24-oktabr, 2026</option>
                    </select>
                  </Field>
                  <Field label="Zichlik" hint="Compact — jadvallar va tugmalar ixchamroq">
                    <select className="input" value={draft.appearance.density} onChange={(e) => setApp('density', e.target.value)}>
                      <option value="comfortable">Qulay</option>
                      <option value="compact">Ixcham</option>
                    </select>
                  </Field>
                </div>
              </div>
            </Card>
          )}

          {section === 'finance' && (
            <Card title="Moliyaviy qoidalar" subtitle="To‘lov muddati, kechikish va qabul qilinadigan usullar.">
              <div className="settings-grid">
                <Field label="Valyuta" hint="Hisobotlar so‘mda yuritiladi">
                  <select className="input" value={draft.finance.currency} onChange={(e) => setFin('currency', e.target.value)}>
                    <option value="UZS">O‘zbek so‘mi (UZS)</option>
                    <option value="USD">AQSH dollari (USD)</option>
                  </select>
                </Field>
                <Field label="Hisob-faktura prefiksi" error={errors['finance.invoicePrefix']} hint="Masalan, INV-0042">
                  <input className="input" value={draft.finance.invoicePrefix} onChange={(e) => setFin('invoicePrefix', e.target.value.toUpperCase())} maxLength={8} />
                </Field>
                <Field label="To‘lov sanasi (oy kuni)" error={errors['finance.dueDay']} hint="Har oy shu kunga qadar">
                  <input className="input" type="number" min={1} max={28} value={draft.finance.dueDay} onChange={(e) => setFin('dueDay', e.target.value)} />
                </Field>
                <Field label="Kechikish jarimasi (%)" error={errors['finance.lateFeePercent']}>
                  <input className="input" type="number" min={0} max={50} step={0.5} value={draft.finance.lateFeePercent} onChange={(e) => setFin('lateFeePercent', e.target.value)} />
                </Field>
                <Field label="Moliyaviy yil boshlanishi">
                  <select className="input" value={draft.finance.fiscalYearStart} onChange={(e) => setFin('fiscalYearStart', Number(e.target.value))}>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </Field>
                <div className={errors['finance.paymentMethods'] ? 'field has-error settings-span' : 'field settings-span'}>
                  <span className="field__label">Qabul qilinadigan to‘lov usullari</span>
                  <div className="chips" role="group">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        className={draft.finance.paymentMethods.includes(m.value) ? 'chip is-active' : 'chip'}
                        aria-pressed={draft.finance.paymentMethods.includes(m.value)}
                        onClick={() => togglePay(m.value)}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {errors['finance.paymentMethods'] && <span className="field__error" role="alert">{errors['finance.paymentMethods']}</span>}
                </div>
              </div>
            </Card>
          )}

          {section === 'attendance' && (
            <Card title="Davomat qoidalari" subtitle="Darsga kechikish va avtomatik yo‘qlama chegaralari.">
              <div className="settings-grid">
                <Field label="Kechikish (daqiqa)" error={errors['attendance.lateMinutes']} hint="Shu vaqtdan keyin «kech» deb belgilanadi">
                  <input className="input" type="number" min={0} max={120} value={draft.attendance.lateMinutes} onChange={(e) => setAtt('lateMinutes', e.target.value)} />
                </Field>
                <Field label="Yo‘qlama (daqiqa)" error={errors['attendance.autoAbsentMinutes']} hint="Shu vaqtdan keyin avtomatik «yo‘q»">
                  <input className="input" type="number" min={0} max={180} value={draft.attendance.autoAbsentMinutes} onChange={(e) => setAtt('autoAbsentMinutes', e.target.value)} />
                </Field>
              </div>
              <div className="settings-toggles">
                <Toggle
                  checked={draft.attendance.requireNote}
                  onChange={(v) => setAtt('requireNote', v)}
                  label="Sababsiz yo‘qlama uchun izoh majburiy"
                  hint="O‘qituvchi izoh yozmasdan saqlay olmaydi"
                />
                <Toggle
                  checked={draft.attendance.notifyParents}
                  onChange={(v) => setAtt('notifyParents', v)}
                  label="Ota-onaga xabar"
                  hint="Yo‘qlama qo‘yilganda SMS/Telegram yuboriladi (DEMO)"
                />
              </div>
            </Card>
          )}

          {section === 'notifications' && (
            <Card title="Bildirishnomalar" subtitle="Qaysi kanallar orqali ogohlantirish yuboriladi.">
              <div className="settings-toggles">
                <Toggle checked={draft.notifications.email} onChange={(v) => setNot('email', v)} label="Email" hint="Hisobot va to‘lov eslatmalari" />
                <Toggle checked={draft.notifications.sms} onChange={(v) => setNot('sms', v)} label="SMS" hint="Qisqa xabarlar — operator ulanishi kerak" />
                <Toggle checked={draft.notifications.telegram} onChange={(v) => setNot('telegram', v)} label="Telegram" hint="Bot orqali tezkor xabarlar" />
                <Toggle checked={draft.notifications.paymentReminders} onChange={(v) => setNot('paymentReminders', v)} label="To‘lov eslatmalari" hint="Muddat yaqinlashganda" />
                <Toggle checked={draft.notifications.attendanceAlerts} onChange={(v) => setNot('attendanceAlerts', v)} label="Davomat ogohlantirishlari" />
                <Toggle checked={draft.notifications.birthdayReminders} onChange={(v) => setNot('birthdayReminders', v)} label="Tug‘ilgan kun eslatmalari" />
              </div>
              <div className="settings-grid" style={{ marginTop: '1rem' }}>
                <Field label="Haftalik xulosa" hint="Administratorga yuboriladigan qisqa hisobot">
                  <select className="input" value={draft.notifications.digest} onChange={(e) => setNot('digest', e.target.value)}>
                    <option value="off">O‘chiq</option>
                    <option value="daily">Har kuni</option>
                    <option value="weekly">Har hafta</option>
                  </select>
                </Field>
              </div>
            </Card>
          )}

          {section === 'security' && (
            <Card title="Xavfsizlik" subtitle="Sessiya muddati va parol talablari. 2FA — DEMO rejimida.">
              <div className="settings-grid">
                <Field label="Sessiya (daqiqa)" error={errors['security.sessionMinutes']} hint="Harakatsizlikdan keyin chiqish">
                  <input className="input" type="number" min={15} max={480} value={draft.security.sessionMinutes} onChange={(e) => setSec('sessionMinutes', e.target.value)} />
                </Field>
                <Field label="Parol minimal uzunligi" error={errors['security.passwordMinLength']}>
                  <input className="input" type="number" min={6} max={16} value={draft.security.passwordMinLength} onChange={(e) => setSec('passwordMinLength', e.target.value)} />
                </Field>
              </div>
              <div className="settings-toggles">
                <Toggle
                  checked={draft.security.twoFactor}
                  onChange={(v) => setSec('twoFactor', v)}
                  label="Ikki bosqichli tasdiqlash"
                  hint="DEMO — haqiqiy 2FA keyingi versiyada"
                />
                <Toggle
                  checked={draft.security.loginAlerts}
                  onChange={(v) => setSec('loginAlerts', v)}
                  label="Yangi qurilmadan kirish haqida xabar"
                />
              </div>
              <div style={{ marginTop: '1rem' }}>
                <Link className="btn btn--secondary" to="/account/security">O‘z parolimni o‘zgartirish</Link>
              </div>
            </Card>
          )}

          {section === 'data' && (
            <Card title="Ma’lumotlar" subtitle="Sozlamalarni zaxiralash yoki standarga qaytarish. Talabalar bazasi o‘chmaydi.">
              <div className="settings-data">
                <div className="settings-data__item">
                  <div>
                    <strong>Eksport</strong>
                    <p>Joriy sozlamalarni JSON faylga yuklab oling.</p>
                  </div>
                  <button type="button" className="btn btn--secondary" onClick={exportJson}>
                    <Download size={16} /> Yuklab olish
                  </button>
                </div>
                <div className="settings-data__item">
                  <div>
                    <strong>Import</strong>
                    <p>Avval yuklab olingan JSON ni qayta yuklang, so‘ng saqlang.</p>
                  </div>
                  <input
                    ref={importRef}
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={(e) => {
                      importJson(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <button type="button" className="btn btn--secondary" onClick={() => importRef.current?.click()}>
                    <Upload size={16} /> Fayl tanlash
                  </button>
                </div>
                <div className="settings-data__item settings-data__item--danger">
                  <div>
                    <strong>Standart qiymatlar</strong>
                    <p>Barcha sozlamalar dastlabki holatga qaytadi. Bu amalni bekor qilib bo‘lmaydi.</p>
                  </div>
                  <button type="button" className="btn btn--danger" onClick={() => setConfirm('reset')}>
                    <RotateCcw size={16} /> Tiklash
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {dirty && (
        <div className="settings-bar" role="status">
          <span>Saqlanmagan o‘zgarishlar bor</span>
          <div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={discard}>Bekor qilish</button>
            <button type="button" className="btn btn--primary btn--sm" onClick={persist}><Save size={14} /> Saqlash</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm === 'reset'}
        title="Standart sozlamalarni tiklash"
        message="Barcha sozlamalar dastlabki qiymatlarga qaytadi. Talabalar, to‘lovlar va boshqa ma’lumotlar o‘zgarmaydi."
        confirmLabel="Tiklash"
        tone="danger"
        onCancel={() => setConfirm(null)}
        onConfirm={applyDefaults}
      />
    </div>
  );
};

export default Settings;
