import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  CreditCard,
  Download,
  Eye,
  GraduationCap,
  Pencil,
  Play,
  Plus,
  Search,
  SearchX,
  Snowflake,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Avatar from '../../components/ui/Avatar';
import RowMenu from '../../components/ui/RowMenu';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/useToast';
import { downloadCsv } from '../../utils/csv';
import { formatDate, formatNumber, formatPhone, formatSom } from '../../utils/format';
import { isoDate, usePayments } from '../finance/financeStore';
import StudentFormModal from './StudentFormModal';
import StudentDrawer from './StudentDrawer';
import { useStudents } from './useStudents';
import useReceptionPermissions from '../../../Reception/useReceptionPermissions';
import {
  ALL_GROUPS,
  COURSES,
  GENDERS,
  PAYMENT_OPTIONS,
  PAYMENT_STATUSES,
  STATUSES,
  STATUS_OPTIONS,
  getCourse,
  getPaymentStatus,
} from './studentsData';
import './Students.scss';

const DEFAULT_FILTERS = { status: 'all', course: 'all', group: 'all', payment: 'all' };
const ARCHIVE_STATUSES = new Set(['graduated']);
const DELETED_STATUS = 'dropped';
const STATUS_TABS = [
  { value: 'all', label: 'Barchasi' },
  ...STATUS_OPTIONS.filter(({ value }) => !ARCHIVE_STATUSES.has(value) && value !== DELETED_STATUS),
  { value: 'archive', label: 'Arxiv' },
];

const COLUMNS = [
  { key: 'name', label: 'Talaba', sortable: true },
  { key: 'phone', label: 'Telefon', className: 'col-lg' },
  { key: 'course', label: 'Kurs / guruh', sortable: true, className: 'col-sm' },
  { key: 'status', label: 'Holati', sortable: true },
  { key: 'payment', label: 'To‘lov', className: 'col-md' },
  { key: 'debt', label: 'Qarz', sortable: true, align: 'right' },
  { key: 'enrolledAt', label: 'Qo‘shilgan', sortable: true, className: 'col-xl' },
];

const SORTERS = {
  name: (a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'uz'),
  course: (a, b) => `${a.course}${a.group}`.localeCompare(`${b.course}${b.group}`, 'uz'),
  status: (a, b) => a.status.localeCompare(b.status),
  debt: (a, b) => a.debt - b.debt,
  enrolledAt: (a, b) => a.enrolledAt.localeCompare(b.enrolledAt),
};

const matchesQuery = (s, q) => {
  if (!q) return true;
  const text = `${s.lastName} ${s.firstName} ${s.id} ${s.group} ${s.course}`.toLowerCase();
  const digits = q.replace(/\D/g, '');
  return text.includes(q) || (digits.length >= 3 && (s.phone.includes(digits) || s.parentPhone.includes(digits)));
};

