import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import './i18n';
import './index.css';

import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import LanguageSelect from './pages/LanguageSelect';
import USBSetup from './pages/USBSetup';
import AppList from './pages/AppList';
import RestoreApps from './pages/RestoreApps';
import Settings from './pages/Settings';
import Toast from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';

// ─── Context ───
export const AppContext = createContext();
export function useApp() {
  return useContext(AppContext);
}

// ─── Mock API for browser dev mode ───
const isElectron = !!window.electron;

const MOCK_APPS = [
  { package: 'com.google.android.gms', isSystem: true, enabled: true },
  { package: 'com.android.vending', isSystem: true, enabled: true },
  { package: 'com.google.android.gm', isSystem: true, enabled: true },
  { package: 'com.google.android.apps.maps', isSystem: true, enabled: true },
  { package: 'com.google.android.youtube', isSystem: true, enabled: true },
  { package: 'com.google.android.apps.photos', isSystem: true, enabled: true },
  { package: 'com.google.android.calendar', isSystem: true, enabled: true },
  { package: 'com.google.android.apps.docs', isSystem: true, enabled: true },
  { package: 'com.google.android.apps.messaging', isSystem: true, enabled: true },
  { package: 'com.android.chrome', isSystem: true, enabled: true },
  { package: 'com.samsung.android.app.notes', isSystem: true, enabled: true },
  { package: 'com.samsung.android.bixby.agent', isSystem: true, enabled: false },
  { package: 'com.facebook.katana', isSystem: true, enabled: true },
  { package: 'com.facebook.system', isSystem: true, enabled: false },
  { package: 'com.netflix.mediaclient', isSystem: true, enabled: true },
  { package: 'com.spotify.music', isSystem: false, enabled: true },
  { package: 'com.whatsapp', isSystem: false, enabled: true },
  { package: 'com.instagram.android', isSystem: false, enabled: true },
];

