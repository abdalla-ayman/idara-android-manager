const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // ADB operations (all device-aware via optional `serial`)
  adb: {
    checkDevice: () => ipcRenderer.invoke('adb:checkDevice'),
    getDeviceInfo: (opts) => ipcRenderer.invoke('adb:getDeviceInfo', opts),
    getPackages: (opts) => ipcRenderer.invoke('adb:getPackages', opts),
    uninstall: (opts) => ipcRenderer.invoke('adb:uninstall', opts),
    restore: (opts) => ipcRenderer.invoke('adb:restore', opts),
    getRestorable: (opts) => ipcRenderer.invoke('adb:getRestorable', opts),
    disable: (opts) => ipcRenderer.invoke('adb:disable', opts),
    enable: (opts) => ipcRenderer.invoke('adb:enable', opts),
    disconnect: (opts) => ipcRenderer.invoke('adb:disconnect', opts),
    killServer: () => ipcRenderer.invoke('adb:killServer'),
    startServer: () => ipcRenderer.invoke('adb:startServer'),
  },

  // Persistent store
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', { key, value }),
    getAll: () => ipcRenderer.invoke('store:getAll'),
  },

  // Recovery password
  password: {
    set: (password, recoveryHours) => ipcRenderer.invoke('password:set', { password, recoveryHours }),
    verify: (password) => ipcRenderer.invoke('password:verify', { password }),
    exists: () => ipcRenderer.invoke('password:exists'),
    reset: () => ipcRenderer.invoke('password:reset'),
  },

  // Deletion history
  deletion: {
    save: (deletion) => ipcRenderer.invoke('deletion:save', { deletion }),
    getAll: () => ipcRenderer.invoke('deletion:getAll'),
    updateStatus: (packageName, status) => ipcRenderer.invoke('deletion:updateStatus', { packageName, status }),
    remove: (packageName) => ipcRenderer.invoke('deletion:remove', { packageName }),
    clearHistory: () => ipcRenderer.invoke('deletion:clearHistory'),
  },
});
