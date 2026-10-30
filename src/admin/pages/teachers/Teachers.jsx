import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Download,
  Eye,
  Plane,
  Pencil,
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
  AlertTriangle,
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
import TeacherFormModal from './TeacherFormModal';
import TeacherDrawer from './TeacherDrawer';
import { useTeachers } from './teachersStore';
import {
  GROUP_LIST,
  SALARY_TYPES,
  SUBJECTS,
  TEACHER_STATUSES,
  TEACHER_STATUS_OPTIONS,
  getTeacherStats,
  teacherName,
} from './teachersData';
import '../students/Students.scss';
import './Teachers.scss';

const DEFAULT_FILTERS = { status: 'all', subject: 'all', groups: 'all' };

const COLUMNS = [
  { key: 'name', label: 'Ustoz', sortable: true },
  { key: 'phone', label: 'Telefon', className: 'col-lg' },
  { key: 'subjects', label: 'Fanlari', className: 'col-sm' },
  { key: 'groups', label: 'Guruhlar', sortable: true, className: 'col-md' },
  { key: 'students', label: 'Talabalar', sortable: true, align: 'right' },
  { key: 'status', label: 'Holati', sortable: true },
  { key: 'salary', label: 'Ish haqi', sortable: true, align: 'right', className: 'col-xl' },
];

const matchesQuery = (t, q) => {
  if (!q) return true;
  const text = `${t.lastName} ${t.firstName} ${t.id} ${t.subjects.join(' ')} ${t.groups.join(' ')}`.toLowerCase();
  const digits = q.replace(/\D/g, '');
  return text.includes(q) || (digits.length >= 3 && t.phone.includes(digits));
};

