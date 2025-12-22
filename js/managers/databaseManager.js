// databaseManager.js
// SQLite-based persistence using sql.js (WebAssembly)
// Hybrid storage: SQLite + IndexedDB + localStorage + .simnote files

const DB_NAME = 'simnote.db';
const DB_VERSION = 1;
const ENTRIES_BACKUP_KEY = 'entries';
const META_BACKUP_KEY = 'simnote_meta';

// File storage will be lazy-loaded to avoid circular dependencies
let fileStorage = null;

// Check if running in Electron (dynamic check)
function isElectron() {
  return typeof window !== 'undefined' && window.electronAPI;
}

class DatabaseManager {
  constructor() {
    this.db = null;
    this.ready = false;
    this.initPromise = null;
    this.fileStorageEnabled = false;
  }

  // Enable file storage (call after user selects directory in browser, or auto in Electron)
  async enableFileStorage() {
    console.log('[DB] enableFileStorage called, isElectron:', isElectron());
    if (isElectron()) {
      // Electron handles file storage via IPC
      this.fileStorageEnabled = true;
      console.log('[DB] File storage enabled via Electron, fileStorageEnabled =', this.fileStorageEnabled);
      return true;
    }
    
    // Browser: use File System Access API
    try {
      if (!fileStorage) {
        const module = await import('./fileStorageBrowser.js');
        fileStorage = module.browserFileStorage;
      }
      
      // Try to restore previously selected directory
      const restored = await fileStorage.restoreDirectory();
      if (restored) {
        this.fileStorageEnabled = true;
        console.log('[DB] File storage restored');
        return true;
      }
    } catch (err) {
      console.warn('[DB] File storage not available:', err.message);
    }
    return false;
  }

  // Prompt user to select file storage directory (browser only)
  async selectFileStorageDirectory() {
    if (isElectron()) return true;
    
    try {
      if (!fileStorage) {
        const module = await import('./fileStorageBrowser.js');
        fileStorage = module.browserFileStorage;
      }
      
      const selected = await fileStorage.selectDirectory();
      if (selected) {
        this.fileStorageEnabled = true;
        // Sync existing entries to the new directory
        const entries = this.getEntries();
        await fileStorage.syncAllEntries(entries);
        return true;
      }
    } catch (err) {
      console.error('[DB] Error selecting directory:', err);
    }
    return false;
  }

  // Sync single entry to file storage
  async _syncEntryToFile(entry) {
    if (!this.fileStorageEnabled) {
      console.log('[DB] File storage not enabled, skipping sync');
      return;
    }
    
    if (isElectron() && window.electronAPI?.saveEntryFile) {
      try {
        const filename = await window.electronAPI.saveEntryFile(entry);
        console.log(`[DB] Synced entry to file: ${filename}`);
      } catch (err) {
        console.warn('[DB] Electron file sync failed:', err);
      }
    } else if (fileStorage?.isEnabled) {
      try {
        await fileStorage.saveEntry(entry);
      } catch (err) {
        console.warn('[DB] Browser file sync failed:', err);
      }
    }
  }

  // Delete entry from file storage
  async _deleteEntryFile(id) {
    if (!this.fileStorageEnabled) return;
    
    if (isElectron() && window.electronAPI?.deleteEntryFile) {
      try {
        await window.electronAPI.deleteEntryFile(id);
      } catch (err) {
        console.warn('[DB] Electron file delete failed:', err);
      }
    } else if (fileStorage?.isEnabled) {
      try {
        await fileStorage.deleteEntryById(id);
      } catch (err) {
        console.warn('[DB] Browser file delete failed:', err);
      }
    }
  }

