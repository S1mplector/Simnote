const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Existing saveEntry API
  saveEntry: (entryName, entryContent) =>
    ipcRenderer.invoke('save-entry', { entryName, entryContent }),
  // New API to get system RAM info.
  getRAMInfo: () => ipcRenderer.invoke('get-ram-info'),
  // Chat API
  chat: (history) => ipcRenderer.invoke('chat', { history }),
  chatStream: (history)=> ipcRenderer.invoke('chat-stream',{history}),
  onChatStreamChunk: (cb)=> ipcRenderer.on('chat-stream-chunk',(e,data)=>cb(data)),
  // Memory APIs
  loadMemory: () => ipcRenderer.invoke('load-memory'),
  saveMemory: (summary) => ipcRenderer.invoke('save-memory', summary),
  summarize: (history) => ipcRenderer.invoke('summarize', { history }),
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
