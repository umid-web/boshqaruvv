import { useContext } from 'react';
import { ToastContext } from './toastContext';

/**
 * const toast = useToast();
 * toast.success('Saqlandi');
 * toast.info('O‘chirildi', { action: { label: 'Qaytarish', onClick } });
 */
export const useToast = () => {
  const { push } = useContext(ToastContext);
  return {
    success: (message, opts) => push({ type: 'success', message, ...opts }),
    error: (message, opts) => push({ type: 'error', message, ...opts }),
    info: (message, opts) => push({ type: 'info', message, ...opts }),
  };
};
