import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import { ROLE_TONES } from './usersData';

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
 * Rol yaratish / tahrirlash. `role` berilsa — tahrirlash (tizim rolining nomi o‘zgarmaydi).
 * Yangi rolni mavjud roldan nusxa olib boshlash mumkin — ruxsatlarni noldan belgilash shart emas.
 */
const FormBody = ({ role, roles, onClose, onSubmit }) => {
  const isEdit = Boolean(role);
  const [form, setForm] = useState({
    name: role?.name ?? '',
    description: role?.description ?? '',
    tone: role?.tone ?? 'primary',
    copyFrom: '',
  });
  const [errors, setErrors] = useState({});

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const e = {};
    if (name.length < 2) e.name = 'Nom kamida 2 ta belgidan iborat bo‘lsin';
    else if (name.length > 30) e.name = 'Nom 30 ta belgidan oshmasin';
    else if (roles.some((r) => r.id !== role?.id && r.name.toLowerCase() === name.toLowerCase())) e.name = 'Bunday nomli rol allaqachon mavjud';
    setErrors(e);
    if (Object.keys(e).length) return;
    onSubmit({ name, description: form.description.trim(), tone: form.tone, copyFrom: form.copyFrom });
  };

  return (
    <Modal
      open
      size="md"
      onClose={onClose}
      title={isEdit ? 'Rolni tahrirlash' : 'Yangi rol'}
      subtitle={isEdit ? role.name : 'Ruxsatlarni keyingi qadamda belgilaysiz'}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Bekor qilish</button>
          <button type="submit" form="role-form" className="btn btn--primary">{isEdit ? 'Saqlash' : 'Rolni yaratish'}</button>
        </>
      }
    >
      <form id="role-form" className="role-form" onSubmit={handleSubmit} noValidate>
        <Field label="Rol nomi" required error={errors.name} hint={role?.system ? 'Tizim rolining nomini o‘zgartirib bo‘lmaydi' : undefined}>
          <input
            className="input"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Masalan, Marketolog"
            autoComplete="off"
            disabled={role?.system}
            data-autofocus
          />
        </Field>
        <Field label="Tavsif">
          <textarea className="input" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Bu rol nima uchun kerak?" />
        </Field>
        <div className="field">
          <span className="field__label">Belgi rangi</span>
          <div className="tone-picker" role="radiogroup" aria-label="Belgi rangi">
            {ROLE_TONES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={form.tone === t.value}
                className={form.tone === t.value ? 'tone-picker__item is-active' : 'tone-picker__item'}
                onClick={() => set('tone', t.value)}
              >
                <span className={`badge badge--${t.value}`}>{form.name.trim() || 'Rol'}</span>
              </button>
            ))}
          </div>
        </div>
        {!isEdit && (
          <Field label="Ruxsatlarni nusxalash" hint="Tanlangan rolning ruxsatlari yangi rolga ko‘chiriladi">
            <select className="input" value={form.copyFrom} onChange={(e) => set('copyFrom', e.target.value)}>
              <option value="">Bo‘sh rol (ruxsatsiz)</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        )}
      </form>
    </Modal>
  );
};

const RoleFormModal = ({ open, role, roles, onClose, onSubmit }) =>
  open ? <FormBody key={role?.id ?? 'new'} role={role} roles={roles} onClose={onClose} onSubmit={onSubmit} /> : null;

export default RoleFormModal;
