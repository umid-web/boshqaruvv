import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { ToastContext } from './toastContext';
import './Toast.scss';

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const DURATION = 5000;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast) => {
      const id = ++counter.current;
      setToasts((list) => [...list.slice(-3), { id, ...toast }]);
      timers.current.set(id, setTimeout(() => dismiss(id), toast.duration ?? DURATION));
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="toast-region" role="region" aria-label="Xabarnomalar" aria-live="polite">
          {toasts.map((t) => {
            const Icon = ICONS[t.type] ?? Info;
            return (
              <div key={t.id} className={`toast toast--${t.type}`} role="status">
                <Icon size={18} className="toast__icon" />
                <span className="toast__message">{t.message}</span>
                {t.action && (
                  <button
                    type="button"
                    className="toast__action"
                    onClick={() => {
                      t.action.onClick();
                      dismiss(t.id);
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
                <button type="button" className="toast__close" onClick={() => dismiss(t.id)} aria-label="Yopish">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
};
