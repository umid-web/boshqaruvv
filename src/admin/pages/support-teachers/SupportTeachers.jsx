import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Download,
  Eye,
  Pencil,
  Plane,
  Play,
  Plus,
  Search,
  SearchX,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Avatar from '../../components/ui/Avatar';
import RowMenu from '../../components/ui/RowMenu';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/useToast';
import { downloadCsv } from '../../utils/csv';
import { formatDate, formatMoney, formatNumber, formatPhone, formatSom } from '../../utils/format';
import { useStudents } from '../students/useStudents';
import SupportTeacherFormModal from './SupportTeacherFormModal';
import SupportTeacherDrawer from './SupportTeacherDrawer';
import { useSupportTeachers } from './supportStore';
import {
  GROUP_LIST,
  PAY_TYPES,
  SUBJECTS,
  SUPPORT_ROLES,
  SUPPORT_ROLE_OPTIONS,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_OPTIONS,
  getSupportStats,
  teacherName,
} from './supportData';
import '../students/Students.scss';
import '../teachers/Teachers.scss';
import './SupportTeachers.scss';

const DEFAULT_FILTERS = { status: 'all', role: 'all', subject: 'all' };

const COLUMNS = [
  { key: 'name', label: 'Ustoz', sortable: true },
  { key: 'phone', label: 'Telefon', className: 'col-lg' },
  { key: 'role', label: 'Roli', sortable: true },
  { key: 'subjects', label: 'Fanlari', className: 'col-sm' },
  { key: 'groups', label: 'Guruhlar', sortable: true, className: 'col-md' },
  { key: 'students', label: 'Talabalar', sortable: true, align: 'right' },
  { key: 'status', label: 'Holati', sortable: true },
  { key: 'pay', label: 'To‘lov', sortable: true, align: 'right', className: 'col-xl' },
];

const matchesQuery = (p, q) => {
  if (!q) return true;
  const text = `${p.lastName} ${p.firstName} ${p.id} ${p.subjects.join(' ')} ${p.groups.join(' ')} ${SUPPORT_ROLES[p.role]?.label ?? ''}`.toLowerCase();
  const digits = q.replace(/\D/g, '');
  return text.includes(q) || (digits.length >= 3 && p.phone.includes(digits));
};

