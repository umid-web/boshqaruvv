import { useMemo, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { maskPhoneInput, phoneDigits } from '../../utils/format';
import { GENDERS, formatSchedule } from '../students/studentsData';
import { loadTeachers, findTeacherByGroup } from '../teachers/teachersStore';
import {
  GROUP_LIST,
  PAY_TYPES,
  PAY_STATUS_OPTIONS,
  SUBJECTS,
  SUPPORT_ROLES,
  SUPPORT_ROLE_OPTIONS,
  SUPPORT_STATUS_OPTIONS,
  WEEK_DAYS,
  findAvailabilityConflict,
  findScheduleConflict,
  teacherName,
} from './supportData';

const todayIso = () => new Date().toISOString().slice(0, 10);

const EMPTY = {
  firstName: '',
  lastName: '',
  gender: 'male',
  birthDate: '',
  phone: '',
  address: '',
  role: 'assistant',
  subjects: [],
  groups: [],
  availableDays: [],
  status: 'active',
  startedAt: '',
  payType: 'perLesson',
  payValue: '40000',
  payStatus: 'unpaid',
  note: '',
};

const toForm = (person) =>
  person
    ? {
        ...EMPTY,
        ...person,
        phone: maskPhoneInput(person.phone),
        payValue: String(person.payValue ?? 0),
        payStatus: person.payStatus ?? 'unpaid'
      }
    : { ...EMPTY, startedAt: todayIso() };

const validate = (f) => {
  const e = {};
  if (f.firstName.trim().length < 2) e.firstName = 'Ism kamida 2 ta belgidan iborat bo‘lsin';
  if (f.lastName.trim().length < 2) e.lastName = 'Familiya kamida 2 ta belgidan iborat bo‘lsin';
  if (phoneDigits(f.phone).length !== 12) e.phone = 'Telefon raqamini to‘liq kiriting';
  if (f.birthDate && f.birthDate > todayIso()) e.birthDate = 'Tug‘ilgan sana kelajakda bo‘lishi mumkin emas';
  if (!f.startedAt) e.startedAt = 'Ishga kirgan sanani kiriting';
  if (f.subjects.length === 0) e.subjects = 'Kamida bitta fan tanlang';
  const pay = Number(f.payValue);
  if (!Number.isFinite(pay) || pay < 0) e.payValue = 'Qiymat manfiy bo‘lishi mumkin emas';
  const conflict = findScheduleConflict(f.groups);
  if (conflict) {
    e.groups = `${conflict[0]} va ${conflict[1]} guruhlarining dars vaqti bir-biriga to‘g‘ri keladi`;
  } else {
    const off = findAvailabilityConflict(f.groups, f.availableDays);
    if (off) e.groups = `${off} guruhining dars kunlari ustozning ish kunlariga to‘g‘ri kelmaydi`;
  }
  return e;
};

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
 * Qo‘shimcha ustoz qo‘shish / tahrirlash formasi. `person` berilsa — tahrirlash rejimi.
 * Asosiy ustozdan farqi: bitta guruhga bir nechta qo‘shimcha ustoz biriktirilishi mumkin.
 */
const FormBody = ({ person, onClose, onSubmit }) => {
  const isEdit = Boolean(person);
  const [form, setForm] = useState(() => toForm(person));
  const [errors, setErrors] = useState({});
  const teachers = useMemo(loadTeachers, []);

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };
  const bind = (name) => ({ value: form[name], onChange: (e) => set(name, e.target.value) });

  const toggleSubject = (name) => {
    setForm((f) => {
      const has = f.subjects.includes(name);
      const subjects = has ? f.subjects.filter((x) => x !== name) : [...f.subjects, name];
      const groups = has ? f.groups.filter((code) => GROUP_LIST.find((g) => g.code === code)?.course !== name) : f.groups;
      return { ...f, subjects, groups };
    });
    setErrors((e) => ({ ...e, subjects: undefined, groups: undefined }));
  };

  const toggleGroup = (code) => {
    setForm((f) => ({
      ...f,
      groups: f.groups.includes(code) ? f.groups.filter((c) => c !== code) : [...f.groups, code],
    }));
    setErrors((e) => ({ ...e, groups: undefined }));
  };

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      availableDays: f.availableDays.includes(day) ? f.availableDays.filter((d) => d !== day) : [...f.availableDays, day],
    }));
    setErrors((e) => ({ ...e, groups: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) {
      document.querySelector('.student-form .has-error .input, .student-form .has-error button')?.focus();
      return;
    }
    onSubmit({
      ...(person ?? {}),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      gender: form.gender,
      birthDate: form.birthDate,
      phone: phoneDigits(form.phone),
      address: form.address.trim(),
      role: form.role,
      subjects: form.subjects,
      groups: form.status === 'left' ? [] : form.groups,
      availableDays: [...form.availableDays].sort((a, b) => a - b),
      status: form.status,
      startedAt: form.startedAt,
      payType: form.payType,
      payValue: Number(form.payValue),
      payStatus: form.payStatus,
      note: form.note.trim(),
    });
  };

  const availableGroups = GROUP_LIST.filter((g) => form.subjects.includes(g.course));

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Qo‘shimcha ustozni tahrirlash' : 'Yangi qo‘shimcha ustoz'}
      subtitle={isEdit ? `${teacherName(person)} · ${person.id}` : 'Majburiy maydonlar * bilan belgilangan'}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Bekor qilish</button>
          <button type="submit" form="support-teacher-form" className="btn btn--primary">
            {isEdit ? 'Saqlash' : 'Ustozni qo‘shish'}
          </button>
        </>
      }
    >
      <form id="support-teacher-form" className="student-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="student-form__section">
          <legend>Shaxsiy ma'lumotlar</legend>
          <Field label="Ism" required error={errors.firstName}>
            <input className="input" {...bind('firstName')} placeholder="Masalan, Gulnora" autoComplete="off" />
          </Field>
          <Field label="Familiya" required error={errors.lastName}>
            <input className="input" {...bind('lastName')} placeholder="Masalan, Tursunova" autoComplete="off" />
          </Field>
          <Field label="Jinsi">
            <select className="input" {...bind('gender')}>
              {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.value === 'male' ? 'Erkak' : 'Ayol'}</option>)}
            </select>
          </Field>
          <Field label="Tug‘ilgan sana" error={errors.birthDate}>
            <input type="date" className="input" max={todayIso()} {...bind('birthDate')} />
          </Field>
          <Field label="Telefon" required error={errors.phone}>
            <input
              className="input"
              value={form.phone}
              onChange={(e) => set('phone', maskPhoneInput(e.target.value))}
              inputMode="tel"
              placeholder="+998 90 123 45 67"
              autoComplete="off"
            />
          </Field>
          <Field label="Manzil">
            <input className="input" {...bind('address')} placeholder="Shahar, ko‘cha, uy" autoComplete="off" />
          </Field>
        </fieldset>

        <fieldset className="student-form__section">
          <legend>Lavozimi</legend>
          <Field label="Roli" hint={SUPPORT_ROLES[form.role]?.hint}>
            <select className="input" {...bind('role')}>
              {SUPPORT_ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="Holati">
            <select className="input" {...bind('status')}>
              {SUPPORT_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Ishga kirgan sana" required error={errors.startedAt}>
            <input type="date" className="input" {...bind('startedAt')} />
          </Field>

          <div className="student-form__wide">
            <div className={errors.subjects ? 'field has-error' : 'field'}>
              <span className="field__label">Yordam beradigan fanlari<abbr title="Majburiy">*</abbr></span>
              <div className="chips" role="group" aria-label="Fanlar">
                {SUBJECTS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={form.subjects.includes(name) ? 'chip is-active' : 'chip'}
                    aria-pressed={form.subjects.includes(name)}
                    onClick={() => toggleSubject(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {errors.subjects && <span className="field__error" role="alert">{errors.subjects}</span>}
            </div>
          </div>

          <div className="student-form__wide">
            <div className="field">
              <span className="field__label">Ish kunlari</span>
              <div className="chips" role="group" aria-label="Ish kunlari">
                {WEEK_DAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={form.availableDays.includes(d.value) ? 'chip is-active' : 'chip'}
                    aria-pressed={form.availableDays.includes(d.value)}
                    onClick={() => toggleDay(d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <span className="field__hint">Hech narsa tanlanmasa — ustoz haftaning istalgan kunida ishlay oladi.</span>
            </div>
          </div>
        </fieldset>

        <fieldset className="student-form__section">
          <legend>Guruhlar</legend>
          <div className="student-form__wide">
            <div className={errors.groups ? 'field has-error' : 'field'}>
              {form.status === 'left' ? (
                <span className="field__hint">Ketgan ustozga guruh biriktirilmaydi.</span>
              ) : availableGroups.length === 0 ? (
                <span className="field__hint">Guruh biriktirish uchun avval fan(lar)ni tanlang. O‘rinbosar ustozga guruh shart emas.</span>
              ) : (
                <div className="group-options">
                  {availableGroups.map((g) => {
                    const checked = form.groups.includes(g.code);
                    const main = findTeacherByGroup(teachers, g.code);
                    return (
                      <label key={g.code} className={`group-option${checked ? ' is-checked' : ''}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleGroup(g.code)} />
                        <span className="group-option__text">
                          <strong>{g.code} <span>· {g.course}</span></strong>
                          <span>{formatSchedule(g.code)}</span>
                          <span>{main ? `Asosiy ustoz: ${teacherName(main)}` : 'Asosiy ustoz yo‘q'}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {errors.groups && <span className="field__error" role="alert">{errors.groups}</span>}
            </div>
          </div>
        </fieldset>

        <fieldset className="student-form__section">
          <legend>To‘lov</legend>
          <Field label="Hisoblash usuli">
            <select className="input" {...bind('payType')}>
              {PAY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field
            label={form.payType === 'perLesson' ? 'Bir dars uchun (so‘m)' : 'Oylik (so‘m)'}
            error={errors.payValue}
            hint={form.payType === 'perLesson' ? 'Oylik = bir dars narxi × oydagi darslar soni (haftasiga × 4)' : undefined}
          >
            <input type="number" min="0" step="5000" className="input" {...bind('payValue')} />
          </Field>

          <Field label="To‘lov holati">
            <select className="input" {...bind('payStatus')}>
              {PAY_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>

          <div className="student-form__wide">
            <Field label="Izoh">
              <textarea className="input" rows={3} {...bind('note')} placeholder="Qo‘shimcha ma'lumot…" />
            </Field>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
};

const SupportTeacherFormModal = ({ open, person, onClose, onSubmit }) =>
  open ? <FormBody key={person?.id ?? 'new'} person={person} onClose={onClose} onSubmit={onSubmit} /> : null;

export default SupportTeacherFormModal;