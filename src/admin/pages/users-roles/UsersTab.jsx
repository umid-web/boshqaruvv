import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Ban,
  ChevronsUpDown,
  Download,
  Eye,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Search,
  SearchX,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import Card from '../../components/Card';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import RowMenu from '../../components/ui/RowMenu';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/useToast';
import { downloadCsv } from '../../utils/csv';
import { formatDate, formatDateTime, formatNumber, formatPhone } from '../../utils/format';
import UserFormModal from './UserFormModal';
import UserDrawer from './UserDrawer';
import { USER_STATUSES, USER_STATUS_OPTIONS, activeOwnerCount, userName } from './usersData';

const DEFAULT_FILTERS = { status: 'all', role: 'all' };

const COLUMNS = [
  { key: 'name', label: 'Foydalanuvchi', sortable: true },
  { key: 'login', label: 'Login', sortable: true, className: 'col-lg' },
  { key: 'role', label: 'Rol', sortable: true },
  { key: 'status', label: 'Holati', sortable: true },
  { key: 'lastLogin', label: 'Oxirgi kirish', sortable: true, className: 'col-xl' },
];

const matchesQuery = (u, q, roleName) => {
  if (!q) return true;
  const text = `${u.lastName} ${u.firstName} ${u.id} ${u.login || u.email?.split('@')[0] || ''} ${roleName}`.toLowerCase();
  const digits = q.replace(/\D/g, '');
  return text.includes(q) || (digits.length >= 3 && u.phone.includes(digits));
};

// Bir nechta foydalanuvchining rolini birdaniga almashtirish oynasi
const BulkRoleModal = ({ count, roles, onClose, onSubmit }) => {
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
  return (
    <Modal
      open
      size="sm"
      onClose={onClose}
      title="Rolni o‘zgartirish"
      subtitle={`${count} ta foydalanuvchi tanlangan`}
      footer={
        <>
          <button type="button" className="btn btn--secondary" onClick={onClose}>Bekor qilish</button>
          <button type="button" className="btn btn--primary" onClick={() => onSubmit(roleId)}>Qo‘llash</button>
        </>
      }
    >
      <label className="field">
        <span className="field__label">Yangi rol</span>
        <select className="input" value={roleId} onChange={(e) => setRoleId(e.target.value)} data-autofocus>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <span className="field__hint">{roles.find((r) => r.id === roleId)?.description}</span>
      </label>
    </Modal>
  );
};

