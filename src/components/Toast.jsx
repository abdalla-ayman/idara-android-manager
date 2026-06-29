import { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const ICONS = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

const COLORS = {
  success: 'var(--success-400)',
  error: 'var(--danger-400)',
  warning: 'var(--warning-400)',
  info: 'var(--accent-400)',
};

export default function Toast({ message, type = 'info', onClose }) {
  const [visible, setVisible] = useState(true);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const dismiss = () => { setVisible(false); setTimeout(() => onCloseRef.current?.(), 300); };

  useEffect(() => {
    const timer = setTimeout(dismiss, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`toast toast--${type}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 300ms ease',
      }}
    >
      <span style={{ color: COLORS[type] }}>{ICONS[type]}</span>
      <span className="toast__text">{message}</span>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
