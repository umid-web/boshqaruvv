import { SUPPORT_ROLES } from '../support-teachers/supportData';
import { eligiblePeople, mainTeacherProblem, supportProblem, teacherName } from './groupsData';

/**
 * Guruhga ustoz biriktirish: bitta asosiy ustoz (ro‘yxatdan tanlanadi) va istalgancha qo‘shimcha ustoz (belgilanadi).
 * `draft` — guruhning joriy (hali saqlanmagan bo‘lishi mumkin) jadvali: kunlar, vaqt, kurs.
 * Faqat shu kurs fanini o‘qitadigan va ishdan ketmagan ustozlar ko‘rsatiladi; vaqti kesishadigan yoki
 * ish kunlariga mos kelmaydigan ustozni tanlab bo‘lmaydi (sababi ko‘rsatiladi).
 */
const TeacherPicker = ({ draft, teachers, supportTeachers, mainId, supportIds, onMain, onSupport, error }) => {
  const mains = eligiblePeople(teachers, draft.course);
  const supports = eligiblePeople(supportTeachers, draft.course);

  const toggleSupport = (id) =>
    onSupport(supportIds.includes(id) ? supportIds.filter((x) => x !== id) : [...supportIds, id]);

  return (
    <>
      <div className="student-form__wide">
        <label className="field">
          <span className="field__label">Asosiy ustoz</span>
          <select className="input" value={mainId} onChange={(e) => onMain(e.target.value)}>
            <option value="">— Biriktirilmagan —</option>
            {mains.map((t) => {
              const problem = mainTeacherProblem(t, draft);
              return (
                <option key={t.id} value={t.id} disabled={Boolean(problem) && t.id !== mainId}>
                  {teacherName(t)}
                  {t.status === 'vacation' ? ' (ta‘tilda)' : ''}
                  {problem ? ` — ${problem}` : ''}
                </option>
              );
            })}
          </select>
          {mains.length === 0 ? (
            <span className="field__hint">“{draft.course}” fanini o‘qitadigan ustoz topilmadi.</span>
          ) : (
            <span className="field__hint">Guruhning asosiy ustozi bitta bo‘ladi.</span>
          )}
        </label>
      </div>

      <div className="student-form__wide">
        <div className={error ? 'field has-error' : 'field'}>
          <span className="field__label">Qo‘shimcha ustozlar</span>
          {supports.length === 0 ? (
            <span className="field__hint">“{draft.course}” fani bo‘yicha qo‘shimcha ustoz topilmadi.</span>
          ) : (
            <div className="group-options">
              {supports.map((p) => {
                const checked = supportIds.includes(p.id);
                const problem = supportProblem(p, draft);
                const blocked = Boolean(problem) && !checked;
                return (
                  <label key={p.id} className={`group-option${checked ? ' is-checked' : ''}${blocked ? ' is-disabled' : ''}`}>
                    <input type="checkbox" checked={checked} disabled={blocked} onChange={() => toggleSupport(p.id)} />
                    <span className="group-option__text">
                      <strong>
                        {teacherName(p)}
                        {p.status === 'vacation' && <span> · ta‘tilda</span>}
                      </strong>
                      <span>{SUPPORT_ROLES[p.role]?.label}</span>
                      {problem && <span className="group-option__owner">{checked ? 'Diqqat' : 'Mumkin emas'}: {problem}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
          <span className="field__hint">Bir guruhga bir nechta qo‘shimcha ustoz (yordamchi, mentor, o‘rinbosar) biriktirish mumkin.</span>
          {error && <span className="field__error" role="alert">{error}</span>}
        </div>
      </div>
    </>
  );
};

export default TeacherPicker;
