// fileStorageBrowser.js
// Browser-compatible .simnote file storage using File System Access API
// Falls back gracefully when API is not available

const SIMNOTE_EXTENSION = '.simnote';
const SIMNOTE_VERSION = 1;
const STORAGE_DIR_HANDLE_KEY = 'simnote_dir_handle';

class BrowserFileStorage {
  constructor() {
    this.dirHandle = null;
    this.isAvailable = 'showDirectoryPicker' in window;
    this.isEnabled = false;
  }

  // Check if File System Access API is available
  static isSupported() {
    return 'showDirectoryPicker' in window;
  }

  // Prompt user to select a directory for storing .simnote files
  async selectDirectory() {
    if (!this.isAvailable) {
      console.warn('[FileStorageBrowser] File System Access API not available');
      return false;
    }

    try {
      this.dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });
      this.isEnabled = true;
      
      // Try to persist the handle for future sessions
      await this._persistHandle();
      
      console.log(`[FileStorageBrowser] Directory selected: ${this.dirHandle.name}`);
      return true;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[FileStorageBrowser] User cancelled directory selection');
      } else {
        console.error('[FileStorageBrowser] Error selecting directory:', err);
      }
      return false;
    }
  }

  // Try to restore previously selected directory handle
  async restoreDirectory() {
    if (!this.isAvailable) return false;

    try {
      // IndexedDB is used to persist the directory handle
      const handle = await this._getPersistedHandle();
      if (handle) {
        // Verify we still have permission
        const permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission === 'granted') {
          this.dirHandle = handle;
          this.isEnabled = true;
          console.log(`[FileStorageBrowser] Restored directory: ${handle.name}`);
          return true;
        } else {
          // Try to request permission again
          const newPermission = await handle.requestPermission({ mode: 'readwrite' });
          if (newPermission === 'granted') {
            this.dirHandle = handle;
            this.isEnabled = true;
            return true;
          }
        }
      }
    } catch (err) {
      console.log('[FileStorageBrowser] Could not restore directory:', err.message);
    }
    return false;
  }

  // Persist directory handle to IndexedDB
  async _persistHandle() {
    if (!this.dirHandle) return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SimnoteFileStorage', 1);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles');
        }
      };
      
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('handles', 'readwrite');
        const store = tx.objectStore('handles');
        store.put(this.dirHandle, STORAGE_DIR_HANDLE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Get persisted directory handle from IndexedDB
  async _getPersistedHandle() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SimnoteFileStorage', 1);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles');
        }
      };
      
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('handles', 'readonly');
        const store = tx.objectStore('handles');
        const getRequest = store.get(STORAGE_DIR_HANDLE_KEY);
        
        getRequest.onsuccess = () => resolve(getRequest.result || null);
        getRequest.onerror = () => resolve(null);
      };
      
      request.onerror = () => resolve(null);
    });
  }

  // Generate a safe filename from entry
  _generateFilename(entry) {
    const safeName = (entry.name || 'untitled')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    return `${safeName}-${entry.id}${SIMNOTE_EXTENSION}`;
  }

  // Convert entry to .simnote file format
  _entryToSimnote(entry) {
    return {
      simnoteVersion: SIMNOTE_VERSION,
      id: entry.id,
      name: entry.name || '',
      content: entry.content || '',
      mood: entry.mood || '',
      tags: entry.tags || [],
      favorite: entry.favorite || false,
      wordCount: entry.wordCount || 0,
      fontFamily: entry.fontFamily || '',
      fontSize: entry.fontSize || '',
      createdAt: entry.createdAt || entry.date || new Date().toISOString(),
      updatedAt: entry.updatedAt || new Date().toISOString(),
      exportedAt: new Date().toISOString()
    };
  }

  // Convert .simnote content back to entry
  _simnoteToEntry(simnoteData) {
    return {
      id: simnoteData.id,
      name: simnoteData.name || '',
      content: simnoteData.content || '',
      mood: simnoteData.mood || '',
      tags: simnoteData.tags || [],
      favorite: simnoteData.favorite || false,
      wordCount: simnoteData.wordCount || 0,
      fontFamily: simnoteData.fontFamily || '',
      fontSize: simnoteData.fontSize || '',
      createdAt: simnoteData.createdAt,
      updatedAt: simnoteData.updatedAt,
      date: simnoteData.createdAt
    };
  }

  // Save entry as .simnote file
  async saveEntry(entry) {
    if (!this.isEnabled || !this.dirHandle) {
      return null;
    }

    try {
      const filename = this._generateFilename(entry);
      const simnoteData = this._entryToSimnote(entry);
      
      const fileHandle = await this.dirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(simnoteData, null, 2));
      await writable.close();
      
      console.log(`[FileStorageBrowser] Saved: ${filename}`);
      return filename;
    } catch (err) {
      console.error('[FileStorageBrowser] Error saving entry:', err);
      return null;
    }
  }

  // Update entry (delete old, save new)
  async updateEntry(entry) {
    await this.deleteEntryById(entry.id);
    return this.saveEntry(entry);
  }

  // Delete entry file by ID
  async deleteEntryById(id) {
    if (!this.isEnabled || !this.dirHandle) return false;

    try {
      for await (const [name, handle] of this.dirHandle) {
        if (handle.kind === 'file' && name.endsWith(SIMNOTE_EXTENSION) && name.includes(id)) {
          await this.dirHandle.removeEntry(name);
          console.log(`[FileStorageBrowser] Deleted: ${name}`);
          return true;
        }
      }
    } catch (err) {
      console.error('[FileStorageBrowser] Error deleting entry:', err);
    }
    return false;
  }

  // Get all entries from .simnote files
  async getEntries() {
    if (!this.isEnabled || !this.dirHandle) return [];

    const entries = [];
    try {
      for await (const [name, handle] of this.dirHandle) {
        if (handle.kind === 'file' && name.endsWith(SIMNOTE_EXTENSION)) {
          try {
            const file = await handle.getFile();
            const content = await file.text();
            const simnoteData = JSON.parse(content);
            entries.push(this._simnoteToEntry(simnoteData));
          } catch (err) {
            console.error(`[FileStorageBrowser] Error reading ${name}:`, err);
          }
        }
      }
    } catch (err) {
      console.error('[FileStorageBrowser] Error listing files:', err);
    }

    return entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Sync all entries to files
  async syncAllEntries(entries) {
    if (!this.isEnabled) return 0;

    let synced = 0;
    for (const entry of entries) {
      const result = await this.saveEntry(entry);
      if (result) synced++;
    }
    console.log(`[FileStorageBrowser] Synced ${synced}/${entries.length} entries to disk`);
    return synced;
  }

  // Get directory name
  getDirectoryName() {
    return this.dirHandle?.name || null;
  }

  // Disable file storage
  disable() {
    this.dirHandle = null;
    this.isEnabled = false;
  }
}

// Singleton instance
const browserFileStorage = new BrowserFileStorage();

export { browserFileStorage, BrowserFileStorage, SIMNOTE_EXTENSION, SIMNOTE_VERSION };
