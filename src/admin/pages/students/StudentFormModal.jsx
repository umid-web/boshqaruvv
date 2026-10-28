import { useMemo, useState } from 'react';
import { CalendarClock, Info } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { formatDate, formatSom, maskPhoneInput, phoneDigits } from '../../utils/format';
import { loadTeachers, findTeacherByGroup } from '../teachers/teachersStore';
import { getCourseFee } from '../courses/coursesStore';
import { COURSES, GENDERS, STATUS_OPTIONS, formatSchedule, getCourse, getGroup } from './studentsData';
import { calcInitialDebt } from './billing';

const todayIso = () => new Date().toISOString().slice(0, 10);

const EMPTY = {
  firstName: '',
  lastName: '',
  gender: 'male',
  birthDate: '',
  phone: '',
  parentPhone: '',
  address: '',
  course: COURSES[0].name,
  group: COURSES[0].groups[0],
  status: 'active',
  monthlyFee: String(COURSES[0].fee),
  debt: '0',
  enrolledAt: '',
  note: '',
};

const toForm = (student) =>
  student
    ? {
        ...EMPTY,
        ...student,
        phone: maskPhoneInput(student.phone),
        parentPhone: maskPhoneInput(student.parentPhone),
        monthlyFee: String(student.monthlyFee),
        debt: String(student.debt ?? 0),
      }
    : { ...EMPTY, monthlyFee: String(getCourseFee(EMPTY.course)), enrolledAt: todayIso() };

