import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import { COURSE_COLORS, COURSE_STATUS_OPTIONS, LEVELS } from './coursesData';

const EMPTY = {
  name: '',
  description: '',
  level: LEVELS[0],
  durationMonths: '6',
  lessonMinutes: '90',
  fee: '',
  status: 'active',
  color: 'primary',
  topics: '',
};

const toForm = (course) =>
  course
    ? {
        ...EMPTY,
        ...course,
        durationMonths: String(course.durationMonths),
        lessonMinutes: String(course.lessonMinutes),
        fee: String(course.fee),
        topics: (course.topics ?? []).join('\n'),
      }
    : { ...EMPTY };

const validate = (f, courses, selfId) => {
  const e = {};
  const name = f.name.trim();
  if (name.length < 2) e.name = 'Kurs nomi kamida 2 ta belgidan iborat bo‘lsin';
  else if (courses.some((c) => c.id !== selfId && c.name.toLowerCase() === name.toLowerCase())) {
    e.name = 'Bunday nomli kurs allaqachon mavjud';
  }
  const fee = Number(f.fee);
  if (!Number.isFinite(fee) || fee <= 0) e.fee = 'Oylik to‘lov 0 dan katta bo‘lsin';
  const months = Number(f.durationMonths);
  if (!Number.isInteger(months) || months < 1 || months > 36) e.durationMonths = '1 dan 36 oygacha butun son kiriting';
  const minutes = Number(f.lessonMinutes);
  if (!Number.isInteger(minutes) || minutes < 30 || minutes > 240) e.lessonMinutes = '30 dan 240 daqiqagacha kiriting';
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
 * Kurs qo‘shish / tahrirlash formasi. `course` berilsa — tahrirlash rejimi.
 * `locked` — kursda guruh yoki talaba bor: nomi o‘zgartirilmaydi (ular kurs nomi bo‘yicha bog‘langan).
 */
const FormBody = ({ course, courses, locked, onClose, onSubmit }) => {
  const isEdit = Boolean(course);
  const [form, setForm] = useState(() => toForm(course));
  const [errors, setErrors] = useState({});

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };
  const bind = (name) => ({ value: form[name], onChange: (e) => set(name, e.target.value) });

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate(form, courses, course?.id);
    setErrors(found);
    if (Object.keys(found).length) {
      document.querySelector('.student-form .has-error .input')?.focus();
      return;
    }
    onSubmit({
      ...(course ?? { createdAt: new Date().toISOString().slice(0, 10) }),
      name: form.name.trim(),
      description: form.description.trim(),
      level: form.level,
      durationMonths: Number(form.durationMonths),
      lessonMinutes: Number(form.lessonMinutes),
      fee: Number(form.fee),
      status: form.status,
      color: form.color,
      topics: form.topics.split('\n').map((t) => t.trim()).filter(Boolean),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Kursni tahrirlash' : 'Yangi kurs qo‘shish'}
      subtitle={isEdit ? `${course.name} · ${course.id}` : 'Majburiy maydonlar * bilan belgilangan'}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Bekor qilish</button>
          <button type="submit" form="course-form" className="btn btn--primary">
            {isEdit ? 'Saqlash' : 'Kursni qo‘shish'}
          </button>
        </>
      }
    >
      <form id="course-form" className="student-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="student-form__section">
          <legend>Asosiy ma'lumotlar</legend>
          <Field
            label="Kurs nomi"
            required
            error={errors.name}
            hint={locked ? 'Kursda guruh yoki talaba bor — nomini o‘zgartirib bo‘lmaydi' : undefined}
          >
            <input className="input" {...bind('name')} disabled={locked} placeholder="Masalan, Biologiya" autoComplete="off" />
          </Field>
          <Field label="Daraja">
            <select className="input" {...bind('level')}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Holati">
            <select className="input" {...bind('status')}>
              {COURSE_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <div className="field">
            <span className="field__label">Rang belgisi</span>
            <div className="color-picker" role="radiogroup" aria-label="Rang belgisi">
              {COURSE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={form.color === c.value}
                  aria-label={c.label}
                  title={c.label}
                  className={`color-dot color-dot--${c.value}${form.color === c.value ? ' is-active' : ''}`}
                  onClick={() => set('color', c.value)}
                />
              ))}
            </div>
          </div>
          <div className="student-form__wide">
            <Field label="Tavsif">
              <textarea className="input" rows={3} {...bind('description')} placeholder="Kurs haqida qisqacha ma'lumot…" />
            </Field>
          </div>
        </fieldset>

        <fieldset className="student-form__section">
          <legend>Narx va davomiylik</legend>
          <Field
            label="Oylik to‘lov (so‘m)"
            required
            error={errors.fee}
            hint="Yangi talaba qo‘shilganda shu narx qo‘llanadi; mavjud talabalar to‘lovi o‘zgarmaydi"
          >
            <input type="number" min="0" step="10000" className="input" {...bind('fee')} placeholder="450000" />
          </Field>
          <Field label="Kurs davomiyligi (oy)" error={errors.durationMonths}>
            <input type="number" min="1" max="36" className="input" {...bind('durationMonths')} />
          </Field>
          <Field label="Bir dars davomiyligi (daqiqa)" error={errors.lessonMinutes}>
            <input type="number" min="30" max="240" step="5" className="input" {...bind('lessonMinutes')} />
          </Field>
        </fieldset>

        <fieldset className="student-form__section">
          <legend>Kurs dasturi</legend>
          <div className="student-form__wide">
            <Field label="Mavzular" hint="Har bir mavzuni yangi qatordan yozing">
              <textarea className="input" rows={6} {...bind('topics')} placeholder={'Sonlar va amallar\nTenglamalar\nFunksiyalar'} />
            </Field>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
};

const CourseFormModal = ({ open, course, courses, locked, onClose, onSubmit }) =>
  open ? (
    <FormBody key={course?.id ?? 'new'} course={course} courses={courses} locked={locked} onClose={onClose} onSubmit={onSubmit} />
  ) : null;

export default CourseFormModal;
