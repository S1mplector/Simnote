// main-electron.js (CommonJS style)

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const { FileStorageManager } = require('../managers/fileStorageManager.js');
const { NativeDbManager } = require('./nativeDbManager.js');
const { SecurityManager } = require('./securityManager.js');

let fileStorageManager = null;
let nativeDb = null;
let securityManager = null;
let storageDirPath = null;
let autoLockTimer = null;
let mainWindow = null;

const MAX_IMPORT_SIZE = 25 * 1024 * 1024;
const MAX_ENTRY_NAME_LENGTH = 200;
const MAX_MOOD_LENGTH = 50;
const MAX_TAGS = 30;
const MAX_TAG_LENGTH = 40;

function normalizeString(value, maxLen) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!maxLen) return text;
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

function normalizeTags(tags) {
  const list = Array.isArray(tags)
    ? tags
    : (typeof tags === 'string' ? tags.split(',') : []);
  return list
    .map(tag => normalizeString(String(tag), MAX_TAG_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_TAGS);
}

function normalizeEntryPayload(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const hasTags = Object.prototype.hasOwnProperty.call(entry, 'tags');
  return {
    id: entry.id !== undefined && entry.id !== null ? String(entry.id) : undefined,
    name: normalizeString(entry.name, MAX_ENTRY_NAME_LENGTH) || 'Untitled',
    content: typeof entry.content === 'string' ? entry.content : '',
    mood: normalizeString(entry.mood, MAX_MOOD_LENGTH),
    tags: hasTags ? normalizeTags(entry.tags) : undefined,
    favorite: !!entry.favorite,
    wordCount: Number.isFinite(entry.wordCount) ? entry.wordCount : undefined,
    fontFamily: normalizeString(entry.fontFamily, 100),
    fontSize: normalizeString(entry.fontSize, 100),
    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : undefined,
    updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : undefined,
    audioFiles: Array.isArray(entry.audioFiles) ? entry.audioFiles : []
  };
}

function isAllowedNavigation(url, appIndexUrl) {
  if (!url || !appIndexUrl) return false;
  if (!url.startsWith('file://')) return false;
  return url === appIndexUrl || url.startsWith(`${appIndexUrl}#`) || url.startsWith(`${appIndexUrl}?`);
}

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

  const appIndexPath = path.join(__dirname, '../../index.html');
  const appIndexUrl = pathToFileURL(appIndexPath).toString();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      preload: path.join(__dirname, '../core/preload.js')
    }
  });

  mainWindow.loadFile(appIndexPath);

  // Security: Block navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url, appIndexUrl)) {
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

  mainWindow.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback, details) => {
    if (permission === 'media') {
      const mediaTypes = details?.mediaTypes || [];
      const allow = mediaTypes.includes('audio') && !mediaTypes.includes('video');
      callback(allow);
      return;
    }
    callback(false);
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
  const safeName = normalizeString(entryName, MAX_ENTRY_NAME_LENGTH) || 'Untitled';
  const safeContent = typeof entryContent === 'string' ? entryContent : '';
  fileStorageManager.saveEntry({ name: safeName, content: safeContent, id: `${Date.now()}` });
  return "Entry saved successfully!";
});

// Save entry as .simnote file (new hybrid storage)
ipcMain.handle('save-entry-file', (event, entry) => {
  console.log('[Electron] save-entry-file called with:', entry?.id, entry?.name);
  if (!ensureFileStorage()) {
    throw new Error("FileStorageManager not initialized!");
  }
  const normalized = normalizeEntryPayload(entry);
  if (!normalized) {
    throw new Error('Invalid entry payload');
  }
  const filename = fileStorageManager.saveEntry(normalized);
  console.log('[Electron] Saved .simnote file:', filename);
  return filename;
});

// Update entry .simnote file
ipcMain.handle('update-entry-file', (event, entry) => {
  if (!ensureFileStorage()) {
    throw new Error("FileStorageManager not initialized!");
  }
  const normalized = normalizeEntryPayload(entry);
  if (!normalized) {
    throw new Error('Invalid entry payload');
  }
  return fileStorageManager.updateEntry(normalized);
});

// Delete entry .simnote file
ipcMain.handle('delete-entry-file', (event, id) => {
  if (!ensureFileStorage()) {
    throw new Error("FileStorageManager not initialized!");
  }
  const safeId = typeof id === 'string' || typeof id === 'number' ? String(id) : '';
  if (!safeId) {
    throw new Error('Invalid entry ID');
  }
  return fileStorageManager.deleteEntryById(safeId);
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
  if (!Array.isArray(entries)) {
    throw new Error('Invalid entries payload');
  }
  const normalizedEntries = entries.map(normalizeEntryPayload).filter(Boolean);
  return fileStorageManager.syncAllEntries(normalizedEntries);
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
    const safeId = typeof id === 'string' || typeof id === 'number' ? String(id) : '';
    event.returnValue = ensureNativeDb().getEntryById(safeId);
  } catch (err) {
    console.error('[Electron] native-db-get-entry failed:', err);
    event.returnValue = null;
  }
});

ipcMain.on('native-db-save-entry', (event, entry) => {
  try {
    const normalized = normalizeEntryPayload(entry) || {};
    const saved = ensureNativeDb().saveEntry(normalized);
    ensureFileStorage()?.saveEntry(saved);
    event.returnValue = saved;
  } catch (err) {
    console.error('[Electron] native-db-save-entry failed:', err);
    event.returnValue = null;
  }
});

ipcMain.on('native-db-update-entry', (event, entry) => {
  try {
    const normalized = normalizeEntryPayload(entry) || {};
    const updated = ensureNativeDb().updateEntry(normalized);
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
    const safeId = typeof id === 'string' || typeof id === 'number' ? String(id) : '';
    const deleted = ensureNativeDb().deleteEntry(safeId);
    if (deleted) {
      ensureFileStorage()?.deleteEntryById(safeId);
    }
    event.returnValue = deleted;
  } catch (err) {
    console.error('[Electron] native-db-delete-entry failed:', err);
    event.returnValue = false;
  }
});

ipcMain.on('native-db-toggle-favorite', (event, id) => {
  try {
    const safeId = typeof id === 'string' || typeof id === 'number' ? String(id) : '';
    const updated = ensureNativeDb().toggleFavorite(safeId);
    const entry = ensureNativeDb().getEntryById(safeId);
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
    const safeKey = typeof key === 'string' ? key : '';
    event.returnValue = ensureNativeDb().getMetadata(safeKey);
  } catch (err) {
    console.error('[Electron] native-db-get-metadata failed:', err);
    event.returnValue = null;
  }
});

ipcMain.on('native-db-set-metadata', (event, payload) => {
  try {
    const safeKey = typeof payload?.key === 'string' ? payload.key : '';
    ensureNativeDb().setMetadata(safeKey, payload?.value);
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
    const safeMood = normalizeString(mood, MAX_MOOD_LENGTH);
    ensureNativeDb().setTodaysMood(safeMood);
    event.returnValue = true;
  } catch (err) {
    console.error('[Electron] native-db-set-todays-mood failed:', err);
    event.returnValue = false;
  }
});

ipcMain.on('native-db-get-mood-history', (event, days) => {
  try {
    const safeDays = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
    event.returnValue = ensureNativeDb().getMoodHistory(safeDays);
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
    if (typeof jsonString !== 'string' || jsonString.length > MAX_IMPORT_SIZE) {
      throw new Error('Invalid import payload');
    }
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
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  ensureSecurityManager().setAutoLockTimeout(safeMinutes);
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
