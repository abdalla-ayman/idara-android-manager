import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

/**
 * Promise-based, theme-aware replacement for window.confirm().
 * Driven by state held in App; resolves true/false.
 */
export default function ConfirmDialog({ state, onResolve }) {
  const { t } = useTranslation();
  const open = !!state;
  const opts = state || {};
  const danger = opts.danger;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onResolve(false)}
        >
          <motion.div
            className="modal modal--sm"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className={`confirm-icon ${danger ? 'confirm-icon--danger' : ''}`}>
              <AlertTriangle size={26} />
            </div>
            <h2 className="modal__title" style={{ textAlign: 'center' }}>{opts.title}</h2>
            {opts.message && (
              <p className="modal__subtitle" style={{ textAlign: 'center', marginBottom: 8 }}>
                {opts.message}
              </p>
            )}
            <div className="modal__actions" style={{ justifyContent: 'center', marginTop: 20 }}>
              <button className="btn btn--ghost" onClick={() => onResolve(false)}>
                {opts.cancelText || t('common.cancel')}
              </button>
              <button
                className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
                onClick={() => onResolve(true)}
                autoFocus
              >
                {opts.confirmText || t('common.confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
