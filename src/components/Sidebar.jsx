import { useTranslation } from 'react-i18next';
import { useApp } from '../App';

export default function Sidebar() {
  const { t } = useTranslation();
  const { currentPage, setCurrentPage, deviceConnected, restorableCount } = useApp();

  const navItems = [
    { id: 'apps',     label: t('nav.apps') },
    { id: 'restore',  label: t('nav.restore'), badge: restorableCount > 0 ? restorableCount : null },
    { id: 'settings', label: t('nav.settings') },
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
            className={`sidebar__link${currentPage === item.id ? ' sidebar__link--active' : ''}`}
            onClick={() => setCurrentPage(item.id)}
          >
            <span className="sidebar__link-icon" aria-hidden="true" />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge != null && (
              <span className="sidebar__badge">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar__status">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className={`sidebar__status-dot ${deviceConnected ? 'sidebar__status-dot--connected' : 'sidebar__status-dot--disconnected'}`} />
          <span className="sidebar__status-text">
            {deviceConnected ? t('setup.connected') : t('setup.notConnected')}
          </span>
        </div>
      </div>
    </aside>
  );
}
