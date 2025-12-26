// main-electron.js (CommonJS style)

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const { FileStorageManager } = require('../managers/fileStorageManager.js');
const { NativeDbManager } = require('./nativeDbManager.js');
const { SecurityManager } = require('./securityManager.js');

let fileStorageManager = null;
let nativeDb = null;
let securityManager = null;
let storageDirPath = null;
let autoLockTimer = null;
let mainWindow = null;

function getStorageDirPath() {
  if (!storageDirPath) {
    storageDirPath = path.join(app.getPath('home'), 'Documents', 'Simnote');
  }
  return storageDirPath;
}

function ensureFileStorage() {
  if (!fileStorageManager) {
    fileStorageManager = new FileStorageManager(getStorageDirPath());
  }
  return fileStorageManager;
}

function ensureNativeDb() {
  if (!nativeDb) {
    nativeDb = new NativeDbManager(getStorageDirPath());
  }
  return nativeDb;
}

function ensureSecurityManager() {
  if (!securityManager) {
    securityManager = new SecurityManager(getStorageDirPath());
  }
  return securityManager;
}

function resetAutoLockTimer() {
  const security = ensureSecurityManager();
  const config = security.getConfig();
  
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
    autoLockTimer = null;
  }
  
  if (config.enabled && config.autoLockMinutes > 0 && security.isUnlocked) {
    autoLockTimer = setTimeout(() => {
      security.lock();
      if (mainWindow) {
        mainWindow.webContents.send('security-locked');
      }
    }, config.autoLockMinutes * 60 * 1000);
  }
}

function createWindow() {
  // Store entries in ~/Documents/Simnote for easy access and cloud sync
  const storageDir = getStorageDirPath();
  ensureFileStorage();
  ensureNativeDb();
  ensureSecurityManager();
  console.log(`[Electron] Storage directory: ${storageDir}`);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, '../core/preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../../index.html'));

  // Security: Block navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'file:') {
      event.preventDefault();
    }
  });

  // Security: Block new window creation, open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// Standard Electron app events
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle IPC calls from the renderer to save entries (legacy)
ipcMain.handle('save-entry', (event, { entryName, entryContent }) => {
  if (!ensureFileStorage()) {
    throw new Error("FileStorageManager not initialized!");
  }
  fileStorageManager.saveEntry({ name: entryName, content: entryContent, id: `${Date.now()}` });
  return "Entry saved successfully!";
});

// Save entry as .simnote file (new hybrid storage)
ipcMain.handle('save-entry-file', (event, entry) => {
  console.log('[Electron] save-entry-file called with:', entry?.id, entry?.name);
  if (!ensureFileStorage()) {
    throw new Error("FileStorageManager not initialized!");
  }
  const filename = fileStorageManager.saveEntry(entry);
  console.log('[Electron] Saved .simnote file:', filename);
  return filename;
});

// Update entry .simnote file
ipcMain.handle('update-entry-file', (event, entry) => {
  if (!ensureFileStorage()) {
    throw new Error("FileStorageManager not initialized!");
  }
  return fileStorageManager.updateEntry(entry);
});

// Delete entry .simnote file
ipcMain.handle('delete-entry-file', (event, id) => {
  if (!ensureFileStorage()) {
    throw new Error("FileStorageManager not initialized!");
  }
  return fileStorageManager.deleteEntryById(id);
});

// Get all entries from .simnote files
ipcMain.handle('get-file-entries', () => {
  if (!ensureFileStorage()) {
    return [];
  }
  return fileStorageManager.getEntries();
});

// Sync all entries to .simnote files
ipcMain.handle('sync-all-entries', (event, entries) => {
  if (!ensureFileStorage()) {
    throw new Error("FileStorageManager not initialized!");
  }
  return fileStorageManager.syncAllEntries(entries);
});

// Get storage directory path
ipcMain.handle('get-storage-dir', () => {
  if (!ensureFileStorage()) return null;
  return fileStorageManager.getStorageDir();
});