const validate = (f, isEdit) => {
  const e = {};
  if (f.firstName.trim().length < 2) e.firstName = 'Ism kamida 2 ta belgidan iborat bo‘lsin';
  if (f.lastName.trim().length < 2) e.lastName = 'Familiya kamida 2 ta belgidan iborat bo‘lsin';
  if (phoneDigits(f.phone).length !== 12) e.phone = 'Telefon raqamini to‘liq kiriting';
  if (f.parentPhone && phoneDigits(f.parentPhone).length !== 12) {
    e.parentPhone = 'Telefon raqamini to‘liq kiriting yoki bo‘sh qoldiring';
  }
  if (f.birthDate && f.birthDate > todayIso()) e.birthDate = 'Tug‘ilgan sana kelajakda bo‘lishi mumkin emas';
  if (!f.enrolledAt) e.enrolledAt = 'Qo‘shilgan sanani kiriting';
  if (!f.group) e.group = 'Guruhni tanlang';
  const fee = Number(f.monthlyFee);
  if (!Number.isFinite(fee) || fee <= 0) e.monthlyFee = 'Oylik to‘lov 0 dan katta bo‘lsin';
  if (isEdit) {
    const debt = Number(f.debt);
    if (!Number.isFinite(debt) || debt < 0) e.debt = 'Qarz manfiy bo‘lishi mumkin emas';
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

const BillingRow = ({ label, children, strong }) => (
  <div className={strong ? 'billing__row billing__row--total' : 'billing__row'}>
    <span>{label}</span>
    <strong>{children}</strong>
  </div>
);

/** Yangi talaba uchun to‘lov hisobi: qo‘shilgan kundan boshlab faqat qatnashadigan darslar uchun. */
const BillingPreview = ({ billing, fee, enrolledAt }) => (
  <div className="billing student-form__wide" aria-live="polite">
    <div className="billing__head">
      <CalendarClock size={16} /> To‘lov hisobi
    </div>
    {billing.total > 0 ? (
      <>
        <BillingRow label="Guruhning shu oydagi darslari">{billing.total} ta</BillingRow>
        <BillingRow label={`Talaba qatnashadi (${formatDate(enrolledAt)} dan boshlab)`}>{billing.attend} ta</BillingRow>
        <BillingRow label="Bitta dars narxi">{formatSom(Math.round(billing.perLesson))}</BillingRow>
        <BillingRow label={billing.prorated ? `Birinchi oy: ${billing.attend} ta dars` : 'Birinchi oy (to‘liq)'}>
          {formatSom(billing.charge)}
        </BillingRow>
      </>
    ) : (
      <BillingRow label="Birinchi oy">{formatSom(billing.charge)}</BillingRow>
    )}
    {billing.extraMonths > 0 && (
      <BillingRow label={`Keyingi ${billing.extraMonths} oy × ${formatSom(fee)}`}>
        {formatSom(billing.extraMonths * fee)}
      </BillingRow>
    )}
    <BillingRow label="To‘lanishi kerak" strong>{formatSom(billing.debt)}</BillingRow>
    <p className="billing__note">
      <Info size={14} />
      {billing.debt > 0
        ? ` Talaba to‘lov qilmagan holda qo‘shiladi — yuqoridagi summa uning qarzi sifatida yoziladi.${
            billing.prorated ? ` Keyingi oylardan boshlab oylik to‘lov to‘liq (${formatSom(fee)}) bo‘ladi.` : ''
          }`
        : ` Bu oyda guruhning darsi qolmagan, shuning uchun hozircha to‘lov yo‘q. To‘lov keyingi oydan (${formatSom(fee)}) boshlanadi.`}
    </p>
  </div>
);

/**
 * Talaba qo‘shish / tahrirlash formasi. `student` berilsa — tahrirlash rejimi.
 * Modal har ochilganda qayta yaratiladi (`key`), shuning uchun forma holati o‘zi tozalanadi.
 */
const FormBody = ({ student, onClose, onSubmit }) => {
  const isEdit = Boolean(student);
  const [form, setForm] = useState(() => toForm(student));
  const [errors, setErrors] = useState({});
  const teachers = useMemo(loadTeachers, []);

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };
  const bind = (name) => ({
    value: form[name],
    onChange: (e) => set(name, e.target.value),
  });
  const bindPhone = (name) => ({
    value: form[name],
    onChange: (e) => set(name, maskPhoneInput(e.target.value)),
    inputMode: 'tel',
    placeholder: '+998 90 123 45 67',
    autoComplete: 'off',
  });

  // Kurs o‘zgarsa: guruh mos ro‘yxatdan tanlanadi, oylik to‘lov kurs narxiga moslanadi
  const handleCourse = (name) => {
    const course = getCourse(name);
    setForm((f) => ({
      ...f,
      course: name,
      group: course.groups.includes(f.group) ? f.group : course.groups[0],
      monthlyFee: String(getCourseFee(name)),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validate(form, isEdit);
    setErrors(found);
    if (Object.keys(found).length) {
      document.querySelector('.student-form .has-error .input')?.focus();
      return;
    }
    onSubmit({
      ...(student ?? {}),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      gender: form.gender,
      birthDate: form.birthDate,
      phone: phoneDigits(form.phone),
      parentPhone: phoneDigits(form.parentPhone),
      address: form.address.trim(),
      course: form.course,
      group: form.group,
      status: form.status,
      monthlyFee: Number(form.monthlyFee),
      enrolledAt: form.enrolledAt,
      attendance: student?.attendance ?? 100,
      note: form.note.trim(),
      ...(isEdit
        ? { debt: Number(form.debt) }
        : {
            // Yangi talaba to‘lamagan holda qo‘shiladi: qarz = qatnashadigan darslar uchun hisoblangan summa
            debt: billing.debt,
            firstCharge: billing.charge,
            firstLessons: billing.attend,
            firstTotal: billing.total,
          }),
    });
  };

  const groups = getCourse(form.course)?.groups ?? [];
  const groupTeacher = findTeacherByGroup(teachers, form.group);
  const billing = useMemo(
    () =>
      isEdit || !form.enrolledAt
        ? null
        : calcInitialDebt({ days: getGroup(form.group)?.days, fee: Number(form.monthlyFee) || 0, enrolledAt: form.enrolledAt }),
    [isEdit, form.group, form.monthlyFee, form.enrolledAt],
  );
  const groupHint = form.group
    ? `${groupTeacher ? `Ustoz: ${groupTeacher.lastName} ${groupTeacher.firstName} · ` : 'Ustoz biriktirilmagan · '}${formatSchedule(form.group)}`
    : undefined;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Talabani tahrirlash' : 'Yangi talaba qo‘shish'}
      subtitle={isEdit ? `${student.lastName} ${student.firstName} · ${student.id}` : 'Majburiy maydonlar * bilan belgilangan'}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Bekor qilish</button>
          <button type="submit" form="student-form" className="btn btn--primary">
            {isEdit ? 'Saqlash' : 'Talabani qo‘shish'}
          </button>
        </>
      }
    >
      <form id="student-form" className="student-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="student-form__section">
          <legend>Shaxsiy ma'lumotlar</legend>
          <Field label="Ism" required error={errors.firstName}>
            <input className="input" {...bind('firstName')} placeholder="Masalan, Anvar" autoComplete="off" />
          </Field>
          <Field label="Familiya" required error={errors.lastName}>
            <input className="input" {...bind('lastName')} placeholder="Masalan, Aliyev" autoComplete="off" />
          </Field>
          <Field label="Jinsi">
            <select className="input" {...bind('gender')}>
              {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </Field>
          <Field label="Tug‘ilgan sana" error={errors.birthDate}>
            <input type="date" className="input" max={todayIso()} {...bind('birthDate')} />
          </Field>
          <Field label="Telefon" required error={errors.phone}>
            <input className="input" {...bindPhone('phone')} />
          </Field>
          <Field label="Ota-ona telefoni" error={errors.parentPhone}>
            <input className="input" {...bindPhone('parentPhone')} />
          </Field>
          <div className="student-form__wide">
            <Field label="Manzil">
              <input className="input" {...bind('address')} placeholder="Shahar, ko‘cha, uy" autoComplete="off" />
            </Field>
          </div>
        </fieldset>

        <fieldset className="student-form__section">
          <legend>O‘quv va to‘lov ma'lumotlari</legend>
          <Field label="Kurs" required>
            <select className="input" value={form.course} onChange={(e) => handleCourse(e.target.value)}>
              {COURSES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Guruh" required error={errors.group} hint={groupHint}>
            <select className="input" {...bind('group')}>
              {groups.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Holati">
            <select className="input" {...bind('status')}>
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Qo‘shilgan sana" required error={errors.enrolledAt}>
            <input type="date" className="input" {...bind('enrolledAt')} />
          </Field>
          <Field label="Oylik to‘lov (so‘m)" required error={errors.monthlyFee}>
            <input type="number" min="0" step="10000" className="input" {...bind('monthlyFee')} />
          </Field>
          {isEdit && (
            <Field label="Joriy qarz (so‘m)" error={errors.debt} hint="Qarz bo‘lmasa 0 qoldiring">
              <input type="number" min="0" step="10000" className="input" {...bind('debt')} />
            </Field>
          )}
          {billing && <BillingPreview billing={billing} fee={Number(form.monthlyFee) || 0} enrolledAt={form.enrolledAt} />}
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

const StudentFormModal = ({ open, student, onClose, onSubmit }) =>
  open ? <FormBody key={student?.id ?? 'new'} student={student} onClose={onClose} onSubmit={onSubmit} /> : null;

export default StudentFormModal;
