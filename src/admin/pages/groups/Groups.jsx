import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Download,
  Eye,
  Layers,
  Pencil,
  Play,
  Plus,
  Search,
  SearchX,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import RowMenu from '../../components/ui/RowMenu';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import useReceptionPermissions from '../../../Reception/useReceptionPermissions';
import { useToast } from '../../components/ui/useToast';
import { downloadCsv } from '../../utils/csv';
import { formatNumber } from '../../utils/format';
import { useStudents } from '../students/useStudents';
import { useTeachers } from '../teachers/teachersStore';
import { useSupportTeachers } from '../support-teachers/supportStore';
import { SUPPORT_ROLES } from '../support-teachers/supportData';
import { useCourses } from '../courses/coursesStore';
import GroupFormModal from './GroupFormModal';
import GroupDrawer from './GroupDrawer';
import AssignTeachersModal from './AssignTeachersModal';
import { useGroups } from './groupsStore';
import { GROUP_STATUSES, GROUP_STATUS_OPTIONS, findRoomConflict, formatGroupSchedule, getGroupStats, getGroupTeam, teacherName } from './groupsData';
import '../students/Students.scss';
import '../teachers/Teachers.scss';
import './Groups.scss';

const DEFAULT_FILTERS = { status: 'all', course: 'all', team: 'all' };

const COLUMNS = [
  { key: 'code', label: 'Guruh', sortable: true },
  { key: 'course', label: 'Kurs', sortable: true, className: 'col-sm' },
  { key: 'schedule', label: 'Dars jadvali', className: 'col-md' },
  { key: 'main', label: 'Asosiy ustoz', sortable: true, className: 'col-lg' },
  { key: 'support', label: 'Qo‘shimcha ustozlar', sortable: true, className: 'col-xl' },
  { key: 'students', label: 'Talabalar', sortable: true, align: 'right' },
  { key: 'status', label: 'Holati', sortable: true },
];

const peopleText = (team) =>
  [team.main && teacherName(team.main), ...team.support.map(teacherName)].filter(Boolean).join(' ');

