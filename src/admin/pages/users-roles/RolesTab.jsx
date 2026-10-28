import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Lock, Pencil, Plus, RotateCcw, Save, ShieldCheck, Trash2, Users } from 'lucide-react';
import Card from '../../components/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/useToast';
import { formatNumber } from '../../utils/format';
import RoleFormModal from './RoleFormModal';
import {
  ACTIONS,
  ALL_PERMISSIONS,
  MODULES,
  PERMISSION_SECTIONS,
  defaultPermissions,
  permKey,
  sameSet,
  setActionPermissions,
  setModulePermissions,
  togglePermission,
} from './usersData';

// Uch holatli (belgilangan / belgilanmagan / qisman) katakcha
const Check = ({ checked, indeterminate = false, ...props }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);
  return <input ref={ref} type="checkbox" checked={checked} {...props} />;
};

const RolesTab = ({ access }) => {
  const toast = useToast();
  const { roles, users, addRole, updateRole, removeRole, restoreRole, resetRole } = access;

  const [selectedId, setSelectedId] = useState(roles[0]?.id);
  const [draft, setDraft] = useState(null); // saqlanmagan ruxsatlar (null — o‘zgarish yo‘q)
  const [pendingId, setPendingId] = useState(null); // saqlanmagan o‘zgarish bor paytda tanlangan boshqa rol
  const [form, setForm] = useState({ open: false, role: null });
  const [toDelete, setToDelete] = useState(null);

  const role = roles.find((r) => r.id === selectedId) ?? roles[0];

  const userCounts = useMemo(() => {
    const map = new Map();
    for (const u of users) map.set(u.roleId, (map.get(u.roleId) ?? 0) + 1);
    return map;
  }, [users]);

  const perms = useMemo(() => new Set(draft ?? role?.permissions ?? []), [draft, role]);
  const dirty = draft !== null;
  const locked = Boolean(role?.locked);

  const defaults = role?.system ? defaultPermissions(role.id) : null;
  const canReset = Boolean(defaults) && !locked && !sameSet(defaults, draft ?? role.permissions);

  if (!role) return null;

  // ---------- Ruxsatlarni belgilash ----------
  const change = (next) => setDraft(sameSet(next, role.permissions) ? null : next);
  const current = () => [...perms];

  const moduleState = (m) => {
    const on = m.actions.filter((a) => perms.has(permKey(m.key, a))).length;
    return { all: on === m.actions.length, some: on > 0 };
  };
  const actionState = (action) => {
    const mods = MODULES.filter((m) => m.actions.includes(action));
    const on = mods.filter((m) => perms.has(permKey(m.key, action))).length;
    return { all: on === mods.length, some: on > 0 };
  };

  // ---------- Rol tanlash ----------
  const selectRole = (id) => {
    if (id === role.id) return;
    if (dirty) setPendingId(id);
    else setSelectedId(id);
  };
  const discardAndSwitch = () => {
    setDraft(null);
    setSelectedId(pendingId);
    setPendingId(null);
  };

  // ---------- Saqlash ----------
  const save = () => {
    updateRole(role.id, { permissions: draft });
    toast.success(`“${role.name}” roli ruxsatlari saqlandi`);
    setDraft(null);
  };

  const restoreDefaults = () => {
    resetRole(role.id);
    setDraft(null);
    toast.success(`“${role.name}” roli ruxsatlari boshlang‘ich holatga qaytarildi`);
  };

  // ---------- Rol yaratish / tahrirlash / nusxalash / o‘chirish ----------
  const handleRoleSubmit = ({ name, description, tone, copyFrom }) => {
    if (form.role) {
      updateRole(form.role.id, form.role.system ? { description, tone } : { name, description, tone });
      toast.success(`“${name}” roli yangilandi`);
    } else {
      const source = roles.find((r) => r.id === copyFrom);
      const created = addRole({ name, description, tone, permissions: source ? [...source.permissions] : [] });
      setDraft(null);
      setSelectedId(created.id);
      toast.success(
        source
          ? `“${name}” roli yaratildi (${source.name} ruxsatlari nusxalandi)`
          : `“${name}” roli yaratildi. Endi ruxsatlarni belgilang`,
      );
    }
    setForm({ open: false, role: null });
  };

  const duplicate = () => {
    const created = addRole({
      name: `${role.name} (nusxa)`,
      description: role.description,
      tone: role.tone,
      permissions: [...perms],
    });
    setDraft(null);
    setSelectedId(created.id);
    toast.success(`“${created.name}” roli yaratildi`);
  };

  const askDelete = () => {
    const count = userCounts.get(role.id) ?? 0;
    if (count > 0) {
      toast.error(`Bu rolga ${count} ta foydalanuvchi biriktirilgan. Avval ularni boshqa rolga o‘tkazing`);
      return;
    }
    setToDelete(role);
  };

  const confirmDelete = () => {
    const removed = removeRole(toDelete.id);
    setToDelete(null);
    setDraft(null);
    setSelectedId(roles.find((r) => r.id !== toDelete.id)?.id);
    toast.info(`“${removed.name}” roli o‘chirildi`, { action: { label: 'Qaytarish', onClick: () => restoreRole(removed) } });
  };

  const usersOfRole = userCounts.get(role.id) ?? 0;

  return (
    <div className="roles-layout">
      {/* ---------- Rollar ro‘yxati ---------- */}
      <aside className="role-list" aria-label="Rollar">
        <button type="button" className="btn btn--primary role-list__add" onClick={() => setForm({ open: true, role: null })}>
          <Plus size={16} /> Yangi rol
        </button>
        <ul>
          {roles.map((r) => {
            const count = userCounts.get(r.id) ?? 0;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  className={r.id === role.id ? 'role-item is-active' : 'role-item'}
                  aria-current={r.id === role.id ? 'true' : undefined}
                  onClick={() => selectRole(r.id)}
                >
                  <span className="role-item__top">
                    <span className={`badge badge--${r.tone}`}>{r.name}</span>
                    {r.locked ? <Lock size={13} aria-label="Qulflangan" /> : r.system && <span className="role-item__system">Tizim</span>}
                  </span>
                  <span className="role-item__meta">
                    <Users size={13} /> {formatNumber(count)} ta · <ShieldCheck size={13} /> {formatNumber(r.permissions.length)} ruxsat
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* ---------- Ruxsatlar jadvali ---------- */}
      <div className="role-editor">
        <Card
          title={
            <span className="role-editor__title">
              <span className={`badge badge--${role.tone}`}>{role.name}</span>
              {role.system && <span className="badge badge--muted">Tizim roli</span>}
            </span>
          }
          subtitle={`${role.description || 'Tavsif kiritilmagan'} · ${formatNumber(usersOfRole)} ta foydalanuvchi`}
          actions={
            <div className="role-editor__actions">
              <button type="button" className="btn btn--secondary btn--sm" onClick={duplicate}>
                <Copy size={14} /> Nusxa olish
              </button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setForm({ open: true, role })}>
                <Pencil size={14} /> Tahrirlash
              </button>
              {canReset && (
                <button type="button" className="btn btn--secondary btn--sm" onClick={restoreDefaults}>
                  <RotateCcw size={14} /> Asl holatga
                </button>
              )}
              {!role.system && (
                <button type="button" className="btn btn--secondary btn--sm role-editor__delete" onClick={askDelete}>
                  <Trash2 size={14} /> O‘chirish
                </button>
              )}
            </div>
          }
          className="role-editor__card"
        >
          {locked && (
            <p className="role-note" role="note">
              <Lock size={14} /> Super admin barcha ruxsatlarga ega va bu ruxsatlarni o‘zgartirib bo‘lmaydi.
            </p>
          )}

          <div className="table-wrap">
            <table className="data-table perm-matrix">
              <thead>
                <tr>
                  <th>Bo‘lim</th>
                  {ACTIONS.map((a) => {
                    const st = actionState(a.key);
                    return (
                      <th key={a.key} className="is-center">
                        <label className="perm-head">
                          <Check
                            checked={st.all}
                            indeterminate={st.some}
                            disabled={locked}
                            onChange={() => change(setActionPermissions(current(), a.key, !st.all))}
                            aria-label={`Barcha bo‘limlar: ${a.label}`}
                          />
                          {a.label}
                        </label>
                      </th>
                    );
                  })}
                  <th className="is-center">Hammasi</th>
                </tr>
              </thead>
              <tbody>
                {PERMISSION_SECTIONS.map((section) => (
                  <Fragment key={section.title}>
                    <tr className="perm-matrix__section">
                      <th colSpan={ACTIONS.length + 2}>{section.title}</th>
                    </tr>
                    {section.modules.map((m) => {
                      const st = moduleState(m);
                      return (
                        <tr key={m.key}>
                          <td>
                            <span className="perm-module">
                              <m.icon size={16} /> {m.label}
                            </span>
                          </td>
                          {ACTIONS.map((a) => (
                            <td key={a.key} className="is-center">
                              {m.actions.includes(a.key) ? (
                                <Check
                                  checked={perms.has(permKey(m.key, a.key))}
                                  disabled={locked}
                                  onChange={() => change(togglePermission(current(), m.key, a.key))}
                                  aria-label={`${m.label}: ${a.label}`}
                                />
                              ) : (
                                <span className="perm-na" aria-hidden="true">—</span>
                              )}
                            </td>
                          ))}
                          <td className="is-center">
                            <Check
                              checked={st.all}
                              indeterminate={st.some}
                              disabled={locked}
                              onChange={() => change(setModulePermissions(current(), m.key, !st.all))}
                              aria-label={`${m.label}: barcha ruxsatlar`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <p className="perm-legend">
            <strong>{formatNumber(perms.size)}</strong> / {formatNumber(ALL_PERMISSIONS.length)} ruxsat berilgan.
            “Ko‘rish” ruxsatisiz bo‘limda boshqa amal bo‘lmaydi — qo‘shish, tahrirlash yoki o‘chirishni yoqsangiz, “Ko‘rish” ham avtomatik yoqiladi.
          </p>
        </Card>

        {dirty && (
          <div className="role-savebar" role="status">
            <span>Saqlanmagan o‘zgarishlar bor</span>
            <div className="role-savebar__actions">
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setDraft(null)}>Bekor qilish</button>
              <button type="button" className="btn btn--primary btn--sm" onClick={save}>
                <Save size={14} /> Saqlash
              </button>
            </div>
          </div>
        )}
      </div>

      <RoleFormModal
        open={form.open}
        role={form.role}
        roles={roles}
        onClose={() => setForm({ open: false, role: null })}
        onSubmit={handleRoleSubmit}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Rolni o‘chirasizmi?"
        message={`“${toDelete?.name}” roli o‘chiriladi. Bir necha soniya ichida “Qaytarish” tugmasi orqali tiklashingiz mumkin.`}
        confirmLabel="O‘chirish"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingId)}
        title="Saqlanmagan o‘zgarishlar"
        message={`“${role.name}” roli ruxsatlarida saqlanmagan o‘zgarishlar bor. Boshqa rolga o‘tsangiz, ular yo‘qoladi.`}
        confirmLabel="O‘zgarishlarni tashlab o‘tish"
        onConfirm={discardAndSwitch}
        onCancel={() => setPendingId(null)}
      />
    </div>
  );
};

export default RolesTab;
