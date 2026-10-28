import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/useToast';
import { SUPPORT_ROLES } from '../support-teachers/supportData';
import {
  WEEK_DAYS,
  findRoomConflict,
  formatGroupSchedule,
  getGroupTeam,
  isValidRange,
  mainTeacherProblem,
  supportProblem,
  teacherName,
} from '../groups/groupsData';

const Field = ({ label, error, hint, children }) => (
  <label className={error ? 'field has-error' : 'field'}>
    <span className="field__label">{label}</span>
    {children}
    {error ? <span className="field__error" role="alert">{error}</span> : hint && <span className="field__hint">{hint}</span>}
  </label>
);

/**
 * Darsning kuni, vaqti va xonasini o‘zgartirish. Saqlashdan oldin tekshiriladi:
 *  – bir xonada bir vaqtda ikkita dars bo‘lmasin;
 *  – asosiy va qo‘shimcha ustozlar shu vaqtda boshqa guruhda dars o‘tmasin (yoki ish kunlariga mos bo‘lsin).
 */
const Body = ({ group, groups, teachers, supportTeachers, onClose, onSubmit }) => {
  const toast = useToast();
  const team = getGroupTeam(group.code, teachers, supportTeachers);
  const [form, setForm] = useState({ days: group.days, start: group.start, end: group.end, room: group.room });
  const [errors, setErrors] = useState({});

  const set = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined, team: undefined }));
  };
  const toggleDay = (d) => set('days', form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d].sort((a, b) => a - b));

  const submit = (ev) => {
    ev.preventDefault();
    const draft = { code: group.code, course: group.course, ...form, room: form.room.trim() };
    const e = {};
    if (draft.days.length === 0) e.days = 'Kamida bitta dars kunini tanlang';
    if (!isValidRange(draft.start, draft.end)) e.time = 'Tugash vaqti boshlanish vaqtidan keyin bo‘lsin';
    if (!draft.room) e.room = 'Xonani kiriting';
    if (!e.days && !e.time) {
      const clash = draft.room && findRoomConflict(groups, draft);
      if (clash) e.room = `${clash.room} shu vaqtda ${clash.code} guruhi uchun band`;
      const mainIssue = team.main && mainTeacherProblem(team.main, draft);
      if (mainIssue) e.team = `${teacherName(team.main)}: ${mainIssue}`;
      else {
        const bad = team.support.find((p) => supportProblem(p, draft));
        if (bad) e.team = `${teacherName(bad)}: ${supportProblem(bad, draft)}`;
      }
    }
    setErrors(e);
    if (Object.keys(e).length) {
      if (e.team) toast.error(e.team);
      return;
    }
    onSubmit({ days: draft.days, start: draft.start, end: draft.end, room: draft.room });
  };

  const rooms = [...new Set(groups.map((g) => g.room))];

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={`${group.code} — darsni o‘zgartirish`}
      subtitle={`${group.course} · hozir: ${formatGroupSchedule(group)}, ${group.room}`}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Bekor qilish</button>
          <button type="submit" form="lesson-form" className="btn btn--primary">Saqlash</button>
        </>
      }
    >
      <form id="lesson-form" className="student-form" onSubmit={submit} noValidate>
        <fieldset className="student-form__section">
          <div className="student-form__wide">
            <div className={errors.days ? 'field has-error' : 'field'}>
              <span className="field__label">Dars kunlari</span>
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
          <Field label="Boshlanish vaqti" error={errors.time}>
            <input type="time" className="input" value={form.start} onChange={(e) => set('start', e.target.value)} />
          </Field>
          <Field label="Tugash vaqti">
            <input type="time" className="input" value={form.end} onChange={(e) => set('end', e.target.value)} />
          </Field>
          <div className="student-form__wide">
            <Field label="Xona" error={errors.room}>
              <input className="input" list="lesson-rooms" value={form.room} onChange={(e) => set('room', e.target.value)} autoComplete="off" />
              <datalist id="lesson-rooms">{rooms.map((r) => <option key={r} value={r} />)}</datalist>
            </Field>
          </div>
          <div className="student-form__wide">
            <div className={errors.team ? 'field has-error' : 'field'}>
              <span className="field__label">Dars o‘tuvchi ustozlar</span>
              <span className="field__hint">
                {team.main ? `Asosiy: ${teacherName(team.main)}` : 'Asosiy ustoz biriktirilmagan'}
                {team.support.length > 0 && ` · Qo‘shimcha: ${team.support.map((p) => `${teacherName(p)} (${SUPPORT_ROLES[p.role]?.label})`).join(', ')}`}
              </span>
              {errors.team && <span className="field__error" role="alert">{errors.team}</span>}
            </div>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
};

const LessonEditModal = ({ group, ...rest }) => (group ? <Body key={group.code} group={group} {...rest} /> : null);

export default LessonEditModal;
