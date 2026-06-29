const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { execFile, execFileSync } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const crypto = require('crypto');
const { resolveAppName } = require('./appLabels');
const { parseDevices, parsePackageList } = require('./adbParse');

const execFileAsync = promisify(execFile);

let mainWindow;
let store;
let cachedAdbPath = null;

// ──────────── electron-store (ESM, dynamic import) ────────────
async function initStore() {
  const Store = (await import('electron-store')).default;
  store = new Store({
    encryptionKey: 'idara-secure-key-2026',
    defaults: {
      language: null,
      deletions: [],
      passwordHash: null,
      passwordSalt: null,
      recoveryHours: 24,
      setupComplete: false,
      lastDevice: null,
    },
  });
}

// ──────────── ADB resolution & execution ────────────
function getAdbPath() {
  if (cachedAdbPath) return cachedAdbPath;

  // 1. Prefer a bundled binary (deterministic across machines).
  const platformMap = { win32: 'windows', darwin: 'macos', linux: 'linux' };
  const platDir = platformMap[process.platform] || 'linux';
  const adbName = process.platform === 'win32' ? 'adb.exe' : 'adb';
  const bundledPath = app.isPackaged
    ? path.join(process.resourcesPath, 'adb', platDir, adbName)
    : path.join(__dirname, '..', 'adb', platDir, adbName);

  if (fs.existsSync(bundledPath)) {
    cachedAdbPath = bundledPath;
    return cachedAdbPath;
  }

  // 2. Fall back to system PATH (resolve once so execFile gets a real path).
  try {
    const finder = process.platform === 'win32' ? 'where' : 'which';
    const resolved = execFileSync(finder, ['adb'], { encoding: 'utf-8' })
      .split('\n')[0]
      .trim();
    if (resolved) {
      cachedAdbPath = resolved;
      return cachedAdbPath;
    }
  } catch { /* not on PATH */ }

  cachedAdbPath = 'adb'; // last resort — let the OS try to resolve it
  return cachedAdbPath;
}

/**
 * Run adb with an explicit argument array (no shell → no injection).
 * @param {string[]} args
 */
