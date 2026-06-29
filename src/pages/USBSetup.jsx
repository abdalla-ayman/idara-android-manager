import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useApp } from '../App';
import {
  Settings, Smartphone, Hash, ToggleRight, Usb, ShieldCheck,
  CheckCircle, XCircle, Loader2, SkipForward, AlertTriangle,
} from 'lucide-react';

export default function USBSetup({ onComplete }) {
  const { t } = useTranslation();
  const { api, showToast, language } = useApp();
  const [status, setStatus] = useState('idle'); // idle | searching | connected | unauthorized | offline | disconnected
  const [checking, setChecking] = useState(false);

  const steps = [
    { icon: <Settings size={18} />, text: t('setup.steps.1') },
    { icon: <Smartphone size={18} />, text: t('setup.steps.2') },
    { icon: <Hash size={18} />, text: t('setup.steps.3') },
    { icon: <ToggleRight size={18} />, text: t('setup.steps.4') },
    { icon: <ToggleRight size={18} />, text: t('setup.steps.5') },
    { icon: <Usb size={18} />, text: t('setup.steps.6') },
    { icon: <ShieldCheck size={18} />, text: t('setup.steps.7') },
  ];

  const handleCheck = async () => {
    setChecking(true);
    setStatus('searching');
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const result = await api.adb.checkDevice();

      if (result.connected) {
        setStatus('connected');
        showToast(t('setup.deviceFound'), 'success');
        setTimeout(() => onComplete(), 1500);
      } else if (result.devices?.some((d) => d.status === 'unauthorized')) {
        setStatus('unauthorized');
        showToast(t('setup.unauthorized'), 'warning');
      } else if (result.devices?.some((d) => d.status === 'offline')) {
        setStatus('offline');
        showToast(t('setup.offline'), 'warning');
      } else {
        setStatus('disconnected');
        showToast(t('setup.notConnected'), 'warning');
      }
    } catch {
      setStatus('disconnected');
      showToast(t('common.error'), 'error');
    } finally {
      setChecking(false);
    }
  };

  const statusContent = {
    searching: { icon: <Loader2 className="spin-icon" size={20} style={{ color: 'var(--primary-300)' }} />, text: t('setup.searching'), tone: 'searching' },
    connected: { icon: <CheckCircle size={20} style={{ color: 'var(--success-400)' }} />, text: t('setup.connected'), tone: 'connected' },
    unauthorized: { icon: <AlertTriangle size={20} style={{ color: 'var(--warning-400)' }} />, text: t('setup.unauthorized'), tone: 'searching' },
    offline: { icon: <AlertTriangle size={20} style={{ color: 'var(--warning-400)' }} />, text: t('setup.offline'), tone: 'searching' },
    disconnected: { icon: <XCircle size={20} style={{ color: 'var(--danger-400)' }} />, text: t('setup.notConnected'), tone: 'disconnected' },
  };
  const sc = statusContent[status];

  return (
    <motion.div className="setup-page" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1 className="page-header__title">{t('setup.title')}</h1>
        <p className="page-header__subtitle">{t('setup.subtitle')}</p>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="setup-hint">
          <Smartphone size={20} style={{ color: 'var(--primary-300)' }} />
          <span>📱 {language === 'ar' ? 'على جهاز الأندرويد:' : 'On your Android device:'}</span>
        </div>
        <div className="setup-steps">
          {steps.map((step, i) => (
            <motion.div key={i} className="setup-step"
              initial={{ opacity: 0, x: language === 'ar' ? 20 : -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
              <div className="setup-step__number">{i + 1}</div>
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>{step.icon}</div>
              <span className="setup-step__text">{step.text}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {sc && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`setup-status setup-status--${sc.tone}`}>
          {sc.icon}
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{sc.text}</span>
        </motion.div>
      )}

      <div className="setup-actions" style={{ justifyContent: 'center' }}>
        <motion.button className="btn btn--primary btn--lg" onClick={handleCheck} disabled={checking}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          {checking ? <Loader2 className="spin-icon" size={18} />
            : ['disconnected', 'unauthorized', 'offline'].includes(status) ? t('setup.retry')
            : t('setup.checkConnection')}
        </motion.button>
        <motion.button className="btn btn--ghost btn--lg" onClick={onComplete} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <SkipForward size={16} /> {t('setup.skip')}
        </motion.button>
      </div>
    </motion.div>
  );
}
