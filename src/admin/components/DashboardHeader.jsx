import { useState } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { PERIODS } from '../data/dashboardDemoData';
import { formatLongDate } from '../utils/format';
import './DashboardHeader.scss';

/** Dashboard sarlavhasi: salomlashuv, sana, davr tanlash, yangilash va eksport. */
const DashboardHeader = ({ period, setPeriod, onRefresh, onExport }) => {
  // Lazy initializer — render paytida impure Date() chaqirilmaydi
  const [today] = useState(() => new Date());

  return (
    <header className="dashboard-header">
      <div className="dashboard-header__left">
        <h1>Boshqaruv paneli</h1>
        <p>Xush kelibsiz, administrator! <span>{formatLongDate(today)}</span></p>
      </div>

      <div className="dashboard-header__right">
        <label className="sr-only" htmlFor="period-select">Davrni tanlang</label>
        <select
          id="period-select"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="period-select"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <button type="button" className="icon-btn" onClick={onRefresh} title="Yangilash" aria-label="Yangilash">
          <RefreshCw size={18} />
        </button>
        <button type="button" className="btn btn--primary" onClick={onExport}>
          <Download size={16} />
          Eksport
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
