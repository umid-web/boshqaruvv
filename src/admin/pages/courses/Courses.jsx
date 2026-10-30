import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  BookOpen,
  Clock,
  Eye,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import RowMenu from '../../components/ui/RowMenu';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import useReceptionPermissions from '../../../Reception/useReceptionPermissions';
import { useToast } from '../../components/ui/useToast';
import { formatMoney, formatNumber, formatSom } from '../../utils/format';
import { useStudents } from '../students/useStudents';
import { useTeachers } from '../teachers/teachersStore';
import { useSupportTeachers } from '../support-teachers/supportStore';
import CourseFormModal from './CourseFormModal';
import CourseDrawer from './CourseDrawer';
import { useCourses } from './coursesStore';
import { COURSE_STATUS_OPTIONS, COURSE_STATUSES, getCourseStats } from './coursesData';
import '../students/Students.scss';
import './Courses.scss';

const SORTS = [
  { value: 'name', label: 'Nomi bo‘yicha' },
  { value: 'students', label: 'Talabalar soni' },
  { value: 'revenue', label: 'Oylik tushum' },
  { value: 'fee', label: 'Narxi' },
];

const Courses = () => {
  const can = useReceptionPermissions();
  const canCreate = can('courses', 'create');
  const canEdit = can('courses', 'edit');
  const canDelete = can('courses', 'delete');
  const toast = useToast();
  const { courses, add, update, remove, restore } = useCourses();
  // Talabalar va ustozlar faqat o‘qiladi: kurs ko‘rsatkichlari shulardan hisoblanadi
  const { students } = useStudents();
  const { teachers } = useTeachers();
  const { supportTeachers } = useSupportTeachers();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sortKey, setSortKey] = useState('name');

  const [form, setForm] = useState({ open: false, course: null });
  const [viewId, setViewId] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  // ---------- Hisoblangan ma'lumotlar ----------
  const statsById = useMemo(() => {
    const map = new Map();
    for (const c of courses) map.set(c.id, getCourseStats(c, students, teachers, supportTeachers));
    return map;
  }, [courses, students, teachers, supportTeachers]);

  const summary = useMemo(() => {
    const live = courses.filter((c) => c.status === 'active');
    const sum = (key) => live.reduce((n, c) => n + (statsById.get(c.id)?.[key] ?? 0), 0);
    return {
      active: live.length,
      students: sum('activeStudents'),
      groups: sum('groupCount'),
      revenue: sum('revenue'),
      noTeacher: sum('groupsWithoutTeacher'),
    };
  }, [courses, statsById]);

  const statusCounts = useMemo(() => {
    const counts = { all: courses.length };
    for (const c of courses) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return counts;
  }, [courses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = courses.filter(
      (c) => (status === 'all' || c.status === status) && (!q || `${c.name} ${c.level} ${c.id}`.toLowerCase().includes(q)),
    );
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name, 'uz'),
      students: (a, b) => statsById.get(b.id).activeStudents - statsById.get(a.id).activeStudents,
      revenue: (a, b) => statsById.get(b.id).revenue - statsById.get(a.id).revenue,
      fee: (a, b) => b.fee - a.fee,
    };
    return [...list].sort((a, b) => sorters[sortKey](a, b) || a.id.localeCompare(b.id));
  }, [courses, query, status, sortKey, statsById]);

  const viewCourse = courses.find((c) => c.id === viewId) ?? null;
  const hasFilters = query.trim() !== '' || status !== 'all';
  const clearFilters = () => {
    setQuery('');
    setStatus('all');
  };

  // ---------- Amallar ----------
  const handleSubmit = (data) => {
    if (form.course ? !canEdit : !canCreate) return;
    if (form.course) {
      update(form.course.id, data);
      toast.success(`“${data.name}” kursi saqlandi`);
    } else {
      const created = add(data);
      toast.success(`“${created.name}” kursi qo‘shildi`);
      toast.info('Guruhlar hozircha kod orqali qo‘shiladi — kursga guruh biriktirilgach, talabalar shu yerda ko‘rinadi');
    }
    setForm({ open: false, course: null });
  };

  const requestDelete = (course) => {
    const st = statsById.get(course.id);
    // Guruh yoki talabasi bor kursni o‘chirib bo‘lmaydi — ma'lumotlar bog‘liqligi buzilmasligi uchun
    if (st.groupCount > 0 || st.totalStudents > 0) {
      toast.error(
        `“${course.name}” kursida ${st.groupCount} ta guruh va ${st.totalStudents} ta talaba bor — o‘chirib bo‘lmaydi`,
        course.status === 'active'
          ? { action: { label: 'Arxivga o‘tkazish', onClick: () => changeStatus(course, 'archived') } }
          : undefined,
      );
      return;
    }
    setToDelete(course);
  };

  const confirmDelete = () => {
    if (!canDelete || !toDelete) return;
    const removed = remove([toDelete.id]);
    setToDelete(null);
    setViewId(null);
    toast.info('Kurs o‘chirildi', { action: { label: 'Qaytarish', onClick: () => restore(removed) } });
  };

  const changeStatus = (course, next) => {
    if (!canEdit) return;
    update(course.id, { status: next });
    toast.success(next === 'archived' ? `“${course.name}” arxivga o‘tkazildi` : `“${course.name}” qayta faollashtirildi`);
  };

  const menuItems = (c) => [
    { label: 'Batafsil', icon: Eye, onClick: () => setViewId(c.id) },
    { label: 'Tahrirlash', icon: Pencil, onClick: () => setForm({ open: true, course: c }) },
    { label: 'Arxivga o‘tkazish', icon: Archive, hidden: c.status !== 'active', onClick: () => changeStatus(c, 'archived') },
    { label: 'Faollashtirish', icon: ArchiveRestore, hidden: c.status === 'active', onClick: () => changeStatus(c, 'active') },
    { label: 'O‘chirish', icon: Trash2, tone: 'danger', divider: true, onClick: () => requestDelete(c) },
  ].filter((item) => item.icon === Eye || (item.icon === Pencil && canEdit) || ([Archive, ArchiveRestore].includes(item.icon) && canEdit) || (item.icon === Trash2 && canDelete));

  const openCreate = () => setForm({ open: true, course: null });

  return (
    <div className="students-page courses-page">
      <header className="page-head">
        <div>
          <h1>Kurslar</h1>
          <p>O‘quv markazi kurslari: narx, dastur, guruhlar va ustozlar</p>
        </div>
        <div className="page-head__actions">
          {canCreate && <button type="button" className="btn btn--primary" onClick={openCreate}>
            <Plus size={16} /> Yangi kurs
          </button>}
        </div>
      </header>

      <section className="students-stats" aria-label="Kurslar ko‘rsatkichlari">
        <StatCard title="Faol kurslar" value={formatNumber(summary.active)} icon={BookOpen} tone="primary" />
        <StatCard title="Faol talabalar" value={formatNumber(summary.students)} icon={GraduationCap} tone="success" />
        <StatCard title="Guruhlar" value={formatNumber(summary.groups)} icon={Layers} tone="warning" />
        <StatCard title="Oylik tushum (kutilayotgan)" value={formatMoney(summary.revenue)} icon={Wallet} tone="danger" />
      </section>

      <div className="courses-toolbar">
        <div className="status-tabs" role="tablist" aria-label="Holat bo‘yicha">
          {[{ value: 'all', label: 'Barchasi' }, ...COURSE_STATUS_OPTIONS].map((o) => (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={status === o.value}
              className={status === o.value ? 'status-tab is-active' : 'status-tab'}
              onClick={() => setStatus(o.value)}
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
              placeholder="Kurs nomi yoki darajasi…"
              aria-label="Kurslarni qidirish"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className="input" aria-label="Saralash" value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {hasFilters && (
            <button type="button" className="btn btn--ghost" onClick={clearFilters}>
              <X size={15} /> Tozalash
            </button>
          )}
        </div>
      </div>

      {summary.noTeacher > 0 && (
        <p className="courses-warning" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          {summary.noTeacher} ta guruhga asosiy ustoz biriktirilmagan — Ustozlar bo‘limida biriktiring.
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state courses-empty">
          <span className="empty-state__icon"><SearchX size={28} /></span>
          <h3>{courses.length === 0 ? 'Hali kurslar yo‘q' : 'Kurslar topilmadi'}</h3>
          <p>
            {courses.length === 0
              ? 'Birinchi kursni qo‘shib, ishni boshlang.'
              : 'Qidiruv yoki filtr shartlariga mos kurs yo‘q.'}
          </p>
          {courses.length === 0 && canCreate ? (
            <button type="button" className="btn btn--primary" onClick={openCreate}>
              <Plus size={16} /> Yangi kurs
            </button>
          ) : (
            <button type="button" className="btn btn--secondary" onClick={clearFilters}>Filtrlarni tozalash</button>
          )}
        </div>
      ) : (
        <div className="course-grid">
          {filtered.map((c) => {
            const st = statsById.get(c.id);
            const state = COURSE_STATUSES[c.status];
            return (
              <article key={c.id} className={`course-card course-card--${c.color}${c.status === 'archived' ? ' is-archived' : ''}`}>
                <header className="course-card__head">
                  <span className="course-card__icon" aria-hidden="true"><BookOpen size={20} /></span>
                  <div className="course-card__title">
                    <h3>
                      <button type="button" onClick={() => setViewId(c.id)}>{c.name}</button>
                    </h3>
                    <span>{c.level} · {c.id}</span>
                  </div>
                  <RowMenu items={menuItems(c)} label={`${c.name} uchun amallar`} />
                </header>

                <p className="course-card__desc">{c.description || 'Tavsif kiritilmagan'}</p>

                <div className="course-card__meta">
                  <span><Clock size={14} aria-hidden="true" /> {c.durationMonths} oy · {c.lessonMinutes} daq</span>
                  <span className={`badge badge--dot badge--${state.tone}`}>{state.label}</span>
                </div>

                <div className="course-card__price">
                  <span>Oylik to‘lov</span>
                  <strong>{formatSom(c.fee)}</strong>
                </div>

                <dl className="course-card__stats">
                  <div><dt><Users size={13} aria-hidden="true" /> Talabalar</dt><dd>{formatNumber(st.activeStudents)}</dd></div>
                  <div><dt><Layers size={13} aria-hidden="true" /> Guruhlar</dt><dd>{formatNumber(st.groupCount)}</dd></div>
                  <div><dt><Wallet size={13} aria-hidden="true" /> Tushum</dt><dd>{formatMoney(st.revenue)}</dd></div>
                </dl>
              </article>
            );
          })}
        </div>
      )}

      <CourseFormModal
        open={form.open}
        course={form.course}
        courses={courses}
        locked={form.course ? statsById.get(form.course.id).groupCount > 0 || statsById.get(form.course.id).totalStudents > 0 : false}
        onClose={() => setForm({ open: false, course: null })}
        onSubmit={handleSubmit}
      />

      <CourseDrawer
        course={viewCourse}
        stats={viewCourse ? statsById.get(viewCourse.id) : null}
        students={students}
        teachers={teachers}
        onClose={() => setViewId(null)}
        onEdit={canEdit ? (c) => setForm({ open: true, course: c }) : null}
        onDelete={canDelete ? requestDelete : null}
        onToggleArchive={canEdit ? (c) => changeStatus(c, c.status === 'active' ? 'archived' : 'active') : null}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Kursni o‘chirasizmi?"
        message={
          <>
            “{toDelete?.name}” kursi ro‘yxatdan o‘chiriladi.
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

export default Courses;
