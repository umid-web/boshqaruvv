import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '../../utils/format';
import './Pagination.scss';

// [1, '…', 4, 5, 6, '…', 20] ko‘rinishidagi sahifa raqamlari ro‘yxati
const buildPages = (page, count) => {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const set = new Set([1, count, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (page >= count - 2) [count - 1, count - 2, count - 3].forEach((n) => set.add(n));
  const sorted = [...set].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b);
  return sorted.flatMap((n, i) => (i > 0 && n - sorted[i - 1] > 1 ? ['gap-' + n, n] : [n]));
};

const Pagination = ({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizes = [10, 20, 50] }) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="pagination">
      <div className="pagination__info">
        <span>
          <strong>{formatNumber(from)}–{formatNumber(to)}</strong> / {formatNumber(total)}
        </span>
        <label className="pagination__size">
          <span className="sr-only">Sahifadagi qatorlar soni</span>
          <select
            className="input"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizes.map((s) => (
              <option key={s} value={s}>{s} ta / sahifa</option>
            ))}
          </select>
        </label>
      </div>

      <nav className="pagination__nav" aria-label="Sahifalash">
        <button
          type="button"
          className="pagination__btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Oldingi sahifa"
        >
          <ChevronLeft size={16} />
        </button>
        {buildPages(page, pageCount).map((n) =>
          typeof n === 'string' ? (
            <span key={n} className="pagination__gap" aria-hidden="true">…</span>
          ) : (
            <button
              key={n}
              type="button"
              className={n === page ? 'pagination__btn is-active' : 'pagination__btn'}
              onClick={() => onPageChange(n)}
              aria-current={n === page ? 'page' : undefined}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          className="pagination__btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Keyingi sahifa"
        >
          <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
};

export default Pagination;