// Open storage folder in Finder
ipcMain.handle('open-storage-folder', () => {
  if (!ensureFileStorage()) return false;
  const storageDir = fileStorageManager.getStorageDir();
  if (storageDir && fs.existsSync(storageDir)) {
    shell.openPath(storageDir);
    return true;
  }
  return false;
});

// ==================== Native SQLite IPC ====================
ipcMain.handle('native-db-init', () => {
  ensureNativeDb();
  return true;
});

ipcMain.on('native-db-get-entry-count', (event) => {
  try {
    event.returnValue = ensureNativeDb().getEntryCount();
  } catch (err) {
    console.error('[Electron] native-db-get-entry-count failed:', err);
    event.returnValue = 0;
  }
});

ipcMain.on('native-db-get-entries', (event) => {
  try {
    event.returnValue = ensureNativeDb().getEntries();
  } catch (err) {
    console.error('[Electron] native-db-get-entries failed:', err);
    event.returnValue = [];
  }
});

ipcMain.on('native-db-get-entry', (event, id) => {
  try {
    event.returnValue = ensureNativeDb().getEntryById(id);
  } catch (err) {
    console.error('[Electron] native-db-get-entry failed:', err);
    event.returnValue = null;
  }
});

ipcMain.on('native-db-save-entry', (event, entry) => {
  try {
    const saved = ensureNativeDb().saveEntry(entry);
    ensureFileStorage()?.saveEntry(saved);
    event.returnValue = saved;
  } catch (err) {
    console.error('[Electron] native-db-save-entry failed:', err);
    event.returnValue = null;
  }
});

ipcMain.on('native-db-update-entry', (event, entry) => {
  try {
    const updated = ensureNativeDb().updateEntry(entry);
    if (updated) {
      ensureFileStorage()?.updateEntry(updated);
    }
    event.returnValue = updated;
  } catch (err) {
    console.error('[Electron] native-db-update-entry failed:', err);
    event.returnValue = null;
  }
});

ipcMain.on('native-db-delete-entry', (event, id) => {
  try {
    const deleted = ensureNativeDb().deleteEntry(id);
    if (deleted) {
      ensureFileStorage()?.deleteEntryById(id);
    }
    event.returnValue = deleted;
  } catch (err) {
    console.error('[Electron] native-db-delete-entry failed:', err);
    event.returnValue = false;
  }
});

ipcMain.on('native-db-toggle-favorite', (event, id) => {
  try {
    const updated = ensureNativeDb().toggleFavorite(id);
    const entry = ensureNativeDb().getEntryById(id);
    if (entry) {
      ensureFileStorage()?.updateEntry(entry);
    }
    event.returnValue = updated;
  } catch (err) {
    console.error('[Electron] native-db-toggle-favorite failed:', err);
    event.returnValue = false;
  }
});

ipcMain.on('native-db-get-metadata', (event, key) => {
  try {
    event.returnValue = ensureNativeDb().getMetadata(key);
  } catch (err) {
    console.error('[Electron] native-db-get-metadata failed:', err);
    event.returnValue = null;
  }
});

ipcMain.on('native-db-set-metadata', (event, payload) => {
  try {
    ensureNativeDb().setMetadata(payload?.key, payload?.value);
    event.returnValue = true;
  } catch (err) {
    console.error('[Electron] native-db-set-metadata failed:', err);
    event.returnValue = false;
  }
});

ipcMain.on('native-db-get-todays-mood', (event) => {
  try {
    event.returnValue = ensureNativeDb().getTodaysMood();
  } catch (err) {
    console.error('[Electron] native-db-get-todays-mood failed:', err);
    event.returnValue = null;
  }
});

ipcMain.on('native-db-set-todays-mood', (event, mood) => {
  try {
    ensureNativeDb().setTodaysMood(mood);
    event.returnValue = true;
  } catch (err) {
    console.error('[Electron] native-db-set-todays-mood failed:', err);
    event.returnValue = false;
  }
});

