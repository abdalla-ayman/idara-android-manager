import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../App';
import AppIcon from '../components/AppIcon';
import { RotateCcw, Lock, Clock, Eye, EyeOff, Loader2, Timer, Check, Smartphone } from 'lucide-react';

export default function RestoreApps() {
  const { t } = useTranslation();
  const { api, showToast, activeDevice, deviceConnected } = useApp();

  // Source of truth: what ADB says is actually restorable right now
  const [restorableApps, setRestorableApps] = useState([]);
  // Metadata overlay: lock timers / history from our deletion store
  const [deletionMeta, setDeletionMeta] = useState({});

  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Run both in parallel; ADB list only makes sense when a device is connected
      const [adbResult, deletions] = await Promise.all([
        deviceConnected
          ? api.adb.getRestorable({ serial: activeDevice })
          : Promise.resolve({ success: true, apps: [] }),
        api.deletion.getAll(),
      ]);

      // Build a metadata map from deletion records (keyed by package)
      const meta = {};
      for (const d of deletions) {
        if (d.status === 'deleted') meta[d.package] = d;
      }
      setDeletionMeta(meta);

      if (adbResult.success) {
        setRestorableApps(adbResult.apps.filter((a) => a.isSystem));
      } else {
        setRestorableApps([]);
        if (deviceConnected) showToast(adbResult.error || t('common.error'), 'error');
      }
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [api, activeDevice, deviceConnected, showToast, t]);

  useEffect(() => {
    load();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [load]);

  const toggleSelect = (pkg) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(pkg) ? next.delete(pkg) : next.add(pkg);
      return next;
    });
  };

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = expiresAt - now;
    if (diff <= 0) return null;
    return {
      hours: Math.floor(diff / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      total: diff,
    };
  };

  const lockProgress = (meta) => {
    const remaining = getTimeRemaining(meta.lockExpiresAt);
    if (!remaining) return 100;
    const window = meta.recoveryMs || (meta.lockExpiresAt - (meta.deletedAt || meta.lockExpiresAt - remaining.total));
    if (!window) return 0;
    return Math.max(0, Math.min(100, (1 - remaining.total / window) * 100));
  };

  const handleRestore = async () => {
    if (selected.size === 0) return;
    if (!deviceConnected) { showToast(t('device.noneTitle'), 'warning'); return; }

    const targets = restorableApps.filter((a) => selected.has(a.package));

    // Start the timer for any locked app that hasn't had a restore attempt yet
    const pendingLock = targets.filter((a) => {
      const meta = deletionMeta[a.package];
      return meta?.isLocked && !meta.lockExpiresAt;
    });
    if (pendingLock.length > 0) {
      await Promise.all(pendingLock.map((a) => api.deletion.startTimer(a.package)));
      await load(); // refresh meta so timers are visible
    }

    // After starting timers, check if any are still within their lock window
    const nowTs = Date.now();
    const hasActiveLock = targets.some((a) => {
      const meta = deletionMeta[a.package];
      if (!meta?.isLocked) return false;
      // pendingLock apps just got their timer set — treat as locked
      if (pendingLock.find((p) => p.package === a.package)) return true;
      return meta.lockExpiresAt && meta.lockExpiresAt > nowTs;
    });

    if (hasActiveLock) {
      if (await api.password.exists()) { setShowPasswordModal(true); return; }
      showToast(t('restore.locked'), 'warning');
      return;
    }
    executeRestore();
  };

  const handlePasswordVerify = async () => {
    setPwError('');
    const result = await api.password.verify(password);
    if (result.valid) {
      setShowPasswordModal(false);
      setPassword('');
      executeRestore();
    } else {
      setPwError(t('password.incorrect'));
    }
  };

  const executeRestore = async () => {
    const targets = restorableApps.filter((a) => selected.has(a.package));
    setRestoring(true);
    let ok = 0;
    for (const app of targets) {
      try {
        const res = await api.adb.restore({ packageName: app.package, serial: activeDevice });
        if (res.success) {
          ok++;
          // Update deletion record status if we have one
          if (deletionMeta[app.package]) {
            await api.deletion.updateStatus(app.package, 'restored');
          }
        }
      } catch { /* keep going */ }
    }
    setRestoring(false);
    setSelected(new Set());
    showToast(`${t('restore.complete')}: ${ok}/${targets.length}`, ok === targets.length ? 'success' : 'warning');
    load();
  };

  const lockedApps = restorableApps
    .map((a) => deletionMeta[a.package])
    .filter((meta) => meta?.isLocked && getTimeRemaining(meta.lockExpiresAt));

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="page-header">
          <h1 className="page-header__title">{t('restore.title')}</h1>
          <p className="page-header__subtitle">{t('restore.subtitle')}</p>
        </div>

        {!deviceConnected && (
          <div className="callout callout--warning" style={{ marginBottom: 20 }}>
            <Smartphone size={18} style={{ flexShrink: 0 }} />
            <span>{t('restore.needDevice')}</span>
          </div>
        )}

        {loading ? (
          <div className="empty-state"><div className="spinner spinner--lg" /></div>
        ) : restorableApps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">✨</div>
            <h3 className="empty-state__title">{t('restore.noApps')}</h3>
            <p className="empty-state__desc">{deviceConnected ? t('restore.noAppsDesc') : t('restore.needDevice')}</p>
          </div>
        ) : (
          <>
            <div className="toolbar" style={{ marginBottom: 14 }}>
              <span className="toolbar__count">
                <strong>{restorableApps.length}</strong> {t('restore.restorable')}
              </span>
            </div>

            <div className="app-grid">
              {restorableApps.map((app, i) => {
                const meta = deletionMeta[app.package];
                const timerStarted = meta?.isLocked && !!meta.lockExpiresAt;
                const remaining = timerStarted ? getTimeRemaining(meta.lockExpiresAt) : null;
                const isLocked = meta?.isLocked && (!timerStarted || !!remaining);
                const isSel = selected.has(app.package);
                const trackedByApp = !!meta;

                return (
                  <motion.div
                    key={app.package}
                    className={`app-card ${isSel ? 'app-card--selected' : ''}`}
                    onClick={() => toggleSelect(app.package)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggleSelect(app.package))}
                    role="button" tabIndex={0} aria-pressed={isSel}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  >
                    <div className="app-card__checkbox">{isSel && <Check size={14} color="white" />}</div>
                    <AppIcon pkg={app.package} name={app.name} />
                    <div className="app-card__info">
                      <div className="app-card__name">{app.name}</div>
                      <div className="app-card__package">{app.package}</div>
                      {isLocked && remaining && (
                        <div className="app-card__timer">
                          <Clock size={12} />
                          {remaining.hours}h {remaining.minutes}m {t('restore.remaining')}
                        </div>
                      )}
                    </div>
                    <div className="app-card__badges">
                      <span className={`app-card__badge app-card__badge--${app.isSystem ? 'system' : 'user'}`}>
                        {app.isSystem ? t('apps.system') : t('apps.user')}
                      </span>
                      {isLocked
                        ? <span className="app-card__badge app-card__badge--locked"><Lock size={10} /> {t('restore.locked')}</span>
                        : trackedByApp
                          ? <span className="app-card__badge app-card__badge--deleted">{t('restore.deleted')}</span>
                          : <span className="app-card__badge app-card__badge--deleted">{t('restore.external')}</span>
                      }
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <AnimatePresence>
              {selected.size > 0 && (
                <motion.div className="action-bar"
                  initial={{ opacity: 0, y: 24, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 24, x: '-50%' }}>
                  <span className="action-bar__count"><strong>{selected.size}</strong> {t('apps.selected')}</span>
                  <button className="btn btn--ghost btn--sm" onClick={() => setSelected(new Set())}>{t('apps.clear')}</button>
                  <button className="btn btn--success" onClick={handleRestore} disabled={restoring || !deviceConnected}>
                    {restoring ? <Loader2 className="spin-icon" size={16} /> : <RotateCcw size={16} />}
                    {t('restore.restore')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>

      {/* Password verify */}
      <AnimatePresence>
        {showPasswordModal && (
          <Overlay onClose={() => setShowPasswordModal(false)}>
            <h2 className="modal__title">{t('restore.enterPassword')}</h2>
            <p className="modal__subtitle">{t('password.verify')}</p>
            <div style={{ marginTop: 20 }}>
              <div className="password-field">
                <input
                  type={showPw ? 'text' : 'password'} className="input" placeholder={t('password.enter')}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordVerify()} autoFocus
                />
                <button className="password-field__toggle" onClick={() => setShowPw(!showPw)} aria-label="toggle">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pwError && <p style={{ color: 'var(--danger-400)', fontSize: 13, marginTop: 8 }}>{pwError}</p>}
            </div>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => { setShowPasswordModal(false); setShowForgotModal(true); }}>{t('password.forgot')}</button>
              <button className="btn btn--ghost" onClick={() => setShowPasswordModal(false)}>{t('common.cancel')}</button>
              <button className="btn btn--primary" onClick={handlePasswordVerify}>{t('password.verifyBtn')}</button>
            </div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* Forgot password — show countdowns */}
      <AnimatePresence>
        {showForgotModal && (
          <Overlay onClose={() => setShowForgotModal(false)}>
            <div style={{ textAlign: 'center' }}>
              <div className="confirm-icon"><Timer size={26} /></div>
              <h2 className="modal__title">{t('password.forgotTitle')}</h2>
              <p className="modal__subtitle">{t('password.forgotDesc')}</p>
            </div>
            {lockedApps.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--success-400)', marginTop: 16 }}>{t('password.unlocked')}</p>
            ) : lockedApps.map((meta) => {
              const remaining = getTimeRemaining(meta.lockExpiresAt);
              return (
                <div key={meta.package} style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, textAlign: 'center' }}>{meta.name}</p>
                  <div className="timer" style={{ justifyContent: 'center' }}>
                    <Segment value={remaining.hours} label="HRS" />
                    <span className="timer__separator">:</span>
                    <Segment value={remaining.minutes} label="MIN" />
                    <span className="timer__separator">:</span>
                    <Segment value={remaining.seconds} label="SEC" />
                  </div>
                  <div className="progress" style={{ marginTop: 16 }}>
                    <div className="progress__fill" style={{ width: `${lockProgress(meta)}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="modal__actions" style={{ justifyContent: 'center', marginTop: 28 }}>
              <button className="btn btn--ghost" onClick={() => setShowForgotModal(false)}>{t('common.ok')}</button>
            </div>
          </Overlay>
        )}
      </AnimatePresence>
    </>
  );
}

function Segment({ value, label }) {
  return (
    <div className="timer__segment">
      <div className="timer__value">{String(value).padStart(2, '0')}</div>
      <div className="timer__label">{label}</div>
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}>
        {children}
      </motion.div>
    </motion.div>
  );
}