const Students = () => {
  const toast = useToast();
  const can = useReceptionPermissions();
  const canCreate = can('students', 'create');
  const canEdit = can('students', 'edit');
  const canDelete = can('students', 'delete');
  const canExport = can('students', 'export');
  const canReceivePayment = can('payments', 'create');
  const { students, add, update, remove, restore, setStatus } = useStudents();
  const { payments, add: addPayment, removeForStudent } = usePayments(students);

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState({ key: 'enrolledAt', dir: 'desc' });
  const [selected, setSelected] = useState(() => new Set());
  const [paymentTarget, setPaymentTarget] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  const [form, setForm] = useState({ open: false, student: null });
  const [viewId, setViewId] = useState(null);
  const [toDelete, setToDelete] = useState(null); // o‘chirilishi kutilayotgan talabalar ro‘yxati

  // ---------- Hisoblangan ma'lumotlar ----------
  const stats = useMemo(() => {
    const currentStudents = students.filter((student) => !ARCHIVE_STATUSES.has(student.status));
    const debtors = currentStudents.filter((s) => s.debt > 0);
    return {
      total: currentStudents.length,
      active: currentStudents.filter((s) => s.status === 'active').length,
      debtors: debtors.length,
    };
  }, [students]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: students.filter((student) => !ARCHIVE_STATUSES.has(student.status)).length,
      archive: students.filter((student) => ARCHIVE_STATUSES.has(student.status)).length,
    };
    for (const s of students) counts[s.status] = (counts[s.status] ?? 0) + 1;
    return counts;
  }, [students]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = students.filter(
      (s) =>
        (filters.status === 'all' ? !ARCHIVE_STATUSES.has(s.status) : filters.status === 'archive' ? ARCHIVE_STATUSES.has(s.status) : s.status === filters.status) &&
        (filters.course === 'all' || s.course === filters.course) &&
        (filters.group === 'all' || s.group === filters.group) &&
        (filters.payment === 'all' || getPaymentStatus(s) === filters.payment) &&
        matchesQuery(s, q),
    );
    const compare = SORTERS[sort.key];
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) =>
      a.group.localeCompare(b.group, 'uz', { numeric: true }) ||
      compare(a, b) * dir ||
      a.id.localeCompare(b.id),
    );
  }, [students, query, filters, sort]);

  const rows = filtered;
  const isArchive = filters.status === 'archive';
  const hasFilters = query.trim() !== '' || Object.keys(DEFAULT_FILTERS).some((k) => filters[k] !== DEFAULT_FILTERS[k]);
  const groupOptions = filters.course === 'all' ? ALL_GROUPS : getCourse(filters.course).groups;
  const viewStudent = students.find((s) => s.id === viewId) ?? null;

  const openPayment = (student) => {
    setPaymentTarget(student.id);
    setPaymentAmount(String(Math.min(Number(student.debt) || 0, Number(student.monthlyFee) || Number(student.debt) || 0)));
  };

  const recordPayment = (student) => {
    if (!canReceivePayment) return;
    const amount = Math.round(Number(paymentAmount));
    const debt = Number(student.debt) || 0;
    if (!Number.isFinite(amount) || amount <= 0 || amount > debt) {
      toast.error(`Summa 1 dan ${formatSom(debt)} gacha bo‘lishi kerak.`);
      return;
    }
    const date = isoDate(new Date());
    addPayment({ studentId: student.id, name: `${student.lastName} ${student.firstName}`, group: student.group, amount, method: 'Naqd', date, period: date.slice(0, 7) });
    update(student.id, { debt: Math.max(0, debt - amount) });
    toast.success(`${student.lastName} ${student.firstName} uchun ${formatSom(amount)} to‘lov saqlandi.`);
    setPaymentTarget('');
    setPaymentAmount('');
  };

  // Sahifadagi barcha qatorlar tanlanganmi (header checkbox holati)
  const pageSelected = rows.length > 0 && rows.every((s) => selected.has(s.id));
  const pageSome = rows.some((s) => selected.has(s.id));
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
    setFilters((f) => ({
      ...f,
      [name]: value,
      ...(name === 'course' ? { group: 'all' } : {}),
    }));
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
      rows.forEach((s) => (pageSelected ? next.delete(s.id) : next.add(s.id)));
      return next;
    });

  // ---------- Amallar ----------
  const handleSubmit = (data) => {
    if (form.student ? !canEdit : !canCreate) return;
    if (form.student) {
      if (data.status === DELETED_STATUS) {
        removeForStudent(form.student.id);
        remove([form.student.id]);
        toast.success(`${form.student.lastName} ${form.student.firstName} bazadan o‘chirildi`);
        setForm({ open: false, student: null });
        return;
      }
      update(form.student.id, data);
      toast.success(`${data.lastName} ${data.firstName} ma'lumotlari saqlandi`);
    } else {
      const created = add(data);
      toast.success(
        `${created.lastName} ${created.firstName} qo‘shildi (${created.id}). ${
          created.debt > 0 ? `To‘lov: ${formatSom(created.debt)} — to‘lanmagan` : 'Bu oy uchun to‘lov yo‘q (dars qolmagan)'
        }`,
      );
      setSort({ key: 'enrolledAt', dir: 'desc' });
    }
    setForm({ open: false, student: null });
  };

  const confirmDelete = () => {
    if (!canDelete || !toDelete) return;
    const ids = toDelete.map((s) => s.id);
    const removed = remove(ids);
    setToDelete(null);
    setViewId(null);
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    toast.info(removed.length === 1 ? 'Talaba o‘chirildi' : `${removed.length} ta talaba o‘chirildi`, {
      action: { label: 'Qaytarish', onClick: () => restore(removed) },
    });
  };

  const changeStatus = (ids, status) => {
    setStatus(ids, status);
    toast.success(
      ids.length === 1
        ? `Holat o‘zgartirildi: ${STATUSES[status].label}`
        : `${ids.length} ta talaba holati o‘zgartirildi: ${STATUSES[status].label}`,
    );
  };

  const exportCsv = () => {
    if (!canExport) return;
    const source = selected.size ? students.filter((s) => selected.has(s.id)) : filtered;
    const header = ['ID', 'Familiya', 'Ism', 'Jinsi', 'Tug‘ilgan sana', 'Telefon', 'Ota-ona telefoni', 'Kurs', 'Guruh', 'Holati', 'To‘lov holati', 'Oylik to‘lov (so‘m)', 'Qarz (so‘m)', 'Davomat (%)', 'Qo‘shilgan sana', 'Manzil'];
    const body = source.map((s) => [
      s.id, s.lastName, s.firstName,
      GENDERS.find((g) => g.value === s.gender)?.label ?? '',
      formatDate(s.birthDate), formatPhone(s.phone), formatPhone(s.parentPhone),
      s.course, s.group, STATUSES[s.status].label, PAYMENT_STATUSES[getPaymentStatus(s)].label,
      s.monthlyFee, s.debt, s.attendance, formatDate(s.enrolledAt), s.address,
    ]);
    downloadCsv('talabalar.csv', [header, ...body]);
    toast.success(`${source.length} ta talaba CSV ga eksport qilindi`);
  };

  const menuItems = (s) => [
    { label: 'Profilni ko‘rish', icon: Eye, onClick: () => setViewId(s.id) },
    { label: 'Tahrirlash', icon: Pencil, onClick: () => setForm({ open: true, student: s }) },
    s.status === 'active'
      ? { label: 'Muzlatish', icon: Snowflake, onClick: () => changeStatus([s.id], 'frozen') }
      : { label: 'Faollashtirish', icon: Play, onClick: () => changeStatus([s.id], 'active') },
    { label: 'O‘chirish', icon: Trash2, tone: 'danger', divider: true, onClick: () => setToDelete([s]) },
  ];

  const visibleMenuItems = (student) => menuItems(student).filter((item) =>
    item.icon !== Pencil || canEdit
  ).filter((item) => item.icon !== Trash2 || canDelete)
    .filter((item) => ![Snowflake, Play].includes(item.icon) || canEdit);

  return (
    <div className="students-page">
      <header className="page-head">
        <div>
          <h1>Talabalar</h1>
          <p>O‘quv markazidagi barcha talabalar: qidirish, filtrlash va boshqarish</p>
        </div>
        <div className="page-head__actions">
          {canExport && <button type="button" className="btn btn--secondary" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={16} /> Eksport
          </button>}
          {canCreate && <button type="button" className="btn btn--primary" onClick={() => setForm({ open: true, student: null })}>
            <Plus size={16} /> Yangi talaba
          </button>}
        </div>
      </header>

      <section className="students-stats students-overview-stats" aria-label="Talabalar ko‘rsatkichlari">
        <StatCard title="Faol talabalar" value={formatNumber(stats.active)} icon={UserCheck} tone="success" />
        <StatCard title="Jami talabalar" value={formatNumber(stats.total)} icon={GraduationCap} tone="primary" />
        <StatCard title="To‘lov kutilmoqda" value={formatNumber(stats.debtors)} icon={AlertTriangle} tone="warning" />
      </section>

      <Card className="students-card">
        <div className="toolbar">
          <div className="status-tabs" role="tablist" aria-label="Holat bo‘yicha">
            {STATUS_TABS.map((o) => (
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
                placeholder="Ism, ID, telefon yoki guruh…"
                aria-label="Talabalarni qidirish"
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
              />
            </div>
            <select className="input" aria-label="Kurs" value={filters.course} onChange={(e) => changeFilter('course', e.target.value)}>
              <option value="all">Barcha kurslar</option>
              {COURSES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <select className="input" aria-label="Guruh" value={filters.group} onChange={(e) => changeFilter('group', e.target.value)}>
              <option value="all">Barcha guruhlar</option>
              {groupOptions.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select className="input" aria-label="To‘lov holati" value={filters.payment} onChange={(e) => changeFilter('payment', e.target.value)}>
              <option value="all">Barcha to‘lovlar</option>
              {PAYMENT_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
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
            <span><strong>{selected.size}</strong> ta talaba tanlandi</span>
            <div className="bulk-bar__actions">
              {canEdit && <button type="button" className="btn btn--secondary btn--sm" onClick={() => changeStatus([...selected], 'active')}>
                <Play size={14} /> Faollashtirish
              </button>}
              {canEdit && <button type="button" className="btn btn--secondary btn--sm" onClick={() => changeStatus([...selected], 'frozen')}>
                <Snowflake size={14} /> Muzlatish
              </button>}
              {canExport && <button type="button" className="btn btn--secondary btn--sm" onClick={exportCsv}>
                <Download size={14} /> Eksport
              </button>}
              {canDelete && <button type="button" className="btn btn--danger btn--sm" onClick={() => setToDelete(students.filter((s) => selected.has(s.id)))}>
                <Trash2 size={14} /> O‘chirish
              </button>}
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelected(new Set())}>
                Bekor qilish
              </button>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon"><SearchX size={28} /></span>
            <h3>{students.length === 0 ? 'Hali talabalar yo‘q' : 'Talabalar topilmadi'}</h3>
            <p>
              {students.length === 0
                ? 'Birinchi talabani qo‘shib, ishni boshlang.'
                : 'Qidiruv yoki filtr shartlariga mos talaba yo‘q. Filtrlarni o‘zgartirib ko‘ring.'}
            </p>
            {students.length === 0 && canCreate ? (
              <button type="button" className="btn btn--primary" onClick={() => setForm({ open: true, student: null })}>
                <Plus size={16} /> Yangi talaba
              </button>
            ) : (
              <button type="button" className="btn btn--secondary" onClick={clearFilters}>Filtrlarni tozalash</button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className={isArchive ? 'data-table data-table--archive' : 'data-table'}>
              <thead>
                <tr>
                  <th className="data-table__check">
                    <input
                      ref={headCheckbox}
                      type="checkbox"
                      checked={pageSelected}
                      onChange={togglePage}
                      aria-label="Sahifadagi barcha talabalarni tanlash"
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
                {rows.map((s, index) => {
                  const status = STATUSES[s.status];
                  const payment = PAYMENT_STATUSES[getPaymentStatus(s)];
                  const isSelected = selected.has(s.id);
                  return (
                    <Fragment key={s.id}>
                    {(index === 0 || rows[index - 1].group !== s.group) && (
                      <tr className="student-group-row">
                        <td colSpan={COLUMNS.length + 2}>
                          <strong>{s.group}</strong><span>{s.course} · {filtered.filter((student) => student.group === s.group).length} ta talaba</span>
                        </td>
                      </tr>
                    )}
                    <tr className={isSelected ? 'is-selected' : undefined}>
                      <td className="data-table__check">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(s.id)}
                          aria-label={`${s.lastName} ${s.firstName} ni tanlash`}
                        />
                      </td>
                      <td>
                        <button type="button" className="student-cell" onClick={() => setViewId(s.id)}>
                          <Avatar firstName={s.firstName} lastName={s.lastName} />
                          <span className="student-cell__text">
                            <span className="student-cell__name">{s.lastName} {s.firstName}</span>
                            <span className="student-cell__id">{s.id}</span>
                          </span>
                        </button>
                      </td>
                      <td className="col-lg data-table__muted">{formatPhone(s.phone)}</td>
                      <td className="col-sm">
                        <div className="two-line">
                          <span>{s.course}</span>
                          <span className="data-table__muted">{s.group}</span>
                        </div>
                      </td>
                      <td><span className={`badge badge--dot badge--${status.tone}`}>{status.label}</span></td>
                      <td className="col-md">
                        <span className={`badge badge--${payment.tone}`}>{payment.label}</span>
                        {canReceivePayment && Number(s.debt) > 0 && (paymentTarget === s.id ? (
                          <div className="student-payment-form">
                            <label>Summa<input type="number" min="1" max={s.debt} step="1000" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></label>
                            <div><button type="button" className="btn btn--primary btn--sm" onClick={() => recordPayment(s)}>To‘lash</button><button type="button" className="btn btn--ghost btn--sm" onClick={() => setPaymentTarget('')}>Bekor</button></div>
                          </div>
                        ) : (
                          <button type="button" className="student-payment-open" onClick={() => openPayment(s)} aria-label={`${s.lastName} ${s.firstName} uchun to‘lov kiritish`} title="To‘lov kiritish"><CreditCard size={15} /></button>
                        ))}
                      </td>
                      <td className="is-right">
                        {s.debt ? <span className="debt">{formatSom(s.debt)}</span> : <span className="data-table__muted">—</span>}
                      </td>
                      <td className="col-xl data-table__muted">{formatDate(s.enrolledAt)}</td>
                      <td className="data-table__actions">
                        <RowMenu items={visibleMenuItems(s)} label={`${s.lastName} ${s.firstName} uchun amallar`} />
                      </td>
                    </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </Card>

      <StudentFormModal
        open={form.open}
        student={form.student}
        onClose={() => setForm({ open: false, student: null })}
        onSubmit={handleSubmit}
      />

      <StudentDrawer
        student={viewStudent}
        payments={payments}
        onClose={() => setViewId(null)}
        onEdit={canEdit ? (s) => setForm({ open: true, student: s }) : null}
        onDelete={canDelete ? (s) => setToDelete([s]) : null}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={toDelete?.length > 1 ? `${toDelete.length} ta talabani o‘chirasizmi?` : 'Talabani o‘chirasizmi?'}
        message={
          toDelete?.length === 1
            ? `${toDelete[0].lastName} ${toDelete[0].firstName} ro‘yxatdan o‘chiriladi. O‘chirgandan so‘ng bir necha soniya ichida “Qaytarish” tugmasi orqali tiklashingiz mumkin.`
            : 'Tanlangan talabalar ro‘yxatdan o‘chiriladi. O‘chirgandan so‘ng bir necha soniya ichida “Qaytarish” tugmasi orqali tiklashingiz mumkin.'
        }
        confirmLabel="O‘chirish"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

export default Students;