const mockApi = {
  adb: {
    checkDevice: async () => {
      const devices = [
        { id: 'R5CT30ABXYZ', status: 'device', model: 'Galaxy S23' },
        { id: 'emulator-5554', status: 'device', model: 'Pixel 7 (emulator)' },
      ];
      return { connected: true, ready: devices, devices };
    },
    getDeviceInfo: async ({ serial } = {}) => {
      const info = {
        R5CT30ABXYZ: { manufacturer: 'Samsung', model: 'Galaxy S23', androidVersion: '14', sdk: '34' },
        'emulator-5554': { manufacturer: 'Google', model: 'Pixel 7 (emulator)', androidVersion: '14', sdk: '34' },
      };
      return { success: true, info: info[serial] || { manufacturer: 'Demo', model: 'Device', androidVersion: '14', sdk: '34' } };
    },
    getPackages: async () => ({
      success: true,
      apps: MOCK_APPS.map((a) => ({ ...a, name: resolveMockName(a.package) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }),
    uninstall: async () => { await wait(500); return { success: true, output: 'Success' }; },
    restore: async () => { await wait(400); return { success: true, output: 'Success' }; },
    getRestorable: async () => ({
      success: true,
      apps: [
        { package: 'com.android.chrome', name: 'Chrome', isSystem: true },
        { package: 'com.android.vending', name: 'Google Play Store', isSystem: true },
        { package: 'com.google.android.gms', name: 'Google Play Services', isSystem: true },
      ],
    }),
    disable: async () => { await wait(300); return { success: true, output: 'Success' }; },
    enable: async () => { await wait(300); return { success: true, output: 'Success' }; },
    disconnect: async () => ({ success: true }),
    killServer: async () => ({ success: true }),
    startServer: async () => ({ success: true }),
  },
  store: {
    get: async (key) => readStore()[key] ?? null,
    set: async (key, value) => { const d = readStore(); d[key] = value; writeStore(d); return true; },
    getAll: async () => readStore(),
  },
  password: {
    set: async (password, recoveryHours) => {
      const d = readStore(); d.passwordHash = btoa(password); d.recoveryHours = recoveryHours; writeStore(d);
      return { success: true };
    },
    verify: async (password) => {
      const d = readStore();
      if (!d.passwordHash) return { valid: false, noPassword: true };
      return { valid: btoa(password) === d.passwordHash };
    },
    exists: async () => !!readStore().passwordHash,
    reset: async () => { const d = readStore(); d.passwordHash = null; d.passwordSalt = null; writeStore(d); return { success: true }; },
  },
  deletion: {
    save: async (deletion) => {
      const d = readStore();
      d.deletions = (d.deletions || []).filter((x) => x.package !== deletion.package);
      d.deletions.push({ ...deletion, deletedAt: Date.now(), status: 'deleted' });
      writeStore(d); return { success: true };
    },
    getAll: async () => readStore().deletions || [],
    updateStatus: async (packageName, status) => {
      const d = readStore();
      const idx = (d.deletions || []).findIndex((x) => x.package === packageName);
      if (idx !== -1) { d.deletions[idx].status = status; if (status === 'restored') d.deletions[idx].restoredAt = Date.now(); }
      writeStore(d); return { success: true };
    },
    remove: async (packageName) => {
      const d = readStore();
      d.deletions = (d.deletions || []).filter((x) => x.package !== packageName);
      writeStore(d); return { success: true };
    },
    startTimer: async (packageName) => {
      const d = readStore();
      const idx = (d.deletions || []).findIndex((x) => x.package === packageName);
      if (idx !== -1 && d.deletions[idx].isLocked && !d.deletions[idx].lockExpiresAt) {
        d.deletions[idx].lockExpiresAt = Date.now() + (d.deletions[idx].recoveryMs || 86400000);
        writeStore(d);
      }
      return { success: true };
    },
    clearHistory: async () => {
      const d = readStore();
      d.deletions = (d.deletions || []).filter((x) => x.status === 'deleted');
      writeStore(d); return { success: true };
    },
  },
  minimize: () => {}, maximize: () => {}, close: () => {},
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const readStore = () => JSON.parse(localStorage.getItem('idara_store') || '{}');
const writeStore = (d) => localStorage.setItem('idara_store', JSON.stringify(d));
function resolveMockName(pkg) {
  const names = {
    'com.google.android.gms': 'Google Play Services', 'com.android.vending': 'Google Play Store',
    'com.google.android.gm': 'Gmail', 'com.google.android.apps.maps': 'Google Maps',
    'com.google.android.youtube': 'YouTube', 'com.google.android.apps.photos': 'Google Photos',
    'com.google.android.calendar': 'Google Calendar', 'com.google.android.apps.docs': 'Google Drive',
    'com.google.android.apps.messaging': 'Messages', 'com.android.chrome': 'Chrome',
    'com.samsung.android.app.notes': 'Samsung Notes', 'com.samsung.android.bixby.agent': 'Bixby',
    'com.facebook.katana': 'Facebook', 'com.facebook.system': 'Facebook App Installer',
    'com.netflix.mediaclient': 'Netflix', 'com.spotify.music': 'Spotify',
    'com.whatsapp': 'WhatsApp', 'com.instagram.android': 'Instagram',
  };
  return names[pkg] || pkg.split('.').pop();
}

const api = isElectron ? window.electron : mockApi;

// Heuristic: is this device an Android emulator (vs. a real phone)?
function isEmulator(d) {
  return /^emulator-/i.test(d.id || '') || /emulator|sdk[_ ]?gphone/i.test(d.model || '');
}

// ─── Main App ───
export default function App() {
  const { i18n } = useTranslation();
  const [currentPage, setCurrentPage] = useState('loading');
  const [language, setLanguage] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('idara_theme') || 'terminal');

  const [devices, setDevices] = useState([]);        // usable (status === 'device')
  const [deviceStatus, setDeviceStatus] = useState('none'); // none | connected | unauthorized | offline
  const [activeDevice, setActiveDevice] = useState(null);   // serial
  const [deviceInfo, setDeviceInfo] = useState(null);

  const [restorableCount, setRestorableCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const confirmResolve = useRef(null);
  const devSigRef = useRef('');

  const deviceConnected = deviceStatus === 'connected';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('idara_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'terminal' ? 'editorial' : 'terminal'));
  }, []);

  const applyLanguage = (lang) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  // Switch language without a full reload (i18n + state re-render the tree).
  const changeLanguage = useCallback(async (lang) => {
    applyLanguage(lang);
    await api.store.set('language', lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore saved language / setup state on mount.
  useEffect(() => {
    (async () => {
      const savedLang = await api.store.get('language');
      if (savedLang) {
        applyLanguage(savedLang);
        const setup = await api.store.get('setupComplete');
        setCurrentPage(setup ? 'apps' : 'setup');
      } else {
        setCurrentPage('language');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Device polling on the main pages.
  useEffect(() => {
    if (!['apps', 'restore', 'settings'].includes(currentPage)) return;
    let cancelled = false;

    const check = async () => {
      const result = await api.adb.checkDevice();
      if (cancelled) return;
      const ready = result.ready || result.devices?.filter((d) => d.status === 'device') || [];

      // Only update device state when the set of usable devices actually
      // changes, so a steady connection doesn't re-render the app every poll.
      const sig = ready.map((d) => d.id).join('|');
      if (sig !== devSigRef.current) { devSigRef.current = sig; setDevices(ready); }

      const status = ready.length > 0 ? 'connected'
        : result.devices?.some((d) => d.status === 'unauthorized') ? 'unauthorized'
          : result.devices?.some((d) => d.status === 'offline') ? 'offline'
            : 'none';
      setDeviceStatus(status); // no-op if unchanged

      // Refresh restorable count whenever device state changes
      if (ready.length > 0) {
        const serial = ready[0]?.id;
        api.adb.getRestorable({ serial }).then((r) => {
          if (r.success) setRestorableCount(r.apps.filter((a) => a.isSystem).length);
        }).catch(() => {});
      } else {
        setRestorableCount(0);
      }
    };

    check();
    const interval = setInterval(check, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [currentPage]);

  // Keep a valid active device selected. When nothing is chosen yet, prefer a
  // real phone over an emulator — but the user can always switch in the UI.
  useEffect(() => {
    if (devices.length === 0) { if (activeDevice !== null) setActiveDevice(null); return; }
    if (!devices.some((d) => d.id === activeDevice)) {
      const preferred = devices.find((d) => !isEmulator(d)) || devices[0];
      setActiveDevice(preferred.id);
    }
  }, [devices, activeDevice]);

  // Fetch device details when the active device changes.
  useEffect(() => {
    if (!activeDevice) { setDeviceInfo(null); return; }
    let cancelled = false;
    (async () => {
      const res = await api.adb.getDeviceInfo({ serial: activeDevice });
      if (!cancelled && res.success) setDeviceInfo(res.info);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDevice]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  // Promise-based confirm dialog.
  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      confirmResolve.current = resolve;
      setConfirmState(options);
    });
  }, []);
  const resolveConfirm = (value) => {
    setConfirmState(null);
    confirmResolve.current?.(value);
    confirmResolve.current = null;
  };

  // "Log out" of the current device: drop the selection and return to the
  // connect screen. For wireless (ip:port) devices this also detaches adb.
  const disconnectDevice = useCallback(async () => {
    const serial = activeDevice;
    if (serial) { try { await api.adb.disconnect({ serial }); } catch { /* ignore */ } }
    devSigRef.current = '';
    setDevices([]);
    setActiveDevice(null);
    setDeviceInfo(null);
    setDeviceStatus('none');
    setCurrentPage('setup');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDevice]);

  const handleLanguageSelect = async (lang) => {
    applyLanguage(lang);
    await api.store.set('language', lang);
    setCurrentPage('setup');
  };

  const handleSetupComplete = async () => {
    await api.store.set('setupComplete', true);
    setCurrentPage('apps');
  };

  const contextValue = {
    api, language, changeLanguage,
    devices, activeDevice, setActiveDevice, deviceInfo, deviceStatus, deviceConnected,
    currentPage, setCurrentPage,
    showToast, confirm, disconnectDevice,
    isEmulator, isElectron,
    theme, toggleTheme,
    restorableCount,
  };

  const overlays = (
    <>
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmDialog state={confirmState} onResolve={resolveConfirm} />
    </>
  );

  if (currentPage === 'loading') {
    return <div className="fullscreen-page"><div className="spinner spinner--lg" /></div>;
  }

  if (currentPage === 'language') {
    return (
      <AppContext.Provider value={contextValue}>
        <LanguageSelect onSelect={handleLanguageSelect} />
        {overlays}
      </AppContext.Provider>
    );
  }

  if (currentPage === 'setup') {
    return (
      <AppContext.Provider value={contextValue}>
        <div id="root-inner" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <TitleBar />
          <div className="setup-scroll">
            <USBSetup onComplete={handleSetupComplete} />
          </div>
        </div>
        {overlays}
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <TitleBar />
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div className="orb orb--primary" />
          <div className="orb orb--accent" />
          {currentPage === 'apps' && <AppList />}
          {currentPage === 'restore' && <RestoreApps />}
          {currentPage === 'settings' && <Settings />}
        </main>
      </div>
      {overlays}
    </AppContext.Provider>
  );
}