const Teachers = () => {
  const toast = useToast();
  const { teachers, add, update, remove, restore, setStatus } = useTeachers();
  // Talabalar faqat o‘qiladi: ustozning talabalari soni va ish haqi shundan hisoblanadi
  const { students } = useStudents();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [selected, setSelected] = useState(() => new Set());

  const [form, setForm] = useState({ open: false, teacher: null });
  const [viewId, setViewId] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  // ---------- Hisoblangan ma'lumotlar ----------
  const statsById = useMemo(() => {
    const map = new Map();
    for (const t of teachers) map.set(t.id, getTeacherStats(t, students));
    return map;
  }, [teachers, students]);

  const summary = useMemo(() => {
    const working = teachers.filter((t) => t.status === 'active');
    const assigned = new Set(teachers.flatMap((t) => (t.status === 'left' ? [] : t.groups)));
    return {
      total: teachers.length,
      active: working.length,
      unassigned: GROUP_LIST.filter((g) => !assigned.has(g.code)).length,
      salaryFund: working.reduce((sum, t) => sum + (statsById.get(t.id)?.salary ?? 0), 0),
    };
  }, [teachers, statsById]);

  const statusCounts = useMemo(() => {
    const counts = { all: teachers.length };
    for (const t of teachers) counts[t.status] = (counts[t.status] ?? 0) + 1;
    return counts;
  }, [teachers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = teachers.filter(
      (t) =>
        (filters.status === 'all' || t.status === filters.status) &&
        (filters.subject === 'all' || t.subjects.includes(filters.subject)) &&
        (filters.groups === 'all' || (filters.groups === 'with' ? t.groups.length > 0 : t.groups.length === 0)) &&
        matchesQuery(t, q),
    );
    const sorters = {
      name: (a, b) => teacherName(a).localeCompare(teacherName(b), 'uz'),
      groups: (a, b) => a.groups.length - b.groups.length,
      students: (a, b) => statsById.get(a.id).studentCount - statsById.get(b.id).studentCount,
      status: (a, b) => a.status.localeCompare(b.status),
      salary: (a, b) => statsById.get(a.id).salary - statsById.get(b.id).salary,
    };
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => sorters[sort.key](a, b) * dir || a.id.localeCompare(b.id));
  }, [teachers, query, filters, sort, statsById]);
  const rows = filtered;

  const hasFilters = query.trim() !== '' || Object.keys(DEFAULT_FILTERS).some((k) => filters[k] !== DEFAULT_FILTERS[k]);
  const viewTeacher = teachers.find((t) => t.id === viewId) ?? null;

  const pageSelected = rows.length > 0 && rows.every((t) => selected.has(t.id));
  const pageSome = rows.some((t) => selected.has(t.id));
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
      rows.forEach((t) => (pageSelected ? next.delete(t.id) : next.add(t.id)));
      return next;
    });

  // ---------- Amallar ----------
  const handleSubmit = (data) => {
    // Ketgan ustozga guruh biriktirilmaydi — guruhlari bo‘shatiladi
    const releasing = data.status === 'left' && data.groups.length > 0;
    const payload = releasing ? { ...data, groups: [] } : data;

    if (form.teacher) {
      update(form.teacher.id, payload);
      toast.success(`${teacherName(payload)} ma'lumotlari saqlandi`);
    } else {
      const created = add(payload);
      toast.success(`${teacherName(created)} qo‘shildi (${created.id})`);
      setSort({ key: 'name', dir: 'asc' });
      
    }
    if (releasing) toast.info(`${data.groups.length} ta guruh ustozsiz qoldi — yangi ustoz biriktiring`);
    setForm({ open: false, teacher: null });
  };

  const confirmDelete = () => {
    const ids = toDelete.map((t) => t.id);
    const removed = remove(ids);
    setToDelete(null);
    setViewId(null);
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    toast.info(removed.length === 1 ? 'Ustoz o‘chirildi' : `${removed.length} ta ustoz o‘chirildi`, {
      action: { label: 'Qaytarish', onClick: () => restore(removed) },
    });
  };

  const changeStatus = (ids, status) => {
    const set = new Set(ids);
    const affected = teachers.filter((t) => set.has(t.id));
    if (status === 'left') {
      // Ketgan ustozning guruhlari bo‘shatiladi; "Qaytarish" holat va guruhlarni tiklaydi
      const released = affected.reduce((n, t) => n + t.groups.length, 0);
      const before = affected.map((t) => ({ id: t.id, status: t.status, groups: t.groups }));
      affected.forEach((t) => update(t.id, { status, groups: [] }));
      toast.info(
        released > 0
          ? `Holat o‘zgartirildi: ${TEACHER_STATUSES[status].label}. ${released} ta guruh ustozsiz qoldi`
          : `Holat o‘zgartirildi: ${TEACHER_STATUSES[status].label}`,
        { action: { label: 'Qaytarish', onClick: () => before.forEach(({ id, ...patch }) => update(id, patch)) } },
      );
      return;
    }
    setStatus(ids, status);
    toast.success(
      ids.length === 1
        ? `Holat o‘zgartirildi: ${TEACHER_STATUSES[status].label}`
        : `${ids.length} ta ustoz holati o‘zgartirildi: ${TEACHER_STATUSES[status].label}`,
    );
  };

  const exportCsv = () => {
    const source = selected.size ? teachers.filter((t) => selected.has(t.id)) : filtered;
    const header = ['ID', 'Familiya', 'Ism', 'Jinsi', 'Tug‘ilgan sana', 'Telefon', 'Fanlari', 'Guruhlar', 'Talabalar soni', 'Holati', 'Ish haqi turi', 'Ish haqi qiymati', 'Taxminiy oylik (so‘m)', 'Tajriba (yil)', 'Ishga kirgan sana', 'Manzil'];
    const body = source.map((t) => {
      const st = statsById.get(t.id);
      return [
        t.id, t.lastName, t.firstName, t.gender === 'female' ? 'Ayol' : 'Erkak', formatDate(t.birthDate),
        formatPhone(t.phone), t.subjects.join(', '), t.groups.join(', '), st.studentCount,
        TEACHER_STATUSES[t.status].label, SALARY_TYPES.find((s) => s.value === t.salaryType)?.label ?? '',
        t.salaryValue, st.salary, t.experience, formatDate(t.hiredAt), t.address,
      ];
    });
    downloadCsv('ustozlar.csv', [header, ...body]);
    toast.success(`${source.length} ta ustoz CSV ga eksport qilindi`);
  };

  const menuItems = (t) => [
    { label: 'Profilni ko‘rish', icon: Eye, onClick: () => setViewId(t.id) },
    { label: 'Tahrirlash', icon: Pencil, onClick: () => setForm({ open: true, teacher: t }) },
    { label: 'Ishga qaytarish', icon: Play, hidden: t.status === 'active', onClick: () => changeStatus([t.id], 'active') },
    { label: 'Ta‘tilga chiqarish', icon: Plane, hidden: t.status !== 'active', onClick: () => changeStatus([t.id], 'vacation') },
    { label: 'Ketgan deb belgilash', icon: UserMinus, hidden: t.status === 'left', onClick: () => changeStatus([t.id], 'left') },
    { label: 'O‘chirish', icon: Trash2, tone: 'danger', divider: true, onClick: () => setToDelete([t]) },
  ];

  const orphanedGroups = toDelete ? toDelete.reduce((n, t) => n + t.groups.length, 0) : 0;
  const openCreate = () => setForm({ open: true, teacher: null });

  return (
    <div className="students-page teachers-page">
      <header className="page-head">
        <div>
          <h1>Ustozlar</h1>
          <p>O‘quv markazi ustozlari: guruhlar, dars jadvali va ish haqini boshqarish</p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn btn--secondary" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={16} /> Eksport
          </button>
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            <Plus size={16} /> Yangi ustoz
          </button>
        </div>
      </header>

      <section className="students-stats" aria-label="Ustozlar ko‘rsatkichlari">
        <StatCard title="Jami ustozlar" value={formatNumber(summary.total)} icon={Users} tone="primary" />
        <StatCard title="Ishlayotgan ustozlar" value={formatNumber(summary.active)} icon={UserCheck} tone="success" />
        <StatCard title="Ustozsiz guruhlar" value={formatNumber(summary.unassigned)} icon={AlertTriangle} tone="warning" />
        <StatCard title="Oylik ish haqi fondi" value={formatMoney(summary.salaryFund)} icon={Wallet} tone="danger" />
      </section>

      <Card className="students-card">
        <div className="toolbar">
          <div className="status-tabs" role="tablist" aria-label="Holat bo‘yicha">
            {[{ value: 'all', label: 'Barchasi' }, ...TEACHER_STATUS_OPTIONS].map((o) => (
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
                aria-label="Ustozlarni qidirish"
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
              />
            </div>
            <select className="input" aria-label="Fan" value={filters.subject} onChange={(e) => changeFilter('subject', e.target.value)}>
              <option value="all">Barcha fanlar</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="input" aria-label="Guruh biriktirilganligi" value={filters.groups} onChange={(e) => changeFilter('groups', e.target.value)}>
              <option value="all">Barcha ustozlar</option>
              <option value="with">Guruhi borlar</option>
              <option value="without">Guruhsizlar</option>
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
              <button type="button" className="btn btn--danger btn--sm" onClick={() => setToDelete(teachers.filter((t) => selected.has(t.id)))}>
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
            <h3>{teachers.length === 0 ? 'Hali ustozlar yo‘q' : 'Ustozlar topilmadi'}</h3>
            <p>
              {teachers.length === 0
                ? 'Birinchi ustozni qo‘shib, ishni boshlang.'
                : 'Qidiruv yoki filtr shartlariga mos ustoz yo‘q. Filtrlarni o‘zgartirib ko‘ring.'}
            </p>
            {teachers.length === 0 ? (
              <button type="button" className="btn btn--primary" onClick={openCreate}>
                <Plus size={16} /> Yangi ustoz
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
                {rows.map((t) => {
                  const status = TEACHER_STATUSES[t.status];
                  const st = statsById.get(t.id);
                  const isSelected = selected.has(t.id);
                  return (
                    <tr key={t.id} className={isSelected ? 'is-selected' : undefined}>
                      <td className="data-table__check">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(t.id)}
                          aria-label={`${teacherName(t)} ni tanlash`}
                        />
                      </td>
                      <td>
                        <button type="button" className="student-cell" onClick={() => setViewId(t.id)}>
                          <Avatar firstName={t.firstName} lastName={t.lastName} />
                          <span className="student-cell__text">
                            <span className="student-cell__name">{teacherName(t)}</span>
                            <span className="student-cell__id">{t.id}</span>
                          </span>
                        </button>
                      </td>
                      <td className="col-lg data-table__muted">{formatPhone(t.phone)}</td>
                      <td className="col-sm">{t.subjects.join(', ')}</td>
                      <td className="col-md">
                        {t.groups.length ? (
                          <span className="tag-list">
                            {t.groups.map((g) => <span key={g} className="tag">{g}</span>)}
                          </span>
                        ) : (
                          <span className="data-table__muted">—</span>
                        )}
                      </td>
                      <td className="is-right">{formatNumber(st.studentCount)}</td>
                      <td><span className={`badge badge--dot badge--${status.tone}`}>{status.label}</span></td>
                      <td className="col-xl is-right data-table__muted">
                        {t.status === 'left' ? '—' : formatSom(st.salary)}
                      </td>
                      <td className="data-table__actions">
                        <RowMenu items={menuItems(t)} label={`${teacherName(t)} uchun amallar`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        
      </Card>

      <TeacherFormModal
        open={form.open}
        teacher={form.teacher}
        teachers={teachers}
        onClose={() => setForm({ open: false, teacher: null })}
        onSubmit={handleSubmit}
      />

      <TeacherDrawer
        teacher={viewTeacher}
        students={students}
        onClose={() => setViewId(null)}
        onEdit={(t) => setForm({ open: true, teacher: t })}
        onDelete={(t) => setToDelete([t])}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={toDelete?.length > 1 ? `${toDelete.length} ta ustozni o‘chirasizmi?` : 'Ustozni o‘chirasizmi?'}
        message={
          <>
            {toDelete?.length === 1
              ? `${teacherName(toDelete[0])} ro‘yxatdan o‘chiriladi.`
              : 'Tanlangan ustozlar ro‘yxatdan o‘chiriladi.'}
            {orphanedGroups > 0 && ` ${orphanedGroups} ta guruh ustozsiz qoladi.`}
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

export default Teachers;
