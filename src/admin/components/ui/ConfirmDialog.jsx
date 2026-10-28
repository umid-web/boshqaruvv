import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

/** Xavfli amallar uchun tasdiqlash oynasi. */
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Tasdiqlash',
  cancelLabel = 'Bekor qilish',
  tone = 'danger',
  onConfirm,
  onCancel,
}) => (
  <Modal
    open={open}
    onClose={onCancel}
    size="sm"
    title={
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}>
        <span
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 34,
            height: 34,
            borderRadius: 10,
            background: `var(--${tone}-soft)`,
            color: `var(--${tone})`,
          }}
        >
          <AlertTriangle size={18} />
        </span>
        {title}
      </span>
    }
    footer={
      <>
        <button type="button" className="btn btn--secondary" onClick={onCancel} data-autofocus>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`btn btn--${tone === 'danger' ? 'danger' : 'primary'}`}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </>
    }
  >
    <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{message}</p>
  </Modal>
);

export default ConfirmDialog;
