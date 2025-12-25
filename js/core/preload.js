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
// - Chat: AI chat with streaming support
// - Memory: Conversation memory persistence
// - File Storage: .simnote file operations
// - Native DB: SQLite database operations (Electron-only)
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
  }
});