const UsersTab = ({ access }) => {
  const toast = useToast();
  const { users: list, roles, addUser, updateUser, removeUsers, restoreUsers, setUsersStatus, setUsersRole } = access;

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [selected, setSelected] = useState(() => new Set());

  const [form, setForm] = useState({ open: false, user: null });
  const [viewId, setViewId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [bulkRole, setBulkRole] = useState(false);

  const roleById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);
  const roleName = (id) => roleById.get(id)?.name ?? 'Noma‘lum rol';

  const statusCounts = useMemo(() => {
    const counts = { all: list.length };
    for (const u of list) counts[u.status] = (counts[u.status] ?? 0) + 1;
    return counts;
  }, [list]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const nameOf = (id) => roleById.get(id)?.name ?? '';
    const result = list.filter(
      (u) =>
        (filters.status === 'all' || u.status === filters.status) &&
        (filters.role === 'all' || u.roleId === filters.role) &&
        matchesQuery(u, q, nameOf(u.roleId)),
    );
    const sorters = {
      name: (a, b) => userName(a).localeCompare(userName(b), 'uz'),
      login: (a, b) => (a.login || a.email?.split('@')[0] || '').localeCompare(b.login || b.email?.split('@')[0] || ''),
      role: (a, b) => nameOf(a.roleId).localeCompare(nameOf(b.roleId), 'uz'),
      status: (a, b) => a.status.localeCompare(b.status),
      lastLogin: (a, b) => (a.lastLoginAt || '').localeCompare(b.lastLoginAt || ''),
    };
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...result].sort((a, b) => sorters[sort.key](a, b) * dir || a.id.localeCompare(b.id));
  }, [list, query, filters, sort, roleById]);
  const rows = filtered;

  const hasFilters = query.trim() !== '' || Object.keys(DEFAULT_FILTERS).some((k) => filters[k] !== DEFAULT_FILTERS[k]);
  const viewUser = list.find((u) => u.id === viewId) ?? null;

  const pageSelected = rows.length > 0 && rows.every((u) => selected.has(u.id));
  const pageSome = rows.some((u) => selected.has(u.id));
  const headCheckbox = useRef(null);
  useEffect(() => {
    if (headCheckbox.current) headCheckbox.current.indeterminate = pageSome && !pageSelected;
  }, [pageSome, pageSelected]);

  // ---------- Filtr / saralash ----------
  const resetView = () => {
    
    setSelected(new Set());
  };
  const changeQuery = (value) => {
    setQuery(value);
    resetView();
  };
  const changeFilter = (name, value) => {
    setFilters((f) => ({ ...f, [name]: value }));
    resetView();
  };
  const clearFilters = () => {
    setQuery('');
    setFilters(DEFAULT_FILTERS);
    resetView();
  };
  const toggleSort = (key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    
  };

  // ---------- Tanlash ----------
  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      rows.forEach((u) => (pageSelected ? next.delete(u.id) : next.add(u.id)));
      return next;
    });

  // ---------- Himoya: tizimda kamida bitta faol Super admin qolishi shart ----------
  const guardOwners = (nextList) => {
    if (activeOwnerCount(list) > 0 && activeOwnerCount(nextList) === 0) {
      toast.error('Tizimda kamida bitta faol Super admin qolishi shart');
      return false;
    }
    return true;
  };

  // ---------- Amallar ----------
  const handleSubmit = (data) => {
    if (form.user) {
      if (!guardOwners(list.map((u) => (u.id === form.user.id ? { ...u, ...data } : u)))) return;
      updateUser(form.user.id, data);
      toast.success(`${userName(data)} ma'lumotlari saqlandi`);
    } else {
      const created = addUser(data);
      toast.success(`${userName(created)} qo‘shildi · login: ${created.login}`);
      setSort({ key: 'name', dir: 'asc' });
      
    }
    setForm({ open: false, user: null });
  };

  const confirmDelete = () => {
    const ids = toDelete.map((u) => u.id);
    const idSet = new Set(ids);
    if (!guardOwners(list.filter((u) => !idSet.has(u.id)))) {
      setToDelete(null);
      return;
    }
    const removed = removeUsers(ids);
    setToDelete(null);
    setViewId(null);
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    toast.info(removed.length === 1 ? 'Foydalanuvchi o‘chirildi' : `${removed.length} ta foydalanuvchi o‘chirildi`, {
      action: { label: 'Qaytarish', onClick: () => restoreUsers(removed) },
    });
  };

  const changeStatus = (ids, status) => {
    const set = new Set(ids);
    const affected = list.filter((u) => set.has(u.id));
    if (!guardOwners(list.map((u) => (set.has(u.id) ? { ...u, status } : u)))) return;
    const before = affected.map((u) => ({ id: u.id, status: u.status }));
    setUsersStatus(ids, status);
    const label = USER_STATUSES[status].label.toLowerCase();
    toast.info(ids.length === 1 ? `${userName(affected[0])}: ${label}` : `${ids.length} ta foydalanuvchi: ${label}`, {
      action: { label: 'Qaytarish', onClick: () => before.forEach(({ id, status: prev }) => updateUser(id, { status: prev })) },
    });
  };

  const changeRole = (ids, roleId) => {
    const set = new Set(ids);
    if (!guardOwners(list.map((u) => (set.has(u.id) ? { ...u, roleId } : u)))) return;
    const before = list.filter((u) => set.has(u.id)).map((u) => ({ id: u.id, roleId: u.roleId }));
    setUsersRole(ids, roleId);
    setBulkRole(false);
    toast.info(`${ids.length} ta foydalanuvchi roli o‘zgartirildi: ${roleName(roleId)}`, {
      action: { label: 'Qaytarish', onClick: () => before.forEach(({ id, roleId: prev }) => updateUser(id, { roleId: prev })) },
    });
  };

  const toggleBlock = (u) => changeStatus([u.id], u.status === 'blocked' ? 'active' : 'blocked');

  const resetPassword = (u) => setForm({ open: true, user: u });

  const exportCsv = () => {
    const source = selected.size ? list.filter((u) => selected.has(u.id)) : filtered;
    const header = ['ID', 'Familiya', 'Ism', 'Login', 'Telefon', 'Rol', 'Holati', 'Oxirgi kirish', 'Qo‘shilgan sana', 'Izoh'];
    const body = source.map((u) => [
      u.id, u.lastName, u.firstName, u.login || u.email?.split('@')[0] || '', formatPhone(u.phone), roleName(u.roleId), USER_STATUSES[u.status].label,
      u.lastLoginAt ? formatDateTime(u.lastLoginAt) : '', formatDate(u.createdAt), u.note,
    ]);
    downloadCsv('foydalanuvchilar.csv', [header, ...body]);
    toast.success(`${source.length} ta foydalanuvchi CSV ga eksport qilindi`);
  };

  const menuItems = (u) => [
    { label: 'Profilni ko‘rish', icon: Eye, onClick: () => setViewId(u.id) },
    { label: 'Tahrirlash', icon: Pencil, onClick: () => setForm({ open: true, user: u }) },
    {
      label: 'Login yoki parolni o‘zgartirish',
      icon: KeyRound,
      hidden: u.status === 'blocked',
      onClick: () => resetPassword(u),
    },
    { label: 'Faollashtirish', icon: UserCheck, hidden: u.status === 'active', onClick: () => changeStatus([u.id], 'active') },
    { label: 'Bloklash', icon: Ban, hidden: u.status === 'blocked', onClick: () => changeStatus([u.id], 'blocked') },
    { label: 'O‘chirish', icon: Trash2, tone: 'danger', divider: true, onClick: () => setToDelete([u]) },
  ];

  const openCreate = () => setForm({ open: true, user: null });

  return (
    <>
      <div className="users-toolbar-actions">
        <button type="button" className="btn btn--secondary" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download size={16} /> Eksport
        </button>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          <Plus size={16} /> Yangi foydalanuvchi
        </button>
      </div>

      <Card className="students-card">
        <div className="toolbar">
          <div className="status-tabs" role="tablist" aria-label="Holat bo‘yicha">
            {[{ value: 'all', label: 'Barchasi' }, ...USER_STATUS_OPTIONS].map((o) => (
              <button
                key={o.value}
                type="button"
                role="tab"
                aria-selected={filters.status === o.value}
                className={filters.status === o.value ? 'status-tab is-active' : 'status-tab'}
                onClick={() => changeFilter('status', o.value)}
              >
                {o.label}
                <span className="status-tab__count">{formatNumber(statusCounts[o.value] ?? 0)}</span>
              </button>
            ))}
          </div>

          <div className="toolbar__filters">
            <div className="toolbar__search">
              <Search size={16} className="toolbar__search-icon" aria-hidden="true" />
              <input
                type="search"
                className="input"
                placeholder="Ism, login, ID yoki telefon…"
                aria-label="Foydalanuvchilarni qidirish"
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
              />
            </div>
            <select className="input" aria-label="Rol" value={filters.role} onChange={(e) => changeFilter('role', e.target.value)}>
              <option value="all">Barcha rollar</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {hasFilters && (
              <button type="button" className="btn btn--ghost" onClick={clearFilters}>
                <X size={15} /> Tozalash
              </button>
            )}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="bulk-bar" role="status">
            <span><strong>{selected.size}</strong> ta foydalanuvchi tanlandi</span>
            <div className="bulk-bar__actions">
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => changeStatus([...selected], 'active')}>
                <UserCheck size={14} /> Faollashtirish
              </button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => changeStatus([...selected], 'blocked')}>
                <Ban size={14} /> Bloklash
              </button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setBulkRole(true)}>
                <ShieldCheck size={14} /> Rolni o‘zgartirish
              </button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={exportCsv}>
                <Download size={14} /> Eksport
              </button>
              <button type="button" className="btn btn--danger btn--sm" onClick={() => setToDelete(list.filter((u) => selected.has(u.id)))}>
                <Trash2 size={14} /> O‘chirish
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelected(new Set())}>
                Bekor qilish
              </button>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon"><SearchX size={28} /></span>
            <h3>{list.length === 0 ? 'Hali foydalanuvchilar yo‘q' : 'Foydalanuvchilar topilmadi'}</h3>
            <p>
              {list.length === 0
                ? 'Birinchi foydalanuvchini qo‘shib, ishni boshlang.'
                : 'Qidiruv yoki filtr shartlariga mos foydalanuvchi yo‘q. Filtrlarni o‘zgartirib ko‘ring.'}
            </p>
            {list.length === 0 ? (
              <button type="button" className="btn btn--primary" onClick={openCreate}>
                <Plus size={16} /> Yangi foydalanuvchi
              </button>
            ) : (
              <button type="button" className="btn btn--secondary" onClick={clearFilters}>Filtrlarni tozalash</button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="data-table__check">
                    <input
                      ref={headCheckbox}
                      type="checkbox"
                      checked={pageSelected}
                      onChange={togglePage}
                      aria-label="Sahifadagi barcha foydalanuvchilarni tanlash"
                    />
                  </th>
                  {COLUMNS.map((c) => {
                    const active = sort.key === c.key;
                    const SortIcon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
                    return (
                      <th
                        key={c.key}
                        className={c.className}
                        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      >
                        <button type="button" className={active ? 'sort-btn is-active' : 'sort-btn'} onClick={() => toggleSort(c.key)}>
                          {c.label}
                          <SortIcon size={13} />
                        </button>
                      </th>
                    );
                  })}
                  <th className="data-table__actions"><span className="sr-only">Amallar</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const status = USER_STATUSES[u.status];
                  const role = roleById.get(u.roleId);
                  const isSelected = selected.has(u.id);
                  return (
                    <tr key={u.id} className={isSelected ? 'is-selected' : undefined}>
                      <td className="data-table__check">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(u.id)} aria-label={`${userName(u)} ni tanlash`} />
                      </td>
                      <td>
                        <button type="button" className="student-cell" onClick={() => setViewId(u.id)}>
                          <Avatar firstName={u.firstName} lastName={u.lastName} />
                          <span className="student-cell__text">
                            <span className="student-cell__name">{userName(u)}</span>
                            <span className="student-cell__id">{u.id}</span>
                          </span>
                        </button>
                      </td>
                      <td className="col-lg data-table__muted">{u.login || u.email?.split('@')[0] || '—'}</td>
                      <td>
                        {role ? <span className={`badge badge--${role.tone}`}>{role.name}</span> : <span className="badge badge--muted">Noma‘lum</span>}
                      </td>
                      <td><span className={`badge badge--dot badge--${status.tone}`}>{status.label}</span></td>
                      <td className="col-xl data-table__muted">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : '—'}</td>
                      <td className="data-table__actions">
                        <RowMenu items={menuItems(u)} label={`${userName(u)} uchun amallar`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        
      </Card>

      <UserFormModal
        open={form.open}
        user={form.user}
        users={list}
        roles={roles}
        onClose={() => setForm({ open: false, user: null })}
        onSubmit={handleSubmit}
      />

      <UserDrawer
        user={viewUser}
        role={viewUser ? roleById.get(viewUser.roleId) : null}
        onClose={() => setViewId(null)}
        onEdit={(u) => setForm({ open: true, user: u })}
        onDelete={(u) => setToDelete([u])}
        onToggleBlock={toggleBlock}
        onResetPassword={resetPassword}
      />

      {bulkRole && (
        <BulkRoleModal count={selected.size} roles={roles} onClose={() => setBulkRole(false)} onSubmit={(roleId) => changeRole([...selected], roleId)} />
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={toDelete?.length > 1 ? `${toDelete.length} ta foydalanuvchini o‘chirasizmi?` : 'Foydalanuvchini o‘chirasizmi?'}
        message={
          <>
            {toDelete?.length === 1 ? `${userName(toDelete[0])} tizimdan o‘chiriladi.` : 'Tanlangan foydalanuvchilar tizimdan o‘chiriladi.'}
            {' '}O‘chirgandan so‘ng bir necha soniya ichida “Qaytarish” tugmasi orqali tiklashingiz mumkin.
          </>
        }
        confirmLabel="O‘chirish"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
};

export default UsersTab;
