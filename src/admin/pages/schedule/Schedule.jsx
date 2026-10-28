import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarDays, CalendarCheck, DoorOpen, Layers, Search, X } from 'lucide-react';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import { useToast } from '../../components/ui/useToast';
import { formatNumber } from '../../utils/format';
import { useTeachers } from '../teachers/teachersStore';
import { useSupportTeachers } from '../support-teachers/supportStore';
import { useCourses } from '../courses/coursesStore';
import { useGroups } from '../groups/groupsStore';
import { getGroupTeam } from '../groups/groupsData';
import { TimelineHead, TimelineRow } from './Timeline';
import LessonEditModal from './LessonEditModal';
import { SCHEDULE_DAYS, buildRows, findAllConflicts, findDayConflicts, getRange, lessonsOn } from './scheduleData';
import '../students/Students.scss';
import '../teachers/Teachers.scss';
import './Schedule.scss';

const MODES = [
  { value: 'teacher', label: 'Ustozlar' },
  { value: 'room', label: 'Xonalar' },
];

const todayDay = () => {
  const d = new Date().getDay();
  return d === 0 ? 1 : d; // yakshanba — dars yo‘q, dushanbani ko‘rsatamiz
};

const Schedule = () => {
  const toast = useToast();
  const { groups, update } = useGroups();
  const { teachers } = useTeachers();
  const { supportTeachers } = useSupportTeachers();
  const { courses } = useCourses();

  const [mode, setMode] = useState('teacher');
  const [view, setView] = useState('day'); // day: tanlangan kun, barcha qatorlar · week: bitta qator, butun hafta
  const [day, setDay] = useState(todayDay);
  const [entity, setEntity] = useState('');
  const [query, setQuery] = useState('');
  const [onlyBusy, setOnlyBusy] = useState(false);
  const [editCode, setEditCode] = useState(null);

  const range = useMemo(() => getRange(groups), [groups]);
  const colorOf = useMemo(() => {
    const map = new Map(courses.map((c) => [c.name, c.color]));
    return (course) => map.get(course) ?? 'primary';
  }, [courses]);

  const rowsByMode = useMemo(
    () => ({
      teacher: buildRows('teacher', groups, teachers, supportTeachers),
      room: buildRows('room', groups, teachers, supportTeachers),
    }),
    [groups, teachers, supportTeachers],
  );
  const rows = rowsByMode[mode];

  const teamByCode = useMemo(() => {
    const map = new Map();
    for (const g of groups) map.set(g.code, getGroupTeam(g.code, teachers, supportTeachers));
    return map;
  }, [groups, teachers, supportTeachers]);

  const conflicts = useMemo(() => findAllConflicts(rowsByMode), [rowsByMode]);

  const summary = useMemo(() => {
    const active = groups.filter((g) => g.status === 'active');
    const today = todayDay();
    return {
      weekly: active.reduce((sum, g) => sum + g.days.length, 0),
      today: active.filter((g) => g.days.includes(today)).length,
      rooms: rowsByMode.room.length,
    };
  }, [groups, rowsByMode]);

  // Darsda ko‘rinadigan yozuv: ustoz rejimida — vaqt va xona, xona rejimida — vaqt va asosiy ustoz
  const describe = (g) => {
    if (mode === 'room') {
      const main = teamByCode.get(g.code)?.main;
      return { title: g.code, sub: `${g.start}–${g.end} · ${main ? main.lastName : 'ustozsiz'}` };
    }
    return { title: g.code, sub: `${g.start}–${g.end} · ${g.room}` };
  };

  const q = query.trim().toLowerCase();
  const visibleRows = rows.filter((r) => (!q || `${r.title} ${r.subtitle}`.toLowerCase().includes(q)) && (!onlyBusy || lessonsOn(r, day).length > 0));
  const weekRow = rows.find((r) => r.key === entity) ?? rows[0] ?? null;

  const conflictCodesFor = (lessons) => new Set(findDayConflicts(lessons).flat().map((g) => g.code));
  const editGroup = groups.find((g) => g.code === editCode) ?? null;

  const changeMode = (value) => {
    setMode(value);
    setEntity('');
  };

  const handleSave = (patch) => {
    const before = groups.find((g) => g.code === editCode);
    update(editCode, patch);
    toast.success(`${editCode} darsi yangilandi`, {
      action: { label: 'Qaytarish', onClick: () => update(before.code, { days: before.days, start: before.start, end: before.end, room: before.room }) },
    });
    setEditCode(null);
  };

  return (
    <div className="students-page teachers-page schedule-page">
      <header className="page-head">
        <div>
          <h1>Dars jadvali</h1>
          <p>Ustozlar va xonalarning band hamda bo‘sh vaqti. Bir xonada bir vaqtda faqat bitta dars, bir ustoz bir vaqtda faqat bitta guruhda</p>
        </div>
        <div className="page-head__actions">
          <Link to="/admin/groups" className="btn btn--secondary">
            <Layers size={16} /> Guruhlar
          </Link>
        </div>
      </header>

      <section className="students-stats" aria-label="Jadval ko‘rsatkichlari">
        <StatCard title="Haftalik darslar" value={formatNumber(summary.weekly)} icon={CalendarDays} tone="primary" />
        <StatCard title="Bugungi darslar" value={formatNumber(summary.today)} icon={CalendarCheck} tone="success" />
        <StatCard title="Xonalar" value={formatNumber(summary.rooms)} icon={DoorOpen} tone="warning" />
        <StatCard title="Vaqt ziddiyatlari" value={formatNumber(conflicts.length)} icon={AlertTriangle} tone={conflicts.length ? 'danger' : 'success'} />
      </section>

      {conflicts.length > 0 && (
        <div className="schedule-alert" role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>Vaqti kesishgan darslar topildi</strong>
            <ul>
              {conflicts.slice(0, 5).map((c, i) => (
                <li key={`${c.rowKey}-${c.dayValue}-${i}`}>
                  {c.row} · {c.day}: {c.a} va {c.b}
                </li>
              ))}
              {conflicts.length > 5 && <li>…va yana {conflicts.length - 5} ta</li>}
            </ul>
            <span>Darsni bosib, vaqti yoki xonasini o‘zgartiring.</span>
          </div>
        </div>
      )}

      <Card className="students-card">
        <div className="toolbar">
          <div className="status-tabs" role="tablist" aria-label="Jadval turi">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={mode === m.value}
                className={mode === m.value ? 'status-tab is-active' : 'status-tab'}
                onClick={() => changeMode(m.value)}
              >
                {m.label}
                <span className="status-tab__count">{formatNumber(rowsByMode[m.value].length)}</span>
              </button>
            ))}
          </div>

          <div className="toolbar__filters">
            <select className="input" aria-label="Ko‘rinish" value={view} onChange={(e) => setView(e.target.value)}>
              <option value="day">Kun bo‘yicha (hamma {mode === 'room' ? 'xonalar' : 'ustozlar'})</option>
              <option value="week">Hafta bo‘yicha (bitta {mode === 'room' ? 'xona' : 'ustoz'})</option>
            </select>

            {view === 'day' ? (
              <>
                <div className="toolbar__search">
                  <Search size={16} className="toolbar__search-icon" aria-hidden="true" />
                  <input
                    type="search"
                    className="input"
                    placeholder={mode === 'room' ? 'Xonani qidirish…' : 'Ustozni qidirish…'}
                    aria-label="Qidirish"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <button type="button" className={onlyBusy ? 'chip is-active' : 'chip'} aria-pressed={onlyBusy} onClick={() => setOnlyBusy((v) => !v)}>
                  Faqat darsi borlar
                </button>
                {(q || onlyBusy) && (
                  <button type="button" className="btn btn--ghost" onClick={() => { setQuery(''); setOnlyBusy(false); }}>
                    <X size={15} /> Tozalash
                  </button>
                )}
              </>
            ) : (
              <select className="input" aria-label={mode === 'room' ? 'Xona' : 'Ustoz'} value={weekRow?.key ?? ''} onChange={(e) => setEntity(e.target.value)}>
                {rows.map((r) => <option key={r.key} value={r.key}>{r.title}</option>)}
              </select>
            )}
          </div>

          {view === 'day' && (
            <div className="status-tabs" role="tablist" aria-label="Hafta kuni">
              {SCHEDULE_DAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  role="tab"
                  aria-selected={day === d.value}
                  className={day === d.value ? 'status-tab is-active' : 'status-tab'}
                  onClick={() => setDay(d.value)}
                >
                  {d.full}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="schedule-legend" aria-label="Belgilar">
          {courses.filter((c) => c.status === 'active').map((c) => (
            <span key={c.id} className="schedule-legend__item" style={{ '--lc': `var(--${c.color})` }}>{c.name}</span>
          ))}
          <span className="schedule-legend__item schedule-legend__item--free">Bo‘sh vaqt — bloklar orasidagi joy</span>
        </div>

        <div className="tl-scroll">
          <div className="tl">
            {view === 'day' ? (
              <>
                <TimelineHead range={range} first={mode === 'room' ? 'Xona' : 'Ustoz'} />
                {visibleRows.length === 0 ? (
                  <p className="empty-text">{rows.length === 0 ? 'Jadval uchun ma’lumot yo‘q' : 'Mos qator topilmadi'}</p>
                ) : (
                  visibleRows.map((r) => {
                    const lessons = lessonsOn(r, day);
                    return (
                      <TimelineRow
                        key={r.key}
                        title={r.title}
                        subtitle={r.subtitle}
                        badge={r.status === 'vacation' ? <span className="badge badge--info">Ta‘tilda</span> : null}
                        lessons={lessons}
                        range={range}
                        describe={describe}
                        colorOf={colorOf}
                        conflictCodes={conflictCodesFor(lessons)}
                        onOpen={(g) => setEditCode(g.code)}
                      />
                    );
                  })
                )}
              </>
            ) : weekRow ? (
              <>
                <TimelineHead range={range} first={weekRow.title} />
                {SCHEDULE_DAYS.map((d) => {
                  const lessons = lessonsOn(weekRow, d.value);
                  return (
                    <TimelineRow
                      key={d.value}
                      who={<strong>{d.full}</strong>}
                      lessons={lessons}
                      range={range}
                      describe={describe}
                      colorOf={colorOf}
                      conflictCodes={conflictCodesFor(lessons)}
                      onOpen={(g) => setEditCode(g.code)}
                    />
                  );
                })}
              </>
            ) : (
              <p className="empty-text">Jadval uchun ma’lumot yo‘q</p>
            )}
          </div>
        </div>
      </Card>

      <LessonEditModal
        group={editGroup}
        groups={groups}
        teachers={teachers}
        supportTeachers={supportTeachers}
        onClose={() => setEditCode(null)}
        onSubmit={handleSave}
      />
    </div>
  );
};

export default Schedule;
