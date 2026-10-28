import { busyMinutes, fmtDuration, freeSlots, toHHMM, toMin } from './scheduleData';

const hoursOf = (range) => (range.end - range.start) / 60;

/** Soat yozuvlari qatori (vaqt chizig‘ining sarlavhasi). */
export const TimelineHead = ({ range, first }) => {
  const hours = hoursOf(range);
  const step = hours > 12 ? 2 : 1;
  const marks = [];
  for (let h = 0; h <= hours; h += step) marks.push(h);
  return (
    <div className="tl-row tl-row--head" aria-hidden="true">
      <div className="tl-row__who">{first}</div>
      <div className="tl-ruler">
        {marks.map((h) => (
          <span key={h} className="tl-ruler__mark" style={{ left: `${(h / hours) * 100}%` }}>
            {toHHMM(range.start + h * 60)}
          </span>
        ))}
      </div>
      <div className="tl-row__info">Band / bo‘sh vaqt</div>
    </div>
  );
};

/**
 * Bitta ustoz yoki xonaning bir kunlik vaqt chizig‘i.
 * Rangli bloklar — darslar (band vaqt), bo‘sh joylar — bo‘sh vaqt. Kesishgan darslar qizil bilan belgilanadi.
 */
export const TimelineRow = ({ title, subtitle, badge, lessons, range, describe, colorOf, conflictCodes, onOpen, who }) => {
  const total = range.end - range.start;
  const free = freeSlots(lessons, range);
  const busy = busyMinutes(lessons);
  const freeText = free.map(([s, e]) => `${toHHMM(s)}–${toHHMM(e)}`);

  return (
    <div className="tl-row">
      <div className="tl-row__who">
        {who ?? (
          <>
            <strong>{title}</strong>
            <span>{subtitle}</span>
            {badge}
          </>
        )}
      </div>

      <div className="tl-track" style={{ '--hours': hoursOf(range) }}>
        {lessons.length === 0 && <span className="tl-track__empty">Kun bo‘yi bo‘sh</span>}
        {lessons.map((g) => {
          const { title: t, sub } = describe(g);
          const color = colorOf(g.course);
          const bad = conflictCodes.has(g.code);
          return (
            <button
              key={g.code}
              type="button"
              className={bad ? 'tl-lesson is-conflict' : 'tl-lesson'}
              style={{
                left: `${((toMin(g.start) - range.start) / total) * 100}%`,
                width: `${((toMin(g.end) - toMin(g.start)) / total) * 100}%`,
                '--lc': `var(--${color})`,
                '--lc-soft': `var(--${color}-soft)`,
              }}
              title={`${g.code} · ${g.course}\n${g.start}–${g.end} · ${g.room}${bad ? '\nVaqti boshqa dars bilan kesishgan!' : ''}`}
              onClick={() => onOpen(g)}
            >
              <strong>{t}</strong>
              <span>{sub}</span>
            </button>
          );
        })}
      </div>

      <div className="tl-row__info">
        <span className="tl-info__busy">Band: {busy ? fmtDuration(busy) : '—'}</span>
        <span className="tl-info__free" title={freeText.join(', ') || 'Bo‘sh vaqt yo‘q'}>
          {freeText.length ? `Bo‘sh: ${freeText.slice(0, 3).join(', ')}${freeText.length > 3 ? ` +${freeText.length - 3}` : ''}` : 'Bo‘sh vaqt yo‘q'}
        </span>
      </div>
    </div>
  );
};
