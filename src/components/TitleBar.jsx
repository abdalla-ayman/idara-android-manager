import { useApp } from '../App';
import { Minus, Square, X } from 'lucide-react';

export default function TitleBar() {
  const { api, isElectron } = useApp();

  return (
    <div className="titlebar">
      <div className="titlebar__logo">
        <div className="titlebar__logo-icon">إ</div>
        <span className="titlebar__title">إدارة</span>
      </div>
      {isElectron && (
        <div className="titlebar__controls">
          <button className="titlebar__btn" onClick={() => api.minimize()} aria-label="Minimize">
            <Minus size={14} />
          </button>
          <button className="titlebar__btn" onClick={() => api.maximize()} aria-label="Maximize">
            <Square size={12} />
          </button>
          <button className="titlebar__btn titlebar__btn--close" onClick={() => api.close()} aria-label="Close">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
