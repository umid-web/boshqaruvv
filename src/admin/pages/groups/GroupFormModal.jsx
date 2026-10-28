import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/useToast';
import TeacherPicker from './TeacherPicker';
import {
  DEFAULT_CAPACITY,
  GROUP_STATUS_OPTIONS,
  WEEK_DAYS,
  eligiblePeople,
  findRoomConflict,
  isValidRange,
  mainTeacherProblem,
  supportProblem,
  suggestCode,
  teacherName,
} from './groupsData';

const todayIso = () => new Date().toISOString().slice(0, 10);

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

const buildInitial = ({ group, team, courseNames, groups }) => {
  if (group) {
    return {
      ...group,
      capacity: String(group.capacity),
      mainId: team?.main?.id ?? '',
      supportIds: (team?.support ?? []).map((p) => p.id),
    };
  }
  const course = courseNames[0] ?? '';
  return {
    code: suggestCode(course, groups),
    course,
    days: [1, 3, 5],
    start: '09:00',
    end: '10:30',
    room: '',
    capacity: String(DEFAULT_CAPACITY),
    startDate: todayIso(),
    status: 'active',
    note: '',
    mainId: '',
    supportIds: [],
  };
};

/**
 * Guruh qo‘shish / tahrirlash. `group` berilsa — tahrirlash rejimi (kod o‘zgarmaydi).
 * Ustozlar shu yerning o‘zida biriktiriladi: asosiy ustoz va istalgancha qo‘shimcha ustoz.
 */
