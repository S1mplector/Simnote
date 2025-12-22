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
  openStorageFolder: () => ipcRenderer.invoke('open-storage-folder')
});