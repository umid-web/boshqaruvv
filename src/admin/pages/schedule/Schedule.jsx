import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, CalendarDays, CalendarCheck, Clock3, DoorOpen, Layers, MapPin } from 'lucide-react';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import { useToast } from '../../components/ui/useToast';
import { formatNumber } from '../../utils/format';
import { useTeachers } from '../teachers/teachersStore';
import { useSupportTeachers } from '../support-teachers/supportStore';
import { useCourses } from '../courses/coursesStore';
import { useGroups } from '../groups/groupsStore';
import { getGroupTeam } from '../groups/groupsData';
import LessonEditModal from './LessonEditModal';
import { SCHEDULE_DAYS, buildRows, findAllConflicts } from './scheduleData';
import '../students/Students.scss';
import '../teachers/Teachers.scss';
import './Schedule.scss';
import useReceptionPermissions from '../../../Reception/useReceptionPermissions';

const todayDay = () => {
  const day = new Date().getDay();
  return day === 0 ? 1 : day;
};
const toMinutes = (time) => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; };
const toTime = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const TIME_OPTIONS = Array.from({ length: 25 }, (_, index) => toTime(8 * 60 + index * 30)).filter((time) => time <= '20:00');
const DAY_NAMES = Object.fromEntries(SCHEDULE_DAYS.map((day) => [day.value, day.full]));

