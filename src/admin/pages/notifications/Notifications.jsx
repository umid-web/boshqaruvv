import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BellOff,
  CalendarCheck,
  CheckCheck,
  Inbox,
  Mail,
  MailOpen,
  Search,
  SearchX,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import Card from '../../components/Card';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/useToast';
import { CATEGORY_OPTIONS, PRIORITIES, PRIORITY_OPTIONS, categoryOf } from '../../activity/meta';
import {
  clearRead,
  markAllRead,
  markRead,
  removeNotifications,
  restoreNotifications,
  useNotifications,
} from '../../activity/notificationStore';
import { groupByDay, timeAgo, todayKey, toDayKey, formatStamp } from '../../activity/time';
import { formatNumber } from '../../utils/format';
import '../../activity/pageKit.scss';
import './Notifications.scss';

const TABS = [
  { value: 'all', label: 'Barchasi' },
  { value: 'unread', label: 'O‘qilmagan' },
  { value: 'read', label: 'O‘qilgan' },
];

const Notifications = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const { items, unread, urgent } = useNotifications();

  const [tab, setTab] = useState('all');
  const [category, setCategory] = useState('all');
  const [priority, setPriority] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [confirmClear, setConfirmClear] = useState(false);

  const today = todayKey();
  const stats = useMemo(
    () => ({
      total: items.length,
      today: items.filter((n) => toDayKey(n.at) === today).length,
    }),
    [items, today],
  );

  const counts = useMemo(
    () => ({ all: items.length, unread, read: items.length - unread }),
    [items, unread],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (n) =>
        (tab === 'all' || (tab === 'unread' ? !n.read : n.read)) &&
        (category === 'all' || n.category === category) &&
        (priority === 'all' || n.priority === priority) &&
        (!q || `${n.title} ${n.message}`.toLowerCase().includes(q)),
    );
  }, [items, tab, category, priority, query]);
  const rows = filtered;
  const groups = useMemo(() => groupByDay(rows), [rows]);

  const hasFilters = query.trim() !== '' || category !== 'all' || priority !== 'all';

  // Tanlash (sahifadagi hammasi)
  const pageSelected = rows.length > 0 && rows.every((n) => selected.has(n.id));
  const pageSome = rows.some((n) => selected.has(n.id));
  const headCheckbox = useRef(null);
  useEffect(() => {
    if (headCheckbox.current) headCheckbox.current.indeterminate = pageSome && !pageSelected;
  }, [pageSome, pageSelected]);

  const resetView = () => {
    
    setSelected(new Set());
  };
  const changeTab = (v) => { setTab(v); resetView(); };
  const changeCategory = (v) => { setCategory(v); resetView(); };
  const changePriority = (v) => { setPriority(v); resetView(); };
  const changeQuery = (v) => { setQuery(v); resetView(); };
  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setPriority('all');
    resetView();
  };

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      rows.forEach((n) => (pageSelected ? next.delete(n.id) : next.add(n.id)));
      return next;
    });

  // ---------- Amallar ----------
  const open = (n) => {
    markRead(n.id);
    if (n.link) navigate(n.link);
  };

  const remove = (ids) => {
    const removed = removeNotifications(ids);
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    toast.info(removed.length === 1 ? 'Bildirishnoma o‘chirildi' : `${removed.length} ta bildirishnoma o‘chirildi`, {
      action: { label: 'Qaytarish', onClick: () => restoreNotifications(removed) },
    });
  };

  const bulkRead = (value) => {
    const ids = [...selected];
    markRead(ids, value);
    setSelected(new Set());
    toast.success(`${ids.length} ta bildirishnoma ${value ? 'o‘qilgan' : 'o‘qilmagan'} deb belgilandi`);
  };

  const readAll = () => {
    markAllRead();
    toast.success('Hammasi o‘qilgan deb belgilandi');
  };

  const confirmClearRead = () => {
    const removed = clearRead();
    setConfirmClear(false);
    setSelected(new Set());
    toast.info(`${removed.length} ta o‘qilgan bildirishnoma o‘chirildi`, {
      action: { label: 'Qaytarish', onClick: () => restoreNotifications(removed) },
    });
  };

  return (
    <div className="pk-page ntf-page">
      <header className="pk-head">
        <div>
          <h1>Bildirishnomalar</h1>
          <p>To‘lov, davomat va tizim xabarlari — muhimlari birinchi navbatda ko‘rinadi</p>
        </div>
        <div className="pk-head__actions">
          <Link to="/admin/settings" className="btn btn--secondary">
            <Settings size={16} /> Sozlamalar
          </Link>
          <button type="button" className="btn btn--secondary" onClick={() => setConfirmClear(true)} disabled={counts.read === 0}>
            <Trash2 size={16} /> O‘qilganlarni tozalash
          </button>
          <button type="button" className="btn btn--primary" onClick={readAll} disabled={unread === 0}>
            <CheckCheck size={16} /> Hammasini o‘qildi deb belgilash
          </button>
        </div>
      </header>

      <section className="pk-stats" aria-label="Bildirishnomalar ko‘rsatkichlari">
        <StatCard title="Jami" value={formatNumber(stats.total)} icon={Inbox} tone="primary" />
        <StatCard title="O‘qilmagan" value={formatNumber(unread)} icon={Bell} tone="warning" />
        <StatCard title="Muhim (o‘qilmagan)" value={formatNumber(urgent)} icon={AlertTriangle} tone="danger" />
        <StatCard title="Bugun" value={formatNumber(stats.today)} icon={CalendarCheck} tone="success" />
      </section>

      <Card className="pk-card">
        <div className="pk-toolbar">
          <div className="pk-tabs" role="tablist" aria-label="Holat bo‘yicha">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                className={tab === t.value ? 'pk-tab is-active' : 'pk-tab'}
                onClick={() => changeTab(t.value)}
              >
                {t.label}
                <span className="pk-tab__count">{formatNumber(counts[t.value])}</span>
              </button>
            ))}
          </div>

          <div className="pk-toolbar__filters">
            <div className="pk-toolbar__search">
              <Search size={16} className="pk-toolbar__search-icon" aria-hidden="true" />
              <input
                type="search"
                className="input"
                placeholder="Sarlavha yoki matn bo‘yicha…"
                aria-label="Bildirishnomalarni qidirish"
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
              />
            </div>
            <select className="input" aria-label="Toifa" value={category} onChange={(e) => changeCategory(e.target.value)}>
              <option value="all">Barcha toifalar</option>
              {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select className="input" aria-label="Muhimlik" value={priority} onChange={(e) => changePriority(e.target.value)}>
              <option value="all">Barcha darajalar</option>
              {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            {hasFilters && (
              <button type="button" className="btn btn--ghost" onClick={clearFilters}>
                <X size={15} /> Tozalash
              </button>
            )}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="pk-bulk" role="status">
            <span><strong>{selected.size}</strong> ta bildirishnoma tanlandi</span>
            <div className="pk-bulk__actions">
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => bulkRead(true)}>
                <MailOpen size={14} /> O‘qildi
              </button>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => bulkRead(false)}>
                <Mail size={14} /> O‘qilmagan
              </button>
              <button type="button" className="btn btn--danger btn--sm" onClick={() => remove([...selected])}>
                <Trash2 size={14} /> O‘chirish
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelected(new Set())}>
                Bekor qilish
              </button>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="pk-empty">
            <span className="pk-empty__icon">{items.length === 0 ? <BellOff size={28} /> : <SearchX size={28} />}</span>
            <h3>{items.length === 0 ? 'Bildirishnomalar yo‘q' : 'Hech narsa topilmadi'}</h3>
            <p>
              {items.length === 0
                ? 'Yangi to‘lov, eslatma yoki tizim xabari kelganda shu yerda ko‘rinadi.'
                : 'Qidiruv yoki filtr shartlariga mos bildirishnoma yo‘q.'}
            </p>
            {hasFilters && <button type="button" className="btn btn--secondary" onClick={clearFilters}>Filtrlarni tozalash</button>}
          </div>
        ) : (
          <>
            <div className="ntf-selectall">
              <label>
                <input ref={headCheckbox} type="checkbox" checked={pageSelected} onChange={togglePage} />
                <span>Sahifadagi hammasini tanlash</span>
              </label>
            </div>

            {groups.map((g) => (
              <section key={g.key} className="ntf-group" aria-label={g.label}>
                <h2 className="ntf-group__title">{g.label}</h2>
                <ul className="ntf-list">
                  {g.items.map((n) => {
                    const { icon: Icon, tone, label } = categoryOf(n.category);
                    const prio = PRIORITIES[n.priority] ?? PRIORITIES.normal;
                    const isSelected = selected.has(n.id);
                    return (
                      <li key={n.id} className={`ntf-row${n.read ? '' : ' is-unread'}${isSelected ? ' is-selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(n.id)}
                          aria-label={`Tanlash: ${n.title}`}
                        />
                        <span className={`pk-icon pk-tone--${tone}`}><Icon size={18} /></span>

                        <button type="button" className="ntf-row__body" onClick={() => open(n)}>
                          <span className="ntf-row__title">
                            {!n.read && <span className="ntf-row__dot" aria-label="O‘qilmagan" />}
                            {n.title}
                          </span>
                          {n.message && <span className="ntf-row__msg">{n.message}</span>}
                          <span className="ntf-row__meta">
                            <span className={`badge badge--${tone}`}>{label}</span>
                            {n.priority === 'high' && <span className={`badge badge--${prio.tone}`}>{prio.label}</span>}
                            <time dateTime={n.at} title={formatStamp(n.at)}>{timeAgo(n.at)}</time>
                          </span>
                        </button>

                        <div className="ntf-row__actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => markRead(n.id, !n.read)}
                            aria-label={n.read ? 'O‘qilmagan deb belgilash' : 'O‘qilgan deb belgilash'}
                            title={n.read ? 'O‘qilmagan deb belgilash' : 'O‘qilgan deb belgilash'}
                          >
                            {n.read ? <Mail size={16} /> : <MailOpen size={16} />}
                          </button>
                          <button
                            type="button"
                            className="icon-btn ntf-row__delete"
                            onClick={() => remove([n.id])}
                            aria-label="O‘chirish"
                            title="O‘chirish"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            
          </>
        )}
      </Card>

      <ConfirmDialog
        open={confirmClear}
        title="O‘qilganlarni tozalash"
        message={`${counts.read} ta o‘qilgan bildirishnoma o‘chiriladi. O‘qilmaganlar saqlanadi. Keyin “Qaytarish” orqali tiklash mumkin.`}
        confirmLabel="Tozalash"
        onConfirm={confirmClearRead}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
};

export default Notifications;
