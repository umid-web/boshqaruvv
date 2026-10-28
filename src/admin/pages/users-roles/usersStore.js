import { useCallback, useEffect, useRef, useState } from 'react';
import { createLogger, diffObjects, logActivity } from '../../activity/activityStore';
import { pushNotification } from '../../activity/notificationStore';
import { createDemoUsers, createDefaultRoles, defaultPermissions, normalizeRoles, USER_STATUSES, userName } from './usersData';

// DEMO: ma'lumotlar brauzerda (localStorage) saqlanadi. Backend ulanganda faqat shu fayldagi
// funksiyalar API so‘rovlari (axios) bilan almashtiriladi — sahifalar kodi o‘zgarmaydi.
// Parollar saqlanmaydi: yangi foydalanuvchiga taklif yuboriladi, parolni u o‘zi o‘rnatadi.
const USERS_KEY = 'edu-users-v1';
const ROLES_KEY = 'edu-roles-v1';

const read = (key) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    /* buzilgan yoki mavjud bo‘lmagan ma'lumot */
  }
  return null;
};

export const loadRoles = () => normalizeRoles(read(ROLES_KEY) ?? createDefaultRoles());
export const loadUsers = () => read(USERS_KEY) ?? createDemoUsers();

const nextUserId = (list) => {
  const max = list.reduce((m, u) => Math.max(m, Number(u.id.replace(/\D/g, '')) || 0), 0);
  return `U-${String(max + 1).padStart(4, '0')}`;
};

// Faoliyat tarixi. Foydalanuvchi va rollar bilan bog‘liq amallar xavfsizlik uchun muhim —
// ba’zilari (bloklash, rol o‘zgarishi, o‘chirish) bildirishnoma ham yaratadi.
const userLog = createLogger({
  module: 'users',
  noun: 'Foydalanuvchi',
  nameOf: userName,
  ignore: ['lastLoginAt', 'createdAt'],
  notifyCreate: (u) => ({
    category: 'security',
    priority: 'normal',
    title: 'Yangi foydalanuvchi qo‘shildi',
    message: `${userName(u)} · ${u.email}`,
    link: '/admin/users-roles',
  }),
});
const roleLog = createLogger({ module: 'roles', noun: 'Rol', nameOf: (r) => r.name, ignore: ['permissions', 'locked', 'system'] });

const security = (title, message) =>
  pushNotification({ category: 'security', priority: 'high', title, message, link: '/admin/users-roles' });

const today = () => new Date().toISOString().slice(0, 10);

