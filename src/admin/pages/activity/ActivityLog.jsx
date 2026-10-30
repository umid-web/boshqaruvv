import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  Download,
  Flame,
  History,
  Search,
  SearchX,
  Trash2,
  Trash,
  X,
  Zap,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/useToast';
import {
  ACTION_OPTIONS,
  MODULE_OPTIONS,
  actionOf,
  moduleOf,
} from '../../activity/meta';
import { clearActivities, useActivities } from '../../activity/activityStore';
import { formatStamp, timeAgo, toDayKey, todayKey } from '../../activity/time';
import { downloadCsv } from '../../utils/csv';
import { formatNumber } from '../../utils/format';
import '../../activity/pageKit.scss';
import './ActivityLog.scss';

const PERIODS = [
  { value: 'all', label: 'Barcha vaqt', days: null },
  { value: 'today', label: 'Bugun', days: 0 },
  { value: '7', label: 'Oxirgi 7 kun', days: 6 },
  { value: '30', label: 'Oxirgi 30 kun', days: 29 },
  { value: 'custom', label: 'Sanalar oralig‘i', days: null },
];

const DAY = 86_400_000;
const dayKeyAgo = (n) => toDayKey(Date.now() - n * DAY);

const SEVERITY_TONE = { info: 'info', success: 'success', warning: 'warning', danger: 'danger' };