  async init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._initialize();
    return this.initPromise;
  }

  async _initialize() {
    try {
      // Load sql.js from local files (for offline support)
      const SQL = await initSqlJs({
        locateFile: file => `/js/lib/${file}`
      });

      // Try to load existing database from IndexedDB
      const savedDb = await this._loadFromIndexedDB();
      
      if (savedDb) {
        this.db = new SQL.Database(savedDb);
        console.log('[DB] Loaded existing database');
      } else {
        this.db = new SQL.Database();
        console.log('[DB] Created new database');
        this._createTables();
        
        // Migrate from localStorage if data exists
        await this._migrateFromLocalStorage();
      }

      this.ready = true;
      
      // Sync to localStorage backup after successful load
      this._syncToLocalStorage();
      
      // Try to enable file storage (restore previous directory or auto-enable in Electron)
      // Wait for this to complete to ensure file storage is ready before entries are saved
      try {
        const fileStorageResult = await this.enableFileStorage();
        console.log('[DB] File storage initialization result:', fileStorageResult);
      } catch (err) {
        console.warn('[DB] File storage initialization failed:', err);
      }
      
      // Auto-save periodically (both IndexedDB and localStorage)
      setInterval(() => {
        this._saveToIndexedDB();
        this._syncToLocalStorage();
      }, 30000);
      
      return true;
    } catch (error) {
      console.error('[DB] Initialization failed:', error);
      this.ready = false;
      return false;
    }
  }

  _createTables() {
    // Entries table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS entries (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT,
        mood TEXT,
        tags TEXT,
        favorite INTEGER DEFAULT 0,
        word_count INTEGER DEFAULT 0,
        font_family TEXT,
        font_size TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Metadata table for app settings
    this.db.run(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Daily moods table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS daily_moods (
        date TEXT PRIMARY KEY,
        mood TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `);

    // Set database version
    this.db.run(`INSERT OR REPLACE INTO metadata (key, value) VALUES ('version', '${DB_VERSION}')`);
    
    console.log('[DB] Tables created');
  }

  async _migrateFromLocalStorage() {
    try {
      // Migrate entries
      const entriesJson = localStorage.getItem('entries');
      if (entriesJson) {
        const entries = JSON.parse(entriesJson);
        console.log(`[DB] Migrating ${entries.length} entries from localStorage`);
        
        for (const entry of entries) {
          this._insertEntry(entry);
        }
      }

      // Migrate metadata
      const meta = localStorage.getItem('simnote_meta');
      if (meta) {
        const metaObj = JSON.parse(meta);
        for (const [key, value] of Object.entries(metaObj)) {
          this.db.run(
            'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)',
            [key, JSON.stringify(value)]
          );
        }
      }

      // Migrate daily moods
      const dailyMoods = localStorage.getItem('simnote_daily_mood');
      if (dailyMoods) {
        const moods = JSON.parse(dailyMoods);
        for (const [date, data] of Object.entries(moods)) {
          this.db.run(
            'INSERT OR REPLACE INTO daily_moods (date, mood, timestamp) VALUES (?, ?, ?)',
            [date, data.mood, data.timestamp]
          );
        }
      }

      // Save the migrated database
      await this._saveToIndexedDB();
      
      // Clear localStorage after successful migration (optional - keep as backup)
      // localStorage.removeItem('entries');
      
      console.log('[DB] Migration complete');
    } catch (error) {
      console.error('[DB] Migration failed:', error);
    }
  }

  _insertEntry(entry) {
    const id = entry.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tags = JSON.stringify(entry.tags || []);
    const createdAt = entry.createdAt || entry.date || new Date().toISOString();
    const updatedAt = entry.updatedAt || createdAt;
    
    this.db.run(`
      INSERT OR REPLACE INTO entries 
      (id, name, content, mood, tags, favorite, word_count, font_family, font_size, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      entry.name || '',
      entry.content || '',
      entry.mood || '',
      tags,
      entry.favorite ? 1 : 0,
      entry.wordCount || 0,
      entry.fontFamily || '',
      entry.fontSize || '',
      createdAt,
      updatedAt
    ]);
    
    return id;
  }

  // IndexedDB operations for persisting SQLite database
  async _loadFromIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SimnoteDB', 1);
      
      request.onerror = () => resolve(null);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('database')) {
          db.createObjectStore('database');
        }
      };
      
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('database', 'readonly');
        const store = tx.objectStore('database');
        const getRequest = store.get('sqlite');
        
        getRequest.onsuccess = () => {
          resolve(getRequest.result || null);
        };
        
        getRequest.onerror = () => resolve(null);
      };
    });
  }

  async _saveToIndexedDB() {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const data = this.db.export();
      const buffer = new Uint8Array(data);
      
      const request = indexedDB.open('SimnoteDB', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('database')) {
          db.createObjectStore('database');
        }
      };
      
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('database', 'readwrite');
        const store = tx.objectStore('database');
        store.put(buffer, 'sqlite');
        
        tx.oncomplete = () => {
          console.log('[DB] Saved to IndexedDB');
          resolve();
        };
        
        tx.onerror = () => reject(tx.error);
      };
    });
  }

  // Public API - Entries
  
  getEntries() {
    if (!this.ready) return [];
    
    const results = this.db.exec(`
      SELECT * FROM entries ORDER BY created_at DESC
    `);
    
    if (!results.length) return [];
    
    return results[0].values.map(row => this._rowToEntry(results[0].columns, row));
  }

  getEntryById(id) {
    if (!this.ready) return null;
    
    const stmt = this.db.prepare('SELECT * FROM entries WHERE id = ?');
    stmt.bind([id]);
    
    if (stmt.step()) {
      const columns = stmt.getColumnNames();
      const values = stmt.get();
      stmt.free();
      return this._rowToEntry(columns, values);
    }
    
    stmt.free();
    return null;
  }

  saveEntry(name, content, mood, fontFamily, fontSize, tags = []) {
    if (!this.ready) return null;
    
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const wordCount = this._countWords(content);
    
    console.log('[DB] saveEntry called, id:', id, 'fileStorageEnabled:', this.fileStorageEnabled);
    
    this.db.run(`
      INSERT INTO entries 
      (id, name, content, mood, tags, favorite, word_count, font_family, font_size, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)
    `, [id, name, content, mood, JSON.stringify(tags), wordCount, fontFamily, fontSize, now, now]);
    
    this._saveToIndexedDB();
    this._syncToLocalStorage();
    this._updateStreak();
    
    // Sync to file storage (async, non-blocking)
    const entry = this.getEntryById(id);
    console.log('[DB] About to sync entry to file, entry exists:', !!entry);
    if (entry) this._syncEntryToFile(entry);
    
    return id;
  }

  updateEntry(id, name, content, mood, fontFamily, fontSize, tags = []) {
    if (!this.ready) return false;
    
    const now = new Date().toISOString();
    const wordCount = this._countWords(content);
    
    this.db.run(`
      UPDATE entries SET
        name = ?, content = ?, mood = ?, tags = ?,
        word_count = ?, font_family = ?, font_size = ?, updated_at = ?
      WHERE id = ?
    `, [name, content, mood, JSON.stringify(tags), wordCount, fontFamily, fontSize, now, id]);
    
    this._saveToIndexedDB();
    this._syncToLocalStorage();
    
    // Sync to file storage (async, non-blocking)
    const entry = this.getEntryById(id);
    if (entry) this._syncEntryToFile(entry);
    
    return true;
  }

  deleteEntry(id) {
    if (!this.ready) return false;
    
    // Delete from file storage first (before we lose the ID)
    this._deleteEntryFile(id);
    
    this.db.run('DELETE FROM entries WHERE id = ?', [id]);
    this._saveToIndexedDB();
    this._syncToLocalStorage();
    return true;
  }

  toggleFavorite(id) {
    if (!this.ready) return false;
    
    const entry = this.getEntryById(id);
    if (!entry) return false;
    
    const newFavorite = entry.favorite ? 0 : 1;
    this.db.run('UPDATE entries SET favorite = ? WHERE id = ?', [newFavorite, id]);
    this._saveToIndexedDB();
    this._syncToLocalStorage();
    
    // Sync to file storage (async, non-blocking)
    const updatedEntry = this.getEntryById(id);
    if (updatedEntry) this._syncEntryToFile(updatedEntry);
    
    return newFavorite === 1;
  }

  // Tags
  getAllTags() {
    if (!this.ready) return [];
    
    const results = this.db.exec('SELECT tags FROM entries');
    if (!results.length) return [];
    
    const tagSet = new Set();
    results[0].values.forEach(row => {
      try {
        const tags = JSON.parse(row[0] || '[]');
        tags.forEach(tag => tagSet.add(tag));
      } catch (e) {}
    });
    
    return Array.from(tagSet).sort();
  }

  // Statistics
  getStats() {
    if (!this.ready) {
      return {
        totalEntries: 0,
        totalWords: 0,
        avgWords: 0,
        favoriteCount: 0,
        moodCounts: {},
        currentStreak: 0,
        longestStreak: 0
      };
    }

    const entries = this.getEntries();
    const totalEntries = entries.length;
    const totalWords = entries.reduce((sum, e) => sum + (e.wordCount || 0), 0);
    const avgWords = totalEntries > 0 ? Math.round(totalWords / totalEntries) : 0;
    const favoriteCount = entries.filter(e => e.favorite).length;

    // Mood counts
    const moodCounts = {};
    entries.forEach(entry => {
      if (entry.mood) {
        moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
      }
    });

    // Get streak from metadata
    const streakData = this.getMetadata('streak') || { current: 0, longest: 0 };

    return {
      totalEntries,
      totalWords,
      avgWords,
      favoriteCount,
      moodCounts,
      currentStreak: streakData.current || 0,
      longestStreak: streakData.longest || 0
    };
  }

  // Metadata
  getMetadata(key) {
    if (!this.ready) return null;
    
    const stmt = this.db.prepare('SELECT value FROM metadata WHERE key = ?');
    stmt.bind([key]);
    
    if (stmt.step()) {
      const value = stmt.get()[0];
      stmt.free();
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    
    stmt.free();
    return null;
  }

  setMetadata(key, value) {
    if (!this.ready) return;
    
    this.db.run(
      'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)',
      [key, JSON.stringify(value)]
    );
    this._saveToIndexedDB();
  }

  // Daily Moods
  getTodaysMood() {
    if (!this.ready) return null;
    
    const today = new Date().toISOString().split('T')[0];
    const stmt = this.db.prepare('SELECT mood FROM daily_moods WHERE date = ?');
    stmt.bind([today]);
    
    if (stmt.step()) {
      const mood = stmt.get()[0];
      stmt.free();
      return mood;
    }
    
    stmt.free();
    return null;
  }

  setTodaysMood(mood) {
    if (!this.ready) return;
    
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    
    this.db.run(
      'INSERT OR REPLACE INTO daily_moods (date, mood, timestamp) VALUES (?, ?, ?)',
      [today, mood, now]
    );
    this._saveToIndexedDB();
  }

  // Storage Info
  async getStorageInfo() {
    const info = {
      entriesCount: 0,
      totalSize: 0,
      sizeFormatted: '0 KB',
      imagesCount: 0,
      imagesSize: 0
    };

    if (!this.ready) return info;

    // Count entries
    const countResult = this.db.exec('SELECT COUNT(*) FROM entries');
    info.entriesCount = countResult.length ? countResult[0].values[0][0] : 0;

    // Calculate database size
    const dbData = this.db.export();
    info.totalSize = dbData.length;
    info.sizeFormatted = this._formatBytes(dbData.length);

    // Count images (base64 data in content)
    const entries = this.getEntries();
    entries.forEach(entry => {
      const matches = (entry.content || '').match(/data:image\/[^;]+;base64,[^"]+/g);
      if (matches) {
        info.imagesCount += matches.length;
        matches.forEach(m => {
          info.imagesSize += m.length * 0.75; // Approximate decoded size
        });
      }
    });

    return info;
  }

  // Export/Import
  exportToJSON() {
    if (!this.ready) return null;
    
    const entries = this.getEntries();
    const dailyMoods = this.db.exec('SELECT * FROM daily_moods');
    
    return JSON.stringify({
      version: 2,
      exportDate: new Date().toISOString(),
      entries,
      dailyMoods: dailyMoods.length ? dailyMoods[0].values.map(row => ({
        date: row[0],
        mood: row[1],
        timestamp: row[2]
      })) : []
    }, null, 2);
  }

  async importFromJSON(jsonString) {
    if (!this.ready) return 0;
    
    try {
      const data = JSON.parse(jsonString);
      let count = 0;
      
      if (data.entries && Array.isArray(data.entries)) {
        for (const entry of data.entries) {
          // Check if entry already exists
          const existing = this.getEntryById(entry.id);
          if (!existing) {
            this._insertEntry(entry);
            count++;
          }
        }
      }
      
      await this._saveToIndexedDB();
      return count;
    } catch (error) {
      console.error('[DB] Import failed:', error);
      return 0;
    }
  }

  // Clear all data
  async clearAllData() {
    if (!this.ready) return;
    
    this.db.run('DELETE FROM entries');
    this.db.run('DELETE FROM daily_moods');
    this.db.run("DELETE FROM metadata WHERE key != 'version'");
    
    await this._saveToIndexedDB();
    console.log('[DB] All data cleared');
  }

  // Helper methods
  _rowToEntry(columns, values) {
    const entry = {};
    columns.forEach((col, i) => {
      const key = this._snakeToCamel(col);
      let value = values[i];
      
      if (col === 'tags') {
        try { value = JSON.parse(value || '[]'); } catch { value = []; }
      } else if (col === 'favorite') {
        value = value === 1;
      } else if (col === 'word_count') {
        value = value || 0;
      }
      
      entry[key] = value;
    });
    return entry;
  }

  _snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  _countWords(text) {
    if (!text) return 0;
    // Strip HTML tags for word count
    const plainText = text.replace(/<[^>]*>/g, ' ');
    return plainText.trim().split(/\s+/).filter(w => w.length > 0).length;
  }

  _formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  _updateStreak() {
    const entries = this.getEntries();
    const dates = new Set(entries.map(e => (e.createdAt || '').split('T')[0]));
    
    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 0;
    
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      if (dates.has(dateStr)) {
        streak++;
        if (i === 0 || (i === 1 && streak > 1)) currentStreak = streak;
        longestStreak = Math.max(longestStreak, streak);
      } else {
        if (i === 0) currentStreak = 0;
        streak = 0;
      }
    }
    
    this.setMetadata('streak', { current: currentStreak, longest: longestStreak });
  }

  // Sync entries to localStorage as backup (dual-write strategy)
  _syncToLocalStorage() {
    try {
      const entries = this.getEntries();
      localStorage.setItem(ENTRIES_BACKUP_KEY, JSON.stringify(entries));
      console.log(`[DB] Synced ${entries.length} entries to localStorage backup`);
    } catch (error) {
      console.warn('[DB] Failed to sync to localStorage:', error);
    }
  }

  // Force save
  async save() {
    await this._saveToIndexedDB();
  }
}

// Singleton instance
const dbManager = new DatabaseManager();

export { dbManager, DatabaseManager };
