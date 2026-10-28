import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './Modal.scss';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Ichma-ich modallar uchun (masalan, drawer ustida tasdiqlash oynasi) scroll qulfi hisoblagichi
let scrollLocks = 0;
const lockScroll = () => {
  if (scrollLocks++ === 0) document.body.style.overflow = 'hidden';
};
const unlockScroll = () => {
  if (--scrollLocks === 0) document.body.style.overflow = '';
};

/**
 * Modal oyna / yon panel (drawer).
 * - variant: 'dialog' (markazda) | 'drawer' (o‘ng tomondan)
 * - size: 'sm' | 'md' | 'lg'
 * Esc bilan yopiladi, fokus oyna ichida qoladi va yopilganda avvalgi elementga qaytadi.
 */
const Modal = ({
  open,
  onClose,
  title,
  subtitle,
  footer,
  size = 'md',
  variant = 'dialog',
  children,
}) => {
  const panelRef = useRef(null);
  const titleId = useId();
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const panel = panelRef.current;
    lockScroll();

    const target =
      panel.querySelector(`[data-autofocus], .modal__body ${FOCUSABLE.split(',').join(', .modal__body ')}`) ||
      panel.querySelector(FOCUSABLE);
    target?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', onKeyDown);

    return () => {
      panel.removeEventListener('keydown', onKeyDown);
      unlockScroll();
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className={`modal modal--${variant}`}>
      <div className="modal__backdrop" onClick={() => onClose?.()} aria-hidden="true" />
      <div
        ref={panelRef}
        className={`modal__panel modal__panel--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="modal__header">
          <div className="modal__heading">
            <h2 id={titleId} className="modal__title">{title}</h2>
            {subtitle && <p className="modal__subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={() => onClose?.()} aria-label="Yopish">
            <X size={18} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
