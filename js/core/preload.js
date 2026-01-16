// preload.js
// Electron preload script - exposes IPC APIs to renderer process
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This script runs in a privileged context between Electron's main process
// and the renderer. It safely exposes specific IPC channels via contextBridge.
//
// API CATEGORIES:
// - Entry operations: save, file storage
// - File Storage: .simnote file operations
// - Native DB: SQLite database operations (Electron-only)
// - Security: Passcode, Touch ID, and lock management
//
// SECURITY:
// - Only exposes specific IPC channels
// - Uses contextBridge for safe exposure
// - Renderer cannot access Node.js directly
//
// DEPENDENCIES:
// - Electron contextBridge, ipcRenderer

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Exposes Electron IPC APIs to the renderer process.
 * All methods communicate with main process via IPC.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ==================== Entry Operations ====================
  
  /**
   * Saves a new entry via main process.
   * @param {string} entryName - Entry title
   * @param {string} entryContent - Entry content
   * @returns {Promise<string>} Result message
   */
  saveEntry: (entryName, entryContent) =>
    ipcRenderer.invoke('save-entry', { entryName, entryContent }),
  // File Storage APIs (.simnote files)
  saveEntryFile: (entry) => ipcRenderer.invoke('save-entry-file', entry),
  updateEntryFile: (entry) => ipcRenderer.invoke('update-entry-file', entry),
  deleteEntryFile: (id) => ipcRenderer.invoke('delete-entry-file', id),
  getFileEntries: () => ipcRenderer.invoke('get-file-entries'),
  syncAllEntries: (entries) => ipcRenderer.invoke('sync-all-entries', entries),
  getStorageDir: () => ipcRenderer.invoke('get-storage-dir'),
  openStorageFolder: () => ipcRenderer.invoke('open-storage-folder'),
  // Native SQLite APIs (Electron-only)
  nativeDb: {
    init: () => ipcRenderer.invoke('native-db-init'),
    getEntryCount: () => ipcRenderer.sendSync('native-db-get-entry-count'),
    getEntries: () => ipcRenderer.sendSync('native-db-get-entries'),
    getEntryById: (id) => ipcRenderer.sendSync('native-db-get-entry', id),
    saveEntry: (entry) => ipcRenderer.sendSync('native-db-save-entry', entry),
    updateEntry: (entry) => ipcRenderer.sendSync('native-db-update-entry', entry),
    deleteEntry: (id) => ipcRenderer.sendSync('native-db-delete-entry', id),
    toggleFavorite: (id) => ipcRenderer.sendSync('native-db-toggle-favorite', id),
    getMetadata: (key) => ipcRenderer.sendSync('native-db-get-metadata', key),
    setMetadata: (key, value) => ipcRenderer.sendSync('native-db-set-metadata', { key, value }),
    getTodaysMood: () => ipcRenderer.sendSync('native-db-get-todays-mood'),
    setTodaysMood: (mood) => ipcRenderer.sendSync('native-db-set-todays-mood', mood),
    getMoodHistory: (days) => ipcRenderer.sendSync('native-db-get-mood-history', days),
    getStorageInfo: () => ipcRenderer.invoke('native-db-get-storage-info'),
    exportToJSON: () => ipcRenderer.sendSync('native-db-export'),
    importFromJSON: (jsonString) => ipcRenderer.invoke('native-db-import', jsonString),
    clearAllData: () => ipcRenderer.invoke('native-db-clear')
  },
  // Native utility APIs (macOS addon; Electron-only)
  nativeUtils: {
    makeDir: (path, recursive) => ipcRenderer.invoke('native-utils-make-dir', path, recursive),
    removePath: (path) => ipcRenderer.invoke('native-utils-remove-path', path),
    renamePath: (fromPath, toPath) => ipcRenderer.invoke('native-utils-rename-path', fromPath, toPath),
    atomicReplace: (sourcePath, destPath) =>
      ipcRenderer.invoke('native-utils-atomic-replace', sourcePath, destPath),
    fileStats: (path) => ipcRenderer.invoke('native-utils-file-stats', path),
    listDirRecursive: (path, maxDepth) => ipcRenderer.invoke('native-utils-list-recursive', path, maxDepth),
    zipDirectory: (sourceDir, zipPath, level) =>
      ipcRenderer.invoke('native-utils-zip-directory', sourceDir, zipPath, level),
    unzipArchive: (zipPath, destDir) =>
      ipcRenderer.invoke('native-utils-unzip-archive', zipPath, destDir),
    readJsonStream: (path) => ipcRenderer.invoke('native-utils-read-json', path),
    writeJsonStream: (path, value) => ipcRenderer.invoke('native-utils-write-json', path, value),
    validateFileSize: (path, maxBytes) => ipcRenderer.invoke('native-utils-validate-size', path, maxBytes),
    sha256File: (path) => ipcRenderer.invoke('native-utils-sha256-file', path),
    search: {
      createIndex: (indexId) => ipcRenderer.invoke('native-search-create-index', indexId),
      clearIndex: (indexId) => ipcRenderer.invoke('native-search-clear-index', indexId),
      removeDoc: (indexId, docId) => ipcRenderer.invoke('native-search-remove-doc', indexId, docId),
      indexText: (indexId, docId, text) => ipcRenderer.invoke('native-search-index-text', indexId, docId, text),
      query: (indexId, query, prefixSearch = false) =>
        ipcRenderer.invoke('native-search-query', indexId, query, prefixSearch)
    },
    crypto: {
      pbkdf2Sha256: (password, salt, iterations, keyLength) =>
        ipcRenderer.invoke('native-crypto-pbkdf2', password, salt, iterations, keyLength),
      sha256: (data) => ipcRenderer.invoke('native-crypto-sha256', data),
      hmacSha256: (data, key) => ipcRenderer.invoke('native-crypto-hmac-sha256', data, key),
      secureDelete: (path, passes) => ipcRenderer.invoke('native-crypto-secure-delete', path, passes)
    }
  },
  // Security APIs (passcode, Touch ID, lock)
  security: {
    getConfig: () => ipcRenderer.invoke('security-get-config'),
    isTouchIdAvailable: () => ipcRenderer.invoke('security-is-touch-id-available'),
    setupPasscode: (passcode) => ipcRenderer.invoke('security-setup-passcode', passcode),
    enableTouchId: () => ipcRenderer.invoke('security-enable-touch-id'),
    disableTouchId: () => ipcRenderer.invoke('security-disable-touch-id'),
    authenticatePasscode: (passcode) => ipcRenderer.invoke('security-authenticate-passcode', passcode),
    authenticateTouchId: () => ipcRenderer.invoke('security-authenticate-touch-id'),
    lock: () => ipcRenderer.invoke('security-lock'),
    changePasscode: (currentPasscode, newPasscode) => 
      ipcRenderer.invoke('security-change-passcode', { currentPasscode, newPasscode }),
    disable: (passcode) => ipcRenderer.invoke('security-disable', passcode),
    setAutoLock: (minutes) => ipcRenderer.invoke('security-set-auto-lock', minutes),
    resetTimer: () => ipcRenderer.invoke('security-reset-timer'),
    isUnlocked: () => ipcRenderer.invoke('security-is-unlocked'),
    isEnabled: () => ipcRenderer.invoke('security-is-enabled'),
    onLocked: (callback) => ipcRenderer.on('security-locked', callback)
  }
});
