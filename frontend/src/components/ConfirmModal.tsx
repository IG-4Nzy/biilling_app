import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmModal({
  open, title = 'Confirm Action', message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'danger', onConfirm, onCancel, loading,
}: ConfirmModalProps) {
  const btnClass = variant === 'danger'
    ? 'bg-red-500 hover:bg-red-600 text-white'
    : variant === 'warning'
    ? 'bg-amber-500 hover:bg-amber-600 text-black'
    : 'btn-primary';

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onCancel}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            className="glass-card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className={`p-2 rounded-lg ${variant === 'danger' ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-red-400' : 'text-amber-400'}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="text-sm text-surface-400 mt-1">{message}</p>
              </div>
              <button onClick={onCancel} className="btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={onCancel} className="btn-secondary flex-1">{cancelLabel}</button>
              <button onClick={onConfirm} disabled={loading}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${btnClass}`}>
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