async function runAdb(args, { timeout = 30000 } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(getAdbPath(), args, {
      encoding: 'utf-8',
      timeout,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
    return { success: true, output: stdout, stderr };
  } catch (error) {
    const msg = error.code === 'ENOENT'
      ? 'ADB executable not found. Install Android platform-tools or bundle adb.'
      : (error.stderr || error.message || 'ADB command failed');
    return { success: false, error: msg.trim(), output: error.stdout || '' };
  }
}

/** Run adb against a specific device serial (when provided). */
function runAdbForDevice(serial, args, opts) {
  const prefix = serial ? ['-s', serial] : [];
  return runAdb([...prefix, ...args], opts);
}

// ──────────── Window ────────────
function createWindow() {
  const iconPath = path.join(__dirname, '..', 'public', 'icon.png');
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 940,
    minHeight: 640,
    frame: false,
    backgroundColor: '#05060f',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}),
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Open external links in the system browser, never in-app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  await initStore();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ──────────── IPC Handlers ────────────
function registerIpcHandlers() {
  // ── Window controls ──
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
    return mainWindow.isMaximized();
  });
  ipcMain.handle('window:close', () => mainWindow?.close());

  // ── ADB: list devices (rich) ──
  ipcMain.handle('adb:checkDevice', async () => {
    const result = await runAdb(['devices', '-l']);
    if (!result.success) return { connected: false, error: result.error, devices: [] };
    const devices = parseDevices(result.output);
    const ready = devices.filter((d) => d.status === 'device');
    return {
      connected: ready.length > 0,
      devices,            // all, including unauthorized/offline
      ready,              // only usable devices
    };
  });

  // ── ADB: device details via getprop ──
  ipcMain.handle('adb:getDeviceInfo', async (_e, { serial } = {}) => {
    const props = [
      'ro.product.manufacturer',
      'ro.product.model',
      'ro.build.version.release',
      'ro.build.version.sdk',
    ];
    const result = await runAdbForDevice(serial, [
      'shell',
      props.map((p) => `getprop ${p}`).join(';echo "|";'),
    ]);
    if (!result.success) return { success: false, error: result.error };
    const parts = result.output.split('|').map((s) => s.trim());
    return {
      success: true,
      info: {
        manufacturer: parts[0] || 'Unknown',
        model: parts[1] || 'Android Device',
        androidVersion: parts[2] || '?',
        sdk: parts[3] || '?',
      },
    };
  });

  // ── ADB: list packages (fast: 3 calls, classified) ──
  ipcMain.handle('adb:getPackages', async (_e, { serial } = {}) => {
    const [all, system, disabled] = await Promise.all([
      runAdbForDevice(serial, ['shell', 'pm list packages --user 0']),
      runAdbForDevice(serial, ['shell', 'pm list packages -s --user 0']),
      runAdbForDevice(serial, ['shell', 'pm list packages -d --user 0']),
    ]);

    if (!all.success) return { success: false, error: all.error };

    const systemSet = system.success ? parsePackageList(system.output) : new Set();
    const disabledSet = disabled.success ? parsePackageList(disabled.output) : new Set();
    const allSet = parsePackageList(all.output);

    const apps = [...allSet]
      .map((pkg) => ({
        package: pkg,
        name: resolveAppName(pkg),
        isSystem: systemSet.has(pkg),
        enabled: !disabledSet.has(pkg),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, apps };
  });

  // ── ADB: uninstall (reversible — keeps data, removes for user 0) ──
  ipcMain.handle('adb:uninstall', async (_e, { packageName, serial }) => {
    return runAdbForDevice(serial, ['shell', 'pm', 'uninstall', '-k', '--user', '0', packageName]);
  });

  // ── ADB: restore a previously uninstalled app ──
  ipcMain.handle('adb:restore', async (_e, { packageName, serial }) => {
    return runAdbForDevice(serial, ['shell', 'cmd', 'package', 'install-existing', packageName]);
  });

  // ── ADB: disable / enable (non-destructive alternative to uninstall) ──
  ipcMain.handle('adb:disable', async (_e, { packageName, serial }) => {
    return runAdbForDevice(serial, ['shell', 'pm', 'disable-user', '--user', '0', packageName]);
  });
  ipcMain.handle('adb:enable', async (_e, { packageName, serial }) => {
    return runAdbForDevice(serial, ['shell', 'pm', 'enable', '--user', '0', packageName]);
  });

  // ── ADB: disconnect (meaningful for wireless ip:port devices) ──
  ipcMain.handle('adb:disconnect', async (_e, { serial } = {}) => {
    if (serial && /[:.]/.test(serial)) return runAdb(['disconnect', serial]);
    return { success: true }; // USB devices can't be detached via adb
  });

  // ── ADB: server control ──
  ipcMain.handle('adb:killServer', () => runAdb(['kill-server']));
  ipcMain.handle('adb:startServer', () => runAdb(['start-server']));

  // ── Store ──
  ipcMain.handle('store:get', (_e, key) => store.get(key));
  ipcMain.handle('store:set', (_e, { key, value }) => { store.set(key, value); return true; });
  ipcMain.handle('store:getAll', () => store.store);

  // ── Password ──
  ipcMain.handle('password:set', async (_e, { password, recoveryHours }) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    store.set('passwordHash', hash);
    store.set('passwordSalt', salt);
    store.set('recoveryHours', recoveryHours || 24);
    return { success: true };
  });
  ipcMain.handle('password:verify', async (_e, { password }) => {
    const storedHash = store.get('passwordHash');
    const storedSalt = store.get('passwordSalt');
    if (!storedHash || !storedSalt) return { valid: false, noPassword: true };
    const hash = crypto.pbkdf2Sync(password, storedSalt, 100000, 64, 'sha512').toString('hex');
    // constant-time comparison
    const valid = hash.length === storedHash.length &&
      crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
    return { valid };
  });
  ipcMain.handle('password:exists', () => !!store.get('passwordHash'));
  ipcMain.handle('password:reset', () => {
    store.set('passwordHash', null);
    store.set('passwordSalt', null);
    return { success: true };
  });

  // ── Deletion history ──
  ipcMain.handle('deletion:save', (_e, { deletion }) => {
    const deletions = store.get('deletions') || [];
    // De-dupe: a re-deleted package replaces its previous record.
    const filtered = deletions.filter((d) => d.package !== deletion.package);
    filtered.push({ ...deletion, deletedAt: Date.now(), status: 'deleted' });
    store.set('deletions', filtered);
    return { success: true };
  });
  ipcMain.handle('deletion:getAll', () => store.get('deletions') || []);
  ipcMain.handle('deletion:updateStatus', (_e, { packageName, status }) => {
    const deletions = store.get('deletions') || [];
    const idx = deletions.findIndex((d) => d.package === packageName);
    if (idx !== -1) {
      deletions[idx].status = status;
      if (status === 'restored') deletions[idx].restoredAt = Date.now();
      store.set('deletions', deletions);
    }
    return { success: true };
  });
  ipcMain.handle('deletion:remove', (_e, { packageName }) => {
    const deletions = store.get('deletions') || [];
    store.set('deletions', deletions.filter((d) => d.package !== packageName));
    return { success: true };
  });
  ipcMain.handle('deletion:clearHistory', () => {
    // Keep still-uninstalled apps (so they remain restorable); drop the rest.
    const deletions = store.get('deletions') || [];
    store.set('deletions', deletions.filter((d) => d.status === 'deleted'));
    return { success: true };
  });
}
