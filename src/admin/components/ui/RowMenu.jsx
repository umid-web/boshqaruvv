import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import './RowMenu.scss';

const MENU_ITEM_HEIGHT = 38;

/**
 * Jadval qatori uchun amallar menyusi. Menyu portal orqali chiqariladi,
 * shuning uchun jadvalning overflow konteyneri uni kesib qo‘ymaydi.
 * items: [{ label, icon, onClick, tone?: 'danger', divider?: true, hidden?: true }]
 */
const RowMenu = ({ items, label = 'Amallar' }) => {
  const [pos, setPos] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const visible = items.filter((i) => !i.hidden);

  const close = useCallback(() => setPos(null), []);

  const toggle = () => {
    if (pos) return close();
    const rect = buttonRef.current.getBoundingClientRect();
    const height = visible.length * MENU_ITEM_HEIGHT + 16;
    const openUp = rect.bottom + height > window.innerHeight - 8;
    setPos({
      right: Math.max(8, window.innerWidth - rect.right),
      ...(openUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    });
    return undefined;
  };

  useEffect(() => {
    if (!pos) return undefined;
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    menuRef.current?.querySelector('button')?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [pos, close]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn row-menu__trigger"
        onClick={toggle}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={Boolean(pos)}
      >
        <MoreVertical size={16} />
      </button>
      {pos &&
        createPortal(
          <div ref={menuRef} className="row-menu" role="menu" style={pos}>
            {visible.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label}>
                  {item.divider && <div className="row-menu__divider" role="separator" />}
                  <button
                    type="button"
                    role="menuitem"
                    className={item.tone === 'danger' ? 'row-menu__item is-danger' : 'row-menu__item'}
                    onClick={() => {
                      close();
                      item.onClick();
                    }}
                  >
                    {Icon && <Icon size={16} />}
                    {item.label}
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
};

export default RowMenu;