const SupportTeachers = () => {
  const toast = useToast();
  const { supportTeachers: list, add, update, remove, restore, setStatus } = useSupportTeachers();
  // Talabalar faqat o‘qiladi: talabalar soni va to‘lov hisobi shundan olinadi
  const { students } = useStudents();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [selected, setSelected] = useState(() => new Set());

  const [form, setForm] = useState({ open: false, person: null });
  const [viewId, setViewId] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  // ---------- Hisoblangan ma'lumotlar ----------
  const statsById = useMemo(() => {
    const map = new Map();
    for (const p of list) map.set(p.id, getSupportStats(p, students));
    return map;
  }, [list, students]);

  const summary = useMemo(() => {
    const working = list.filter((p) => p.status === 'active');
    const covered = new Set(list.flatMap((p) => (p.status === 'left' ? [] : p.groups)));
    return {
      total: list.length,
      active: working.length,
      covered: covered.size,
      uncovered: GROUP_LIST.length - covered.size,
      payFund: working.reduce((sum, p) => sum + (statsById.get(p.id)?.pay ?? 0), 0),
    };
  }, [list, statsById]);

  const statusCounts = useMemo(() => {
    const counts = { all: list.length };
    for (const p of list) counts[p.status] = (counts[p.status] ?? 0) + 1;
    return counts;
  }, [list]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = list.filter(
      (p) =>
        (filters.status === 'all' || p.status === filters.status) &&
        (filters.role === 'all' || p.role === filters.role) &&
        (filters.subject === 'all' || p.subjects.includes(filters.subject)) &&
        matchesQuery(p, q),
    );
    const sorters = {
      name: (a, b) => teacherName(a).localeCompare(teacherName(b), 'uz'),
      role: (a, b) => SUPPORT_ROLES[a.role].label.localeCompare(SUPPORT_ROLES[b.role].label, 'uz'),
      groups: (a, b) => a.groups.length - b.groups.length,
      students: (a, b) => statsById.get(a.id).studentCount - statsById.get(b.id).studentCount,
      status: (a, b) => a.status.localeCompare(b.status),
      pay: (a, b) => statsById.get(a.id).pay - statsById.get(b.id).pay,
    };
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...result].sort((a, b) => sorters[sort.key](a, b) * dir || a.id.localeCompare(b.id));
  }, [list, query, filters, sort, statsById]);
  const rows = filtered;

  const hasFilters = query.trim() !== '' || Object.keys(DEFAULT_FILTERS).some((k) => filters[k] !== DEFAULT_FILTERS[k]);
  const viewPerson = list.find((p) => p.id === viewId) ?? null;

  const pageSelected = rows.length > 0 && rows.every((p) => selected.has(p.id));
  const pageSome = rows.some((p) => selected.has(p.id));
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
      rows.forEach((p) => (pageSelected ? next.delete(p.id) : next.add(p.id)));
      return next;
    });

  // ---------- Amallar ----------
  const handleSubmit = (data) => {
    // Ketgan ustozga guruh biriktirilmaydi
    const payload = data.status === 'left' ? { ...data, groups: [] } : data;

    if (form.person) {
      update(form.person.id, payload);
      toast.success(`${teacherName(payload)} ma'lumotlari saqlandi`);
    } else {
      const created = add(payload);
      toast.success(`${teacherName(created)} qo‘shildi (${created.id})`);
      setSort({ key: 'name', dir: 'asc' });
      
    }
    setForm({ open: false, person: null });
  };

  const confirmDelete = () => {
    const ids = toDelete.map((p) => p.id);
    const removed = remove(ids);
    setToDelete(null);
    setViewId(null);
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    toast.info(removed.length === 1 ? 'Qo‘shimcha ustoz o‘chirildi' : `${removed.length} ta qo‘shimcha ustoz o‘chirildi`, {
      action: { label: 'Qaytarish', onClick: () => restore(removed) },
    });
  };

  const changeStatus = (ids, status) => {
    const set = new Set(ids);
    const affected = list.filter((p) => set.has(p.id));
    if (status === 'left') {
      // Ketgan ustozning guruhlari bo‘shatiladi; "Qaytarish" holat va guruhlarni tiklaydi
      const before = affected.map((p) => ({ id: p.id, status: p.status, groups: p.groups }));
      affected.forEach((p) => update(p.id, { status, groups: [] }));
      toast.info(`Holat o‘zgartirildi: ${SUPPORT_STATUSES[status].label}`, {
        action: { label: 'Qaytarish', onClick: () => before.forEach(({ id, ...patch }) => update(id, patch)) },
      });
      return;
    }
    setStatus(ids, status);
    toast.success(
      ids.length === 1
        ? `Holat o‘zgartirildi: ${SUPPORT_STATUSES[status].label}`
        : `${ids.length} ta ustoz holati o‘zgartirildi: ${SUPPORT_STATUSES[status].label}`,
    );
  };

  const exportCsv = () => {
    const source = selected.size ? list.filter((p) => selected.has(p.id)) : filtered;
    const header = ['ID', 'Familiya', 'Ism', 'Jinsi', 'Tug‘ilgan sana', 'Telefon', 'Roli', 'Fanlari', 'Guruhlar', 'Talabalar soni', 'Holati', 'To‘lov turi', 'To‘lov qiymati', 'Taxminiy oylik (so‘m)', 'Ishga kirgan sana', 'Manzil'];
    const body = source.map((p) => {
      const st = statsById.get(p.id);
      return [
        p.id, p.lastName, p.firstName, p.gender === 'female' ? 'Ayol' : 'Erkak', formatDate(p.birthDate),
        formatPhone(p.phone), SUPPORT_ROLES[p.role].label, p.subjects.join(', '), p.groups.join(', '), st.studentCount,
        SUPPORT_STATUSES[p.status].label, PAY_TYPES.find((t) => t.value === p.payType)?.label ?? '',
        p.payValue, st.pay, formatDate(p.startedAt), p.address,
      ];
    });
    downloadCsv('qoshimcha-ustozlar.csv', [header, ...body]);
    toast.success(`${source.length} ta qo‘shimcha ustoz CSV ga eksport qilindi`);
  };

  const menuItems = (p) => [
    { label: 'Profilni ko‘rish', icon: Eye, onClick: () => setViewId(p.id) },
    { label: 'Tahrirlash', icon: Pencil, onClick: () => setForm({ open: true, person: p }) },
    { label: 'Ishga qaytarish', icon: Play, hidden: p.status === 'active', onClick: () => changeStatus([p.id], 'active') },
    { label: 'Ta‘tilga chiqarish', icon: Plane, hidden: p.status !== 'active', onClick: () => changeStatus([p.id], 'vacation') },
    { label: 'Ketgan deb belgilash', icon: UserMinus, hidden: p.status === 'left', onClick: () => changeStatus([p.id], 'left') },
    { label: 'O‘chirish', icon: Trash2, tone: 'danger', divider: true, onClick: () => setToDelete([p]) },
  ];

  const openCreate = () => setForm({ open: true, person: null });

  return (
    <div className="students-page teachers-page support-page">
      <header className="page-head">
        <div>
          <h1>Qo‘shimcha ustozlar</h1>
          <p>Yordamchi ustozlar, mentorlar va o‘rinbosarlar: guruhlarga biriktirish va to‘lovni boshqarish</p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--secondary" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={16} /> Eksport
          </button>
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            <Plus size={16} /> Yangi qo‘shimcha ustoz
          </button>
        </div>
      </header>

      <section className="students-stats" aria-label="Qo‘shimcha ustozlar ko‘rsatkichlari">
        <StatCard title="Jami qo‘shimcha ustozlar" value={formatNumber(summary.total)} icon={Users} tone="primary" />
        <StatCard title="Ishlayotganlar" value={formatNumber(summary.active)} icon={UserCheck} tone="success" />
        <StatCard
          title="Yordam biriktirilmagan guruhlar"
          value={formatNumber(summary.uncovered)}
          icon={AlertTriangle}
          tone="warning"
        />
        <StatCard title="Oylik to‘lov fondi" value={formatMoney(summary.payFund)} icon={Wallet} tone="danger" />
      </section>

      <Card className="students-card">
        <div className="toolbar">
          <div className="status-tabs" role="tablist" aria-label="Holat bo‘yicha">
            {[{ value: 'all', label: 'Barchasi' }, ...SUPPORT_STATUS_OPTIONS].map((o) => (
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
                placeholder="Ism, ID, telefon, fan yoki guruh…"
                aria-label="Qo‘shimcha ustozlarni qidirish"
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
              />
            </div>
            <select className="input" aria-label="Roli" value={filters.role} onChange={(e) => changeFilter('role', e.target.value)}>
              <option value="all">Barcha rollar</option>
              {SUPPORT_ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <select className="input" aria-label="Fan" value={filters.subject} onChange={(e) => changeFilter('subject', e.target.value)}>
              <option value="all">Barcha fanlar</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
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
            <span><strong>{selected.size}</strong> ta ustoz tanlandi</span>
            <div className="bulk-bar__actions">
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => changeStatus([...selected], 'active')}>
                <Play size={14} /> Ishga qaytarish
              </button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => changeStatus([...selected], 'vacation')}>
                <Plane size={14} /> Ta‘tilga chiqarish
              </button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={exportCsv}>
                <Download size={14} /> Eksport
              </button>
              <button type="button" className="btn btn--danger btn--sm" onClick={() => setToDelete(list.filter((p) => selected.has(p.id)))}>
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
            <h3>{list.length === 0 ? 'Hali qo‘shimcha ustozlar yo‘q' : 'Ustozlar topilmadi'}</h3>
            <p>
              {list.length === 0
                ? 'Birinchi qo‘shimcha ustozni qo‘shib, ishni boshlang.'
                : 'Qidiruv yoki filtr shartlariga mos ustoz yo‘q. Filtrlarni o‘zgartirib ko‘ring.'}
            </p>
            {list.length === 0 ? (
              <button type="button" className="btn btn--primary" onClick={openCreate}>
                <Plus size={16} /> Yangi qo‘shimcha ustoz
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
                      aria-label="Sahifadagi barcha ustozlarni tanlash"
                    />
                  </th>
                  {COLUMNS.map((c) => {
                    const active = sort.key === c.key;
                    const SortIcon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
                    return (
                      <th
                        key={c.key}
                        className={`${c.className ?? ''} ${c.align === 'right' ? 'is-right' : ''}`.trim()}
                        aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      >
                        {c.sortable ? (
                          <button type="button" className={active ? 'sort-btn is-active' : 'sort-btn'} onClick={() => toggleSort(c.key)}>
                            {c.label}
                            <SortIcon size={13} />
                          </button>
                        ) : (
                          c.label
                        )}
                      </th>
                    );
                  })}
                  <th className="data-table__actions"><span className="sr-only">Amallar</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const status = SUPPORT_STATUSES[p.status];
                  const role = SUPPORT_ROLES[p.role];
                  const st = statsById.get(p.id);
                  const isSelected = selected.has(p.id);
                  return (
                    <tr key={p.id} className={isSelected ? 'is-selected' : undefined}>
                      <td className="data-table__check">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(p.id)}
                          aria-label={`${teacherName(p)} ni tanlash`}
                        />
                      </td>
                      <td>
                        <button type="button" className="student-cell" onClick={() => setViewId(p.id)}>
                          <Avatar firstName={p.firstName} lastName={p.lastName} />
                          <span className="student-cell__text">
                            <span className="student-cell__name">{teacherName(p)}</span>
                            <span className="student-cell__id">{p.id}</span>
                          </span>
                        </button>
                      </td>
                      <td className="col-lg data-table__muted">{formatPhone(p.phone)}</td>
                      <td><span className={`badge badge--${role.tone}`}>{role.label}</span></td>
                      <td className="col-sm">{p.subjects.join(', ')}</td>
                      <td className="col-md">
                        {p.groups.length ? (
                          <span className="tag-list">
                            {p.groups.map((g) => <span key={g} className="tag">{g}</span>)}
                          </span>
                        ) : (
                          <span className="data-table__muted">—</span>
                        )}
                      </td>
                      <td className="is-right">{formatNumber(st.studentCount)}</td>
                      <td><span className={`badge badge--dot badge--${status.tone}`}>{status.label}</span></td>
                      <td className="col-xl is-right data-table__muted">
                        {p.status === 'left' ? '—' : formatSom(st.pay)}
                      </td>
                      <td className="data-table__actions">
                        <RowMenu items={menuItems(p)} label={`${teacherName(p)} uchun amallar`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        
      </Card>

      <SupportTeacherFormModal
        open={form.open}
        person={form.person}
        onClose={() => setForm({ open: false, person: null })}
        onSubmit={handleSubmit}
      />

      <SupportTeacherDrawer
        person={viewPerson}
        students={students}
        onClose={() => setViewId(null)}
        onEdit={(p) => setForm({ open: true, person: p })}
        onDelete={(p) => setToDelete([p])}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={toDelete?.length > 1 ? `${toDelete.length} ta ustozni o‘chirasizmi?` : 'Qo‘shimcha ustozni o‘chirasizmi?'}
        message={
          <>
            {toDelete?.length === 1
              ? `${teacherName(toDelete[0])} ro‘yxatdan o‘chiriladi.`
              : 'Tanlangan ustozlar ro‘yxatdan o‘chiriladi.'}
            {' '}O‘chirgandan so‘ng bir necha soniya ichida “Qaytarish” tugmasi orqali tiklashingiz mumkin.
          </>
        }
        confirmLabel="O‘chirish"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

export default SupportTeachers;