/** Foydalanuvchilar va rollar — bitta joyda, chunki ular o‘zaro bog‘liq (rol o‘chirilganda, foydalanuvchi soni va h.k.). */
export const useAccess = () => {
  const [users, setUsers] = useState(loadUsers);
  const [roles, setRoles] = useState(loadRoles);
  const latest = useRef({ users, roles });

  useEffect(() => {
    latest.current.users = users;
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch {
      /* e'tiborsiz */
    }
  }, [users]);

  useEffect(() => {
    latest.current.roles = roles;
    try {
      localStorage.setItem(ROLES_KEY, JSON.stringify(roles));
    } catch {
      /* e'tiborsiz */
    }
  }, [roles]);

  /* ---------- Foydalanuvchilar ---------- */
  const addUser = useCallback((data) => {
    const created = { ...data, id: nextUserId(latest.current.users), createdAt: today(), lastLoginAt: '' };
    setUsers((list) => [created, ...list]);
    userLog.created(created);
    return created;
  }, []);

  const updateUser = useCallback((id, patch) => {
    const before = latest.current.users.find((u) => u.id === id);
    userLog.updated(before, patch);
    if (before && patch.roleId && patch.roleId !== before.roleId) {
      const name = (rid) => latest.current.roles.find((r) => r.id === rid)?.name ?? rid;
      security('Foydalanuvchi roli o‘zgartirildi', `${userName(before)}: ${name(before.roleId)} → ${name(patch.roleId)}`);
    }
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  // O‘chirilgan yozuvlarni qaytaradi — "Qaytarish" (undo) uchun
  const removeUsers = useCallback((ids) => {
    const set = new Set(ids);
    const removed = latest.current.users.filter((u) => set.has(u.id));
    setUsers((list) => list.filter((u) => !set.has(u.id)));
    userLog.deleted(removed);
    if (removed.length) security('Foydalanuvchi o‘chirildi', removed.length === 1 ? userName(removed[0]) : `${removed.length} ta foydalanuvchi`);
    return removed;
  }, []);

  const restoreUsers = useCallback((items) => {
    userLog.restored(items);
    setUsers((list) => [...items, ...list.filter((u) => !items.some((i) => i.id === u.id))]);
  }, []);

  const setUsersStatus = useCallback((ids, status) => {
    const set = new Set(ids);
    const affected = latest.current.users.filter((u) => set.has(u.id) && u.status !== status);
    userLog.statusChanged(affected, status, USER_STATUSES[status]?.label);
    if (status === 'blocked' && affected.length) {
      security('Foydalanuvchi bloklandi', affected.length === 1 ? userName(affected[0]) : `${affected.length} ta foydalanuvchi`);
    }
    setUsers((list) => list.map((u) => (set.has(u.id) ? { ...u, status } : u)));
  }, []);

  const setUsersRole = useCallback((ids, roleId) => {
    const set = new Set(ids);
    const affected = latest.current.users.filter((u) => set.has(u.id) && u.roleId !== roleId);
    const roleName = (rid) => latest.current.roles.find((r) => r.id === rid)?.name ?? rid;
    if (affected.length) {
      const single = affected.length === 1;
      logActivity({
        module: 'users',
        action: 'security',
        severity: 'warning',
        title: single
          ? `Foydalanuvchi roli o‘zgartirildi: ${userName(affected[0])} → ${roleName(roleId)}`
          : `${affected.length} ta foydalanuvchi roli o‘zgartirildi → ${roleName(roleId)}`,
        entityId: single ? affected[0].id : '',
        entityName: single ? userName(affected[0]) : '',
        changes: single ? [{ field: 'roleId', label: 'Rol', from: roleName(affected[0].roleId), to: roleName(roleId) }] : [],
        items: single ? [] : affected.map((u) => ({ id: u.id, name: userName(u) })),
      });
    }
    setUsers((list) => list.map((u) => (set.has(u.id) ? { ...u, roleId } : u)));
  }, []);

  /* ---------- Rollar ---------- */
  const addRole = useCallback((data) => {
    const created = { ...data, id: `custom-${Date.now().toString(36)}`, system: false, locked: false };
    setRoles((list) => [...list, created]);
    roleLog.created(created);
    return created;
  }, []);

  const updateRole = useCallback((id, patch) => {
    const before = latest.current.roles.find((r) => r.id === id);
    if (before) {
      const changes = diffObjects(before, patch, { ignore: ['permissions', 'locked', 'system'] });
      const permsChanged = patch.permissions !== undefined && JSON.stringify(patch.permissions) !== JSON.stringify(before.permissions);
      if (permsChanged) changes.push({ field: 'permissions', label: 'Ruxsatlar', from: 'oldingi', to: 'yangilandi' });
      if (changes.length) {
        logActivity({
          module: 'roles',
          action: permsChanged ? 'security' : 'update',
          severity: permsChanged ? 'warning' : 'info',
          title: `Rol tahrirlandi: ${patch.name ?? before.name}`,
          entityId: id,
          entityName: patch.name ?? before.name,
          changes,
        });
        if (permsChanged) security('Rol ruxsatlari o‘zgartirildi', patch.name ?? before.name);
      }
    }
    setRoles((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const removeRole = useCallback((id) => {
    const removed = latest.current.roles.find((r) => r.id === id) ?? null;
    setRoles((list) => list.filter((r) => r.id !== id));
    if (removed) {
      roleLog.deleted([removed]);
      security('Rol o‘chirildi', removed.name);
    }
    return removed;
  }, []);

  const restoreRole = useCallback((role) => {
    roleLog.restored([role]);
    setRoles((list) => (list.some((r) => r.id === role.id) ? list : [...list, role]));
  }, []);

  const resetRole = useCallback((id) => {
    const permissions = defaultPermissions(id);
    const role = latest.current.roles.find((r) => r.id === id);
    if (permissions && role) {
      logActivity({
        module: 'roles',
        action: 'security',
        severity: 'warning',
        title: `Rol ruxsatlari standart holatga qaytarildi: ${role.name}`,
        entityId: id,
        entityName: role.name,
      });
    }
    if (permissions) setRoles((list) => list.map((r) => (r.id === id ? { ...r, permissions } : r)));
  }, []);

  const resetDemo = useCallback(() => {
    logActivity({ module: 'users', action: 'system', severity: 'warning', title: 'Foydalanuvchilar va rollar DEMO holatga qaytarildi' });
    setUsers(createDemoUsers());
    setRoles(normalizeRoles(createDefaultRoles()));
  }, []);

  return {
    users, roles,
    addUser, updateUser, removeUsers, restoreUsers, setUsersStatus, setUsersRole,
    addRole, updateRole, removeRole, restoreRole, resetRole, resetDemo,
  };
};
