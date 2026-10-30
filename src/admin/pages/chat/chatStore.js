import { loadTeachers } from '../teachers/teachersStore';
import { loadUsers } from '../users-roles/usersStore';

export const CHAT_STORAGE_KEY = 'edu-chat-v1';

export const getCurrentChatActorKey = () => {
  const role = sessionStorage.getItem('educontrol_role') || 'admin';
  const userId = sessionStorage.getItem('educontrol_user_id');
  const user = loadUsers().find((item) => item.id === userId);
  if (user) {
    if (user.roleId === 'teacher') {
      const teachers = loadTeachers();
      const norm = (value = '') => value.trim().toLocaleLowerCase('uz');
      const teacher = teachers.find((item) => item.id === user.teacherId)
        || teachers.find((item) => norm(item.firstName) === norm(user.firstName) && norm(item.lastName) === norm(user.lastName));
      if (teacher) return `teacher:${teacher.id}`;
    }
    return `user:${user.id}`;
  }
  const teacherId = sessionStorage.getItem('educontrol_teacher_id');
  if (role === 'teacher' && teacherId) return `teacher:${teacherId}`;
  return `${role}:${sessionStorage.getItem('educontrol_username') || role}`;
};

export const getUnreadChatCount = (actorKey) => {
  try {
    const messages = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || [];
    return messages.filter((message) => message.fromKey !== actorKey && !message.readBy?.includes(actorKey)).length;
  } catch { return 0; }
};