const Schedule = () => {
  const basePath = useLocation().pathname.startsWith('/reception') ? '/reception' : '/admin';
  const canEdit = useReceptionPermissions()('schedule', 'edit');
  const toast = useToast();
  const { groups, update } = useGroups();
  const { teachers } = useTeachers();
  const { supportTeachers } = useSupportTeachers();
  const { courses } = useCourses();
  const [day, setDay] = useState(todayDay);
  const [query, setQuery] = useState('');
  const [duration, setDuration] = useState(90);
  const [selectedDay, setSelectedDay] = useState(todayDay);
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [editCode, setEditCode] = useState(null);

  const activeGroups = useMemo(() => groups.filter((group) => group.status === 'active'), [groups]);
  const rooms = useMemo(() => [...new Set(groups.map((group) => group.room).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'uz', { numeric: true })), [groups]);
  const scheduleTimes = useMemo(() => [...new Set(activeGroups.map((group) => group.start))].sort(), [activeGroups]);
  const teams = useMemo(() => new Map(groups.map((group) => [group.code, getGroupTeam(group.code, teachers, supportTeachers)])), [groups, teachers, supportTeachers]);
  const colorOf = useMemo(() => {
    const colors = new Map(courses.map((course) => [course.name, course.color]));
    return (course) => colors.get(course) || 'primary';
  }, [courses]);
  const rowsByMode = useMemo(() => ({
    teacher: buildRows('teacher', groups, teachers, supportTeachers),
    room: buildRows('room', groups, teachers, supportTeachers),
  }), [groups, teachers, supportTeachers]);
  const conflicts = useMemo(() => findAllConflicts(rowsByMode), [rowsByMode]);
  const todayLessons = activeGroups.filter((group) => group.days.includes(todayDay())).length;
  const weeklyCount = activeGroups.reduce((count, group) => count + group.days.length, 0);
  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - ((rangeStart.getDay() + 6) % 7));
  rangeStart.setHours(0, 0, 0, 0);
  const weekDates = SCHEDULE_DAYS.map((weekday) => {
    const date = new Date(rangeStart);
    date.setDate(date.getDate() + weekday.value - 1);
    return date;
  });

  const availableRooms = rooms.map((room) => {
    const lesson = activeGroups.find((group) => group.room === room && group.days.includes(selectedDay)
      && toMinutes(group.start) < toMinutes(selectedTime) + Number(duration)
      && toMinutes(selectedTime) < toMinutes(group.end));
    return { room, lesson };
  });
  const freeRooms = availableRooms.filter((item) => !item.lesson);
  const q = query.trim().toLocaleLowerCase('uz');
  const getCellLessons = (weekday, time) => activeGroups
    .filter((group) => group.days.includes(weekday) && group.start === time)
    .filter((group) => !q || `${group.code} ${group.course} ${group.room} ${teams.get(group.code)?.main?.lastName ?? ''}`.toLocaleLowerCase('uz').includes(q))
    .sort((a, b) => a.code.localeCompare(b.code, 'uz'));
  const editGroup = groups.find((group) => group.code === editCode) ?? null;

  const handleSave = (patch) => {
    if (!canEdit) return;
    const before = groups.find((group) => group.code === editCode);
    update(editCode, patch);
    toast.success(`${editCode} darsi yangilandi`, {
      action: { label: 'Qaytarish', onClick: () => update(before.code, { days: before.days, start: before.start, end: before.end, room: before.room }) },
    });
    setEditCode(null);
  };

  return (
    <div className="students-page teachers-page schedule-page schedule-calendar-page">
      <header className="page-head">
        <div><span className="schedule-eyebrow">HAFTALIK REJA</span><h1>Dars jadvali</h1><p>Markazdagi faol darslar va tanlangan vaqtda bo‘sh xonalar.</p></div>
        <div className="page-head__actions"><Link to={`${basePath}/groups`} className="btn btn--secondary"><Layers size={16}/> Guruhlar</Link></div>
      </header>

      <section className="students-stats" aria-label="Jadval ko‘rsatkichlari">
        <StatCard title="Haftalik darslar" value={formatNumber(weeklyCount)} icon={CalendarDays} tone="primary"/>
        <StatCard title="Bugungi darslar" value={formatNumber(todayLessons)} icon={CalendarCheck} tone="success"/>
        <StatCard title="Xonalar" value={formatNumber(rooms.length)} icon={DoorOpen} tone="warning"/>
        <StatCard title="Vaqt ziddiyatlari" value={formatNumber(conflicts.length)} icon={AlertTriangle} tone={conflicts.length ? 'danger' : 'success'}/>
      </section>

      {conflicts.length > 0 && <div className="schedule-alert" role="alert"><AlertTriangle size={18}/><div><strong>Vaqti kesishgan darslar topildi</strong><ul>{conflicts.slice(0, 4).map((conflict, index) => <li key={`${conflict.rowKey}-${conflict.dayValue}-${index}`}>{conflict.row} · {conflict.day}: {conflict.a} va {conflict.b}</li>)}</ul></div></div>}

      <div className="schedule-workspace">
        <Card className="schedule-calendar-card" title="Haftalik darslar" subtitle={`${activeGroups.length} ta faol guruh · sana va vaqt bo‘yicha`}>
          <div className="schedule-toolbar">
            <label className="schedule-search"><CalendarDays size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Guruh, kurs, xona yoki ustozni qidirish"/></label>
            <div className="schedule-day-pick" aria-label="Ko‘rilayotgan hafta kuni">{SCHEDULE_DAYS.map((weekday) => <button key={weekday.value} type="button" className={day === weekday.value ? 'is-active' : ''} onClick={() => { setDay(weekday.value); setSelectedDay(weekday.value); }}>{weekday.short}</button>)}</div>
          </div>
          <div className="schedule-calendar-scroll"><div className="schedule-calendar-grid" style={{ '--schedule-days': weekDates.length }}>
            <div className="schedule-calendar__time-head"><Clock3 size={14}/></div>
            {weekDates.map((date) => {
              const weekday = date.getDay();
              const count = activeGroups.filter((group) => group.days.includes(weekday)).length;
              return <div className={`schedule-calendar__day${weekday === day ? ' is-selected' : ''}${weekday === todayDay() ? ' is-today' : ''}`} key={weekday} onClick={() => { setDay(weekday); setSelectedDay(weekday); }} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && (setDay(weekday), setSelectedDay(weekday))}><span>{DAY_NAMES[weekday]}</span><strong>{String(date.getDate()).padStart(2, '0')}.{String(date.getMonth() + 1).padStart(2, '0')}</strong><small>{count} ta dars</small></div>;
            })}
            {scheduleTimes.map((time) => <div className="schedule-calendar__row" key={time}>
              <div className="schedule-calendar__time">{time}</div>
              {weekDates.map((date) => {
                const weekday = date.getDay();
                const lessons = getCellLessons(weekday, time);
                return <div className={`schedule-calendar__cell${weekday === day ? ' is-selected' : ''}`} key={`${weekday}-${time}`}>
                  {lessons.map((group) => {
                    const main = teams.get(group.code)?.main;
                    const lesson = <><span className="schedule-event__range">{group.start}–{group.end}</span><strong>{group.course}</strong><span className="schedule-event__group">{group.code}</span><span className="schedule-event__room"><MapPin size={12}/>{group.room}</span><span className="schedule-event__teacher">{main ? `${main.lastName} ${main.firstName}` : 'Ustoz biriktirilmagan'}</span></>;
                    return canEdit
                      ? <button type="button" className={`schedule-event schedule-event--${colorOf(group.course)}`} key={group.code} onClick={() => setEditCode(group.code)}>{lesson}</button>
                      : <article className={`schedule-event schedule-event--${colorOf(group.course)}`} key={group.code}>{lesson}</article>;
                  })}
                </div>;
              })}
            </div>)}
            {!scheduleTimes.length && <div className="schedule-calendar__empty">Faol dars jadvali hozircha mavjud emas.</div>}
          </div></div>
        </Card>

        <Card className="room-availability-card" title="Bo‘sh xonalar" subtitle="Tanlangan kun va vaqt kesimida">
          <div className="room-picker__days">{SCHEDULE_DAYS.map((weekday) => <button key={weekday.value} type="button" className={selectedDay === weekday.value ? 'is-active' : ''} onClick={() => setSelectedDay(weekday.value)}>{weekday.short}</button>)}</div>
          <div className="room-picker__fields"><label className="field"><span className="field__label">Boshlanish vaqti</span><select className="input" value={selectedTime} onChange={(event) => setSelectedTime(event.target.value)}>{TIME_OPTIONS.map((time) => <option key={time}>{time}</option>)}</select></label><label className="field"><span className="field__label">Davomiyligi</span><select className="input" value={duration} onChange={(event) => setDuration(Number(event.target.value))}><option value={60}>1 soat</option><option value={90}>1 soat 30 daqiqa</option><option value={120}>2 soat</option></select></label></div>
          <div className="room-availability__period"><Clock3 size={15}/>{DAY_NAMES[selectedDay]}, {selectedTime}–{toTime(toMinutes(selectedTime) + Number(duration))}</div>
          <div className="room-availability__summary"><strong>{freeRooms.length}</strong><span>ta xona bo‘sh</span><i>{availableRooms.length} ta xonadan</i></div>
          <div className="room-availability__list">{availableRooms.map(({ room, lesson }) => <div key={room} className={`room-availability__item${lesson ? ' is-busy' : ' is-free'}`}><span className="room-availability__dot"/><div><strong>{room}</strong>{lesson ? <small>{lesson.code} · {lesson.start}–{lesson.end}</small> : <small>Tanlangan vaqt uchun bo‘sh</small>}</div><span className="room-availability__status">{lesson ? 'Band' : 'Bo‘sh'}</span></div>)}{!availableRooms.length && <p className="room-availability__empty">Xonalar ro‘yxati topilmadi.</p>}</div>
        </Card>
      </div>

      <div className="schedule-legend" aria-label="Kurs ranglari">{courses.filter((course) => course.status === 'active').map((course) => <span className="schedule-legend__item" key={course.id} style={{ '--schedule-accent': `var(--${course.color})` }}>{course.name}</span>)}</div>

      <LessonEditModal group={editGroup} groups={groups} teachers={teachers} supportTeachers={supportTeachers} onClose={() => setEditCode(null)} onSubmit={handleSave}/>
    </div>
  );
};

export default Schedule;
