import './TodaySchedule.scss';

const STATUS = {
  scheduled: { label: 'Rejalashtirilgan', tone: 'info' },
  ongoing: { label: 'Davom etmoqda', tone: 'success' },
  completed: { label: 'Yakunlangan', tone: 'muted' },
  delayed: { label: 'Kechikmoqda', tone: 'warning' },
};

/** Bugungi darslar jadvali. schedule: [{ id, time, subject, group, teacher, room, status }] */
const TodaySchedule = ({ schedule = [], availableRooms = [], occupiedRooms = null }) => {
  const occupied = occupiedRooms ?? new Set(schedule.map((item) => item.room).filter(Boolean));
  const freeRooms = availableRooms.filter((room) => !occupied.has(room));
  if (schedule.length === 0) {
    return <><p className="empty-text">Bugungi darslar topilmadi</p>{availableRooms.length > 0 && <p className="today-schedule__free-rooms"><strong>Bo‘sh xonalar:</strong> {availableRooms.join(', ')}</p>}</>;
  }

  return (
    <div className="today-schedule">
      <table className="schedule-table">
        <thead>
          <tr>
            <th>Vaqt</th>
            <th>Fan</th>
            <th>Guruh</th>
            <th>Ustoz</th>
            <th>Xona</th>
            <th>Holat</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((item) => {
            const status = STATUS[item.status] ?? { label: item.status, tone: 'muted' };
            return (
              <tr key={item.id}>
                <td className="schedule-table__time">{item.time}</td>
                <td className="schedule-table__strong">{item.subject}</td>
                <td>{item.group}</td>
                <td>{item.teacher}</td>
                <td>{item.room}</td>
                <td>
                  <span className={`badge badge--${status.tone}`}>{status.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {availableRooms.length > 0 && <p className="today-schedule__free-rooms"><strong>Bugun bo‘sh xonalar:</strong> {freeRooms.length ? freeRooms.join(', ') : 'Bo‘sh xona yo‘q'}</p>}
    </div>
  );
};

export default TodaySchedule;
