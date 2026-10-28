import { TrendingUp, TrendingDown } from 'lucide-react';
import './StatCard.scss';

/**
 * Ko‘rsatkich kartasi.
 * - icon: lucide komponenti (masalan, `Users`)
 * - tone: primary | success | warning | danger
 * - change: o‘tgan davrga nisbatan o‘zgarish (%)
 * - invertChange: true bo‘lsa, kamayish yaxshi hisoblanadi (masalan, qarzdorlik)
 */
// "12,4 mln so‘m" → raqam va birlikni ajratadi (birlik kichikroq ko‘rsatiladi)
const splitUnit = (value) => {
  const match = typeof value === 'string' ? /^([\d\u00A0,]+) (.+)$/.exec(value) : null;
  return match ? { amount: match[1], unit: match[2] } : { amount: value, unit: null };
};

const StatCard = ({ title, value, icon: Icon, tone = 'primary', change, invertChange = false }) => {
  const hasChange = typeof change === 'number';
  const isUp = hasChange && change >= 0;
  const isGood = invertChange ? !isUp : isUp;
  const ChangeIcon = isUp ? TrendingUp : TrendingDown;
  const { amount, unit } = splitUnit(value);

  return (
    <article className="stat-card">
      <div className={`stat-card__icon stat-card__icon--${tone}`}>
        {Icon && <Icon size={22} />}
      </div>
      <div className="stat-card__info">
        <div className="stat-card__title">{title}</div>
        <div className="stat-card__value">
          {amount}
          {unit && <>{' '}<span className="stat-card__unit">{unit}</span></>}
        </div>
        {hasChange && (
          <div className={`stat-card__change ${isGood ? 'is-good' : 'is-bad'}`}>
            <ChangeIcon size={14} />
            <span>{isUp ? '+' : '−'}{Math.abs(change)}%</span>
            <span className="stat-card__hint">o‘tgan davrga nisbatan</span>
          </div>
        )}
      </div>
    </article>
  );
};

export default StatCard;
