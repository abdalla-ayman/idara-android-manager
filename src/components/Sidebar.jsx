import { useTranslation } from 'react-i18next';
import { useApp } from '../App';
import { Smartphone, RotateCcw, Settings, Wifi, WifiOff } from 'lucide-react';

export default function Sidebar() {
  const { t } = useTranslation();
  const { currentPage, setCurrentPage, deviceConnected } = useApp();

  const navItems = [
    { id: 'apps', icon: <Smartphone size={20} />, label: t('nav.apps') },
    { id: 'restore', icon: <RotateCcw size={20} />, label: t('nav.restore') },
    { id: 'settings', icon: <Settings size={20} />, label: t('nav.settings') },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-icon">إ</div>
        <div className="sidebar__brand-text">
          <h2>إدارة</h2>
          <p>{t('app.tagline')}</p>
        </div>
      </div>

      <div className="sidebar__divider" />

      <nav className="sidebar__nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar__link ${currentPage === item.id ? 'sidebar__link--active' : ''}`}
            onClick={() => setCurrentPage(item.id)}
          >
            <span className="sidebar__link-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__status">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className={`sidebar__status-dot ${deviceConnected ? 'sidebar__status-dot--connected' : 'sidebar__status-dot--disconnected'}`} />
          {deviceConnected ? (
            <Wifi size={14} style={{ marginRight: 6, color: 'var(--success-400)' }} />
          ) : (
            <WifiOff size={14} style={{ marginRight: 6, color: 'var(--danger-400)' }} />
          )}
          <span className="sidebar__status-text">
            {deviceConnected ? t('setup.connected') : t('setup.notConnected')}
          </span>
        </div>
      </div>
    </aside>
  );
}
