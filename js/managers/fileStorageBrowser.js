// fileStorageBrowser.js
// Browser-compatible .simnote file storage using File System Access API
// Falls back gracefully when API is not available
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This module provides file-based storage in browsers using the
// File System Access API. Features include:
// - Directory picker for user-selected storage location
// - IndexedDB persistence of directory handles
// - .simnote JSON file format for entries
// - Graceful fallback when API not available
//
// FILE FORMAT:
// - Extension: .simnote
// - Content: JSON with entry data and metadata
// - Filename: sanitized-name-entryid.simnote
//
// PERSISTENCE:
// - Directory handle stored in IndexedDB
// - Permissions re-requested on session restore
//
// DEPENDENCIES:
// - File System Access API (Chrome, Edge)
// - IndexedDB for handle persistence

/** @constant {string} File extension for simnote files */
const SIMNOTE_EXTENSION = '.simnote';
/** @constant {number} Current file format version */
const SIMNOTE_VERSION = 1;
/** @constant {string} IndexedDB key for directory handle */
const STORAGE_DIR_HANDLE_KEY = 'simnote_dir_handle';

/**
 * Browser-based file storage using File System Access API.
 * Stores entries as .simnote JSON files in user-selected directory.
 * 
 * @class BrowserFileStorage
 */
class BrowserFileStorage {
  /**
   * Creates BrowserFileStorage instance.
   * @constructor
   */
  constructor() {
    /** @type {FileSystemDirectoryHandle|null} Selected directory handle */
    this.dirHandle = null;
    /** @type {boolean} Whether File System Access API is available */
    this.isAvailable = 'showDirectoryPicker' in window;
    /** @type {boolean} Whether file storage is currently enabled */
    this.isEnabled = false;
  }

  /**
   * Normalizes an entry ID for safe filenames.
   * @param {string|number} entryId - Entry ID
   * @returns {string}
   * @private
   */
  _normalizeEntryId(entryId) {
    const raw = String(entryId || '').trim();
    return raw ? encodeURIComponent(raw) : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * Ensures the entry has an ID.
   * @param {Object} entry - Entry object
   * @returns {string}
   * @private
   */
  _ensureEntryId(entry) {
    if (!entry || (!entry.id && entry.id !== 0)) {
      const fallbackId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      if (entry) entry.id = fallbackId;
      return fallbackId;
    }
    return String(entry.id);
  }

  /**
   * Normalizes entry names for filenames.
   * @param {string} entryName - Entry name
   * @returns {string}
   * @private
   */
  _normalizeEntryName(entryName) {
    const safeName = String(entryName || 'entry')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    return safeName || 'entry';
  }

  /**
   * Checks if File System Access API is supported.
   * @static
   * @returns {boolean} Whether API is available
   */
  static isSupported() {
    return 'showDirectoryPicker' in window;
  }

  /**
   * Prompts user to select a directory for storing files.
   * 
   * @async
   * @returns {Promise<boolean>} Whether selection succeeded
   */
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

  /**
   * Restores previously selected directory from IndexedDB.
   * Re-requests permission if needed.
   * 
   * @async
   * @returns {Promise<boolean>} Whether restore succeeded
   */
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

  /**
   * Persists directory handle to IndexedDB.
   * 
   * @async
   * @private
   */
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

  /**
   * Gets persisted directory handle from IndexedDB.
   * 
   * @async
   * @returns {Promise<FileSystemDirectoryHandle|null>}
   * @private
   */
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

  /**
   * Generates a safe filename from entry data.
   * 
   * @param {Object} entry - Entry object
   * @returns {string} Safe filename with .simnote extension
   * @private
   */
  _generateFilename(entry) {
    const safeName = this._normalizeEntryName(entry?.name);
    const safeId = this._normalizeEntryId(entry?.id);
    return `${safeName}-${safeId}${SIMNOTE_EXTENSION}`;
  }

  /**
   * Converts entry object to .simnote file format.
   * 
   * @param {Object} entry - Entry object
   * @returns {Object} Simnote format object
   * @private
   */
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

  /**
   * Converts .simnote file content back to entry object.
   * 
   * @param {Object} simnoteData - Parsed simnote file data
   * @returns {Object} Entry object
   * @private
   */
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

  /**
   * Saves entry as .simnote file.
   * 
   * @async
   * @param {Object} entry - Entry to save
   * @returns {Promise<string|null>} Filename or null on failure
   */
  async saveEntry(entry) {
    if (!this.isEnabled || !this.dirHandle) {
      return null;
    }

    try {
      this._ensureEntryId(entry);
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

  /**
   * Updates entry by deleting old file and saving new.
   * 
   * @async
   * @param {Object} entry - Entry to update
   * @returns {Promise<string|null>} Filename or null
   */
  async updateEntry(entry) {
    await this.deleteEntryById(entry.id);
    return this.saveEntry(entry);
  }

  /**
   * Deletes entry file by ID.
   * 
   * @async
   * @param {string} id - Entry ID
   * @returns {Promise<boolean>} Whether deletion succeeded
   */
  async deleteEntryById(id) {
    if (!this.isEnabled || !this.dirHandle) return false;

    try {
      const safeId = this._normalizeEntryId(id);
      const targetSuffix = `-${safeId}${SIMNOTE_EXTENSION}`;
      for await (const [name, handle] of this.dirHandle) {
        if (handle.kind === 'file' && name.endsWith(targetSuffix)) {
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

  /**
   * Gets all entries from .simnote files in directory.
   * 
   * @async
   * @returns {Promise<Object[]>} Array of entry objects
   */
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

  /**
   * Syncs all entries to files.
   * 
   * @async
   * @param {Object[]} entries - Entries to sync
   * @returns {Promise<number>} Count of synced entries
   */
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

  /**
   * Gets the selected directory name.
   * @returns {string|null} Directory name or null
   */
  getDirectoryName() {
    return this.dirHandle?.name || null;
  }

  /**
   * Disables file storage.
   */
  disable() {
    this.dirHandle = null;
    this.isEnabled = false;
  }
}

/** @type {BrowserFileStorage} Singleton browser file storage instance */
const browserFileStorage = new BrowserFileStorage();

export { browserFileStorage, BrowserFileStorage, SIMNOTE_EXTENSION, SIMNOTE_VERSION };
