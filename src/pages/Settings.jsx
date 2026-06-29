import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useApp } from '../App';
import { Globe, Trash2, KeyRound, RefreshCw, Wifi, WifiOff, ChevronRight, Smartphone, Unplug, Sun, Moon } from 'lucide-react';

const APP_VERSION = '1.0.0';

export default function Settings() {
  const { t } = useTranslation();
  const { api, language, changeLanguage, showToast, confirm, disconnectDevice, deviceConnected, deviceInfo, activeDevice, theme, toggleTheme } = useApp();

  const [hasPassword, setHasPassword] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [restartingAdb, setRestartingAdb] = useState(false);

  const refresh = useCallback(async () => {
    setHasPassword(await api.password.exists());
    const dels = await api.deletion.getAll();
    setHistoryCount(dels.length);
  }, [api]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleLanguageToggle = async () => {
    const next = language === 'en' ? 'ar' : 'en';
    await changeLanguage(next);
    showToast(next === 'ar' ? 'تم تغيير اللغة' : 'Language changed', 'success');
  };

  const handleClearHistory = async () => {
    const ok = await confirm({ title: t('settings.clearHistory'), message: t('settings.clearHistoryDesc'), danger: true, confirmText: t('settings.clearHistory') });
    if (!ok) return;
    await api.deletion.clearHistory();
    await refresh();
    showToast(t('common.success'), 'success');
  };

  const handleResetPassword = async () => {
    const ok = await confirm({ title: t('settings.resetPassword'), message: t('settings.resetPasswordDesc'), danger: true, confirmText: t('settings.resetPassword') });
    if (!ok) return;
    await api.password.reset();
    setHasPassword(false);
    showToast(t('common.success'), 'success');
  };

  const handleRestartAdb = async () => {
    setRestartingAdb(true);
    await api.adb.killServer();
    await new Promise((r) => setTimeout(r, 500));
    await api.adb.startServer();
    setRestartingAdb(false);
    showToast(t('settings.adbRestarted'), 'info');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="page-header">
        <h1 className="page-header__title">{t('settings.title')}</h1>
        <p className="page-header__subtitle">{t('settings.subtitle')}</p>
      </div>

      {/* General */}
      <div className="settings-section">
        <h3 className="settings-section__title">{t('settings.general')}</h3>
        <button className="settings-item settings-item--button" onClick={toggleTheme}>
          <span className="settings-item__label">
            <span className="settings-item__label-icon">
              {theme === 'terminal' ? <Moon size={18} /> : <Sun size={18} />}
            </span>
            <span>
              <span className="settings-item__label-text">{t('settings.theme')}</span>
              <span className="settings-item__label-desc">{theme === 'terminal' ? t('settings.themeTerminal') : t('settings.themeEditorial')}</span>
            </span>
          </span>
          <span className="chip chip--primary">{theme === 'terminal' ? '◼ Terminal' : '◻ Editorial'}</span>
        </button>
        <button className="settings-item settings-item--button" onClick={handleLanguageToggle}>
          <span className="settings-item__label">
            <span className="settings-item__label-icon"><Globe size={18} /></span>
            <span>
              <span className="settings-item__label-text">{t('settings.language')}</span>
              <span className="settings-item__label-desc">{language === 'en' ? 'English' : 'العربية'}</span>
            </span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="chip chip--primary">{language === 'en' ? '🇺🇸 EN' : '🇸🇦 AR'}</span>
            <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
          </span>
        </button>
      </div>

      {/* Security */}
      <div className="settings-section">
        <h3 className="settings-section__title">{t('settings.security')}</h3>
        <div className="settings-item">
          <span className="settings-item__label">
            <span className="settings-item__label-icon"><KeyRound size={18} /></span>
            <span>
              <span className="settings-item__label-text">{t('settings.resetPassword')}</span>
              <span className="settings-item__label-desc">{hasPassword ? t('settings.passwordSet') : t('settings.passwordNotSet')}</span>
            </span>
          </span>
          {hasPassword && <button className="btn btn--ghost btn--sm" onClick={handleResetPassword}>{t('settings.resetPassword')}</button>}
        </div>
        <div className="settings-item">
          <span className="settings-item__label">
            <span className="settings-item__label-icon"><Trash2 size={18} /></span>
            <span>
              <span className="settings-item__label-text">{t('settings.clearHistory')}</span>
              <span className="settings-item__label-desc">{t('settings.records', { n: historyCount })}</span>
            </span>
          </span>
          <button className="btn btn--ghost btn--sm" onClick={handleClearHistory} disabled={historyCount === 0}>{t('settings.clearHistory')}</button>
        </div>
      </div>

      {/* Device */}
      <div className="settings-section">
        <h3 className="settings-section__title">{t('settings.deviceInfo')}</h3>
        <div className="settings-item">
          <span className="settings-item__label">
            <span className="settings-item__label-icon" style={{ color: deviceConnected ? 'var(--success-400)' : 'var(--danger-400)' }}>
              {deviceConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
            </span>
            <span>
              <span className="settings-item__label-text">{t('settings.adbStatus')}</span>
              <span className="settings-item__label-desc">{deviceConnected ? t('setup.connected') : t('setup.notConnected')}</span>
            </span>
          </span>
          <button className="btn btn--ghost btn--sm" onClick={handleRestartAdb} disabled={restartingAdb}>
            <RefreshCw size={14} className={restartingAdb ? 'spinning' : ''} /> {t('settings.restartAdb')}
          </button>
        </div>
        {deviceConnected && deviceInfo && (
          <div className="settings-item">
            <span className="settings-item__label">
              <span className="settings-item__label-icon"><Smartphone size={18} /></span>
              <span>
                <span className="settings-item__label-text">{deviceInfo.manufacturer} {deviceInfo.model}</span>
                <span className="settings-item__label-desc">Android {deviceInfo.androidVersion} · SDK {deviceInfo.sdk} · {activeDevice}</span>
              </span>
            </span>
          </div>
        )}
        {deviceConnected && (
          <div className="settings-item">
            <span className="settings-item__label">
              <span className="settings-item__label-icon"><Unplug size={18} /></span>
              <span>
                <span className="settings-item__label-text">{t('device.disconnect')}</span>
                <span className="settings-item__label-desc">{t('device.disconnectDesc')}</span>
              </span>
            </span>
            <button className="btn btn--ghost btn--sm" onClick={disconnectDevice}>{t('device.disconnect')}</button>
          </div>
        )}
      </div>

      {/* About */}
      <div className="settings-section">
        <h3 className="settings-section__title">{t('settings.about')}</h3>
        <div className="card about-card">
          <div className="about-card__logo">إ</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{t('app.fullName')}</h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>{t('app.tagline')}</p>
          <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>{t('settings.version')} {APP_VERSION}</p>
          <div className="about-card__chips">
            <span className="chip chip--primary">Electron</span>
            <span className="chip chip--success">React</span>
            <span className="chip chip--warning">ADB</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
