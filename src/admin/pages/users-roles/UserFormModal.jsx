import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import { maskPhoneInput, phoneDigits } from '../../utils/format';
import { EMAIL_PATTERN, USER_STATUS_OPTIONS, summarizePermissions, userName } from './usersData';

const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  roleId: '',
  status: 'invited',
  note: '',
};

const toForm = (user, defaultRoleId) =>
  user ? { ...EMPTY, ...user, phone: maskPhoneInput(user.phone) } : { ...EMPTY, roleId: defaultRoleId };

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

/**
 * Foydalanuvchi qo‘shish / tahrirlash formasi. `user` berilsa — tahrirlash rejimi.
 * Parol so‘ralmaydi: yangi foydalanuvchiga taklif yuboriladi, parolni u o‘zi o‘rnatadi.
 */
const FormBody = ({ user, users, roles, onClose, onSubmit }) => {
  const isEdit = Boolean(user);
  const [form, setForm] = useState(() => toForm(user, roles.find((r) => r.id === 'manager')?.id ?? roles[0]?.id ?? ''));
  const [errors, setErrors] = useState({});

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };
  const bind = (name) => ({ value: form[name], onChange: (e) => set(name, e.target.value) });

  const validate = () => {
    const e = {};
    if (form.firstName.trim().length < 2) e.firstName = 'Ism kamida 2 ta belgidan iborat bo‘lsin';
    if (form.lastName.trim().length < 2) e.lastName = 'Familiya kamida 2 ta belgidan iborat bo‘lsin';
    const email = form.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) e.email = 'Email manzilini to‘g‘ri kiriting';
    else if (users.some((u) => u.id !== user?.id && u.email.toLowerCase() === email)) e.email = 'Bu email bilan foydalanuvchi allaqachon mavjud';
    if (form.phone && phoneDigits(form.phone).length !== 12) e.phone = 'Telefon raqamini to‘liq kiriting yoki bo‘sh qoldiring';
    if (!form.roleId || !roles.some((r) => r.id === form.roleId)) e.roleId = 'Rolni tanlang';
    return e;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      document.querySelector('.student-form .has-error .input')?.focus();
      return;
    }
    onSubmit({
      ...(user ?? {}),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: phoneDigits(form.phone),
      roleId: form.roleId,
      status: form.status,
      note: form.note.trim(),
    });
  };

  const role = roles.find((r) => r.id === form.roleId);
  const summary = role ? summarizePermissions(role) : null;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi'}
      subtitle={isEdit ? `${userName(user)} · ${user.id}` : 'Majburiy maydonlar * bilan belgilangan'}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Bekor qilish</button>
          <button type="submit" form="user-form" className="btn btn--primary">
            {isEdit ? 'Saqlash' : 'Foydalanuvchini qo‘shish'}
          </button>
        </>
      }
    >
      <form id="user-form" className="student-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="student-form__section">
          <legend>Shaxsiy ma'lumotlar</legend>
          <Field label="Ism" required error={errors.firstName}>
            <input className="input" {...bind('firstName')} placeholder="Masalan, Anvar" autoComplete="off" data-autofocus />
          </Field>
          <Field label="Familiya" required error={errors.lastName}>
            <input className="input" {...bind('lastName')} placeholder="Masalan, Karimov" autoComplete="off" />
          </Field>
          <Field label="Email (login)" required error={errors.email} hint="Tizimga kirish uchun ishlatiladi">
            <input type="email" className="input" {...bind('email')} placeholder="ism@educontrol.uz" autoComplete="off" />
          </Field>
          <Field label="Telefon" error={errors.phone}>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => set('phone', maskPhoneInput(e.target.value))}
              inputMode="tel"
              placeholder="+998 90 123 45 67"
              autoComplete="off"
            />
          </Field>
        </fieldset>

        <fieldset className="student-form__section">
          <legend>Kirish huquqi</legend>
          <Field label="Rol" required error={errors.roleId} hint={role?.description}>
            <select className="input" {...bind('roleId')}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field
            label="Holati"
            hint={
              form.status === 'invited'
                ? 'Foydalanuvchi emailga havola oladi va parolni o‘zi o‘rnatadi'
                : form.status === 'blocked'
                  ? 'Bloklangan foydalanuvchi tizimga kira olmaydi'
                  : undefined
            }
          >
            <select className="input" {...bind('status')}>
              {USER_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          {summary && (
            <div className="student-form__wide">
              <p className="role-preview">
                <strong>{role.name}</strong> roli: {summary.modules.length} ta bo‘lim, {summary.count} ta ruxsat.
                Ruxsatlarni “Rollar va ruxsatlar” bo‘limida o‘zgartirish mumkin.
              </p>
            </div>
          )}
          <div className="student-form__wide">
            <Field label="Izoh">
              <textarea className="input" rows={3} {...bind('note')} placeholder="Lavozimi yoki qo‘shimcha ma'lumot…" />
            </Field>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
};

const UserFormModal = ({ open, user, users, roles, onClose, onSubmit }) =>
  open ? <FormBody key={user?.id ?? 'new'} user={user} users={users} roles={roles} onClose={onClose} onSubmit={onSubmit} /> : null;

export default UserFormModal;