const Groups = () => {
  const toast = useToast();
  const can = useReceptionPermissions();
  const canCreate = can('groups', 'create');
  const canEdit = can('groups', 'edit');
  const canDelete = can('groups', 'delete');
  const canExport = can('groups', 'export');
  const { groups, add, update, remove, restore, setStatus } = useGroups();
  const { teachers, update: updateTeacher } = useTeachers();
  const { supportTeachers, update: updateSupport } = useSupportTeachers();
  const { courses } = useCourses();
  // Talabalar faqat o‘qiladi: guruh to‘laligi, tushum va davomat shundan hisoblanadi
  const { students } = useStudents();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState({ key: 'code', dir: 'asc' });
  const [selected, setSelected] = useState(() => new Set());

  const [form, setForm] = useState({ open: false, group: null });
  const [assignCode, setAssignCode] = useState(null);
  const [viewCode, setViewCode] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  // ---------- Hisoblangan ma'lumotlar ----------
  const info = useMemo(() => {
    const map = new Map();
    for (const g of groups) {
      map.set(g.code, { team: getGroupTeam(g.code, teachers, supportTeachers), stats: getGroupStats(g, students) });
    }
    return map;
  }, [groups, teachers, supportTeachers, students]);

  const courseNames = useMemo(() => {
    const names = courses.filter((c) => c.status === 'active').map((c) => c.name);
    if (form.group && !names.includes(form.group.course)) names.push(form.group.course);
    return names;
  }, [courses, form.group]);

  const summary = useMemo(() => {
    const active = groups.filter((g) => g.status === 'active');
    return {
      total: groups.length,
      students: active.reduce((sum, g) => sum + info.get(g.code).stats.activeStudents, 0),
      withoutMain: active.filter((g) => !info.get(g.code).team.main).length,
      withSupport: active.filter((g) => info.get(g.code).team.support.length > 0).length,
    };
  }, [groups, info]);

  const statusCounts = useMemo(() => {
    const counts = { all: groups.length };
    for (const g of groups) counts[g.status] = (counts[g.status] ?? 0) + 1;
    return counts;
  }, [groups]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (g) => {
      if (!q) return true;
      return `${g.code} ${g.course} ${g.room} ${peopleText(info.get(g.code).team)}`.toLowerCase().includes(q);
    };
    const teamOk = (g) => {
      const { team } = info.get(g.code);
      if (filters.team === 'no-main') return !team.main;
      if (filters.team === 'with-support') return team.support.length > 0;
      if (filters.team === 'no-support') return team.support.length === 0;
      return true;
    };
    const list = groups.filter(
      (g) => (filters.status === 'all' || g.status === filters.status) && (filters.course === 'all' || g.course === filters.course) && teamOk(g) && matches(g),
    );
    const sorters = {
      code: (a, b) => a.code.localeCompare(b.code, 'uz'),
      course: (a, b) => a.course.localeCompare(b.course, 'uz'),
      main: (a, b) => (info.get(a.code).team.main ? teacherName(info.get(a.code).team.main) : '~').localeCompare(info.get(b.code).team.main ? teacherName(info.get(b.code).team.main) : '~', 'uz'),
      support: (a, b) => info.get(a.code).team.support.length - info.get(b.code).team.support.length,
      students: (a, b) => info.get(a.code).stats.activeStudents - info.get(b.code).stats.activeStudents,
      status: (a, b) => a.status.localeCompare(b.status),
    };
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => sorters[sort.key](a, b) * dir || a.code.localeCompare(b.code));
  }, [groups, query, filters, sort, info]);
  const rows = filtered;

  const hasFilters = query.trim() !== '' || Object.keys(DEFAULT_FILTERS).some((k) => filters[k] !== DEFAULT_FILTERS[k]);
  const viewGroup = groups.find((g) => g.code === viewCode) ?? null;
  const assignGroup = groups.find((g) => g.code === assignCode) ?? null;

  const pageSelected = rows.length > 0 && rows.every((g) => selected.has(g.code));
  const pageSome = rows.some((g) => selected.has(g.code));
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
  const toggleOne = (code) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      rows.forEach((g) => (pageSelected ? next.delete(g.code) : next.add(g.code)));
      return next;
    });

  // ---------- Ustoz biriktirish (asosiy yozuv — ustozlar do‘konlarida: `groups` ro‘yxati) ----------
  const applyTeam = (code, mainId, supportIds) => {
    const prev = teachers.find((t) => t.groups.includes(code));
    if ((prev?.id ?? '') !== mainId) {
      if (prev) updateTeacher(prev.id, { groups: prev.groups.filter((c) => c !== code) });
      const next = teachers.find((t) => t.id === mainId);
      if (next) updateTeacher(next.id, { groups: [...next.groups.filter((c) => c !== code), code] });
    }
    for (const p of supportTeachers) {
      const has = p.groups.includes(code);
      const want = supportIds.includes(p.id);
      if (has !== want) updateSupport(p.id, { groups: want ? [...p.groups, code] : p.groups.filter((c) => c !== code) });
    }
  };

  // Guruh(lar) bilan bog‘liq ustozlarning oldingi holati — "Qaytarish" uchun
  const snapshotTeams = (codes) => {
    const set = new Set(codes);
    const pick = (list) => list.filter((p) => p.groups.some((c) => set.has(c))).map((p) => ({ id: p.id, groups: p.groups }));
    return { teachers: pick(teachers), support: pick(supportTeachers) };
  };
  const restoreTeams = (snap) => {
    snap.teachers.forEach(({ id, groups: g }) => updateTeacher(id, { groups: g }));
    snap.support.forEach(({ id, groups: g }) => updateSupport(id, { groups: g }));
  };
  const releaseTeams = (codes) => {
    const set = new Set(codes);
    teachers.forEach((t) => t.groups.some((c) => set.has(c)) && updateTeacher(t.id, { groups: t.groups.filter((c) => !set.has(c)) }));
    supportTeachers.forEach((p) => p.groups.some((c) => set.has(c)) && updateSupport(p.id, { groups: p.groups.filter((c) => !set.has(c)) }));
  };

  // ---------- Amallar ----------
  const handleSubmit = ({ group, mainId, supportIds }) => {
    if (form.group ? !canEdit : !canCreate) return;
    if (form.group) {
      update(group.code, group);
      toast.success(`${group.code} guruhi saqlandi`);
    } else {
      add(group);
      toast.success(`${group.code} guruhi qo‘shildi`);
      setSort({ key: 'code', dir: 'asc' });
      
    }
    applyTeam(group.code, mainId, supportIds);
    setForm({ open: false, group: null });
  };

  const handleAssign = ({ mainId, supportIds }) => {
    if (!canEdit) return;
    const snap = snapshotTeams([assignGroup.code]);
    applyTeam(assignGroup.code, mainId, supportIds);
    toast.success(`${assignGroup.code}: ustozlar yangilandi`, { action: { label: 'Qaytarish', onClick: () => restoreTeams(snap) } });
    setAssignCode(null);
  };

  const studentTotal = (code) => info.get(code)?.stats.totalStudents ?? 0;

  const requestDelete = (list) => {
    const blocked = list.filter((g) => studentTotal(g.code) > 0);
    const allowed = list.filter((g) => studentTotal(g.code) === 0);
    if (blocked.length) {
      toast.error(`${blocked.map((g) => g.code).join(', ')} — talabalari bor, o‘chirib bo‘lmaydi. Avval talabalarni boshqa guruhga o‘tkazing yoki guruhni arxivga o‘tkazing.`);
    }
    if (allowed.length) setToDelete(allowed);
  };

  const confirmDelete = () => {
    if (!canDelete || !toDelete) return;
    const codes = toDelete.map((g) => g.code);
    const snap = snapshotTeams(codes);
    const removed = remove(codes);
    releaseTeams(codes);
    setToDelete(null);
    setViewCode(null);
    setSelected((prev) => {
      const next = new Set(prev);
      codes.forEach((c) => next.delete(c));
      return next;
    });
    toast.info(removed.length === 1 ? 'Guruh o‘chirildi' : `${removed.length} ta guruh o‘chirildi`, {
      action: { label: 'Qaytarish', onClick: () => { restore(removed); restoreTeams(snap); } },
    });
  };

  const changeStatus = (codes, status) => {
    if (!canEdit) return;
    const list = groups.filter((g) => codes.includes(g.code));
    if (status === 'archived') {
      const blocked = list.filter((g) => studentTotal(g.code) > 0);
      if (blocked.length) toast.error(`${blocked.map((g) => g.code).join(', ')} — talabalari bor, arxivga o‘tkazib bo‘lmaydi`);
      const ok = list.filter((g) => studentTotal(g.code) === 0).map((g) => g.code);
      if (!ok.length) return;
      const snap = snapshotTeams(ok);
      const hadTeam = snap.teachers.length + snap.support.length > 0;
      setStatus(ok, 'archived');
      releaseTeams(ok);
      toast.info(hadTeam ? `${ok.length} ta guruh arxivga o‘tkazildi, ustozlar bo‘shatildi` : `${ok.length} ta guruh arxivga o‘tkazildi`, {
        action: { label: 'Qaytarish', onClick: () => { setStatus(ok, 'active'); restoreTeams(snap); } },
      });
      return;
    }
    // Faollashtirishda xona boshqa faol guruh bilan kesishmasligi kerak (bir xonada bir vaqtda bitta dars)
    const clashes = list.map((g) => ({ g, other: findRoomConflict(groups, g) })).filter((x) => x.other);
    if (clashes.length) toast.error(clashes.map(({ g, other }) => `${g.code}: ${other.room} shu vaqtda ${other.code} uchun band`).join('; '));
    const allowed = list.filter((g) => !clashes.some((x) => x.g.code === g.code)).map((g) => g.code);
    if (!allowed.length) return;
    setStatus(allowed, status);
    toast.success(allowed.length === 1 ? `Holat o‘zgartirildi: ${GROUP_STATUSES[status].label}` : `${allowed.length} ta guruh holati o‘zgartirildi: ${GROUP_STATUSES[status].label}`);
  };

  const exportCsv = () => {
    if (!canExport) return;
    const source = selected.size ? groups.filter((g) => selected.has(g.code)) : filtered;
    const header = ['Guruh', 'Kurs', 'Kunlar va vaqt', 'Xona', 'Asosiy ustoz', 'Qo‘shimcha ustozlar', 'Faol talabalar', 'Sig‘im', 'Holati', 'Boshlangan sana'];
    const body = source.map((g) => {
      const { team, stats } = info.get(g.code);
      return [
        g.code, g.course, formatGroupSchedule(g), g.room, team.main ? teacherName(team.main) : '',
        team.support.map((p) => `${teacherName(p)} (${SUPPORT_ROLES[p.role]?.label})`).join('; '),
        stats.activeStudents, g.capacity, GROUP_STATUSES[g.status].label, g.startDate,
      ];
    });
    downloadCsv('guruhlar.csv', [header, ...body]);
    toast.success(`${source.length} ta guruh CSV ga eksport qilindi`);
  };

  const menuItems = (g) => [
    { label: 'Profilni ko‘rish', icon: Eye, onClick: () => setViewCode(g.code) },
    { label: 'Tahrirlash', icon: Pencil, onClick: () => setForm({ open: true, group: g }) },
    { label: 'Ustozlarni biriktirish', icon: UserPlus, hidden: g.status === 'archived', onClick: () => setAssignCode(g.code) },
    { label: 'Faollashtirish', icon: Play, hidden: g.status === 'active', onClick: () => changeStatus([g.code], 'active') },
    { label: 'Arxivga o‘tkazish', icon: Archive, hidden: g.status === 'archived', onClick: () => changeStatus([g.code], 'archived') },
    { label: 'O‘chirish', icon: Trash2, tone: 'danger', divider: true, onClick: () => requestDelete([g]) },
  ].filter((item) => item.icon === Eye || (item.icon === Pencil && canEdit) || (item.icon === UserPlus && canEdit) || (item.icon === Play && canEdit) || (item.icon === Archive && canEdit) || (item.icon === Trash2 && canDelete));

  const openCreate = () => setForm({ open: true, group: null });
  const teamOf = (code) => info.get(code)?.team ?? { main: null, support: [] };
  const countOf = (code) => info.get(code)?.stats ?? { activeStudents: 0, totalStudents: 0 };

  return (
    <div className="students-page teachers-page groups-page">
      <header className="page-head">
        <div>
          <h1>Guruhlar</h1>
          <p>Guruhlar, dars jadvali va ularga biriktirilgan asosiy hamda qo‘shimcha ustozlar</p>
        </div>
        <div className="page-head__actions">
          {canExport && <button type="button" className="btn btn--secondary" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={16} /> Eksport
          </button>}
          {canCreate && <button type="button" className="btn btn--primary" onClick={openCreate}>
            <Plus size={16} /> Yangi guruh
          </button>}
        </div>
      </header>

      <section className="students-stats" aria-label="Guruhlar ko‘rsatkichlari">
        <StatCard title="Jami guruhlar" value={formatNumber(summary.total)} icon={Layers} tone="primary" />
        <StatCard title="Guruhlardagi talabalar" value={formatNumber(summary.students)} icon={Users} tone="success" />
        <StatCard title="Ustozsiz guruhlar" value={formatNumber(summary.withoutMain)} icon={AlertTriangle} tone="warning" />
        <StatCard title="Qo‘shimcha ustozli guruhlar" value={formatNumber(summary.withSupport)} icon={UserPlus} tone="danger" />
      </section>

      <Card className="students-card">
        <div className="toolbar">
          <div className="status-tabs" role="tablist" aria-label="Holat bo‘yicha">
            {[{ value: 'all', label: 'Barchasi' }, ...GROUP_STATUS_OPTIONS].map((o) => (
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
                placeholder="Guruh, kurs, xona yoki ustoz…"
                aria-label="Guruhlarni qidirish"
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
              />
            </div>
            <select className="input" aria-label="Kurs" value={filters.course} onChange={(e) => changeFilter('course', e.target.value)}>
              <option value="all">Barcha kurslar</option>
              {[...new Set(groups.map((g) => g.course))].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <select className="input" aria-label="Ustozlar bo‘yicha" value={filters.team} onChange={(e) => changeFilter('team', e.target.value)}>
              <option value="all">Barcha guruhlar</option>
              <option value="no-main">Asosiy ustozsiz</option>
              <option value="with-support">Qo‘shimcha ustozli</option>
              <option value="no-support">Qo‘shimcha ustozsiz</option>
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
            <span><strong>{selected.size}</strong> ta guruh tanlandi</span>
            <div className="bulk-bar__actions">
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => changeStatus([...selected], 'active')}>
                <Play size={14} /> Faollashtirish
              </button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => changeStatus([...selected], 'archived')}>
                <Archive size={14} /> Arxivga
              </button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={exportCsv}>
                <Download size={14} /> Eksport
              </button>
              <button type="button" className="btn btn--danger btn--sm" onClick={() => requestDelete(groups.filter((g) => selected.has(g.code)))}>
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
            <h3>{groups.length === 0 ? 'Hali guruhlar yo‘q' : 'Guruhlar topilmadi'}</h3>
            <p>
              {groups.length === 0
                ? 'Birinchi guruhni qo‘shib, ustozlarni biriktiring.'
                : 'Qidiruv yoki filtr shartlariga mos guruh yo‘q. Filtrlarni o‘zgartirib ko‘ring.'}
            </p>
            {groups.length === 0 && canCreate ? (
              <button type="button" className="btn btn--primary" onClick={openCreate}>
                <Plus size={16} /> Yangi guruh
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
                    <input ref={headCheckbox} type="checkbox" checked={pageSelected} onChange={togglePage} aria-label="Sahifadagi barcha guruhlarni tanlash" />
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
                {rows.map((g) => {
                  const status = GROUP_STATUSES[g.status];
                  const { main, support } = teamOf(g.code);
                  const { activeStudents } = countOf(g.code);
                  const isSelected = selected.has(g.code);
                  return (
                    <tr key={g.code} className={isSelected ? 'is-selected' : undefined}>
                      <td className="data-table__check">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(g.code)} aria-label={`${g.code} ni tanlash`} />
                      </td>
                      <td>
                        <button type="button" className="student-cell" onClick={() => setViewCode(g.code)}>
                          <span className="group-badge" aria-hidden="true">{g.code.split('-')[0]}</span>
                          <span className="student-cell__text">
                            <span className="student-cell__name">{g.code}</span>
                            <span className="student-cell__id">{g.room}</span>
                          </span>
                        </button>
                      </td>
                      <td className="col-sm">{g.course}</td>
                      <td className="col-md data-table__muted">{formatGroupSchedule(g)}</td>
                      <td className="col-lg">
                        {main ? teacherName(main) : g.status === 'active' ? <span className="badge badge--warning">Ustozsiz</span> : <span className="data-table__muted">—</span>}
                      </td>
                      <td className="col-xl">
                        {support.length ? (
                          <span className="tag-list">
                            {support.map((p) => (
                              <span key={p.id} className="tag" title={`${teacherName(p)} · ${SUPPORT_ROLES[p.role]?.label}`}>{p.lastName}</span>
                            ))}
                          </span>
                        ) : (
                          <span className="data-table__muted">—</span>
                        )}
                      </td>
                      <td className={`is-right${activeStudents >= g.capacity ? ' is-full' : ''}`}>{formatNumber(activeStudents)} / {g.capacity}</td>
                      <td><span className={`badge badge--dot badge--${status.tone}`}>{status.label}</span></td>
                      <td className="data-table__actions">
                        <RowMenu items={menuItems(g)} label={`${g.code} uchun amallar`} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        
      </Card>

      <GroupFormModal
        open={form.open}
        group={form.group}
        team={form.group ? teamOf(form.group.code) : null}
        studentCount={form.group ? { active: countOf(form.group.code).activeStudents, total: countOf(form.group.code).totalStudents } : { active: 0, total: 0 }}
        groups={groups}
        courseNames={courseNames}
        teachers={teachers}
        supportTeachers={supportTeachers}
        onClose={() => setForm({ open: false, group: null })}
        onSubmit={handleSubmit}
      />

      <AssignTeachersModal
        group={assignGroup}
        team={assignGroup ? teamOf(assignGroup.code) : null}
        teachers={teachers}
        supportTeachers={supportTeachers}
        onClose={() => setAssignCode(null)}
        onSubmit={handleAssign}
      />

      <GroupDrawer
        group={viewGroup}
        students={students}
        teachers={teachers}
        supportTeachers={supportTeachers}
        onClose={() => setViewCode(null)}
        onEdit={canEdit ? (g) => setForm({ open: true, group: g }) : null}
        onAssign={canEdit ? (g) => setAssignCode(g.code) : null}
        onDelete={canDelete ? (g) => requestDelete([g]) : null}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={toDelete?.length > 1 ? `${toDelete.length} ta guruhni o‘chirasizmi?` : 'Guruhni o‘chirasizmi?'}
        message={
          <>
            {toDelete?.length === 1 ? `${toDelete[0].code} guruhi ro‘yxatdan o‘chiriladi.` : 'Tanlangan guruhlar ro‘yxatdan o‘chiriladi.'}
            {' '}Biriktirilgan ustozlar guruhdan bo‘shatiladi. O‘chirgandan so‘ng bir necha soniya ichida “Qaytarish” tugmasi orqali tiklashingiz mumkin.
          </>
        }
        confirmLabel="O‘chirish"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

export default Groups;