ipcMain.on('native-db-get-mood-history', (event, days) => {
  try {
    event.returnValue = ensureNativeDb().getMoodHistory(days);
  } catch (err) {
    console.error('[Electron] native-db-get-mood-history failed:', err);
    event.returnValue = [];
  }
});

ipcMain.on('native-db-export', (event) => {
  try {
    event.returnValue = ensureNativeDb().exportToJSON();
  } catch (err) {
    console.error('[Electron] native-db-export failed:', err);
    event.returnValue = null;
  }
});

ipcMain.handle('native-db-import', (event, jsonString) => {
  try {
    const count = ensureNativeDb().importFromJSON(jsonString);
    ensureFileStorage()?.syncAllEntries(ensureNativeDb().getEntries());
    return count;
  } catch (err) {
    console.error('[Electron] native-db-import failed:', err);
    return 0;
  }
});

ipcMain.handle('native-db-get-storage-info', () => {
  try {
    return ensureNativeDb().getStorageInfo();
  } catch (err) {
    console.error('[Electron] native-db-get-storage-info failed:', err);
    return {
      entriesCount: 0,
      totalSize: 0,
      sizeFormatted: '0 KB',
      imagesCount: 0,
      imagesSize: 0
    };
  }
});

ipcMain.handle('native-db-clear', () => {
  try {
    ensureNativeDb().clearAllData();
    ensureFileStorage()?.clearAllEntries?.();
    return true;
  } catch (err) {
    console.error('[Electron] native-db-clear failed:', err);
    return false;
  }
});

// ==================== Security IPC Handlers ====================

ipcMain.handle('security-get-config', () => {
  return ensureSecurityManager().getConfig();
});

ipcMain.handle('security-is-touch-id-available', async () => {
  return await ensureSecurityManager().isTouchIdAvailable();
});

ipcMain.handle('security-setup-passcode', async (event, passcode) => {
  try {
    await ensureSecurityManager().setupPasscode(passcode);
    resetAutoLockTimer();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('security-enable-touch-id', async () => {
  try {
    await ensureSecurityManager().enableTouchId();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('security-disable-touch-id', () => {
  ensureSecurityManager().disableTouchId();
  return { success: true };
});

ipcMain.handle('security-authenticate-passcode', async (event, passcode) => {
  try {
    await ensureSecurityManager().authenticateWithPasscode(passcode);
    resetAutoLockTimer();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('security-authenticate-touch-id', async () => {
  try {
    await ensureSecurityManager().authenticateWithTouchId();
    resetAutoLockTimer();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('security-lock', () => {
  ensureSecurityManager().lock();
  if (autoLockTimer) {
    clearTimeout(autoLockTimer);
    autoLockTimer = null;
  }
  return { success: true };
});

ipcMain.handle('security-change-passcode', async (event, { currentPasscode, newPasscode }) => {
  try {
    await ensureSecurityManager().changePasscode(currentPasscode, newPasscode);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('security-disable', async (event, passcode) => {
  try {
    await ensureSecurityManager().disableSecurity(passcode);
    if (autoLockTimer) {
      clearTimeout(autoLockTimer);
      autoLockTimer = null;
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('security-set-auto-lock', (event, minutes) => {
  ensureSecurityManager().setAutoLockTimeout(minutes);
  resetAutoLockTimer();
  return { success: true };
});

ipcMain.handle('security-reset-timer', () => {
  resetAutoLockTimer();
  return { success: true };
});

ipcMain.handle('security-is-unlocked', () => {
  const security = ensureSecurityManager();
  if (!security.isSecurityEnabled()) return true;
  return security.isUnlocked;
});

ipcMain.handle('security-is-enabled', () => {
  return ensureSecurityManager().isSecurityEnabled();
});
