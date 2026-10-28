import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import TeacherPicker from './TeacherPicker';
import { formatGroupSchedule } from './groupsData';

/** Tezkor biriktirish: guruh ma'lumotlariga tegmasdan faqat asosiy va qo‘shimcha ustozlarni o‘zgartiradi. */
const Body = ({ group, team, teachers, supportTeachers, onClose, onSubmit }) => {
  const [mainId, setMainId] = useState(team.main?.id ?? '');
  const [supportIds, setSupportIds] = useState(team.support.map((p) => p.id));

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title="Ustozlarni biriktirish"
      subtitle={`${group.code} · ${group.course} · ${formatGroupSchedule(group)}`}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Bekor qilish</button>
          <button type="submit" form="assign-form" className="btn btn--primary">Saqlash</button>
        </>
      }
    >
      <form
        id="assign-form"
        className="student-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ mainId, supportIds });
        }}
      >
        <fieldset className="student-form__section">
          <TeacherPicker
            draft={group}
            teachers={teachers}
            supportTeachers={supportTeachers}
            mainId={mainId}
            supportIds={supportIds}
            onMain={setMainId}
            onSupport={setSupportIds}
          />
        </fieldset>
      </form>
    </Modal>
  );
};

const AssignTeachersModal = ({ group, ...rest }) => (group ? <Body key={group.code} group={group} {...rest} /> : null);

export default AssignTeachersModal;