const ActivityLog = () => {
  const toast = useToast();
  const all = useActivities();

  const [query, setQuery] = useState('');
  const [moduleKey, setModuleKey] = useState('all');
  const [action, setAction] = useState('all');
  const [period, setPeriod] = useState('all');
  const [range, setRange] = useState({ from: '', to: '' });
  const [dir, setDir] = useState('desc');
  const [viewId, setViewId] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // ---------- Ko‘rsatkichlar (filtrga bog‘liq emas) ----------
  const stats = useMemo(() => {
    const today = todayKey();
    const weekFrom = dayKeyAgo(6);
    let todayCount = 0;
    let week = 0;
    let deletes = 0;
    const byModule = {};
    for (const a of all) {
      const key = toDayKey(a.at);
      if (key === today) todayCount += 1;
      if (key >= weekFrom) {
        week += 1;
        if (a.action === 'delete') deletes += 1;
        byModule[a.module] = (byModule[a.module] ?? 0) + 1;
      }
    }
    const top = Object.entries(byModule).sort((x, y) => y[1] - x[1])[0];
    return { today: todayCount, week, deletes, top: top ? moduleOf(top[0]).label : '—' };
  }, [all]);

  // Oxirgi 14 kun bo‘yicha faollik (ustunli diagramma)
  const trend = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const key = dayKeyAgo(13 - i);
      return { key, count: 0, label: key.slice(8) + '.' + key.slice(5, 7) };
    });
    const index = new Map(days.map((d, i) => [d.key, i]));
    for (const a of all) {
      const i = index.get(toDayKey(a.at));
      if (i !== undefined) days[i].count += 1;
    }
    return { days, max: Math.max(1, ...days.map((d) => d.count)) };
  }, [all]);

  // ---------- Filtr ----------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let from = null;
    let to = null;
    const p = PERIODS.find((x) => x.value === period);
    if (p?.days !== null && p?.days !== undefined) from = dayKeyAgo(p.days);
    if (period === 'custom') {
      from = range.from || null;
      to = range.to || null;
    }
    const list = all.filter((a) => {
      const day = toDayKey(a.at);
      return (
        (moduleKey === 'all' || a.module === moduleKey) &&
        (action === 'all' || a.action === action) &&
        (!from || day >= from) &&
        (!to || day <= to) &&
        (!q || `${a.title} ${a.entityName} ${a.entityId} ${a.actor?.name}`.toLowerCase().includes(q))
      );
    });
    return dir === 'desc' ? list : [...list].reverse();
  }, [all, query, moduleKey, action, period, range, dir]);
  const rows = filtered;
  const hasFilters = query.trim() !== '' || moduleKey !== 'all' || action !== 'all' || period !== 'all';
  const viewing = all.find((a) => a.id === viewId) ?? null;

  const change = (setter) => (value) => {
    setter(value);
    
  };
  const clearFilters = () => {
    setQuery('');
    setModuleKey('all');
    setAction('all');
    setPeriod('all');
    setRange({ from: '', to: '' });
    
  };

  const exportCsv = () => {
    const header = ['Vaqt', 'Foydalanuvchi', 'Rol', 'Bo‘lim', 'Amal', 'Tavsif', 'Obyekt ID', 'O‘zgarishlar'];
    const body = filtered.map((a) => [
      formatStamp(a.at),
      a.actor?.name ?? '',
      a.actor?.role ?? '',
      moduleOf(a.module).label,
      actionOf(a.action).label,
      a.title,
      a.entityId,
      a.changes.map((c) => `${c.label}: ${c.from} → ${c.to}`).join('; '),
    ]);
    downloadCsv('faoliyat-tarixi.csv', [header, ...body]);
    toast.success(`${filtered.length} ta yozuv CSV ga eksport qilindi`);
  };

  const doClear = () => {
    clearActivities();
    setConfirmClear(false);
    setViewId(null);
    
    toast.info('Faoliyat tarixi tozalandi');
  };

  return (
    <div className="pk-page act-page">
      <header className="pk-head">
        <div>
          <h1>Faoliyat tarixi</h1>
          <p>Tizimda kim, nima va qachon qilgani — barcha o‘zgarishlar izi (audit)</p>
        </div>
        <div className="pk-head__actions">
          <button type="button" className="btn btn--secondary" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={16} /> Eksport
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => setConfirmClear(true)} disabled={all.length === 0}>
            <Trash2 size={16} /> Tarixni tozalash
          </button>
        </div>
      </header>

      <section className="pk-stats" aria-label="Faoliyat ko‘rsatkichlari">
        <StatCard title="Bugungi amallar" value={formatNumber(stats.today)} icon={Zap} tone="primary" />
        <StatCard title="So‘nggi 7 kun" value={formatNumber(stats.week)} icon={CalendarDays} tone="success" />
        <StatCard title="O‘chirishlar (7 kun)" value={formatNumber(stats.deletes)} icon={Trash} tone="danger" />
        <StatCard title="Eng faol bo‘lim" value={stats.top} icon={Flame} tone="warning" />
      </section>

      <Card title="Oxirgi 14 kun faolligi" subtitle="Kuniga bajarilgan amallar soni" className="act-trend-card">
        <div className="act-trend" role="img" aria-label="Oxirgi 14 kunlik faollik diagrammasi">
          {trend.days.map((d) => (
            <div key={d.key} className="act-trend__col" title={`${d.label}: ${d.count} ta amal`}>
              <span className="act-trend__count">{d.count || ''}</span>
              <span className="act-trend__bar" style={{ height: `${Math.max(4, (d.count / trend.max) * 100)}%` }} data-empty={d.count === 0} />
              <span className="act-trend__label">{d.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="pk-card">
        <div className="pk-toolbar">
          <div className="pk-toolbar__filters">
            <div className="pk-toolbar__search">
              <Search size={16} className="pk-toolbar__search-icon" aria-hidden="true" />
              <input
                type="search"
                className="input"
                placeholder="Tavsif, nom, ID yoki foydalanuvchi…"
                aria-label="Faoliyatni qidirish"
                value={query}
                onChange={(e) => change(setQuery)(e.target.value)}
              />
            </div>
            <select className="input" aria-label="Bo‘lim" value={moduleKey} onChange={(e) => change(setModuleKey)(e.target.value)}>
              <option value="all">Barcha bo‘limlar</option>
              {MODULE_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select className="input" aria-label="Amal turi" value={action} onChange={(e) => change(setAction)(e.target.value)}>
              <option value="all">Barcha amallar</option>
              {ACTION_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            <select className="input" aria-label="Davr" value={period} onChange={(e) => change(setPeriod)(e.target.value)}>
              {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            {period === 'custom' && (
              <>
                <input
                  type="date"
                  className="input"
                  aria-label="Boshlanish sanasi"
                  value={range.from}
                  max={range.to || undefined}
                  onChange={(e) => { setRange((r) => ({ ...r, from: e.target.value }));  }}
                />
                <input
                  type="date"
                  className="input"
                  aria-label="Tugash sanasi"
                  value={range.to}
                  min={range.from || undefined}
                  onChange={(e) => { setRange((r) => ({ ...r, to: e.target.value }));  }}
                />
              </>
            )}
            {hasFilters && (
              <button type="button" className="btn btn--ghost" onClick={clearFilters}>
                <X size={15} /> Tozalash
              </button>
            )}
          </div>
          <span className="act-count">{formatNumber(filtered.length)} ta yozuv</span>
        </div>

        {rows.length === 0 ? (
          <div className="pk-empty">
            <span className="pk-empty__icon">{all.length === 0 ? <History size={28} /> : <SearchX size={28} />}</span>
            <h3>{all.length === 0 ? 'Faoliyat tarixi bo‘sh' : 'Yozuvlar topilmadi'}</h3>
            <p>
              {all.length === 0
                ? 'Talaba, to‘lov yoki sozlamalarda biror amal bajarilganda shu yerda paydo bo‘ladi.'
                : 'Qidiruv yoki filtr shartlariga mos yozuv yo‘q.'}
            </p>
            {hasFilters && <button type="button" className="btn btn--secondary" onClick={clearFilters}>Filtrlarni tozalash</button>}
          </div>
        ) : (
          <>
            <div className="act-table-wrap">
              <table className="act-table">
                <thead>
                  <tr>
                    <th aria-sort={dir === 'desc' ? 'descending' : 'ascending'}>
                      <button type="button" className="act-sort" onClick={() => setDir((d) => (d === 'desc' ? 'asc' : 'desc'))}>
                        Vaqt {dir === 'desc' ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
                      </button>
                    </th>
                    <th>Foydalanuvchi</th>
                    <th>Bo‘lim</th>
                    <th>Amal</th>
                    <th>Tavsif</th>
                    <th className="act-col-end"><span className="sr-only">Batafsil</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => {
                    const mod = moduleOf(a.module);
                    const act = actionOf(a.action);
                    const ModIcon = mod.icon;
                    const ActIcon = act.icon;
                    const extra = a.changes.length || a.items.length;
                    return (
                      <tr key={a.id} onClick={() => setViewId(a.id)}>
                        <td>
                          <div className="act-two">
                            <span>{timeAgo(a.at)}</span>
                            <small>{formatStamp(a.at)}</small>
                          </div>
                        </td>
                        <td>
                          <div className="act-user">
                            <Avatar firstName={a.actor?.name ?? '?'} lastName="" size={30} />
                            <div className="act-two">
                              <span>{a.actor?.name}</span>
                              <small>{a.actor?.role}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge pk-tone--${mod.tone} act-chip`}><ModIcon size={13} /> {mod.label}</span>
                        </td>
                        <td>
                          <span className={`badge badge--${act.tone} act-chip`}><ActIcon size={13} /> {act.label}</span>
                        </td>
                        <td className="act-desc">
                          <button type="button" className="act-link" onClick={(e) => { e.stopPropagation(); setViewId(a.id); }}>
                            {a.title}
                          </button>
                          {extra > 0 && (
                            <small>
                              {a.changes.length > 0 && `${a.changes.length} ta o‘zgarish`}
                              {a.changes.length > 0 && a.items.length > 0 && ' · '}
                              {a.items.length > 0 && `${a.items.length} ta yozuv`}
                            </small>
                          )}
                        </td>
                        <td className="act-col-end"><ArrowRight size={16} aria-hidden="true" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            
          </>
        )}
      </Card>

      {viewing && <ActivityDetail entry={viewing} onClose={() => setViewId(null)} />}

      <ConfirmDialog
        open={confirmClear}
        title="Tarixni tozalash"
        message={`${all.length} ta yozuv butunlay o‘chiriladi va qaytarib bo‘lmaydi. Tozalash haqida bitta yozuv qoldiriladi.`}
        confirmLabel="Tozalash"
        onConfirm={doClear}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
};

const Meta = ({ label, children }) => (
  <div className="act-meta__row">
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
);

/** Bitta yozuv tafsilotlari: kim, qachon, nima o‘zgargan (oldin → keyin). */
const ActivityDetail = ({ entry: a, onClose }) => {
  const mod = moduleOf(a.module);
  const act = actionOf(a.action);
  const ModIcon = mod.icon;
  const canOpen = a.action !== 'delete' && mod.path !== '';

  return (
    <Modal
      open
      variant="drawer"
      onClose={onClose}
      title="Faoliyat tafsilotlari"
      footer={
        canOpen ? (
          <Link to={`/admin/${mod.path}`} className="btn btn--primary" onClick={onClose}>
            {mod.label} sahifasiga o‘tish <ArrowRight size={16} />
          </Link>
        ) : (
          <button type="button" className="btn btn--secondary" onClick={onClose}>Yopish</button>
        )
      }
    >
      <div className="act-detail">
        <div className="act-detail__hero">
          <span className={`pk-icon pk-tone--${SEVERITY_TONE[a.severity] ?? mod.tone}`}><ModIcon size={20} /></span>
          <div>
            <h3>{a.title}</h3>
            <div className="act-detail__badges">
              <span className={`badge badge--${act.tone}`}>{act.label}</span>
              <span className={`badge pk-tone--${mod.tone}`}>{mod.label}</span>
              {a.demo && <span className="badge badge--muted">DEMO</span>}
            </div>
          </div>
        </div>

        <dl className="act-meta">
          <Meta label="Vaqt">{formatStamp(a.at)} <small>({timeAgo(a.at)})</small></Meta>
          <Meta label="Foydalanuvchi">{a.actor?.name} · {a.actor?.role}</Meta>
          {a.entityName && <Meta label="Obyekt">{a.entityName}</Meta>}
          {a.entityId && <Meta label="Obyekt ID"><code>{a.entityId}</code></Meta>}
          <Meta label="Yozuv ID"><code>{a.id}</code></Meta>
        </dl>

        {a.changes.length > 0 && (
          <section className="act-detail__section">
            <h4>O‘zgarishlar</h4>
            <table className="act-diff">
              <thead>
                <tr><th>Maydon</th><th>Oldin</th><th>Keyin</th></tr>
              </thead>
              <tbody>
                {a.changes.map((c) => (
                  <tr key={c.field}>
                    <td>{c.label}</td>
                    <td><span className="act-diff__from">{c.from}</span></td>
                    <td><span className="act-diff__to">{c.to}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {a.items.length > 0 && (
          <section className="act-detail__section">
            <h4>Ta’sirlangan yozuvlar ({a.items.length})</h4>
            <ul className="act-items">
              {a.items.map((it) => (
                <li key={it.id}>
                  <span>{it.name}</span>
                  <code>{it.id}</code>
                </li>
              ))}
            </ul>
          </section>
        )}

        {a.meta && Object.keys(a.meta).length > 0 && (
          <section className="act-detail__section">
            <h4>Qo‘shimcha</h4>
            <dl className="act-meta">
              {Object.entries(a.meta).map(([k, v]) => <Meta key={k} label={k}>{String(v)}</Meta>)}
            </dl>
          </section>
        )}
      </div>
    </Modal>
  );
};

export default ActivityLog;
