import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../App';
import AppIcon from '../components/AppIcon';
import Stepper from '../components/Stepper';
import {
  RefreshCw, Trash2, Check, CheckSquare, Square, AlertTriangle,
  Lock, Eye, EyeOff, Smartphone, PowerOff, Play, Loader2, Unplug,
} from 'lucide-react';

const FILTERS = ['all', 'system', 'user', 'disabled'];

export default function AppList() {
  const { t } = useTranslation();
  const {
    api, showToast, confirm, isEmulator, disconnectDevice,
    activeDevice, deviceInfo, devices, setActiveDevice,
    deviceConnected, deviceStatus,
  } = useApp();

  const deviceLabel = (d) => {
    const base = d.model || d.id;
    const emu = isEmulator(d) && !/emulator/i.test(base) ? ' (emulator)' : '';
    return d.model ? `${base}${emu} · ${d.id}` : `${base}${emu}`;
  };

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(new Set());

  // Uninstall + recovery-password flow
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [recoveryHours, setRecoveryHours] = useState(24);
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState('');

  // Batch progress
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, app: '', mode: 'uninstall' });

  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.adb.getPackages({ serial: activeDevice });
      if (result.success) {
        setApps(result.apps);
      } else {
        setApps([]);
        if (deviceConnected) showToast(result.error || t('common.error'), 'error');
      }
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [api, activeDevice, deviceConnected, showToast, t]);

  // Load (or clear) the app list whenever the active device changes.
  useEffect(() => {
    setSelected(new Set());
    if (!activeDevice) { setApps([]); setLoading(false); return; }
    loadApps();
  }, [activeDevice, loadApps]);

  const counts = useMemo(() => ({
    all: apps.length,
    system: apps.filter((a) => a.isSystem).length,
    user: apps.filter((a) => !a.isSystem).length,
    disabled: apps.filter((a) => !a.enabled).length,
  }), [apps]);

  const filteredApps = useMemo(() => {
    let list = apps;
    if (filter === 'system') list = list.filter((a) => a.isSystem);
    else if (filter === 'user') list = list.filter((a) => !a.isSystem);
    else if (filter === 'disabled') list = list.filter((a) => !a.enabled);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q) || a.package.toLowerCase().includes(q));
    }
    return list;
  }, [apps, filter, search]);

  const allFilteredSelected = filteredApps.length > 0 && filteredApps.every((a) => selected.has(a.package));

  const toggleSelect = (pkg) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(pkg) ? next.delete(pkg) : next.add(pkg);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filteredApps.forEach((a) => next.delete(a.package));
        return next;
      }
      return new Set([...prev, ...filteredApps.map((a) => a.package)]);
    });
  };

  // ── Uninstall flow ──
  const handleUninstall = () => { if (selected.size > 0) setShowConfirm(true); };

  const handleConfirmUninstall = (withPassword) => {
    setShowConfirm(false);
    if (withPassword) setShowPasswordSetup(true);
    else executeBatch('uninstall', false);
  };

  const handlePasswordSubmit = async () => {
    setPwError('');
    if (password.length < 4) { setPwError(t('password.weak')); return; }
    if (password !== confirmPw) { setPwError(t('password.mismatch')); return; }
    await api.password.set(password, recoveryHours);
    setShowPasswordSetup(false);
    executeBatch('uninstall', true, recoveryHours);
  };

  // ── Disable flow ──
  const handleDisable = async () => {
    const targets = apps.filter((a) => selected.has(a.package) && a.enabled);
    if (targets.length === 0) { showToast(t('disable.noneEnabled'), 'info'); return; }
    const ok = await confirm({
      title: t('disable.confirmTitle'),
      message: t('disable.confirmMsg', { n: targets.length }),
      confirmText: t('disable.action'),
    });
    if (ok) executeBatch('disable');
  };

  const handleEnable = async (app, e) => {
    e.stopPropagation();
    const res = await api.adb.enable({ packageName: app.package, serial: activeDevice });
    if (res.success) { showToast(t('enable.success'), 'success'); loadApps(); }
    else showToast(res.error || t('common.error'), 'error');
  };

  // ── Shared batch runner ──
  const executeBatch = async (mode, isLocked = false, hours = 24) => {
    let targets = apps.filter((a) => selected.has(a.package));
    if (mode === 'disable') targets = targets.filter((a) => a.enabled);

    setBusy(true);
    setProgress({ current: 0, total: targets.length, app: '', mode });

    let ok = 0;
    for (let i = 0; i < targets.length; i++) {
      const app = targets[i];
      setProgress({ current: i + 1, total: targets.length, app: app.name, mode });
      try {
        const fn = mode === 'uninstall' ? api.adb.uninstall : api.adb.disable;
        const res = await fn({ packageName: app.package, serial: activeDevice });
        if (res.success) {
          ok++;
          if (mode === 'uninstall') {
            await api.deletion.save({
              package: app.package, name: app.name, isSystem: app.isSystem,
              isLocked,
              lockExpiresAt: isLocked ? Date.now() + hours * 3600 * 1000 : null,
              recoveryMs: isLocked ? hours * 3600 * 1000 : null,
            });
          }
        }
      } catch { /* keep going */ }
    }

    setBusy(false);
    setSelected(new Set());
    setPassword(''); setConfirmPw('');
    const label = mode === 'uninstall' ? t('delete.success') : t('disable.success');
    showToast(`${label}: ${ok}/${targets.length}`, ok === targets.length ? 'success' : 'warning');
    loadApps();
  };

  const onCardKey = (e, pkg) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelect(pkg); }
  };

  const selectedApps = apps.filter((a) => selected.has(a.package));

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="page-header">
          <h1 className="page-header__title">{t('apps.title')}</h1>
          <p className="page-header__subtitle">{t('apps.subtitle')}</p>
        </div>

        {/* Device bar */}
        {deviceConnected && (
          <div className="device-bar">
            <div className="device-bar__icon"><Smartphone size={20} /></div>
            <div className="device-bar__info">
              <div className="device-bar__name">
                {deviceInfo
                  ? `${deviceInfo.manufacturer} ${deviceInfo.model}`
                  : (devices.find((d) => d.id === activeDevice)?.model || t('device.connected'))}
              </div>
              <div className="device-bar__meta">
                {deviceInfo && `Android ${deviceInfo.androidVersion} · SDK ${deviceInfo.sdk} · `}{activeDevice}
              </div>
            </div>
            <div className="device-bar__picker">
              <label className="device-bar__picker-label" htmlFor="device-select">
                {t('device.choose')}{devices.length > 1 ? ` (${devices.length})` : ''}
              </label>
              <select
                id="device-select"
                className="device-bar__select"
                value={activeDevice || ''}
                onChange={(e) => setActiveDevice(e.target.value)}
                aria-label={t('device.switch')}
              >
                {devices.map((d) => <option key={d.id} value={d.id}>{deviceLabel(d)}</option>)}
              </select>
            </div>
            <span className="device-bar__status"><span className="dot dot--ok" />{t('device.connected')}</span>
            <button className="device-bar__disconnect" onClick={disconnectDevice} title={t('device.disconnect')}>
              <Unplug size={15} /> {t('device.disconnect')}
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar__search">
            <input
              type="text"
              className="input input--search"
              placeholder={t('apps.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!deviceConnected}
            />
          </div>
          <div className="toolbar__actions">
            <button className="btn btn--ghost btn--sm" onClick={toggleAll} disabled={filteredApps.length === 0}>
              {allFilteredSelected ? <><Square size={14} /> {t('apps.deselectAll')}</> : <><CheckSquare size={14} /> {t('apps.selectAll')}</>}
            </button>
            <button className="btn btn--ghost btn--sm" onClick={loadApps} disabled={loading || !deviceConnected}>
              <RefreshCw size={14} className={loading ? 'spinning' : ''} /> {t('apps.refresh')}
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        {deviceConnected && (
          <div className="filter-tabs">
            {FILTERS.map((f) => (
              <button
                key={f}
                className={`filter-tab ${filter === f ? 'filter-tab--active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {t(`apps.filter_${f}`)}
                <span className="filter-tab__count">{counts[f]}</span>
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        {!deviceConnected ? (
          <NoDevice status={deviceStatus} t={t} />
        ) : loading ? (
          <div className="empty-state">
            <div className="spinner spinner--lg" />
            <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>{t('apps.loading')}</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🔍</div>
            <h3 className="empty-state__title">{t('apps.noApps')}</h3>
            <p className="empty-state__desc">{search ? t('apps.noMatch') : t('apps.emptyFilter')}</p>
          </div>
        ) : (
          <>
            <div className="app-grid">
              {filteredApps.map((app, i) => {
                const isSel = selected.has(app.package);
                return (
                  <motion.div
                    key={app.package}
                    className={`app-card ${isSel ? 'app-card--selected' : ''} ${!app.enabled ? 'app-card--disabled' : ''}`}
                    onClick={() => toggleSelect(app.package)}
                    onKeyDown={(e) => onCardKey(e, app.package)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSel}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.015, 0.25) }}
                  >
                    <div className="app-card__checkbox">{isSel && <Check size={14} color="white" />}</div>
                    <AppIcon pkg={app.package} name={app.name} />
                    <div className="app-card__info">
                      <div className="app-card__name">{app.name}</div>
                      <div className="app-card__package">{app.package}</div>
                    </div>
                    <div className="app-card__badges">
                      <span className={`app-card__badge app-card__badge--${app.isSystem ? 'system' : 'user'}`}>
                        {app.isSystem ? t('apps.system') : t('apps.user')}
                      </span>
                      {!app.enabled && (
                        <button className="app-card__enable" onClick={(e) => handleEnable(app, e)} title={t('apps.enable')}>
                          <Play size={11} /> {t('apps.enable')}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Bulk action bar */}
            <AnimatePresence>
              {selected.size > 0 && (
                <motion.div
                  className="action-bar"
                  initial={{ opacity: 0, y: 24, x: '-50%' }}
                  animate={{ opacity: 1, y: 0, x: '-50%' }}
                  exit={{ opacity: 0, y: 24, x: '-50%' }}
                >
                  <span className="action-bar__count"><strong>{selected.size}</strong> {t('apps.selected')}</span>
                  <button className="btn btn--ghost btn--sm" onClick={() => setSelected(new Set())}>{t('apps.clear')}</button>
                  <button className="btn btn--warning" onClick={handleDisable}><PowerOff size={16} /> {t('disable.action')}</button>
                  <button className="btn btn--danger" onClick={handleUninstall}><Trash2 size={16} /> {t('apps.deleteSelected')}</button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>

      {/* ── Confirm uninstall ── */}
      <AnimatePresence>
        {showConfirm && (
          <Overlay onClose={() => setShowConfirm(false)}>
            <h2 className="modal__title">{t('delete.title')}</h2>
            <p className="modal__subtitle">{t('delete.subtitle')}</p>

            <div className="delete-list">
              {selectedApps.map((app) => (
                <div key={app.package} className="delete-item">
                  <AppIcon pkg={app.package} name={app.name} size={32} />
                  <div style={{ minWidth: 0 }}>
                    <div className="delete-item__name">{app.name}</div>
                    <div className="delete-item__package">{app.package}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="callout callout--warning">
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{t('delete.warning')}</span>
            </div>

            <div className="modal__actions" style={{ flexDirection: 'column', gap: 10 }}>
              <button className="btn btn--primary" onClick={() => handleConfirmUninstall(true)} style={{ width: '100%' }}>
                <Lock size={16} /> {t('delete.withPassword')}
              </button>
              <button className="btn btn--danger" onClick={() => handleConfirmUninstall(false)} style={{ width: '100%' }}>
                <Trash2 size={16} /> {t('delete.noPassword')}
              </button>
              <button className="btn btn--ghost" onClick={() => setShowConfirm(false)} style={{ width: '100%' }}>
                {t('common.cancel')}
              </button>
            </div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* ── Recovery password setup ── */}
      <AnimatePresence>
        {showPasswordSetup && (
          <Overlay onClose={() => setShowPasswordSetup(false)}>
            <h2 className="modal__title">{t('password.title')}</h2>
            <p className="modal__subtitle">{t('password.subtitle')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
              <div className="password-field">
                <input
                  type={showPw ? 'text' : 'password'} className="input"
                  placeholder={t('password.enter')} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button className="password-field__toggle" onClick={() => setShowPw(!showPw)} aria-label="toggle">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <input
                type={showPw ? 'text' : 'password'} className="input"
                placeholder={t('password.confirm')} value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              />
              <div>
                <label className="field-label">{t('password.recoveryTime')}</label>
                <Stepper value={recoveryHours} min={1} max={168} onChange={setRecoveryHours} suffix="h" />
                <span className="field-hint">{t('password.recoveryHint')}</span>
              </div>
              {pwError && <p style={{ color: 'var(--danger-400)', fontSize: 13 }}>{pwError}</p>}
            </div>

            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setShowPasswordSetup(false)}>{t('common.cancel')}</button>
              <button className="btn btn--primary" onClick={handlePasswordSubmit}><Lock size={16} /> {t('password.set')}</button>
            </div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* ── Batch progress ── */}
      <AnimatePresence>
        {busy && (
          <Overlay>
            <div style={{ textAlign: 'center' }}>
              <h2 className="modal__title">{progress.mode === 'uninstall' ? t('delete.progress') : t('disable.progress')}</h2>
              <p className="modal__subtitle">{progress.app}</p>
              <div style={{ margin: '24px 0' }}>
                <div className="progress">
                  <div className="progress__fill" style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }} />
                </div>
                <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-muted)' }}>{progress.current} / {progress.total}</p>
              </div>
              <Loader2 className="spin-icon" size={26} style={{ margin: '0 auto', color: 'var(--primary-300)' }} />
            </div>
          </Overlay>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Helpers ──
function Overlay({ children, onClose }) {
  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose ? () => onClose() : undefined}>
      <motion.div className="modal" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}>
        {children}
      </motion.div>
    </motion.div>
  );
}

function NoDevice({ status, t }) {
  const map = {
    unauthorized: { icon: '🔒', title: t('device.unauthorizedTitle'), desc: t('device.unauthorizedDesc') },
    offline: { icon: '🔌', title: t('device.offlineTitle'), desc: t('device.offlineDesc') },
    none: { icon: '📵', title: t('device.noneTitle'), desc: t('device.noneDesc') },
  };
  const s = map[status] || map.none;
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{s.icon}</div>
      <h3 className="empty-state__title">{s.title}</h3>
      <p className="empty-state__desc">{s.desc}</p>
    </div>
  );
}
