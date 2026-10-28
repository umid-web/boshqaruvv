import './TodaySchedule.scss';

const STATUS = {
  scheduled: { label: 'Rejalashtirilgan', tone: 'info' },
  ongoing: { label: 'Davom etmoqda', tone: 'success' },
  completed: { label: 'Yakunlangan', tone: 'muted' },
  delayed: { label: 'Kechikmoqda', tone: 'warning' },
};

/** Bugungi darslar jadvali. schedule: [{ id, time, subject, group, teacher, room, status }] */
const TodaySchedule = ({ schedule = [] }) => {
  if (schedule.length === 0) {
    return <p className="empty-text">Bugungi darslar topilmadi</p>;
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
    </div>
  );
};

export default TodaySchedule;