const FormBody = ({ group, team, groups, courseNames, teachers, supportTeachers, studentCount, onClose, onSubmit }) => {
  const toast = useToast();
  const isEdit = Boolean(group);
  const [form, setForm] = useState(() => buildInitial({ group, team, courseNames, groups }));
  const [codeTouched, setCodeTouched] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };
  const bind = (name) => ({ value: form[name], onChange: (e) => set(name, e.target.value) });

  // Kurs o‘zgarsa: kod taklifi yangilanadi, fanga mos kelmaydigan ustozlar olib tashlanadi
  const changeCourse = (course) => {
    setForm((f) => {
      const okMain = eligiblePeople(teachers, course).some((t) => t.id === f.mainId);
      const okSupport = new Set(eligiblePeople(supportTeachers, course).map((p) => p.id));
      return {
        ...f,
        course,
        code: isEdit || codeTouched ? f.code : suggestCode(course, groups),
        mainId: okMain ? f.mainId : '',
        supportIds: f.supportIds.filter((id) => okSupport.has(id)),
      };
    });
    setErrors((e) => ({ ...e, course: undefined, team: undefined }));
  };

  const toggleDay = (value) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(value) ? f.days.filter((d) => d !== value) : [...f.days, value].sort((a, b) => a - b),
    }));
    setErrors((e) => ({ ...e, days: undefined, team: undefined, room: undefined }));
  };

  const draft = { code: form.code.trim().toUpperCase(), course: form.course, days: form.days, start: form.start, end: form.end, room: form.room };
  const archived = form.status === 'archived';

  const validate = () => {
    const e = {};
    if (!isEdit) {
      if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(draft.code) || draft.code.length < 2 || draft.code.length > 12) {
        e.code = 'Kod lotin harf/raqamlardan iborat bo‘lsin (masalan, MAT-C)';
      } else if (groups.some((g) => g.code === draft.code)) {
        e.code = 'Bunday kodli guruh allaqachon mavjud';
      }
    }
    if (!form.course) e.course = 'Kursni tanlang';
    if (form.days.length === 0) e.days = 'Kamida bitta dars kunini tanlang';
    if (!isValidRange(form.start, form.end)) e.time = 'Tugash vaqti boshlanish vaqtidan keyin bo‘lsin';
    if (!form.room.trim()) e.room = 'Xonani kiriting';
    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) e.capacity = 'Sig‘im 1 dan 100 gacha butun son bo‘lsin';
    if (!form.startDate) e.startDate = 'Boshlanish sanasini kiriting';

    const activeNow = studentCount.active;
    if (!e.capacity && isEdit && capacity < activeNow) e.capacity = `Guruhda hozir ${activeNow} ta faol talaba bor`;
    if (archived && studentCount.total > 0) e.status = `Guruhda ${studentCount.total} ta talaba bor — avval ularni boshqa guruhga o‘tkazing`;

    if (!e.days && !e.time && !e.room) {
      const roomClash = findRoomConflict(groups, draft);
      if (roomClash) e.room = `${roomClash.room} shu vaqtda ${roomClash.code} guruhi uchun band`;
    }

    if (!archived && !e.days && !e.time) {
      const main = teachers.find((t) => t.id === form.mainId);
      const mainIssue = main && mainTeacherProblem(main, draft);
      if (mainIssue) e.team = `${teacherName(main)}: ${mainIssue}`;
      else {
        const bad = supportTeachers.filter((p) => form.supportIds.includes(p.id)).find((p) => supportProblem(p, draft));
        if (bad) e.team = `${teacherName(bad)}: ${supportProblem(bad, draft)}`;
      }
    }
    return e;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      if (found.team) toast.error(found.team);
      document.querySelector('.student-form .has-error .input, .student-form .has-error button')?.focus();
      return;
    }
    onSubmit({
      group: {
        code: draft.code,
        course: form.course,
        days: form.days,
        start: form.start,
        end: form.end,
        room: form.room.trim(),
        capacity: Number(form.capacity),
        startDate: form.startDate,
        status: form.status,
        note: form.note.trim(),
      },
      mainId: archived ? '' : form.mainId,
      supportIds: archived ? [] : form.supportIds,
    });
  };

  const rooms = [...new Set(groups.map((g) => g.room))];
  const courseLocked = isEdit && studentCount.total > 0;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Guruhni tahrirlash' : 'Yangi guruh qo‘shish'}
      subtitle={isEdit ? `${group.code} · ${group.course}` : 'Majburiy maydonlar * bilan belgilangan'}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Bekor qilish</button>
          <button type="submit" form="group-form" className="btn btn--primary">{isEdit ? 'Saqlash' : 'Guruhni qo‘shish'}</button>
        </>
      }
    >
      <form id="group-form" className="student-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="student-form__section">
          <legend>Asosiy ma'lumotlar</legend>
          <Field label="Kurs" required error={errors.course} hint={courseLocked ? 'Talabalari bor guruhning kursini o‘zgartirib bo‘lmaydi' : undefined}>
            <select className="input" value={form.course} disabled={courseLocked} onChange={(e) => changeCourse(e.target.value)}>
              {courseNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Guruh kodi" required error={errors.code} hint={isEdit ? 'Kod o‘zgartirilmaydi — talabalar shu kod bo‘yicha bog‘langan' : undefined}>
            <input
              className="input"
              value={form.code}
              disabled={isEdit}
              onChange={(e) => {
                setCodeTouched(true);
                set('code', e.target.value.toUpperCase());
              }}
              placeholder="MAT-C"
              autoComplete="off"
            />
          </Field>
          <Field label="Boshlanish sanasi" required error={errors.startDate}>
            <input type="date" className="input" {...bind('startDate')} />
          </Field>
          <Field label="Holati" error={errors.status} hint={archived ? 'Arxivdagi guruhdan ustozlar bo‘shatiladi' : undefined}>
            <select className="input" {...bind('status')}>
              {GROUP_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        </fieldset>

        <fieldset className="student-form__section">
          <legend>Dars jadvali</legend>
          <div className="student-form__wide">
            <div className={errors.days ? 'field has-error' : 'field'}>
              <span className="field__label">Dars kunlari<abbr title="Majburiy">*</abbr></span>
              <div className="chips" role="group" aria-label="Dars kunlari">
                {WEEK_DAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={form.days.includes(d.value) ? 'chip is-active' : 'chip'}
                    aria-pressed={form.days.includes(d.value)}
                    onClick={() => toggleDay(d.value)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {errors.days && <span className="field__error" role="alert">{errors.days}</span>}
            </div>
          </div>
          <Field label="Boshlanish vaqti" required error={errors.time}>
            <input type="time" className="input" {...bind('start')} />
          </Field>
          <Field label="Tugash vaqti" required>
            <input type="time" className="input" {...bind('end')} />
          </Field>
          <Field label="Xona" required error={errors.room}>
            <input className="input" list="group-rooms" {...bind('room')} placeholder="1-xona" autoComplete="off" />
            <datalist id="group-rooms">{rooms.map((r) => <option key={r} value={r} />)}</datalist>
          </Field>
          <Field label="Sig‘im (talaba)" required error={errors.capacity}>
            <input type="number" min="1" max="100" className="input" {...bind('capacity')} />
          </Field>
        </fieldset>

        <fieldset className="student-form__section">
          <legend>Ustozlar</legend>
          {archived ? (
            <div className="student-form__wide"><span className="field__hint">Arxivdagi guruhga ustoz biriktirilmaydi.</span></div>
          ) : (
            <TeacherPicker
              draft={draft}
              teachers={teachers}
              supportTeachers={supportTeachers}
              mainId={form.mainId}
              supportIds={form.supportIds}
              onMain={(id) => {
                set('mainId', id);
                setErrors((e) => ({ ...e, team: undefined }));
              }}
              onSupport={(ids) => {
                set('supportIds', ids);
                setErrors((e) => ({ ...e, team: undefined }));
              }}
              error={errors.team}
            />
          )}
        </fieldset>

        <fieldset className="student-form__section">
          <legend>Izoh</legend>
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

const GroupFormModal = ({ open, group, ...rest }) =>
  open ? <FormBody key={group?.code ?? 'new'} group={group} {...rest} /> : null;

export default GroupFormModal;
